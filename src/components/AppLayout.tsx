import { useState, useEffect, useCallback } from 'react';
import { Layout, Menu, Button, Typography, theme, Avatar, Dropdown, Tag, Badge, Input, Modal } from 'antd';
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
  TeamOutlined,
  SearchOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import * as notifApi from '../api/notification';
import type { NotificationDto } from '../types/api';

const { Header, Sider, Content } = Layout;

const allMenuItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Trang chủ', managerOnly: false },
  { key: '/team', icon: <TeamOutlined />, label: 'Đội ngũ', managerOnly: true },
  { key: '/users', icon: <UserOutlined />, label: 'Người dùng', managerOnly: true },
  { key: '/projects', icon: <ProjectOutlined />, label: 'Dự án', managerOnly: false },
  { key: '/work-logs', icon: <FileTextOutlined />, label: 'Báo cáo CV', managerOnly: false },
  { key: '/calendar', icon: <CalendarOutlined />, label: 'Lịch', managerOnly: false },
  { key: '/comments', icon: <CommentOutlined />, label: 'Bình luận', managerOnly: false },
  { key: '/notifications', icon: <BellOutlined />, label: 'Thông báo', managerOnly: false },
  { key: '/reports', icon: <BarChartOutlined />, label: 'Báo cáo', managerOnly: false },
];

const searchOptions = [
  { key: '/users', label: 'Người dùng', category: 'Trang' },
  { key: '/projects', label: 'Dự án', category: 'Trang' },
  { key: '/work-logs', label: 'Báo cáo Công việc', category: 'Trang' },
  { key: '/calendar', label: 'Lịch', category: 'Trang' },
  { key: '/comments', label: 'Bình luận', category: 'Trang' },
  { key: '/notifications', label: 'Thông báo', category: 'Trang' },
  { key: '/reports', label: 'Báo cáo', category: 'Trang' },
];

export const AppLayout = () => {
  const { user, logoutAction } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { token: { colorBgContainer, colorPrimary, colorBorderSecondary } } = theme.useToken();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const isManager = user?.role === 'manager';

  const menuItems = allMenuItems
    .filter((item) => !item.managerOnly || isManager)
    .map((item) =>
      item.key === '/notifications' && unreadCount > 0
        ? { ...item, label: <Badge count={unreadCount} size="small" offset={[8, 0]}>Thông báo</Badge> }
        : item,
    );

  const dropdownItems = [
    {
      key: 'theme',
      icon: isDark ? <SunOutlined /> : <MoonOutlined />,
      label: isDark ? 'Chế độ Sáng' : 'Chế độ Tối',
      onClick: toggleTheme,
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: logoutAction,
    },
  ];

  // Fetch unread count
  const fetchUnread = useCallback(async () => {
    try {
      const res = await notifApi.getNotifications(1, 100);
      const count = (res.data ?? []).filter((n: NotificationDto) => !n.isRead).length;
      setUnreadCount(count);
    } catch { /* ignored */ }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filteredOptions = searchText
    ? searchOptions.filter((o) => o.label.toLowerCase().includes(searchText.toLowerCase()))
    : searchOptions;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={220}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme={isDark ? 'dark' : 'light'}
        style={{ borderRight: `1px solid ${colorBorderSecondary}` }}
        breakpoint="lg"
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 24px',
          borderBottom: `1px solid ${colorBorderSecondary}`,
        }}>
          <Typography.Title level={4} style={{ margin: 0, color: colorPrimary, whiteSpace: 'nowrap' }}>
            {collapsed ? 'S' : 'Summary'}
          </Typography.Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[menuItems.some((m) => location.pathname.startsWith(m.key) && m.key !== '/') ? '/' + location.pathname.split('/')[1] : location.pathname]}
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
          gap: 12,
          borderBottom: `1px solid ${colorBorderSecondary}`,
          height: 64,
        }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm kiếm... (Ctrl+K)"
            style={{ width: 220 }}
            readOnly
            onClick={() => setSearchOpen(true)}
          />
          <Button
            type="text"
            icon={isDark ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggleTheme}
          />
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

      <Modal
        title="Điều hướng nhanh"
        open={searchOpen}
        onCancel={() => { setSearchOpen(false); setSearchText(''); }}
        footer={null}
        width={480}
        styles={{ body: { padding: '12px 0' } }}
      >
        <div style={{ padding: '0 16px 12px' }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm trang..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            autoFocus
            size="large"
          />
        </div>
        <Menu
          mode="inline"
          items={filteredOptions.map((o) => ({ key: o.key, label: o.label }))}
          onClick={({ key }) => {
            navigate(key);
            setSearchOpen(false);
            setSearchText('');
          }}
          style={{ borderRight: 0 }}
        />
      </Modal>
    </Layout>
  );
};
