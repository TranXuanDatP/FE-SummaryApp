import { Table, Button, Modal, Form, Input, Select, message, Space, Card, Typography, Tag, Empty, Alert } from 'antd';
import { PlusOutlined, EditOutlined, MergeCellsOutlined, ReloadOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import * as projectApi from '../api/project';
import { useAuth } from '../contexts/AuthContext';

export const ProjectsPage = () => {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [searchQ, setSearchQ] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Merge modal state
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<any>(null);
  const [mergeSubmitting, setMergeSubmitting] = useState(false);
  const [mergeForm] = Form.useForm();

  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  const fetch = async (p = page, q = searchQ) => {
    setLoading(true);
    try {
      const res: any = q
        ? await projectApi.searchProjects(q, p, 20)
        : await projectApi.getProjects(p, 20);
      setData(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (err: any) {
      message.error(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [page]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editItem) {
        await projectApi.updateProject(editItem.id, values);
        message.success('Project updated');
      } else {
        await projectApi.createProject(values);
        message.success('Project created');
      }
      setModalOpen(false);
      setEditItem(null);
      form.resetFields();
      fetch();
    } catch (err: any) {
      if (err.status === 409) {
        form.setFields([{ name: 'name', errors: ['Project name already exists'] }]);
      } else {
        message.error(err.message || 'Operation failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openCreate = () => {
    setEditItem(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: any) => {
    setEditItem(record);
    form.setFieldsValue({ name: record.name, description: record.description });
    setModalOpen(true);
  };

  const openMerge = (record: any) => {
    setMergeTarget(record);
    mergeForm.resetFields();
    setMergeModalOpen(true);
  };

  const handleMerge = async (values: any) => {
    setMergeSubmitting(true);
    try {
      await projectApi.mergeProjects(mergeTarget.id, values.sourceIds);
      message.success(`Merged into "${mergeTarget.name}" successfully`);
      setMergeModalOpen(false);
      setMergeTarget(null);
      mergeForm.resetFields();
      fetch();
    } catch (err: any) {
      message.error(err.message || 'Merge failed');
    } finally {
      setMergeSubmitting(false);
    }
  };

  const statusColors: Record<string, string> = {
    active: 'success',
    inactive: 'default',
    merged: 'warning',
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      render: (name: string, record: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          {record.description && (
            <div style={{ fontSize: 12, color: '#999', maxWidth: 300 }} className="ant-typography-ellipsis">{record.description}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => <Tag color={statusColors[s] || 'default'}>{s}</Tag>,
    },
    {
      title: 'Version',
      dataIndex: 'version',
      width: 80,
      align: 'center' as const,
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      width: 120,
      render: (d: string) => d ? new Date(d).toLocaleDateString() : '—',
    },
    {
      title: 'Action',
      width: 200,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>Edit</Button>
          {isManager && record.status === 'active' && data.filter((p) => p.status === 'active' && p.id !== record.id).length > 0 && (
            <Button size="small" icon={<MergeCellsOutlined />} onClick={() => openMerge(record)}>Merge</Button>
          )}
        </Space>
      ),
    },
  ];

  const activeProjects = data.filter((p) => p.status === 'active' && p.id !== mergeTarget?.id);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>Projects</Typography.Title>
          <Typography.Text type="secondary">{searchQ ? `Search: "${searchQ}"` : `${total} projects`}</Typography.Text>
        </div>
        <Space>
          <Input.Search
            placeholder="Search projects..."
            allowClear
            onSearch={(q) => { setSearchQ(q); setPage(1); fetch(1, q); }}
            onClear={() => { setSearchQ(''); setPage(1); fetch(1, ''); }}
            style={{ width: 280 }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => fetch()}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Create Project
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          locale={{ emptyText: searchQ
            ? <Empty description={`No projects matching "${searchQ}"`} />
            : <Empty description="No projects yet. Create your first project!" />
          }}
          pagination={{
            current: page,
            total,
            pageSize: 20,
            onChange: setPage,
            showTotal: (t) => `${t} projects`,
            showSizeChanger: false,
          }}
        />
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        title={editItem ? 'Edit Project' : 'Create New Project'}
        open={modalOpen}
        confirmLoading={submitting}
        onCancel={() => { setModalOpen(false); setEditItem(null); form.resetFields(); }}
        onOk={() => form.submit()}
        okText={editItem ? 'Update' : 'Create'}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Project Name" rules={[
            { required: true, message: 'Project name is required' },
            { max: 200, message: 'Name cannot exceed 200 characters' },
          ]}>
            <Input placeholder="e.g. Website Redesign" />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[
            { max: 1000, message: 'Description cannot exceed 1000 characters' },
          ]}>
            <Input.TextArea rows={3} placeholder="Optional project description" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Merge Modal */}
      <Modal
        title={`Merge into "${mergeTarget?.name ?? ''}"`}
        open={mergeModalOpen}
        confirmLoading={mergeSubmitting}
        onCancel={() => { setMergeModalOpen(false); setMergeTarget(null); mergeForm.resetFields(); }}
        onOk={() => mergeForm.submit()}
        okText="Merge"
      >
        <Alert
          message="Select projects to merge into the target. Selected projects will be marked as 'merged' and their work logs will be reassigned."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={mergeForm} layout="vertical" onFinish={handleMerge}>
          <Form.Item name="sourceIds" label="Source Projects" rules={[
            { required: true, message: 'Select at least one project to merge' },
          ]}>
            <Select
              mode="multiple"
              placeholder="Select projects to merge"
              options={activeProjects.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
