import { Table, Button, Modal, Form, Input, Select, DatePicker, Space, Tag, message, Popconfirm, Card, Typography, Empty, Row, Col, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UnlockOutlined, ReloadOutlined, FilterOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import * as worklogApi from '../api/worklog';
import * as projectApi from '../api/project';
import * as sprintApi from '../api/sprint';
import { useAuth } from '../contexts/AuthContext';
import type { WorkLogDto, ProjectDto, WorkLogDefaultsDto, SprintDto, ApiError } from '../types/api';
import { useConfirmDirtyClose } from '../hooks/useConfirmDirtyClose';

const WORK_TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  code:     { icon: '💻', color: '#52c41a', label: 'Code' },
  bug_fix:  { icon: '🐛', color: '#ff4d4f', label: 'Fix Bug' },
  research: { icon: '🔬', color: '#1890ff', label: 'R&D' },
  meeting:  { icon: '📅', color: '#722ed1', label: 'Meeting' },
  review:   { icon: '👀', color: '#fa8c16', label: 'Review' },
  other:    { icon: '📋', color: '#8c8c8c', label: 'Other' },
};

export const WorkLogsPage = () => {
  const [data, setData] = useState<WorkLogDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<WorkLogDto | null>(null);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [sprints, setSprints] = useState<SprintDto[]>([]);
  const [unlockModal, setUnlockModal] = useState<string | null>(null);
  const [unlockSubmitting, setUnlockSubmitting] = useState(false);

  const [sprintCreateOpen, setSprintCreateOpen] = useState(false);
  const [sprintCreateLoading, setSprintCreateLoading] = useState(false);
  const [sprintCreateForm] = Form.useForm();

  const [filterProject, setFilterProject] = useState<string | undefined>();
  const [filterDate, setFilterDate] = useState<string | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  const [unlockForm] = Form.useForm();
  const [form] = Form.useForm();
  const { user } = useAuth();
  const isManager = user?.role === 'manager';
  const confirmDirtyClose = useConfirmDirtyClose();

  const fetch = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20, ...(filterProject ? { projectId: filterProject } : {}), ...(filterDate ? { executionDate: filterDate } : {}) };
      const res = await worklogApi.getWorkLogs(params);
      setData(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      message.error((err as ApiError).message || 'Failed to load work logs');
    } finally {
      setLoading(false);
    }
  }, [page, filterProject, filterDate]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await projectApi.getProjects(1, 100);
      setProjects(res.data ?? []);
    } catch { /* ignored */ }
  }, []);

  useEffect(() => { fetch(); fetchProjects(); }, [fetch, fetchProjects]);

  const loadSprints = async (projectId: string) => {
    try {
      const res = await sprintApi.getSprints(projectId);
      setSprints(Array.isArray(res) ? res : []);
    } catch { setSprints([]); }
  };

  const openCreate = async () => {
    setEditItem(null);
    form.resetFields();
    setSprints([]);
    try {
      const d = await worklogApi.getDefaults() as WorkLogDefaultsDto;
      if (d) {
        form.setFieldsValue({
          projectId: d.suggestedProjectId ?? undefined,
          executionDate: d.todayDate ? dayjs(d.todayDate) : dayjs(),
        });
        if (d.suggestedProjectId) await loadSprints(d.suggestedProjectId);
      } else {
        form.setFieldsValue({ executionDate: dayjs() });
      }
    } catch {
      form.setFieldsValue({ executionDate: dayjs() });
    }
    setModalOpen(true);
  };

  const openEdit = async (record: WorkLogDto) => {
    setEditItem(record);
    setSprints([]);
    form.setFieldsValue({
      content: record.content,
      sprintId: record.sprintId ?? undefined,
      executionDate: record.executionDate ? dayjs(record.executionDate) : undefined,
      workType: record.workType ?? undefined,
    });
    if (record.projectId) {
      await loadSprints(record.projectId);
    }
    setModalOpen(true);
  };

  const handleSubmit = async (values: { content: string; projectId?: string; sprintId?: string; executionDate?: dayjs.Dayjs; workType?: string }) => {
    setSubmitting(true);
    try {
      if (editItem) {
        await worklogApi.updateWorkLog(editItem.id, {
          content: values.content,
          ...(values.sprintId !== undefined ? { sprintId: values.sprintId || null } : {}),
          ...(values.workType !== undefined ? { workType: values.workType || null } : {}),
        });
        message.success('Đã cập nhật báo cáo CV');
      } else {
        const payload = {
          content: values.content,
          ...(values.projectId ? { projectId: values.projectId } : {}),
          ...(values.sprintId ? { sprintId: values.sprintId } : {}),
          ...(values.executionDate ? { executionDate: values.executionDate.format('YYYY-MM-DD') } : {}),
          ...(values.workType ? { workType: values.workType } : {}),
        };
        await worklogApi.createWorkLog(payload);
        message.success('Đã tạo báo cáo CV');
      }
      setModalOpen(false);
      setEditItem(null);
      form.resetFields();
      fetch();
    } catch (err) {
      const code = (err as ApiError).code;
      if (code === 'WORKLOG_DUPLICATE') {
        message.error('Đã có báo cáo CV cho nhân viên/dự án/ngày này');
      } else if (code === 'WORKLOG_FUTURE_DATE') {
        form.setFields([{ name: 'executionDate', errors: ['Cannot create work log for future dates'] }]);
      } else if (code === 'WORKLOG_LOCKED') {
        message.error('Báo cáo CV đã bị khóa, không thể sửa');
      } else {
        message.error((err as ApiError).message || 'Thao tác thất bại');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await worklogApi.deleteWorkLog(id);
      message.success('Đã xóa báo cáo CV');
      fetch();
    } catch (err) {
      message.error((err as ApiError).message || 'Xóa thất bại');
    }
  };

  const handleUnlock = async (id: string, reason: string) => {
    setUnlockSubmitting(true);
    try {
      await worklogApi.unlockWorkLog(id, reason);
      message.success('Đã mở khóa báo cáo CV');
      setUnlockModal(null);
      unlockForm.resetFields();
      fetch();
    } catch (err) {
      message.error((err as ApiError).message || 'Mở khóa thất bại');
    } finally {
      setUnlockSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const next = currentStatus === 'done' ? 'in_progress' : 'done';
    try {
      await worklogApi.updateWorkLogStatus(id, next);
      message.success(next === 'done' ? 'Đã đánh dấu hoàn thành' : 'Đã mở lại');
      fetch();
    } catch (err) {
      message.error((err as ApiError).message || 'Cập nhật trạng thái thất bại');
    }
  };

  const clearFilters = () => {
    setFilterProject(undefined);
    setFilterDate(undefined);
    setPage(1);
  };

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleBulkMarkDone = async () => {
    setBulkLoading(true);
    try {
      await Promise.all(
        selectedRowKeys.map((id) => data.find((r) => r.id === id)).filter((r) => r && r.status !== 'done').map((r) => worklogApi.updateWorkLogStatus(r!.id, 'done')),
      );
      message.success(`${selectedRowKeys.length} work log(s) marked as done`);
      setSelectedRowKeys([]);
      fetch();
    } catch (err) {
      message.error((err as ApiError).message || 'Thao tác hàng loạt thất bại');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkLoading(true);
    try {
      await Promise.all(selectedRowKeys.map((id) => worklogApi.deleteWorkLog(id)));
      message.success(`${selectedRowKeys.length} work log(s) deleted`);
      setSelectedRowKeys([]);
      fetch();
    } catch (err) {
      message.error((err as ApiError).message || 'Xóa hàng loạt thất bại');
    } finally {
      setBulkLoading(false);
    }
  };

  const columns = [
    {
      title: 'Ngày', dataIndex: 'executionDate', width: 110,
      render: (d: string) => <Typography.Text style={{ fontSize: 13 }}>{dayjs(d).format('DD/MM/YYYY')}</Typography.Text>,
    },
    { title: 'Nội dung', dataIndex: 'content', ellipsis: true },
    {
      title: 'Dự án', dataIndex: 'projectName', width: 130,
      render: (name: string) => name || <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'Sprint', dataIndex: 'sprintName', width: 120,
      render: (name: string) => name || <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'Loại CV', dataIndex: 'workType', width: 100,
      render: (wt: string | null) => {
        if (!wt) return <Typography.Text type="secondary">—</Typography.Text>;
        const cfg = WORK_TYPE_CONFIG[wt] ?? WORK_TYPE_CONFIG.other;
        return <Tag color={cfg.color}>{cfg.icon} {cfg.label}</Tag>;
      },
    },
    {
      title: 'Nhân viên', dataIndex: 'employeeName', width: 130,
    },
    {
      title: 'Trạng thái', width: 130,
      render: (_: unknown, record: WorkLogDto) => (
        <Space size={4}>
          {record.status === 'done' ? <Tag color="blue" icon={<CheckCircleOutlined />}>Done</Tag> : <Tag color="processing" icon={<SyncOutlined spin />}>In Progress</Tag>}
          {!record.isEditable && !record.isUnlocked && <Tag color="error">Locked</Tag>}
          {record.isUnlocked && <Tag color="orange">Unlocked</Tag>}
        </Space>
      ),
    },
    {
      title: 'Thao tác', width: 260,
      render: (_: unknown, record: WorkLogDto) => (
        <Space size={4}>
          <Switch size="small" checked={record.status === 'done'} checkedChildren="Done" unCheckedChildren="Todo" onChange={() => handleToggleStatus(record.id, record.status)} />
          {record.isEditable && <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>Edit</Button>}
          {record.isEditable && (
            <Popconfirm title="Delete this work log?" description="This action cannot be undone." onConfirm={() => handleDelete(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
            </Popconfirm>
          )}
          {isManager && !record.isEditable && !record.isUnlocked && (
            <Button size="small" type="primary" ghost icon={<UnlockOutlined />} onClick={() => setUnlockModal(record.id)}>Unlock</Button>
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
          <Button icon={<FilterOutlined />} onClick={() => setShowFilters(!showFilters)} type={showFilters || filterProject || filterDate ? 'primary' : 'default'}>
            Filters {(filterProject || filterDate) ? '(active)' : ''}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => fetch()}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Create Work Log</Button>
        </Space>
      </div>

      {selectedRowKeys.length > 0 && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space>
            <Typography.Text strong>{selectedRowKeys.length} selected</Typography.Text>
            <Button size="small" type="primary" loading={bulkLoading} onClick={handleBulkMarkDone}>Mark Done</Button>
            <Popconfirm title={`Delete ${selectedRowKeys.length} work log(s)?`} description="This action cannot be undone." onConfirm={handleBulkDelete} okText="Xóa" okButtonProps={{ danger: true }}>
              <Button size="small" danger loading={bulkLoading}>Delete</Button>
            </Popconfirm>
            <Button size="small" onClick={() => setSelectedRowKeys([])}>Bỏ chọn</Button>
          </Space>
        </Card>
      )}

      {showFilters && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap>
            <Select allowClear placeholder="Lọc theo dự án" style={{ width: 200 }} value={filterProject} onChange={(v) => { setFilterProject(v); setPage(1); }} options={projects.map((p) => ({ value: p.id, label: p.name }))} />
            <DatePicker placeholder="Lọc theo ngày" style={{ width: 160 }} value={filterDate ? dayjs(filterDate) : undefined} onChange={(d) => { setFilterDate(d ? d.format('YYYY-MM-DD') : undefined); setPage(1); }} />
            {(filterProject || filterDate) && <Button type="link" onClick={clearFilters}>Clear filters</Button>}
          </Space>
        </Card>
      )}

      <Card>
        <Table
          rowKey="id"
          columns={columns}
          rowSelection={{ selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys as string[]) }}
          dataSource={data}
          loading={loading}
          locale={{ emptyText: <Empty description="Chưa có báo cáo CV found" /> }}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: (t) => `${t} work logs`, showSizeChanger: false }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editItem ? 'Edit Work Log' : 'Create Work Log'}
        open={modalOpen}
        confirmLoading={submitting}
        onCancel={() => confirmDirtyClose(form, () => { setModalOpen(false); setEditItem(null); form.resetFields(); })}
        onOk={() => form.submit()}
        okText={editItem ? 'Update' : 'Create'}
        width={600}
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
                <Form.Item name="projectId" label="Dự án">
                  <Select
                    allowClear
                    placeholder="Select project"
                    onChange={async (value: string | undefined) => {
                      form.setFieldsValue({ sprintId: undefined });
                      if (value) { await loadSprints(value); } else { setSprints([]); }
                    }}
                  >
                    {projects.map((p) => (<Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>))}
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
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sprintId" label="Sprint / Module">
                <Space.Compact style={{ width: '100%' }}>
                  <Select
                    allowClear
                    placeholder={editItem ? 'Chọn sprint' : (sprints.length === 0 ? 'Chọn dự án trước' : 'Chọn sprint')}
                    disabled={!editItem && sprints.length === 0}
                    style={{ width: 'calc(100% - 40px)' }}
                    onChange={(val) => form.setFieldsValue({ sprintId: val })}
                  >
                    {sprints.map((s) => (<Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>))}
                  </Select>
                  <Button
                    icon={<PlusOutlined />}
                    disabled={!editItem && !form.getFieldValue('projectId')}
                    onClick={() => { sprintCreateForm.resetFields(); setSprintCreateOpen(true); }}
                    title="Tạo sprint mới"
                  />
                </Space.Compact>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="workType" label="Loại công việc">
                <Select allowClear placeholder="Chọn loại">
                  <Select.Option value="code">💻 Code</Select.Option>
                  <Select.Option value="bug_fix">🐛 Fix Bug</Select.Option>
                  <Select.Option value="research">🔬 R&D</Select.Option>
                  <Select.Option value="meeting">📅 Meeting</Select.Option>
                  <Select.Option value="review">👀 Review</Select.Option>
                  <Select.Option value="other">📋 Other</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Inline Sprint Create Modal */}
      <Modal
        title="Tạo Sprint mới"
        open={sprintCreateOpen}
        confirmLoading={sprintCreateLoading}
        onCancel={() => { setSprintCreateOpen(false); sprintCreateForm.resetFields(); }}
        onOk={() => sprintCreateForm.submit()}
        okText="Tạo"
        width={420}
      >
        <Form form={sprintCreateForm} layout="vertical" onFinish={async (vals: { name: string; description?: string }) => {
          const projectId = editItem?.projectId || form.getFieldValue('projectId');
          if (!projectId) { message.error('Chọn dự án trước'); return; }
          setSprintCreateLoading(true);
          try {
            const newSprint = await sprintApi.createSprint(projectId, { name: vals.name, description: vals.description });
            const list = Array.isArray(await sprintApi.getSprints(projectId)) ? await sprintApi.getSprints(projectId) : sprints;
            setSprints(Array.isArray(list) ? list : [...sprints, newSprint]);
            form.setFieldsValue({ sprintId: newSprint.id });
            message.success(`Đã tạo sprint "${newSprint.name}"`);
            setSprintCreateOpen(false);
            sprintCreateForm.resetFields();
          } catch (err) {
            message.error((err as ApiError).message || 'Tạo sprint thất bại');
          } finally {
            setSprintCreateLoading(false);
          }
        }}>
          <Form.Item name="name" label="Tên Sprint" rules={[
            { required: true, message: 'Tên sprint là bắt buộc' },
            { max: 200, message: 'Tối đa 200 ký tự' },
          ]}>
            <Input placeholder="VD: Sprint 1" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả" rules={[{ max: 1000 }]}>
            <Input.TextArea rows={2} placeholder="Mô tả tùy chọn" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Unlock Modal */}
      <Modal
        title="Unlock Work Log"
        open={!!unlockModal}
        confirmLoading={unlockSubmitting}
        onCancel={() => { setUnlockModal(null); unlockForm.resetFields(); }}
        onOk={() => unlockForm.submit()}
        okText="Unlock"
      >
        <Typography.Paragraph type="secondary">Unlocking allows the employee to edit this work log again. Please provide a reason.</Typography.Paragraph>
        <Form form={unlockForm} layout="vertical" onFinish={(v: { reason: string }) => handleUnlock(unlockModal!, v.reason)}>
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
