import { Card, Col, Row, Statistic, Typography, Table, Tag, Spin } from 'antd';
import { UserOutlined, ProjectOutlined, FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import * as userApi from '../api/user';
import * as projectApi from '../api/project';
import * as worklogApi from '../api/worklog';
import { useAuth } from '../contexts/AuthContext';

export const DashboardPage = () => {
  const [stats, setStats] = useState({ users: 0, projects: 0, workLogs: 0, rate: 0 });
  const [summary, setSummary] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  useEffect(() => {
    const now = dayjs();
    const m = now.month() + 1;
    const y = now.year();

    Promise.all([
      userApi.getUsers(1, 1).catch(() => ({ total: 0 })),
      projectApi.getProjects(1, 1).catch(() => ({ total: 0 })),
      worklogApi.getWorkLogs({ page: 1, limit: 1 }).catch(() => ({ total: 0 })),
      worklogApi.getSummary(m, y).catch(() => ({} as any)),
      worklogApi.getWorkLogs({ page: 1, limit: 5 }).catch(() => ({ data: [] })),
    ]).then(([u, p, w, s, recent]: any[]) => {
      setStats({
        users: u.total ?? 0,
        projects: p.total ?? 0,
        workLogs: w.total ?? 0,
        rate: Math.round((s.completionRate ?? 0) * 100),
      });
      setSummary(s);
      setRecentLogs(recent.data ?? []);
      setLoading(false);
    });
  }, []);

  const businessDays = summary?.totalBusinessDays ?? 0;
  const loggedDays = summary?.loggedDays ?? 0;
  const editableMissing = summary?.editableMissingDays ?? 0;

  const recentColumns = [
    {
      title: 'Date',
      dataIndex: 'executionDate',
      width: 100,
      render: (d: string) => d ? dayjs(d).format('DD/MM') : '—',
    },
    ...(isManager ? [{
      title: 'Employee',
      dataIndex: 'employeeName',
      width: 120,
    }] : []),
    {
      title: 'Content',
      dataIndex: 'content',
      ellipsis: true,
    },
    {
      title: 'Project',
      dataIndex: 'projectName',
      width: 120,
      render: (name: string) => name || <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'Status',
      width: 90,
      render: (_: any, record: any) => {
        if (record.isUnlocked) return <Tag color="orange">Unlocked</Tag>;
        if (record.isEditable) return <Tag color="success">Editable</Tag>;
        return <Tag color="default">Locked</Tag>;
      },
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>Dashboard</Typography.Title>

      {loading ? <Spin size="large" /> : (
        <>
          {/* Top Stats */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}><Card hoverable><Statistic title="Users" value={stats.users} prefix={<UserOutlined />} /></Card></Col>
            <Col span={6}><Card hoverable><Statistic title="Projects" value={stats.projects} prefix={<ProjectOutlined />} /></Card></Col>
            <Col span={6}><Card hoverable><Statistic title="Work Logs" value={stats.workLogs} prefix={<FileTextOutlined />} /></Card></Col>
            <Col span={6}><Card hoverable><Statistic title="This Month" value={stats.rate} suffix="%" prefix={<CheckCircleOutlined />} /></Card></Col>
          </Row>

          {/* Monthly Detail */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card>
                <Statistic title="Business Days" value={businessDays} prefix={<ClockCircleOutlined />} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Logged Days"
                  value={loggedDays}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Missing (Editable)"
                  value={editableMissing}
                  prefix={<WarningOutlined />}
                  valueStyle={{ color: editableMissing > 0 ? '#faad14' : '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Recent Work Logs */}
          <Card title="Recent Work Logs" size="small">
            <Table
              rowKey="id"
              columns={recentColumns}
              dataSource={recentLogs}
              size="small"
              pagination={false}
              locale={{ emptyText: 'No recent work logs' }}
            />
          </Card>
        </>
      )}
    </div>
  );
};
