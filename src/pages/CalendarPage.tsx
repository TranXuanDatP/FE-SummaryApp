import { Calendar, Card, Modal, Form, Input, Select, message, Typography, Row, Col, Statistic, Tag, Space } from 'antd';
import { CheckCircleOutlined, WarningOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useState, useEffect, useCallback } from 'react';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import * as worklogApi from '../api/worklog';
import * as projectApi from '../api/project';
import * as userApi from '../api/user';
import { useAuth } from '../contexts/AuthContext';
import type { CalendarDayDto, ProjectDto, UserDto, SummaryDto, ApiError } from '../types/api';

export const CalendarPage = () => {
  const [calendarData, setCalendarData] = useState<CalendarDayDto[]>([]);
  const [, setSummary] = useState<SummaryDto | null>(null);
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [selectedEmployee, setSelectedEmployee] = useState<string | undefined>();
  const [employees, setEmployees] = useState<UserDto[]>([]);
  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  const fetchCalendar = useCallback(async (month: number, year: number) => {
    try {
      const empId = isManager ? selectedEmployee : undefined;
      const [calRes, sumRes] = await Promise.all([
        worklogApi.getCalendar(month, year, empId),
        worklogApi.getSummary(month, year, empId),
      ]);
      setCalendarData(calRes ?? []);
      setSummary(sumRes ?? null);
    } catch (err) {
      message.error((err as ApiError).message || 'Failed to load calendar');
    }
  }, [isManager, selectedEmployee]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await projectApi.getProjects(1, 100);
      setProjects(res.data ?? []);
    } catch { /* ignored */ }
  }, []);

  const fetchEmployees = useCallback(async () => {
    if (!isManager) return;
    try {
      const res = await userApi.getUsers(1, 100);
      setEmployees(res.data ?? []);
    } catch { /* ignored */ }
  }, [isManager]);

  useEffect(() => {
    fetchCalendar(currentMonth.month() + 1, currentMonth.year());
  }, [currentMonth, fetchCalendar]);

  useEffect(() => {
    fetchProjects();
    fetchEmployees();
  }, [fetchProjects, fetchEmployees]);

  const onPanelChange = (value: Dayjs) => {
    setCurrentMonth(value);
  };

  const onSelect = (value: Dayjs) => {
    if (selectedEmployee) return;
    const dateStr = value.format('YYYY-MM-DD');
    const dayInfo = calendarData.find((d) => d.date === dateStr);
    if (dayInfo?.isBusinessDay && !dayInfo.hasWorkLog) {
      setSelectedDate(dateStr);
      form.resetFields();
      setModalOpen(true);
    }
  };

  const dateCellRender = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const dayInfo = calendarData.find((d) => d.date === dateStr);
    if (!dayInfo || !dayInfo.isBusinessDay) return null;

    if (dayInfo.hasWorkLog) {
      return (
        <div style={{ padding: '2px 0' }}>
          <Tag color="success" style={{ fontSize: 10, margin: 0 }}>
            <CheckCircleOutlined /> Done
          </Tag>
        </div>
      );
    }
    if (dayInfo.isEditable) {
      return (
        <div style={{ padding: '2px 0' }}>
          <Tag color="warning" style={{ fontSize: 10, margin: 0 }}>
            <WarningOutlined /> Missing
          </Tag>
        </div>
      );
    }
    return (
      <div style={{ padding: '2px 0' }}>
        <Tag color="default" style={{ fontSize: 10, margin: 0 }}>
          <ClockCircleOutlined /> Past
        </Tag>
      </div>
    );
  };

  const handleCreate = async (values: { content: string; projectId?: string }) => {
    setSubmitting(true);
    try {
      const payload = { content: values.content, executionDate: selectedDate, ...(values.projectId ? { projectId: values.projectId } : {}) };
      await worklogApi.createWorkLog(payload);
      message.success(`Work log created for ${selectedDate}`);
      setModalOpen(false);
      form.resetFields();
      fetchCalendar(currentMonth.month() + 1, currentMonth.year());
    } catch (err) {
      if ((err as ApiError).code === 'WORKLOG_DUPLICATE') {
        message.error('A work log already exists for this date');
      } else {
        message.error((err as ApiError).message || 'Failed to create work log');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const businessDays = calendarData.filter((d) => d.isBusinessDay);
  const loggedDays = businessDays.filter((d) => d.hasWorkLog).length;
  const missingDays = businessDays.filter((d) => !d.hasWorkLog && d.isEditable).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Calendar — {currentMonth.format('MMMM YYYY')}
        </Typography.Title>
        {isManager && (
          <Select
            allowClear
            placeholder="View my calendar"
            style={{ width: 240 }}
            value={selectedEmployee}
            onChange={(v) => {
              setSelectedEmployee(v);
              setCurrentMonth(dayjs(currentMonth));
            }}
            options={employees.map((e) => ({ value: e.id, label: `${e.fullName} (${e.email})` }))}
          />
        )}
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Business Days" value={businessDays.length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Logged" value={loggedDays} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Missing (Editable)" value={missingDays} valueStyle={{ color: missingDays > 0 ? '#faad14' : undefined }} prefix={<WarningOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Completion" value={Math.round((loggedDays / (businessDays.length || 1)) * 100)} suffix="%" />
          </Card>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Tag color="success"><CheckCircleOutlined /> Logged</Tag>
        <Tag color="warning"><WarningOutlined /> Missing {!selectedEmployee && '(click to add)'}</Tag>
        <Tag color="default"><ClockCircleOutlined /> Past (locked)</Tag>
      </Space>

      <Card>
        <Calendar
          value={currentMonth}
          onPanelChange={onPanelChange}
          onSelect={onSelect}
          cellRender={(date, info) => {
            if (info.type === 'date') return dateCellRender(date);
            return info.originNode;
          }}
        />
      </Card>

      <Modal
        title={`Work Log — ${dayjs(selectedDate).format('dddd, DD/MM/YYYY')}`}
        open={modalOpen}
        confirmLoading={submitting}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Create"
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="content" label="What did you work on?" rules={[
            { required: true, message: 'Content is required' },
            { max: 5000, message: 'Max 5000 characters' },
          ]}>
            <Input.TextArea rows={4} placeholder="Describe your work..." showCount maxLength={5000} />
          </Form.Item>
          <Form.Item name="projectId" label="Project">
            <Select allowClear placeholder="Select project (optional)">
              {projects.map((p) => (
                <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
