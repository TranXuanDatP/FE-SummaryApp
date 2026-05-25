import { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Space } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import type { ApiError } from '../types/api';

export const LoginPage = () => {
  const { loginAction } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError('');
    try {
      await loginAction(values.email, values.password);
    } catch (err) {
      setError((err as ApiError).message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card style={{ width: 420, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', borderRadius: 8 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Typography.Title level={2} style={{ margin: 0, color: '#1677ff' }}>
            Summary
          </Typography.Title>
          <Typography.Text type="secondary">Work Log Management System</Typography.Text>
        </div>

        {error && (
          <Alert message={error} type="error" showIcon closable onClose={() => setError('')} style={{ marginBottom: 16 }} />
        )}

        <Form onFinish={onFinish} size="large" autoComplete="off">
          <Form.Item name="email" rules={[
            { required: true, message: 'Please enter your email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}>
            <Input prefix={<MailOutlined />} placeholder="Email" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Please enter your password' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, marginTop: 8 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Test accounts:
          </Typography.Text>
          <Space direction="vertical" size={4} style={{ display: 'flex', marginTop: 8 }}>
            <Typography.Text code style={{ fontSize: 12 }}>manager@test.com / password123</Typography.Text>
            <Typography.Text code style={{ fontSize: 12 }}>emp@test.com / password123</Typography.Text>
          </Space>
        </div>
      </Card>
    </div>
  );
};
