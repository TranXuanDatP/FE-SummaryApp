import { useState } from 'react';
import { Layout, Menu, Button, Typography, theme, Avatar, Dropdown, Tag } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ProjectOutlined,
  FileTextOutlined,
  CalendarOutlined,
  CommentOutlined,
  BellOutlined,
  BarChartOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/users', icon: <UserOutlined />, label: 'Users' },
  { key: '/projects', icon: <ProjectOutlined />, label: 'Projects' },
  { key: '/work-logs', icon: <FileTextOutlined />, label: 'Work Logs' },
  { key: '/calendar', icon: <CalendarOutlined />, label: 'Calendar' },
  { key: '/comments', icon: <CommentOutlined />, label: 'Comments' },
  { key: '/notifications', icon: <BellOutlined />, label: 'Notifications' },
  { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
];

export const AppLayout = () => {
  const { user, logoutAction } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { token: { colorBgContainer, colorPrimary } } = theme.useToken();
  const [collapsed, setCollapsed] = useState(false);

  const dropdownItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: logoutAction,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={220}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        style={{ borderRight: '1px solid #f0f0f0' }}
        breakpoint="lg"
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 24px',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <Typography.Title level={4} style={{ margin: 0, color: colorPrimary, whiteSpace: 'nowrap' }}>
            {collapsed ? 'S' : 'Summary'}
          </Typography.Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: colorBgContainer,
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 16,
          borderBottom: '1px solid #f0f0f0',
          height: 64,
        }}>
          <Tag color={user?.role === 'manager' ? 'blue' : 'green'}>{user?.role}</Tag>
          <Dropdown menu={{ items: dropdownItems }} placement="bottomRight">
            <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{user?.email}</span>
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
