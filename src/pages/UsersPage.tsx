import { Table, Button, Modal, Form, Input, Select, Tag, message, Popconfirm, Card, Typography, Empty, Alert, Space } from 'antd';
import { PlusOutlined, StopOutlined, DeleteOutlined, ReloadOutlined, UserOutlined } from '@ant-design/icons';
import { useState, useEffect, useCallback } from 'react';
import * as userApi from '../api/user';
import type { UserDto, ApiError } from '../types/api';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmDirtyClose } from '../hooks/useConfirmDirtyClose';

export const UsersPage = () => {
  const [data, setData] = useState<UserDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();
  const { user: currentUser } = useAuth();
  const isManager = currentUser?.role === 'manager';
  const confirmDirtyClose = useConfirmDirtyClose();

  const fetch = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await userApi.getUsers(p, 20);
      setData(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      message.error((err as ApiError).message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleCreate = async (values: { email: string; password: string; fullName: string; role: string }) => {
    setCreating(true);
    try {
      await userApi.createUser(values);
      message.success('User created successfully');
      setModalOpen(false);
      form.resetFields();
      fetch();
    } catch (err) {
      if ((err as ApiError).status === 409) {
        form.setFields([{ name: 'email', errors: ['Email already exists'] }]);
      } else {
        message.error((err as ApiError).message || 'Failed to create user');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await userApi.deactivateUser(id);
      message.success('User deactivated');
      fetch();
    } catch (err) {
      message.error((err as ApiError).message || 'Failed to deactivate user');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await userApi.deleteUser(id);
      message.success('User deleted');
      fetch();
    } catch (err) {
      message.error((err as ApiError).message || 'Failed to delete user');
    }
  };

  const columns = [
    {
      title: 'Người dùng',
      key: 'user',
      render: (_: unknown, record: UserDto) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.fullName}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.email}</div>
        </div>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      width: 120,
      filters: [
        { text: 'Manager', value: 'manager' },
        { text: 'Employee', value: 'employee' },
      ],
      onFilter: (value: unknown, record: UserDto) => record.role === value,
      render: (r: string) => (
        <Tag color={r === 'manager' ? 'blue' : 'green'} icon={<UserOutlined />}>
          {r}
        </Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      width: 100,
      render: (v: boolean) => <Tag color={v ? 'success' : 'error'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Phiên bản',
      dataIndex: 'version',
      width: 80,
      align: 'center' as const,
    },
    {
      title: 'Thao tác',
      width: 180,
      align: 'center' as const,
      render: (_: unknown, record: UserDto) => (
        <Space size={4}>
          {record.isActive && (
            <Popconfirm
              title="Deactivate this user?"
              description="The user will not be able to login."
              onConfirm={() => handleDeactivate(record.id)}
              okText="Yes, deactivate"
              cancelText="Cancel"
            >
              <Button size="small" danger icon={<StopOutlined />}>Deactivate</Button>
            </Popconfirm>
          )}
          {isManager && record.id !== currentUser?.userId && (
            <Popconfirm
              title="Delete this user permanently?"
              description="This action cannot be undone."
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
            </Popconfirm>
          )}
          {!record.isActive && !isManager && <Tag color="default">—</Tag>}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>Users</Typography.Title>
          <Typography.Text type="secondary">{total} total users</Typography.Text>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<ReloadOutlined />} onClick={() => fetch()}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Create User
          </Button>
        </div>
      </div>

      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          locale={{ emptyText: <Empty description="No users found" /> }}
          pagination={{
            current: page,
            total,
            pageSize: 20,
            onChange: setPage,
            showTotal: (t) => `${t} users`,
            showSizeChanger: false,
          }}
        />
      </Card>

      <Modal
        title="Create New User"
        open={modalOpen}
        onCancel={() => confirmDirtyClose(form, () => { setModalOpen(false); form.resetFields(); })}
        confirmLoading={creating}
        onOk={() => form.submit()}
        okText="Tạo"
      >
        <Alert
          message="The new user will be able to login immediately."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="email" label="Email" rules={[
            { required: true, message: 'Email is required' },
            { type: 'email', message: 'Invalid email format' },
            { max: 254, message: 'Email too long' },
          ]}>
            <Input placeholder="user@example.com" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[
            { required: true, message: 'Password is required' },
            { min: 8, message: 'At least 8 characters' },
            { max: 100, message: 'Password too long' },
          ]}>
            <Input.Password placeholder="Min 8 characters" />
          </Form.Item>
          <Form.Item name="fullName" label="Full Name" rules={[
            { required: true, message: 'Full name is required' },
            { max: 200, message: 'Name too long' },
          ]}>
            <Input placeholder="John Doe" />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true, message: 'Role is required' }]}>
            <Select placeholder="Select role" options={[
              { value: 'employee', label: 'Nhân viên' },
              { value: 'manager', label: 'Quản lý' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
