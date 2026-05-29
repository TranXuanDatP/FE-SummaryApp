import { Card, Row, Col, Avatar, Typography, Progress, Tag, DatePicker, Button, Space, Input, Empty, Spin, message } from 'antd';
import { UserOutlined, TeamOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import * as userApi from '../api/user';
import * as reportApi from '../api/report';
import type { EmployeeListItemDto, ApiError } from '../types/api';
import { EmployeeDetailDrawer } from '../components/EmployeeDetailDrawer';

export const TeamPage = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<EmployeeListItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(dayjs().month() + 1);
  const [year, setYear] = useState(dayjs().year());

  const selectedEmployee = employeeId
    ? employees.find((e) => e.id === employeeId) ?? null
    : null;

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userApi.getEmployees({ month, year });
      setEmployees(res as unknown as EmployeeListItemDto[]);
    } catch (err) {
      message.error((err as ApiError).message || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const blob = await reportApi.exportMonthlyReport({ month, year });
      const url = window.URL.createObjectURL(new Blob([blob as any]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `BaoCao_Thang${String(month).padStart(2, '0')}_${year}_All.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success('Đã tải Excel');
    } catch {
      message.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const openEmployee = (id: string) => navigate(`/team/${id}`);
  const closeEmployee = () => navigate('/team');

  const filtered = search
    ? employees.filter((e) => e.fullName.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase()))
    : employees;

  const getStatusColor = (rate: number) => rate >= 0.8 ? 'success' : rate >= 0.5 ? 'warning' : 'error';
  const getStatusLabel = (rate: number) => rate >= 0.8 ? 'On Track' : rate >= 0.5 ? 'At Risk' : 'Behind';
  const getProgressColor = (rate: number) => rate >= 0.8 ? '#52c41a' : rate >= 0.5 ? '#faad14' : '#ff4d4f';

  if (loading && employees.length === 0) {
    return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            <TeamOutlined /> Team Overview
          </Typography.Title>
          <Typography.Text type="secondary">
            {employees.length} employees — {dayjs().month(month - 1).format('MMMM')} {year}
          </Typography.Text>
        </div>
        <Space>
          <Input.Search
            placeholder="Search employees..."
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220 }}
          />
          <DatePicker
            picker="month"
            defaultValue={dayjs()}
            onChange={(d) => {
              if (d) {
                setMonth(d.month() + 1);
                setYear(d.year());
              }
            }}
            format="MMMM YYYY"
          />
          <Button icon={<ReloadOutlined />} onClick={() => fetch()}>Refresh</Button>
          <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExportAll}>
            Export All
          </Button>
        </Space>
      </div>

      {filtered.length === 0 ? (
        <Empty description={search ? `No employees matching "${search}"` : 'No employees found'} />
      ) : (
        <Row gutter={[16, 16]}>
          {filtered.map((emp) => {
            const pct = Math.round(emp.completionRate * 100);
            return (
              <Col key={emp.id} xs={24} sm={12} lg={8} xl={6}>
                <Card
                  hoverable
                  onClick={() => openEmployee(emp.id)}
                  styles={{ body: { padding: 20 } }}
                  style={{ borderLeft: `3px solid ${getProgressColor(emp.completionRate)}` }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <Avatar size={40} icon={<UserOutlined />} style={{ backgroundColor: getProgressColor(emp.completionRate) }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Typography.Text strong style={{ fontSize: 14, display: 'block' }} ellipsis>
                        {emp.fullName}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{emp.email}</Typography.Text>
                    </div>
                  </div>
                  <Progress
                    percent={pct}
                    size="small"
                    strokeColor={getProgressColor(emp.completionRate)}
                    format={() => `${pct}%`}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {emp.loggedDays}/{emp.totalBusinessDays} days
                    </Typography.Text>
                    <Tag color={getStatusColor(emp.completionRate)} style={{ margin: 0 }}>
                      {getStatusLabel(emp.completionRate)}
                    </Tag>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <EmployeeDetailDrawer
        open={!!selectedEmployee}
        employee={selectedEmployee}
        month={month}
        year={year}
        onClose={closeEmployee}
      />
    </div>
  );
};
