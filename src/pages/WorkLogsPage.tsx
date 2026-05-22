import { Table, Button, Modal, Form, Input, Select, DatePicker, Space, Tag, message, Popconfirm, Card, Typography, Empty, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UnlockOutlined, ReloadOutlined, FilterOutlined } from '@ant-design/icons';
import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import * as worklogApi from '../api/worklog';
import * as projectApi from '../api/project';
import { useAuth } from '../contexts/AuthContext';

export const WorkLogsPage = () => {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [unlockModal, setUnlockModal] = useState<string | null>(null);
  const [unlockSubmitting, setUnlockSubmitting] = useState(false);

  // Filters
  const [filterProject, setFilterProject] = useState<string | undefined>();
  const [filterDate, setFilterDate] = useState<string | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  const [unlockForm] = Form.useForm();
  const [form] = Form.useForm();
  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  const fetch = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params: any = { page: p, limit: 20 };
      if (filterProject) params.projectId = filterProject;
      if (filterDate) params.executionDate = filterDate;
      const res: any = await worklogApi.getWorkLogs(params);
      setData(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (err: any) {
      message.error(err.message || 'Failed to load work logs');
    } finally {
      setLoading(false);
    }
  }, [page, filterProject, filterDate]);

  const fetchProjects = async () => {
    try {
      const res: any = await projectApi.getProjects(1, 100);
      setProjects(res.data ?? []);
    } catch {}
  };

  useEffect(() => { fetch(); fetchProjects(); }, [fetch]);

  const openCreate = async () => {
    setEditItem(null);
    form.resetFields();
    try {
      const d: any = await worklogApi.getDefaults();
      form.setFieldsValue({
        projectId: d.suggestedProjectId,
        executionDate: dayjs(d.todayDate),
      });
    } catch {}
    setModalOpen(true);
  };

  const openEdit = (record: any) => {
    setEditItem(record);
    form.setFieldsValue({ content: record.content });
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editItem) {
        await worklogApi.updateWorkLog(editItem.id, { content: values.content });
        message.success('Work log updated');
      } else {
        const payload: any = { content: values.content };
        if (values.projectId) payload.projectId = values.projectId;
        if (values.executionDate) payload.executionDate = values.executionDate.format('YYYY-MM-DD');
        await worklogApi.createWorkLog(payload);
        message.success('Work log created');
      }
      setModalOpen(false);
      setEditItem(null);
      form.resetFields();
      fetch();
    } catch (err: any) {
      if (err.code === 'WORKLOG_DUPLICATE') {
        message.error('A work log already exists for this employee/project/date');
      } else if (err.code === 'WORKLOG_FUTURE_DATE') {
        form.setFields([{ name: 'executionDate', errors: ['Cannot create work log for future dates'] }]);
      } else if (err.code === 'WORKLOG_LOCKED') {
        message.error('This work log is locked and cannot be edited');
      } else {
        message.error(err.message || 'Operation failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await worklogApi.deleteWorkLog(id);
      message.success('Work log deleted');
      fetch();
    } catch (err: any) {
      message.error(err.message || 'Failed to delete');
    }
  };

  const handleUnlock = async (id: string, reason: string) => {
    setUnlockSubmitting(true);
    try {
      await worklogApi.unlockWorkLog(id, reason);
      message.success('Work log unlocked');
      setUnlockModal(null);
      unlockForm.resetFields();
      fetch();
    } catch (err: any) {
      message.error(err.message || 'Failed to unlock');
    } finally {
      setUnlockSubmitting(false);
    }
  };

  const clearFilters = () => {
    setFilterProject(undefined);
    setFilterDate(undefined);
    setPage(1);
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'executionDate',
      width: 110,
      render: (d: string) => (
        <Typography.Text style={{ fontSize: 13 }}>{dayjs(d).format('DD/MM/YYYY')}</Typography.Text>
      ),
    },
    {
      title: 'Content',
      dataIndex: 'content',
      ellipsis: true,
    },
    {
      title: 'Project',
      dataIndex: 'projectName',
      width: 140,
      render: (name: string) => name || <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'Employee',
      dataIndex: 'employeeName',
      width: 140,
    },
    {
      title: 'Status',
      width: 120,
      render: (_: any, record: any) => {
        if (record.isUnlocked) return <Tag color="orange">Unlocked</Tag>;
        if (record.isEditable) return <Tag color="success">Editable</Tag>;
        return <Tag color="error">Locked</Tag>;
      },
    },
    {
      title: 'Actions',
      width: 200,
      render: (_: any, record: any) => (
        <Space size={4}>
          {record.isEditable && (
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>Edit</Button>
          )}
          {record.isEditable && (
            <Popconfirm title="Delete this work log?" description="This action cannot be undone." onConfirm={() => handleDelete(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
            </Popconfirm>
          )}
          {isManager && !record.isEditable && !record.isUnlocked && (
            <Button size="small" type="primary" ghost icon={<UnlockOutlined />} onClick={() => setUnlockModal(record.id)}>
              Unlock
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>Work Logs</Typography.Title>
          <Typography.Text type="secondary">{total} entries</Typography.Text>
        </div>
        <Space>
          <Button
            icon={<FilterOutlined />}
            onClick={() => setShowFilters(!showFilters)}
            type={showFilters || filterProject || filterDate ? 'primary' : 'default'}
          >
            Filters {(filterProject || filterDate) ? '(active)' : ''}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => fetch()}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Create Work Log
          </Button>
        </Space>
      </div>

      {showFilters && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap>
            <Select
              allowClear
              placeholder="Filter by project"
              style={{ width: 200 }}
              value={filterProject}
              onChange={(v) => { setFilterProject(v); setPage(1); }}
              options={projects.map((p: any) => ({ value: p.id, label: p.name }))}
            />
            <DatePicker
              placeholder="Filter by date"
              style={{ width: 160 }}
              value={filterDate ? dayjs(filterDate) : undefined}
              onChange={(d) => { setFilterDate(d ? d.format('YYYY-MM-DD') : undefined); setPage(1); }}
            />
            {(filterProject || filterDate) && (
              <Button type="link" onClick={clearFilters}>Clear filters</Button>
            )}
          </Space>
        </Card>
      )}

      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          locale={{ emptyText: <Empty description="No work logs found" /> }}
          pagination={{
            current: page,
            total,
            pageSize: 20,
            onChange: setPage,
            showTotal: (t) => `${t} work logs`,
            showSizeChanger: false,
          }}
        />
      </Card>

      <Modal
        title={editItem ? 'Edit Work Log' : 'Create Work Log'}
        open={modalOpen}
        confirmLoading={submitting}
        onCancel={() => { setModalOpen(false); setEditItem(null); form.resetFields(); }}
        onOk={() => form.submit()}
        okText={editItem ? 'Update' : 'Create'}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="content" label="Content" rules={[
            { required: true, message: 'Content is required' },
            { max: 5000, message: 'Content cannot exceed 5000 characters' },
          ]}>
            <Input.TextArea rows={5} placeholder="What did you work on?" showCount maxLength={5000} />
          </Form.Item>
          {!editItem && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="projectId" label="Project">
                  <Select allowClear placeholder="Select project">
                    {projects.map((p: any) => (
                      <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="executionDate" label="Date">
                  <DatePicker style={{ width: '100%' }} disabledDate={(d) => d && d.isAfter(dayjs(), 'day')} />
                </Form.Item>
              </Col>
            </Row>
          )}
        </Form>
      </Modal>

      <Modal
        title="Unlock Work Log"
        open={!!unlockModal}
        confirmLoading={unlockSubmitting}
        onCancel={() => { setUnlockModal(null); unlockForm.resetFields(); }}
        onOk={() => unlockForm.submit()}
        okText="Unlock"
      >
        <Typography.Paragraph type="secondary">
          Unlocking allows the employee to edit this work log again. Please provide a reason.
        </Typography.Paragraph>
        <Form form={unlockForm} layout="vertical" onFinish={(v) => handleUnlock(unlockModal!, v.reason)}>
          <Form.Item name="reason" label="Reason" rules={[
            { required: true, message: 'Reason is required' },
            { max: 1000, message: 'Reason cannot exceed 1000 characters' },
          ]}>
            <Input.TextArea rows={3} placeholder="e.g. Employee requested correction for typo" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
