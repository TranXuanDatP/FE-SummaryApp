import { Table, Button, Modal, Form, Input, Select, Tag, message, Popconfirm, Card, Typography, Empty, Alert } from 'antd';
import { PlusOutlined, StopOutlined, ReloadOutlined, UserOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import * as userApi from '../api/user';

export const UsersPage = () => {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  const fetch = async (p = page) => {
    setLoading(true);
    try {
      const res: any = await userApi.getUsers(p, 20);
      setData(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (err: any) {
      message.error(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [page]);

  const handleCreate = async (values: any) => {
    setCreating(true);
    try {
      await userApi.createUser(values);
      message.success('User created successfully');
      setModalOpen(false);
      form.resetFields();
      fetch();
    } catch (err: any) {
      if (err.status === 409) {
        form.setFields([{ name: 'email', errors: ['Email already exists'] }]);
      } else {
        message.error(err.message || 'Failed to create user');
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
    } catch (err: any) {
      message.error(err.message || 'Failed to deactivate user');
    }
  };

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (_: any, record: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.fullName}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.email}</div>
        </div>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      width: 120,
      filters: [
        { text: 'Manager', value: 'manager' },
        { text: 'Employee', value: 'employee' },
      ],
      onFilter: (value: any, record: any) => record.role === value,
      render: (r: string) => (
        <Tag color={r === 'manager' ? 'blue' : 'green'} icon={<UserOutlined />}>
          {r}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      width: 100,
      render: (v: boolean) => <Tag color={v ? 'success' : 'error'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Version',
      dataIndex: 'version',
      width: 80,
      align: 'center' as const,
    },
    {
      title: 'Action',
      width: 120,
      align: 'center' as const,
      render: (_: any, record: any) =>
        record.isActive ? (
          <Popconfirm
            title="Deactivate this user?"
            description="The user will not be able to login."
            onConfirm={() => handleDeactivate(record.id)}
            okText="Yes, deactivate"
            cancelText="Cancel"
          >
            <Button size="small" danger icon={<StopOutlined />}>Deactivate</Button>
          </Popconfirm>
        ) : (
          <Tag color="default">—</Tag>
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
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={creating}
        onOk={() => form.submit()}
        okText="Create"
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
              { value: 'employee', label: 'Employee' },
              { value: 'manager', label: 'Manager' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
