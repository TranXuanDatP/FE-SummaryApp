import { Drawer, Tabs, Table, Tag, Button, Space, Typography, Progress, message, Input, Empty, Timeline, Popconfirm, Modal, Collapse, Select, Tooltip } from 'antd';
import { DownloadOutlined, PlusOutlined, DeleteOutlined, UnlockOutlined, FolderOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { useState, useEffect, useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import * as worklogApi from '../api/worklog';
import * as commentApi from '../api/comment';
import * as reportApi from '../api/report';
import type { WorkLogDto } from '../types/api';
import { useAuth } from '../contexts/AuthContext';

dayjs.extend(isoWeek);

interface Props {
  open: boolean;
  employee: { id: string; fullName: string; email: string; completionRate: number; loggedDays: number; totalBusinessDays: number } | null;
  month: number;
  year: number;
  onClose: () => void;
}

const WORK_TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  code:     { icon: '💻', color: '#52c41a', label: 'Code' },
  bug_fix:  { icon: '🐛', color: '#ff4d4f', label: 'Fix Bug' },
  research: { icon: '🔬', color: '#1890ff', label: 'R&D' },
  meeting:  { icon: '📅', color: '#722ed1', label: 'Meeting' },
  review:   { icon: '👀', color: '#fa8c16', label: 'Review' },
  other:    { icon: '📋', color: '#8c8c8c', label: 'Other' },
};

function WorkTypeTag({ workType }: { workType: string | null }) {
  if (!workType) return null;
  const cfg = WORK_TYPE_CONFIG[workType] ?? WORK_TYPE_CONFIG.other;
  return <Tag color={cfg.color}>{cfg.icon} {cfg.label}</Tag>;
}

function StatusTag({ status }: { status: string }) {
  return status === 'done'
    ? <Tag color="success">Done</Tag>
    : <Tag color="processing">In Progress</Tag>;
}

function ProgressMini({ value }: { value: number }) {
  return (
    <Progress
      percent={value}
      size="small"
      style={{ width: 80 }}
      strokeColor={value >= 80 ? '#52c41a' : value >= 50 ? '#faad14' : '#ff4d4f'}
      format={() => `${value}%`}
    />
  );
}

export const EmployeeDetailDrawer = ({ open, employee, month, year, onClose }: Props) => {
  const [workLogs, setWorkLogs] = useState<WorkLogDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [commentTarget, setCommentTarget] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const { user } = useAuth();

  const fetchWorkLogs = useCallback(async () => {
    if (!employee) return;
    setLoading(true);
    try {
      const res = await worklogApi.getWorkLogs({ employeeId: employee.id, page: 1, limit: 100 });
      setWorkLogs(res.data ?? []);
    } catch {
      message.error('Không thể tải báo cáo CV');
    } finally {
      setLoading(false);
    }
  }, [employee]);

  useEffect(() => {
    if (open && employee) fetchWorkLogs();
  }, [open, employee, fetchWorkLogs]);

  useEffect(() => { setProjectFilter([]); }, [employee?.id]);

  const handleExport = async () => {
    if (!employee) return;
    setExporting(true);
    try {
      const blob = await reportApi.exportMonthlyReport({ employeeId: employee.id, month, year });
      const url = window.URL.createObjectURL(new Blob([blob as any]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `BaoCao_Thang${String(month).padStart(2, '0')}_${year}_${employee.fullName}.xlsx`;
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

  const handleUnlock = async (id: string) => {
    try {
      await worklogApi.unlockWorkLog(id, 'Manager unlock from team view');
      message.success('Đã mở khóa báo cáo CV');
      fetchWorkLogs();
    } catch {
      message.error('Mở khóa thất bại');
    }
  };

  const handleAddComment = async () => {
    if (!commentTarget || !commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await commentApi.createComment(commentTarget, commentText.trim());
      message.success('Đã thêm bình luận');
      setCommentTarget(null);
      setCommentText('');
      fetchWorkLogs();
    } catch {
      message.error('Thêm bình luận thất bại');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    try {
      await commentApi.deleteComment(id);
      message.success('Đã xóa bình luận');
      fetchWorkLogs();
    } catch {
      message.error('Xóa bình luận thất bại');
    }
  };

  const filtered = useMemo(() =>
    projectFilter.length > 0
      ? workLogs.filter((wl) => projectFilter.includes(wl.projectId))
      : workLogs,
    [workLogs, projectFilter],
  );

  const projectOptions = useMemo(() =>
    Array.from(new Map(workLogs.map((wl) => [wl.projectId, wl.projectName])).entries())
      .map(([id, name]) => ({ value: id, label: name || '(No project)' })),
    [workLogs],
  );

  const allComments = useMemo(() =>
    workLogs.flatMap((wl) =>
      (wl.comments ?? []).map((c) => ({ ...c, workLogDate: wl.executionDate, workLogContent: wl.content })),
    ),
    [workLogs],
  );

  // --- 3-Level Hierarchy ---
  const projectGroups = useMemo(() => {
    const map = new Map<string, { name: string; logs: WorkLogDto[] }>();
    for (const wl of filtered) {
      if (!map.has(wl.projectId)) {
        map.set(wl.projectId, { name: wl.projectName, logs: [] });
      }
      map.get(wl.projectId)!.logs.push(wl);
    }
    return Array.from(map.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      logs: data.logs,
      progress: data.logs.length > 0
        ? Math.round((data.logs.filter((l) => l.status === 'done').length / data.logs.length) * 100)
        : 0,
    }));
  }, [filtered]);

  const getSprintGroups = useCallback((logs: WorkLogDto[]) => {
    const sprintMap = new Map<string, { name: string; logs: WorkLogDto[] }>();
    const noSprintLogs: WorkLogDto[] = [];

    for (const wl of logs) {
      if (wl.sprintId && wl.sprintName) {
        if (!sprintMap.has(wl.sprintId)) {
          sprintMap.set(wl.sprintId, { name: wl.sprintName, logs: [] });
        }
        sprintMap.get(wl.sprintId)!.logs.push(wl);
      } else {
        noSprintLogs.push(wl);
      }
    }

    const groups = Array.from(sprintMap.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      logs: data.logs,
      progress: data.logs.length > 0
        ? Math.round((data.logs.filter((l) => l.status === 'done').length / data.logs.length) * 100)
        : 0,
    }));

    if (noSprintLogs.length > 0) {
      groups.push({
        id: '__no_sprint__',
        name: 'Chưa phân Sprint',
        logs: noSprintLogs,
        progress: noSprintLogs.length > 0
          ? Math.round((noSprintLogs.filter((l) => l.status === 'done').length / noSprintLogs.length) * 100)
          : 0,
      });
    }
    return groups;
  }, []);

  // --- Activity Heatmap ---
  const heatmapDays = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const loggedDates = new Set(workLogs.map((wl) => dayjs(wl.executionDate).format('YYYY-MM-DD')));
    const today = dayjs().format('YYYY-MM-DD');
    const days: { date: string; day: number; isLogged: boolean; isFuture: boolean; isWeekend: boolean; hasComment: boolean }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = dayjs(new Date(year, month - 1, d));
      const dateStr = date.format('YYYY-MM-DD');
      const dow = date.day();
      const isWeekend = dow === 0 || dow === 6;
      const logsOnDate = workLogs.filter((wl) => dayjs(wl.executionDate).format('YYYY-MM-DD') === dateStr);
      days.push({ date: dateStr, day: d, isLogged: loggedDates.has(dateStr), isFuture: dateStr > today, isWeekend, hasComment: logsOnDate.some((wl) => (wl.comments ?? []).length > 0) });
    }
    return days;
  }, [workLogs, month, year]);

  const weekdayLabels = ['Mon', '', 'Wed', '', 'Fri', '', ''];

  // --- Table columns for "Bảng" tab ---
  const workLogColumns = [
    { title: 'Ngày', dataIndex: 'executionDate', width: 90, render: (d: string) => dayjs(d).format('DD/MM') },
    { title: 'Nội dung', dataIndex: 'content', ellipsis: true },
    {
      title: 'Sprint', dataIndex: 'sprintName', width: 120,
      render: (name: string) => name || <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'Loại CV', dataIndex: 'workType', width: 100,
      render: (wt: string | null) => wt ? <WorkTypeTag workType={wt} /> : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'Trạng thái', width: 80,
      render: (_: unknown, r: WorkLogDto) =>
        r.isUnlocked ? <Tag color="orange">Unlocked</Tag> :
        r.isEditable ? <Tag color="success">Editable</Tag> :
        <Tag color="default">Locked</Tag>,
    },
    {
      title: 'Bình luận', width: 240,
      render: (_: unknown, r: WorkLogDto) => {
        const comments = r.comments ?? [];
        return (
          <div>
            {comments.length > 0 && (
              <Space direction="vertical" size={2} style={{ width: '100%', marginBottom: 4 }}>
                {comments.map((c) => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                    <div style={{ flex: 1 }}>
                      <Typography.Text strong style={{ fontSize: 11 }}>{c.managerName}</Typography.Text>
                      <div><Typography.Text style={{ fontSize: 12 }}>{c.content}</Typography.Text></div>
                    </div>
                    {user?.userId === c.managerId && (
                      <Popconfirm title="Xóa?" onConfirm={() => handleDeleteComment(c.id)} okText="Có">
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} style={{ minWidth: 20 }} />
                      </Popconfirm>
                    )}
                  </div>
                ))}
              </Space>
            )}
            <Button size="small" type="link" icon={<PlusOutlined />} onClick={() => { setCommentTarget(r.id); setCommentText(''); }} style={{ padding: 0, fontSize: 12 }}>
              Comment
            </Button>
          </div>
        );
      },
    },
    {
      title: '', width: 50,
      render: (_: unknown, r: WorkLogDto) =>
        !r.isEditable && !r.isUnlocked ? (
          <Tooltip title="Mở khóa">
            <Button size="small" type="link" icon={<UnlockOutlined />} onClick={() => handleUnlock(r.id)} />
          </Tooltip>
        ) : null,
    },
  ];

  if (!employee) return null;

  const pct = Math.round(employee.completionRate * 100);

  return (
    <Drawer title={null} open={open} onClose={onClose} width="78%" styles={{ body: { paddingTop: 12 } }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{employee.fullName}</Typography.Title>
        <Typography.Text type="secondary">{employee.email}</Typography.Text>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Progress percent={pct} size="small" style={{ width: 200 }} strokeColor={pct >= 80 ? '#52c41a' : pct >= 50 ? '#faad14' : '#ff4d4f'} />
          <Typography.Text type="secondary">{employee.loggedDays}/{employee.totalBusinessDays} work logs this month</Typography.Text>
        </div>
      </div>

      {/* Heatmap */}
      <div style={{ marginBottom: 16 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
          Activity &mdash; {dayjs().month(month - 1).format('MMMM')} {year}
        </Typography.Text>
        <div style={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginRight: 4 }}>
            {weekdayLabels.map((label, i) => (
              <div key={i} style={{ height: 20, display: 'flex', alignItems: 'center', fontSize: 10, color: '#999', width: 24, justifyContent: 'flex-end' }}>{label}</div>
            ))}
          </div>
          {heatmapDays.map((d) => {
            let bg = '#f0f0f0';
            if (d.isFuture) bg = '#fafafa';
            else if (d.isWeekend) bg = '#e8e8e8';
            else if (d.isLogged && d.hasComment) bg = '#52c41a';
            else if (d.isLogged) bg = '#95de64';
            else bg = '#ffccc7';
            return (
              <Tooltip key={d.date} title={`${dayjs(d.date).format('DD/MM')} ${d.isFuture ? '(future)' : d.isLogged ? 'Logged' : d.isWeekend ? 'Weekend' : 'Missing'}`}>
                <div style={{ width: 20, height: 20, background: bg, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: d.isLogged || d.isFuture ? '#333' : '#999', cursor: 'default' }}>{d.day}</div>
              </Tooltip>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
          <Space size={4}><div style={{ width: 12, height: 12, background: '#95de64', borderRadius: 2 }} /><Typography.Text style={{ fontSize: 11 }} type="secondary">Logged</Typography.Text></Space>
          <Space size={4}><div style={{ width: 12, height: 12, background: '#52c41a', borderRadius: 2 }} /><Typography.Text style={{ fontSize: 11 }} type="secondary">Has Comment</Typography.Text></Space>
          <Space size={4}><div style={{ width: 12, height: 12, background: '#ffccc7', borderRadius: 2 }} /><Typography.Text style={{ fontSize: 11 }} type="secondary">Missing</Typography.Text></Space>
        </div>
      </div>

      <Tabs
        defaultActiveKey="hierarchy"
        items={[
          {
            key: 'hierarchy',
            label: `Cấu trúc 3 cấp (${filtered.length})`,
            children: (
              <div>
                {projectOptions.length > 1 && (
                  <div style={{ marginBottom: 12 }}>
                    <Select mode="multiple" allowClear placeholder="Lọc theo dự án..." style={{ width: '100%', maxWidth: 500 }} value={projectFilter} onChange={setProjectFilter} options={projectOptions} maxTagCount={3} />
                  </div>
                )}
                {loading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
                ) : projectGroups.length === 0 ? (
                  <Empty description="Chưa có báo cáo CV" />
                ) : (
                  /* Level 1: Project */
                  <Collapse
                    defaultActiveKey={projectGroups.map((p) => p.id)}
                    items={projectGroups.map((project) => {
                      const sprintGroups = getSprintGroups(project.logs);
                      return {
                        key: project.id,
                        label: (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space><FolderOutlined /><span style={{ fontWeight: 600 }}>{project.name || '(No project)'}</span></Space>
                            <Space size={8}>
                              <ProgressMini value={project.progress} />
                              <Tag>{project.logs.length} logs</Tag>
                            </Space>
                          </div>
                        ),
                        children: (
                          /* Level 2: Sprint */
                          <Collapse
                            size="small"
                            defaultActiveKey={sprintGroups.map((s) => s.id)}
                            items={sprintGroups.map((sprint) => ({
                              key: sprint.id,
                              label: (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Space><FolderOpenOutlined /><span style={{ fontWeight: 500 }}>{sprint.name}</span></Space>
                                  <Space size={8}>
                                    <ProgressMini value={sprint.progress} />
                                    <Tag>{sprint.logs.length} logs</Tag>
                                  </Space>
                                </div>
                              ),
                              children: (
                                /* Level 3: WorkLogs */
                                <div>
                                  {sprint.logs.map((wl) => (
                                    <div key={wl.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px', borderBottom: '1px solid #f5f5f5' }}>
                                      <Typography.Text type="secondary" style={{ fontSize: 12, minWidth: 48, marginTop: 2 }}>
                                        {dayjs(wl.executionDate).format('DD/MM')}
                                      </Typography.Text>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                          <WorkTypeTag workType={wl.workType} />
                                          <StatusTag status={wl.status} />
                                          <Typography.Text style={{ fontSize: 13 }}>{wl.content}</Typography.Text>
                                        </div>
                                        {(wl.comments ?? []).length > 0 && (
                                          <div style={{ marginTop: 4, paddingLeft: 8, borderLeft: '2px solid #d9d9d9' }}>
                                            {(wl.comments ?? []).map((c) => (
                                              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4, marginBottom: 2 }}>
                                                <div>
                                                  <Typography.Text strong style={{ fontSize: 11 }}>{c.managerName}</Typography.Text>
                                                  <div><Typography.Text style={{ fontSize: 12 }}>{c.content}</Typography.Text></div>
                                                </div>
                                                {user?.userId === c.managerId && (
                                                  <Popconfirm title="Xóa?" onConfirm={() => handleDeleteComment(c.id)} okText="Có">
                                                    <Button size="small" type="text" danger icon={<DeleteOutlined />} style={{ minWidth: 20 }} />
                                                  </Popconfirm>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <Space size={4} style={{ flexShrink: 0 }}>
                                        {!wl.isEditable && !wl.isUnlocked && (
                                          <Tooltip title="Mở khóa">
                                            <Button size="small" type="link" icon={<UnlockOutlined />} onClick={() => handleUnlock(wl.id)} />
                                          </Tooltip>
                                        )}
                                        <Button size="small" type="link" icon={<PlusOutlined />} onClick={() => { setCommentTarget(wl.id); setCommentText(''); }} style={{ padding: 0 }} />
                                      </Space>
                                    </div>
                                  ))}
                                </div>
                              ),
                            }))}
                          />
                        ),
                      };
                    })}
                  />
                )}
              </div>
            ),
          },
          {
            key: 'table',
            label: `Bảng (${filtered.length})`,
            children: (
              <div>
                {projectOptions.length > 1 && (
                  <div style={{ marginBottom: 12 }}>
                    <Select mode="multiple" allowClear placeholder="Lọc theo dự án..." style={{ width: '100%', maxWidth: 500 }} value={projectFilter} onChange={setProjectFilter} options={projectOptions} maxTagCount={3} />
                  </div>
                )}
                <Table rowKey="id" columns={workLogColumns} dataSource={filtered} size="small" pagination={false} locale={{ emptyText: <Empty description="Chưa có báo cáo CV" /> }} />
              </div>
            ),
          },
          {
            key: 'comments',
            label: `Bình luận (${allComments.length})`,
            children: allComments.length === 0 ? (
              <Empty description="Chưa có bình luận" />
            ) : (
              <Timeline items={allComments.map((c) => ({
                children: (
                  <div key={c.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Typography.Text strong style={{ fontSize: 13 }}>{c.managerName}</Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                          {dayjs(c.createdAt).format('DD/MM HH:mm')} &mdash; on {dayjs(c.workLogDate).format('DD/MM')}
                        </Typography.Text>
                      </div>
                      {user?.userId === c.managerId && (
                        <Popconfirm title="Xóa bình luận này?" onConfirm={() => handleDeleteComment(c.id)}>
                          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      )}
                    </div>
                    <div style={{ marginTop: 4 }}>{c.content}</div>
                  </div>
                ),
              }))} />
            ),
          },
        ]}
        tabBarExtraContent={
          <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>Export</Button>
        }
      />

      {/* Add Comment Modal */}
      <Modal
        title="Thêm bình luận"
        open={!!commentTarget}
        confirmLoading={submittingComment}
        onCancel={() => { setCommentTarget(null); setCommentText(''); }}
        onOk={handleAddComment}
        okText="Thêm"
        okButtonProps={{ disabled: !commentText.trim() }}
      >
        <Input.TextArea rows={3} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Viết nhận xét..." maxLength={2000} showCount autoFocus />
      </Modal>
    </Drawer>
  );
};
