import { Table, Button, Modal, Form, Input, Select, message, Space, Card, Typography, Empty, Alert, Popconfirm, Drawer, Tag, DatePicker, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, MergeCellsOutlined, DeleteOutlined, ReloadOutlined, FolderOutlined } from '@ant-design/icons';
import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import * as projectApi from '../api/project';
import * as sprintApi from '../api/sprint';
import type { ProjectDto, SprintDto, ApiError } from '../types/api';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmDirtyClose } from '../hooks/useConfirmDirtyClose';

export const ProjectsPage = () => {
  const [data, setData] = useState<ProjectDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ProjectDto | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<ProjectDto | null>(null);
  const [mergeSubmitting, setMergeSubmitting] = useState(false);
  const [mergeForm] = Form.useForm();

  // Sprint management
  const [sprintDrawerOpen, setSprintDrawerOpen] = useState(false);
  const [sprintProject, setSprintProject] = useState<ProjectDto | null>(null);
  const [sprints, setSprints] = useState<SprintDto[]>([]);
  const [sprintsLoading, setSprintsLoading] = useState(false);
  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [editSprint, setEditSprint] = useState<SprintDto | null>(null);
  const [sprintSubmitting, setSprintSubmitting] = useState(false);
  const [sprintForm] = Form.useForm();

  const { user } = useAuth();
  const isManager = user?.role === 'manager';
  const confirmDirtyClose = useConfirmDirtyClose();

  const fetch = useCallback(async (p = page, q = searchQ) => {
    setLoading(true);
    try {
      const res = q ? await projectApi.searchProjects(q, p, 20) : await projectApi.getProjects(p, 20);
      setData(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      message.error((err as ApiError).message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [page, searchQ]);

  useEffect(() => { fetch(); }, [fetch]);

  // Sprint fetching
  const fetchSprints = useCallback(async () => {
    if (!sprintProject) return;
    setSprintsLoading(true);
    try {
      const res = await sprintApi.getSprints(sprintProject.id);
      setSprints(Array.isArray(res) ? res : []);
    } catch {
      setSprints([]);
      message.error('Không thể tải sprint');
    } finally {
      setSprintsLoading(false);
    }
  }, [sprintProject]);

  useEffect(() => {
    if (sprintDrawerOpen && sprintProject) fetchSprints();
  }, [sprintDrawerOpen, sprintProject, fetchSprints]);

  // Project CRUD
  const handleSubmit = async (values: { name: string; description?: string }) => {
    setSubmitting(true);
    try {
      if (editItem) { await projectApi.updateProject(editItem.id, values); message.success('Project updated'); }
      else { await projectApi.createProject(values); message.success('Project created'); }
      setModalOpen(false); setEditItem(null); form.resetFields(); fetch();
    } catch (err) {
      if ((err as ApiError).status === 409) form.setFields([{ name: 'name', errors: ['Project name already exists'] }]);
      else message.error((err as ApiError).message || 'Thao tác thất bại');
    } finally { setSubmitting(false); }
  };

  const openCreate = () => { setEditItem(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (record: ProjectDto) => { setEditItem(record); form.setFieldsValue({ name: record.name, description: record.description }); setModalOpen(true); };
  const openMerge = (record: ProjectDto) => { setMergeTarget(record); mergeForm.resetFields(); setMergeModalOpen(true); };
  const openSprints = (record: ProjectDto) => { setSprintProject(record); setSprintDrawerOpen(true); };

  const handleMerge = async (values: { sourceIds: string[] }) => {
    setMergeSubmitting(true);
    try {
      await projectApi.mergeProjects(mergeTarget!.id, values.sourceIds);
      await Promise.all(values.sourceIds.map((id) => projectApi.deleteProject(id)));
      message.success(`Merged into "${mergeTarget!.name}" — ${values.sourceIds.length} project(s) removed`);
      setMergeModalOpen(false); setMergeTarget(null); mergeForm.resetFields(); fetch();
    } catch (err) { message.error((err as ApiError).message || 'Merge failed'); }
    finally { setMergeSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try { await projectApi.deleteProject(id); message.success('Project deleted'); fetch(); }
    catch (err) { message.error((err as ApiError).message || 'Failed to delete project'); }
  };

  // Sprint CRUD
  const openCreateSprint = () => { setEditSprint(null); sprintForm.resetFields(); setSprintModalOpen(true); };

  const openEditSprint = (sprint: SprintDto) => {
    setEditSprint(sprint);
    sprintForm.setFieldsValue({
      name: sprint.name, description: sprint.description,
      startDate: sprint.startDate ? dayjs(sprint.startDate) : undefined,
      endDate: sprint.endDate ? dayjs(sprint.endDate) : undefined,
      sortOrder: sprint.sortOrder,
    });
    setSprintModalOpen(true);
  };

  const handleSprintSubmit = async (values: { name: string; description?: string; startDate?: dayjs.Dayjs; endDate?: dayjs.Dayjs; sortOrder?: number }) => {
    setSprintSubmitting(true);
    try {
      const payload = { name: values.name, description: values.description, startDate: values.startDate?.toISOString(), endDate: values.endDate?.toISOString(), sortOrder: values.sortOrder ?? 0 };
      if (editSprint) { await sprintApi.updateSprint(editSprint.id, payload); message.success('Đã cập nhật sprint'); }
      else { await sprintApi.createSprint(sprintProject!.id, payload); message.success('Đã tạo sprint'); }
      setSprintModalOpen(false); setEditSprint(null); sprintForm.resetFields(); fetchSprints();
    } catch (err) { message.error((err as ApiError).message || 'Thao tác thất bại'); }
    finally { setSprintSubmitting(false); }
  };

  const handleDeleteSprint = async (id: string) => {
    try { await sprintApi.deleteSprint(id); message.success('Đã xóa sprint'); fetchSprints(); }
    catch { message.error('Xóa sprint thất bại'); }
  };

  const handleSprintStatusChange = async (id: string, status: 'planning' | 'in_progress' | 'completed') => {
    try { await sprintApi.updateSprintStatus(id, status); message.success('Đã cập nhật trạng thái'); fetchSprints(); }
    catch { message.error('Cập nhật trạng thái thất bại'); }
  };

  // Project table columns
  const columns = [
    {
      title: 'Tên', dataIndex: 'name',
      render: (name: string, record: ProjectDto) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          {record.description && <div style={{ fontSize: 12, color: '#999', maxWidth: 300 }} className="ant-typography-ellipsis">{record.description}</div>}
        </div>
      ),
    },
    { title: 'Phiên bản', dataIndex: 'version', width: 80, align: 'center' as const },
    { title: 'Cập nhật', dataIndex: 'updatedAt', width: 120, render: (d: string) => d ? new Date(d).toLocaleDateString() : '—' },
    {
      title: 'Thao tác', width: 320,
      render: (_: unknown, record: ProjectDto) => (
        <Space size={4}>
          <Button size="small" icon={<FolderOutlined />} onClick={() => openSprints(record)}>Sprints</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>Edit</Button>
          {isManager && record.status === 'active' && data.filter((p) => p.status === 'active' && p.id !== record.id).length > 0 && (
            <Button size="small" icon={<MergeCellsOutlined />} onClick={() => openMerge(record)}>Merge</Button>
          )}
          {isManager && (
            <Popconfirm title="Delete this project?" description="Associated work logs will also be soft-deleted." onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Cancel" okButtonProps={{ danger: true }}>
              <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // Sprint table columns (inside Drawer)
  const sprintColumns = [
    {
      title: 'Tên Sprint', dataIndex: 'name',
      render: (name: string, record: SprintDto) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          {record.description && <div style={{ fontSize: 12, color: '#999' }}>{record.description}</div>}
        </div>
      ),
    },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 130,
      render: (status: string, record: SprintDto) => (
        <Select value={status as SprintDto['status']} size="small" style={{ width: 120 }} onChange={(v: 'planning' | 'in_progress' | 'completed') => handleSprintStatusChange(record.id, v)} options={[
          { value: 'planning', label: <Tag color="default">Kế hoạch</Tag> },
          { value: 'in_progress', label: <Tag color="processing">Đang làm</Tag> },
          { value: 'completed', label: <Tag color="success">Hoàn thành</Tag> },
        ]} />
      ),
    },
    {
      title: 'Thời gian', width: 180,
      render: (_: unknown, record: SprintDto) => {
        if (!record.startDate && !record.endDate) return <Typography.Text type="secondary">—</Typography.Text>;
        return <Typography.Text style={{ fontSize: 12 }}>{record.startDate ? dayjs(record.startDate).format('DD/MM') : '?'} – {record.endDate ? dayjs(record.endDate).format('DD/MM/YYYY') : 'Hiện tại'}</Typography.Text>;
      },
    },
    {
      title: 'Thao tác', width: 120,
      render: (_: unknown, record: SprintDto) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditSprint(record)}>Sửa</Button>
          <Popconfirm title="Xóa sprint này?" onConfirm={() => handleDeleteSprint(record.id)} okText="Xóa">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
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
          <Input.Search placeholder="Search projects..." allowClear onSearch={(q) => { setSearchQ(q); setPage(1); fetch(1, q); }} onClear={() => { setSearchQ(''); setPage(1); fetch(1, ''); }} style={{ width: 280 }} />
          <Button icon={<ReloadOutlined />} onClick={() => fetch()}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Create Project</Button>
        </Space>
      </div>

      <Card>
        <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
          locale={{ emptyText: searchQ ? <Empty description={`Không có dự án matching "${searchQ}"`} /> : <Empty description="Không có dự án yet. Create your first project!" /> }}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: (t) => `${t} projects`, showSizeChanger: false }}
        />
      </Card>

      {/* Project Create/Edit Modal */}
      <Modal title={editItem ? 'Edit Project' : 'Create New Project'} open={modalOpen} confirmLoading={submitting}
        onCancel={() => confirmDirtyClose(form, () => { setModalOpen(false); setEditItem(null); form.resetFields(); })}
        onOk={() => form.submit()} okText={editItem ? 'Update' : 'Create'}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Project Name" rules={[{ required: true, message: 'Project name is required' }, { max: 200 }]}>
            <Input placeholder="e.g. Website Redesign" />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ max: 1000 }]}>
            <Input.TextArea rows={3} placeholder="Optional project description" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Merge Modal */}
      <Modal title={`Merge into "${mergeTarget?.name ?? ''}"`} open={mergeModalOpen} confirmLoading={mergeSubmitting}
        onCancel={() => confirmDirtyClose(mergeForm, () => { setMergeModalOpen(false); setMergeTarget(null); mergeForm.resetFields(); })}
        onOk={() => mergeForm.submit()} okText="Merge">
        <Alert message="Select projects to merge into the target. Selected projects will be marked as 'merged' and their work logs will be reassigned." type="info" showIcon style={{ marginBottom: 16 }} />
        <Form form={mergeForm} layout="vertical" onFinish={handleMerge}>
          <Form.Item name="sourceIds" label="Source Projects" rules={[{ required: true, message: 'Select at least one project to merge' }]}>
            <Select mode="multiple" placeholder="Select projects to merge" options={activeProjects.map((p) => ({ value: p.id, label: p.name }))} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Sprint Management Drawer */}
      <Drawer title={<Space><FolderOutlined /> Sprints — {sprintProject?.name}</Space>} open={sprintDrawerOpen}
        onClose={() => { setSprintDrawerOpen(false); setSprintProject(null); setSprints([]); }} width={700}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography.Text type="secondary">{sprints.length} sprint(s)</Typography.Text>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateSprint}>Tạo Sprint</Button>
        </div>
        <Table rowKey="id" columns={sprintColumns} dataSource={sprints} loading={sprintsLoading} size="small" pagination={false}
          locale={{ emptyText: <Empty description="Chưa có sprint. Tạo sprint đầu tiên!" /> }} />

        {/* Sprint Create/Edit Modal */}
        <Modal title={editSprint ? 'Sửa Sprint' : 'Tạo Sprint mới'} open={sprintModalOpen} confirmLoading={sprintSubmitting}
          onCancel={() => { setSprintModalOpen(false); setEditSprint(null); sprintForm.resetFields(); }}
          onOk={() => sprintForm.submit()} okText={editSprint ? 'Cập nhật' : 'Tạo'}>
          <Form form={sprintForm} layout="vertical" onFinish={handleSprintSubmit}>
            <Form.Item name="name" label="Tên Sprint" rules={[{ required: true, message: 'Tên sprint là bắt buộc' }, { max: 200 }]}>
              <Input placeholder="VD: Sprint 1 - Xử lý ảnh" />
            </Form.Item>
            <Form.Item name="description" label="Mô tả" rules={[{ max: 1000 }]}>
              <Input.TextArea rows={2} placeholder="Mô tả tùy chọn" />
            </Form.Item>
            <Space style={{ width: '100%' }} size={16}>
              <Form.Item name="startDate" label="Ngày bắt đầu"><DatePicker format="DD/MM/YYYY" /></Form.Item>
              <Form.Item name="endDate" label="Ngày kết thúc"><DatePicker format="DD/MM/YYYY" /></Form.Item>
              <Form.Item name="sortOrder" label="Thứ tự"><InputNumber min={0} style={{ width: 80 }} /></Form.Item>
            </Space>
          </Form>
        </Modal>
      </Drawer>
    </div>
  );
};
