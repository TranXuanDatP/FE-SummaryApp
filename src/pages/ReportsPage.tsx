import { Table, DatePicker, Select, Button, Space, Card, Typography, Empty, Tag, message } from 'antd';
import { DownloadOutlined, FileExcelOutlined, ReloadOutlined } from '@ant-design/icons';
import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import * as reportApi from '../api/report';
import type { MonthlyReportRow } from '../api/report';
import * as userApi from '../api/user';
import type { UserDto } from '../types/api';
import * as projectApi from '../api/project';
import type { ProjectDto, ApiError } from '../types/api';
import { useAuth } from '../contexts/AuthContext';

export const ReportsPage = () => {
  const [data, setData] = useState<MonthlyReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [month, setMonth] = useState(dayjs().month() + 1);
  const [year, setYear] = useState(dayjs().year());
  const [filterEmployee, setFilterEmployee] = useState<string | undefined>();
  const [filterProject, setFilterProject] = useState<string | undefined>();
  const [employees, setEmployees] = useState<UserDto[]>([]);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  const fetch = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = { month, year, page: p, limit: 20, ...(filterEmployee ? { employeeId: filterEmployee } : {}), ...(filterProject ? { projectId: filterProject } : {}) };
      const res = await reportApi.getMonthlyReport(params);
      setData(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      message.error((err as ApiError).message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [page, month, year, filterEmployee, filterProject]);

  const fetchFilters = useCallback(async () => {
    if (!isManager) return;
    try {
      const [uRes, pRes] = await Promise.all([
        userApi.getUsers(1, 100),
        projectApi.getProjects(1, 100),
      ]);
      setEmployees(uRes.data ?? []);
      setProjects(pRes.data ?? []);
    } catch { /* ignored */ }
  }, [isManager]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { fetchFilters(); }, [fetchFilters]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = { month, year, ...(filterEmployee ? { employeeId: filterEmployee } : {}), ...(filterProject ? { projectId: filterProject } : {}) };
      const blob = await reportApi.exportMonthlyReport(params);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `BaoCao_Thang${String(month).padStart(2, '0')}_${year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success('Excel file downloaded');
    } catch (err) {
      message.error((err as ApiError).message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      width: 110,
      render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
    },
    {
      title: 'Employee',
      dataIndex: 'employeeName',
      width: 150,
    },
    {
      title: 'Project',
      dataIndex: 'projectName',
      width: 150,
    },
    {
      title: 'Content',
      dataIndex: 'content',
      ellipsis: true,
    },
    {
      title: 'Status',
      width: 100,
      render: (_: unknown, record: MonthlyReportRow) =>
        record.isEditable
          ? <Tag color="success">Editable</Tag>
          : <Tag color="default">Locked</Tag>,
    },
    {
      title: 'Comments',
      dataIndex: 'comments',
      width: 200,
      render: (comments: MonthlyReportRow['comments']) =>
        comments?.length > 0 ? (
          <Space direction="vertical" size={2}>
            {comments.map((c, i) => (
              <Typography.Text key={i} style={{ fontSize: 12 }} type="secondary">
                {c.managerName}: {c.content}
              </Typography.Text>
            ))}
          </Space>
        ) : (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>—</Typography.Text>
        ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            <FileExcelOutlined /> Monthly Report
          </Typography.Title>
          <Typography.Text type="secondary">
            {total} entries for {dayjs().month(month - 1).format('MMMM')} {year}
          </Typography.Text>
        </div>
        <Space>
          <DatePicker
            picker="month"
            defaultValue={dayjs()}
            onChange={(d) => {
              if (d) {
                setMonth(d.month() + 1);
                setYear(d.year());
                setPage(1);
              }
            }}
            format="MMMM YYYY"
          />
          <Button icon={<ReloadOutlined />} onClick={() => fetch()}>Refresh</Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            loading={exporting}
            onClick={handleExport}
          >
            Export Excel
          </Button>
        </Space>
      </div>

      {isManager && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap>
            <Select
              allowClear
              placeholder="Filter by employee"
              style={{ width: 220 }}
              value={filterEmployee}
              onChange={(v) => { setFilterEmployee(v); setPage(1); }}
              options={employees.map((e) => ({ value: e.id, label: e.fullName }))}
            />
            <Select
              allowClear
              placeholder="Filter by project"
              style={{ width: 220 }}
              value={filterProject}
              onChange={(v) => { setFilterProject(v); setPage(1); }}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
            />
            {(filterEmployee || filterProject) && (
              <Button type="link" onClick={() => { setFilterEmployee(undefined); setFilterProject(undefined); setPage(1); }}>
                Clear filters
              </Button>
            )}
          </Space>
        </Card>
      )}

      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          locale={{ emptyText: (
            <Empty
              description={`No data for ${dayjs().month(month - 1).format('MMMM')} ${year}`}
            />
          )}
          }
          pagination={{
            current: page,
            total,
            pageSize: 20,
            onChange: setPage,
            showTotal: (t) => `${t} entries`,
          }}
        />
      </Card>
    </div>
  );
};
