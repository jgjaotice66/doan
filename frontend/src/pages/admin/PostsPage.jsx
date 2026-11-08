import { ArrowSquareOut, ImageSquare, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { App, Button, Flex, Image, Popconfirm, Space, Tag, theme, Tooltip, Typography } from 'antd'
import { useNavigate } from 'react-router'
import { getErrorMessage } from '../../api/client'
import { adminPostsApi } from '../../api/admin/posts'
import AdminTable from '../../components/admin/AdminTable'
import { adminPostKeys, POST_RELATED_KEYS, POST_STATUS_COLORS, POST_STATUS_OPTIONS } from '../../features/admin/posts'
import { useCrudMutations } from '../../features/admin/useCrudMutations'
import { formatDateTime } from '../../utils/format'

/** Ảnh đại diện 1200×630 → khung xem trước cùng tỉ lệ. */
const THUMB = { width: 96, height: 50 }

function Thumbnail({ post }) {
  const { token } = theme.useToken()

  if (post.thumbnail) {
    return <Image src={post.thumbnail} alt={post.title} width={THUMB.width} height={THUMB.height} style={{ objectFit: 'cover', borderRadius: 6 }} />
  }

  return (
    <Flex
      align="center"
      justify="center"
      style={{ ...THUMB, borderRadius: 6, background: token.colorFillQuaternary, border: `1px dashed ${token.colorBorder}` }}
    >
      <ImageSquare aria-label="Chưa có ảnh đại diện" size={20} color={token.colorTextQuaternary} />
    </Flex>
  )
}

/** Trạng thái + mốc thời gian đi kèm (đăng lúc / sẽ đăng lúc). */
function StatusCell({ post }) {
  const { value, label } = post.status
  const note = {
    published: post.published_at && `Đăng ${formatDateTime(post.published_at)}`,
    scheduled: post.published_at && `Sẽ đăng ${formatDateTime(post.published_at)}`,
    draft: 'Chỉ admin thấy',
  }[value]

  return (
    <Flex vertical gap={4} align="flex-start">
      <Tag color={POST_STATUS_COLORS[value]} style={{ marginInlineEnd: 0 }}>
        {label}
      </Tag>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {note}
      </Typography.Text>
    </Flex>
  )
}

export default function PostsPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const { remove } = useCrudMutations(adminPostsApi, POST_RELATED_KEYS)

  const onDelete = (post) =>
    remove.mutateAsync(post.id).then(
      () => message.success(`Đã xoá "${post.title}"`),
      (error) => message.error(getErrorMessage(error, 'Không xoá được bài viết')),
    )

  const columns = [
    { title: 'Ảnh', dataIndex: 'thumbnail', width: THUMB.width + 32, render: (_, post) => <Thumbnail post={post} /> },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      render: (title, post) => (
        <Flex vertical gap={2} style={{ maxWidth: 420 }}>
          <Typography.Link strong ellipsis={{ tooltip: title }} onClick={() => navigate(`/admin/posts/${post.id}`)}>
            {title}
          </Typography.Link>
          <Typography.Text type="secondary" style={{ fontSize: 12 }} ellipsis>
            /news/{post.slug}
          </Typography.Text>
        </Flex>
      ),
    },
    { title: 'Trạng thái', dataIndex: 'status', render: (_, post) => <StatusCell post={post} /> },
    { title: 'Tác giả', dataIndex: 'author', render: (author) => author?.name ?? '—' },
    { title: 'Sửa lần cuối', dataIndex: 'updated_at', render: formatDateTime },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      fixed: 'right',
      render: (_, post) => (
        <Space size={0}>
          <Tooltip title="Sửa">
            <Button type="text" icon={<PencilSimple size={18} />} aria-label={`Sửa ${post.title}`} onClick={() => navigate(`/admin/posts/${post.id}`)} />
          </Tooltip>
          {post.status.value === 'published' && (
            <Tooltip title="Xem trên cửa hàng">
              <Button
                type="text"
                icon={<ArrowSquareOut size={18} />}
                aria-label={`Xem ${post.title} trên cửa hàng`}
                href={`/news/${post.slug}`}
                target="_blank"
              />
            </Tooltip>
          )}
          <Popconfirm
            title={`Xoá bài "${post.title}"?`}
            description="Ảnh đại diện và ảnh trong bài cũng bị xoá. Không khôi phục được."
            okText="Xoá"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(post)}
          >
            <Tooltip title="Xoá">
              <Button type="text" danger icon={<Trash size={18} />} aria-label={`Xoá ${post.title}`} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <title>Tin tức – Toy Store Admin</title>
      <AdminTable
        queryKey={adminPostKeys.all}
        fetchFn={adminPostsApi.list}
        columns={columns}
        searchPlaceholder="Tìm theo tiêu đề…"
        filters={[{ name: 'status', placeholder: 'Trạng thái', options: POST_STATUS_OPTIONS, width: 160 }]}
        toolbar={
          <Button type="primary" icon={<Plus size={16} />} onClick={() => navigate('/admin/posts/new')}>
            Viết bài
          </Button>
        }
        locale={{ emptyText: 'Chưa có bài viết nào. Bấm "Viết bài" để bắt đầu.' }}
      />
    </>
  )
}
