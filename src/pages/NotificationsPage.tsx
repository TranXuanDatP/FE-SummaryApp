import { Table, Button, Tag, Switch, message, Card, Typography, Empty, Space, Tabs, Badge } from 'antd';
import { CheckOutlined, BellOutlined, SettingOutlined } from '@ant-design/icons';
import { useState, useEffect, useCallback } from 'react';
import * as notifApi from '../api/notification';
import type { NotificationDto, NotificationPreferenceDto, ApiError } from '../types/api';

export const NotificationsPage = () => {
  const [data, setData] = useState<NotificationDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferenceDto[]>([]);
  const [activeTab, setActiveTab] = useState('list');

  const fetchNotifications = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await notifApi.getNotifications(p, 20);
      setData(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      message.error((err as ApiError).message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await notifApi.getPreferences();
      setPrefs(Array.isArray(res) ? res : []);
    } catch { /* ignored */ }
  }, []);

  useEffect(() => { fetchNotifications(); fetchPrefs(); }, [fetchNotifications, fetchPrefs]);

  const handleMarkRead = async (id: string) => {
    try {
      await notifApi.markRead(id);
      message.success('Marked as read');
      fetchNotifications();
    } catch (err) {
      message.error((err as ApiError).message || 'Failed');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notifApi.markAllRead();
      message.success('All notifications marked as read');
      fetchNotifications();
    } catch (err) {
      message.error((err as ApiError).message || 'Failed');
    }
  };

  const handleTogglePref = async (type: string, channel: string, enabled: boolean) => {
    try {
      await notifApi.updatePreferences([{ type, channel, enabled }]);
      message.success('Preference updated');
      fetchPrefs();
    } catch (err) {
      message.error((err as ApiError).message || 'Failed to update');
    }
  };

  const unreadCount = data.filter((n) => !n.isRead).length;

  const columns = [
    {
      title: 'Status',
      dataIndex: 'isRead',
      width: 70,
      render: (v: boolean) => v
        ? <Tag color="default">Read</Tag>
        : <Badge dot><Tag color="blue">New</Tag></Badge>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      width: 140,
      render: (t: string) => <Tag>{t}</Tag>,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      render: (title: string, record: NotificationDto) => (
        <div>
          <div style={{ fontWeight: record.isRead ? 400 : 600 }}>{title}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.content}</div>
        </div>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'createdAt',
      width: 150,
      render: (d: string) => new Date(d).toLocaleString(),
    },
    {
      title: 'Action',
      width: 100,
      render: (_: unknown, record: NotificationDto) =>
        !record.isRead ? (
          <Button size="small" type="link" icon={<CheckOutlined />} onClick={() => handleMarkRead(record.id)}>
            Mark read
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            <BellOutlined /> Notifications
          </Typography.Title>
          <Typography.Text type="secondary">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </Typography.Text>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllRead}>Mark All Read</Button>
        )}
      </div>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          {
            key: 'list',
            label: (
              <Space>
                <span>All</span>
                {unreadCount > 0 && <Badge count={unreadCount} size="small" />}
              </Space>
            ),
            children: (
              <Table
                rowKey="id"
                columns={columns}
                dataSource={data}
                loading={loading}
                locale={{ emptyText: <Empty description="No notifications" /> }}
                pagination={{
                  current: page,
                  total,
                  pageSize: 20,
                  onChange: setPage,
                  showTotal: (t) => `${t} notifications`,
                }}
              />
            ),
          },
          {
            key: 'prefs',
            label: <Space><SettingOutlined /> Preferences</Space>,
            children: (
              <div>
                <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
                  Control which notifications you receive and through which channel.
                </Typography.Paragraph>
                {prefs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {prefs.map((p) => (
                      <Card key={p.id} size="small" style={{ background: '#fafafa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <Typography.Text strong>{p.type}</Typography.Text>
                            <br />
                            <Tag>{p.channel}</Tag>
                          </div>
                          <Switch checked={p.enabled} onChange={(v) => handleTogglePref(p.type, p.channel, v)} />
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Empty description="No notification preferences configured" />
                )}
              </div>
            ),
          },
        ]} />
      </Card>
    </div>
  );
};
