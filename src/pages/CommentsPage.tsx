import { Table, Button, Modal, Form, Input, Select, Space, message, Card, Typography, Empty, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CommentOutlined } from '@ant-design/icons';
import { useState, useEffect, useCallback } from 'react';
import * as commentApi from '../api/comment';
import * as worklogApi from '../api/worklog';
import { useAuth } from '../contexts/AuthContext';
import type { WorkLogDto, CommentDto, ApiError } from '../types/api';

interface WorkLogWithComments extends WorkLogDto {
  comments?: CommentDto[];
}

export const CommentsPage = () => {
  const [workLogs, setWorkLogs] = useState<WorkLogWithComments[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<CommentDto & { workLogId: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  const fetchWorkLogs = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await worklogApi.getWorkLogs({ page: p, limit: 20 });
      setWorkLogs(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      message.error((err as ApiError).message || 'Failed to load work logs');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchWorkLogs(); }, [fetchWorkLogs]);

  const openCreate = () => {
    setEditItem(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openCreateForWorkLog = (workLogId: string) => {
    setEditItem(null);
    form.resetFields();
    form.setFieldsValue({ workLogId });
    setModalOpen(true);
  };

  const openEdit = (comment: CommentDto & { workLogId: string }) => {
    setEditItem(comment);
    form.resetFields();
    form.setFieldsValue({ workLogId: comment.workLogId, content: comment.content });
    setModalOpen(true);
  };

  const handleSubmit = async (values: { workLogId: string; content: string }) => {
    setSubmitting(true);
    try {
      if (editItem) {
        await commentApi.updateComment(editItem.id, values.content);
        message.success('Comment updated');
      } else {
        await commentApi.createComment(values.workLogId, values.content);
        message.success('Comment added');
      }
      setModalOpen(false);
      setEditItem(null);
      form.resetFields();
      fetchWorkLogs();
    } catch (err) {
      message.error((err as ApiError).message || 'Failed to save comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await commentApi.deleteComment(commentId);
      message.success('Comment deleted');
      fetchWorkLogs();
    } catch (err) {
      message.error((err as ApiError).message || 'Failed to delete comment');
    }
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'executionDate',
      width: 110,
      render: (d: string) => d?.substring(0, 10),
    },
    {
      title: 'Employee',
      dataIndex: 'employeeName',
      width: 140,
    },
    {
      title: 'Work Content',
      dataIndex: 'content',
      ellipsis: true,
    },
    {
      title: 'Project',
      dataIndex: 'projectName',
      width: 130,
    },
    {
      title: 'Comments',
      width: 300,
      render: (_: unknown, record: WorkLogWithComments) => {
        const comments = record.comments ?? [];
        return (
          <div>
            {comments.length === 0 ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>No comments</Typography.Text>
            ) : (
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                {comments.map((c) => (
                  <Card key={c.id} size="small" style={{ background: '#fafafa', padding: '4px 8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <Typography.Text strong style={{ fontSize: 12 }}>{c.managerName}</Typography.Text>
                        <div><Typography.Text style={{ fontSize: 12 }}>{c.content}</Typography.Text></div>
                      </div>
                      {isManager && c.managerId === user?.userId && (
                        <Space size={4}>
                          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit({ ...c, workLogId: record.id })} />
                          <Popconfirm title="Delete this comment?" onConfirm={() => handleDelete(c.id)}>
                            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      )}
                    </div>
                  </Card>
                ))}
              </Space>
            )}
            {isManager && (
              <Button size="small" type="link" icon={<PlusOutlined />} onClick={() => openCreateForWorkLog(record.id)} style={{ padding: 0, marginTop: 4 }}>
                Add comment
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            <CommentOutlined /> Comments
          </Typography.Title>
          <Typography.Text type="secondary">
            Manager feedback on work logs — {total} work logs
          </Typography.Text>
        </div>
        {isManager && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Comment
          </Button>
        )}
      </div>

      {!isManager && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary">
            Only managers can create, edit, and delete comments on work logs.
          </Typography.Text>
        </Card>
      )}

      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={workLogs}
          loading={loading}
          locale={{ emptyText: <Empty description="No work logs found" /> }}
          pagination={{
            current: page,
            total,
            pageSize: 20,
            onChange: setPage,
            showTotal: (t) => `${t} work logs`,
          }}
        />
      </Card>

      <Modal
        title={editItem ? 'Edit Comment' : 'Add Comment'}
        open={modalOpen}
        confirmLoading={submitting}
        onCancel={() => { setModalOpen(false); setEditItem(null); form.resetFields(); }}
        onOk={() => form.submit()}
        okText={editItem ? 'Update' : 'Add'}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {!editItem && (
            <Form.Item name="workLogId" label="Work Log" rules={[{ required: true, message: 'Select a work log' }]}>
              <Select
                placeholder="Select work log"
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {workLogs.map((wl) => (
                  <Select.Option key={wl.id} value={wl.id}>
                    {wl.executionDate?.substring(0, 10)} — {wl.employeeName}: {wl.content?.substring(0, 50)}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
          <Form.Item name="content" label="Comment" rules={[
            { required: true, message: 'Comment is required' },
            { max: 2000, message: 'Max 2000 characters' },
          ]}>
            <Input.TextArea rows={4} placeholder="Write your feedback..." showCount maxLength={2000} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
