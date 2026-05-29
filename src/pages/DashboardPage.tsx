import { Card, Col, Row, Statistic, Typography, Table, Tag, Spin, Progress, Space } from 'antd';
import { UserOutlined, ProjectOutlined, FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import * as userApi from '../api/user';
import * as projectApi from '../api/project';
import * as worklogApi from '../api/worklog';
import { useAuth } from '../contexts/AuthContext';
import type { WorkLogDto, SummaryDto } from '../types/api';

export const DashboardPage = () => {
  const [stats, setStats] = useState({ users: 0, projects: 0, workLogs: 0, rate: 0 });
  const [summary, setSummary] = useState<SummaryDto | null>(null);
  const [recentLogs, setRecentLogs] = useState<WorkLogDto[]>([]);
  const [projectBreakdown, setProjectBreakdown] = useState<{ name: string; count: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  useEffect(() => {
    const now = dayjs();
    const m = now.month() + 1;
    const y = now.year();

    Promise.all([
      userApi.getUsers(1, 1).catch(() => ({ total: 0, data: [], page: 1, totalPages: 0 })),
      projectApi.getProjects(1, 1).catch(() => ({ total: 0, data: [], page: 1, totalPages: 0 })),
      worklogApi.getWorkLogs({ page: 1, limit: 1 }).catch(() => ({ total: 0, data: [], page: 1, totalPages: 0 })),
      worklogApi.getSummary(m, y).catch(() => ({ completionRate: 0, totalBusinessDays: 0, loggedDays: 0, editableMissingDays: 0 })),
      worklogApi.getWorkLogs({ page: 1, limit: 5 }).catch(() => ({ data: [], total: 0, page: 1, totalPages: 0 })),
      worklogApi.getWorkLogs({ page: 1, limit: 100 }).catch(() => ({ data: [], total: 0, page: 1, totalPages: 0 })),
    ]).then(([u, p, w, s, recent, allLogs]) => {
      setStats({
        users: u.total ?? 0,
        projects: p.total ?? 0,
        workLogs: w.total ?? 0,
        rate: Math.round((s.completionRate ?? 0) * 100),
      });
      setSummary(s);
      setRecentLogs(recent.data ?? []);

      // Build project breakdown from all logs
      const colorPool = ['#1677ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#13c2c2', '#fa541c', '#2f54eb'];
      const map = new Map<string, number>();
      for (const wl of allLogs.data ?? []) {
        const name = wl.projectName || '(No Project)';
        map.set(name, (map.get(name) ?? 0) + 1);
      }
      const breakdown = Array.from(map.entries())
        .map(([name, count], i) => ({ name, count, color: colorPool[i % colorPool.length] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      setProjectBreakdown(breakdown);

      setLoading(false);
    });
  }, []);

  const businessDays = summary?.totalBusinessDays ?? 0;
  const loggedDays = summary?.loggedDays ?? 0;
  const editableMissing = summary?.editableMissingDays ?? 0;
  const completionPct = businessDays > 0 ? Math.round((loggedDays / businessDays) * 100) : 0;
  const totalBreakdown = projectBreakdown.reduce((s, p) => s + p.count, 0) || 1;

  const recentColumns = [
    {
      title: 'Ngày',
      dataIndex: 'executionDate',
      width: 100,
      render: (d: string) => d ? dayjs(d).format('DD/MM') : '—',
    },
    ...(isManager ? [{
      title: 'Nhân viên',
      dataIndex: 'employeeName',
      width: 120,
    }] : []),
    {
      title: 'Nội dung',
      dataIndex: 'content',
      ellipsis: true,
    },
    {
      title: 'Dự án',
      dataIndex: 'projectName',
      width: 120,
      render: (name: string) => name || <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'Trạng thái',
      width: 90,
      render: (_: unknown, record: WorkLogDto) => {
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
          {/* Top stats */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}><Card hoverable><Statistic title="Người dùng" value={stats.users} prefix={<UserOutlined />} /></Card></Col>
            <Col span={6}><Card hoverable><Statistic title="Dự án" value={stats.projects} prefix={<ProjectOutlined />} /></Card></Col>
            <Col span={6}><Card hoverable><Statistic title="Báo cáo CV" value={stats.workLogs} prefix={<FileTextOutlined />} /></Card></Col>
            <Col span={6}><Card hoverable><Statistic title="Tháng này" value={stats.rate} suffix="%" prefix={<CheckCircleOutlined />} /></Card></Col>
          </Row>

          {/* Monthly detail */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card>
                <Statistic title="Ngày làm việc" value={businessDays} prefix={<ClockCircleOutlined />} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="Ngày đã ghi" value={loggedDays} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="Chưa ghi (Còn sửa được)" value={editableMissing} prefix={<WarningOutlined />} valueStyle={{ color: editableMissing > 0 ? '#faad14' : '#52c41a' }} />
              </Card>
            </Col>
          </Row>

          {/* Charts row */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Card title="Tỷ lệ hoàn thành tháng" size="small">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Progress
                    type="circle"
                    percent={completionPct}
                    size={120}
                    strokeColor={completionPct >= 80 ? '#52c41a' : completionPct >= 50 ? '#faad14' : '#ff4d4f'}
                    format={(pct) => <span style={{ fontSize: 24, fontWeight: 600 }}>{pct}%</span>}
                  />
                  <div style={{ flex: 1 }}>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Typography.Text type="secondary">Logged</Typography.Text>
                          <Typography.Text strong>{loggedDays}/{businessDays}</Typography.Text>
                        </div>
                        <Progress percent={businessDays > 0 ? (loggedDays / businessDays) * 100 : 0} showInfo={false} strokeColor="#52c41a" size="small" />
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Typography.Text type="secondary">Missing</Typography.Text>
                          <Typography.Text strong type="warning">{editableMissing}</Typography.Text>
                        </div>
                        <Progress percent={businessDays > 0 ? (editableMissing / businessDays) * 100 : 0} showInfo={false} strokeColor="#faad14" size="small" />
                      </div>
                    </Space>
                  </div>
                </div>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Theo dự án" size="small">
                {projectBreakdown.length === 0 ? (
                  <Typography.Text type="secondary">No data yet</Typography.Text>
                ) : (
                  <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    {projectBreakdown.map((p) => (
                      <div key={p.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <Typography.Text style={{ fontSize: 13 }}>{p.name}</Typography.Text>
                          <Typography.Text strong style={{ fontSize: 13 }}>{p.count}</Typography.Text>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, background: '#f0f0f0', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${(p.count / totalBreakdown) * 100}%`,
                            background: p.color,
                            borderRadius: 4,
                            transition: 'width 0.3s',
                          }} />
                        </div>
                      </div>
                    ))}
                  </Space>
                )}
              </Card>
            </Col>
          </Row>

          {/* Recent logs */}
          <Card title="Báo cáo CV gần đây" size="small">
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
