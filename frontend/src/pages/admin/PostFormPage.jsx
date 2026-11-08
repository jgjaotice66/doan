import { ArrowLeft, ArrowSquareOut, Fire, FloppyDisk } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Card, Col, DatePicker, Flex, Form, Input, Result, Row, Skeleton, Space, Switch, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useRef } from 'react'
import { useBeforeUnload, useBlocker, useNavigate, useParams } from 'react-router'
import { adminPostsApi } from '../../api/admin/posts'
import ImagePicker from '../../components/admin/ImagePicker'
import RichTextEditor from '../../components/admin/RichTextEditor'
import { applyFormErrors } from '../../features/admin/formErrors'
import {
  adminPostKeys,
  isBlankHtml,
  normalizeEditorHtml,
  POST_IMAGE_MAX_MB,
  POST_RELATED_KEYS,
  POST_STATUS_COLORS,
  SLUG_PATTERN,
  useAdminPost,
} from '../../features/admin/posts'
import { imagePayload, useCrudMutations } from '../../features/admin/useCrudMutations'
import { formatDateTime } from '../../utils/format'

const FORM_ID = 'post-form'
const DATE_FORMAT = 'DD/MM/YYYY HH:mm'

const EMPTY = { title: '', slug: '', excerpt: '', content: '', is_published: false, is_featured: false, published_at: null, thumbnail: null }

const toFormValues = (post) => ({
  title: post.title,
  slug: post.slug,
  excerpt: post.excerpt ?? '',
  content: post.content,
  is_published: post.is_published,
  is_featured: post.is_featured,
  published_at: post.published_at ? dayjs(post.published_at) : null,
  thumbnail: post.thumbnail,
})

/**
 * Câu giải thích bài sẽ hiện thế nào nếu lưu với lựa chọn hiện tại.
 */
function publishHint(isPublished, publishedAt) {
  if (!isPublished) return { type: 'info', text: 'Bài nháp — chỉ admin thấy, khách không xem được.' }
  if (!publishedAt) return { type: 'success', text: 'Bài hiện trên trang Tin tức ngay khi lưu.' }
  if (publishedAt.isAfter(dayjs())) return { type: 'warning', text: `Hẹn giờ — bài tự hiện lúc ${publishedAt.format(DATE_FORMAT)}.` }
  return { type: 'success', text: `Bài hiện trên trang Tin tức (ngày đăng ${publishedAt.format(DATE_FORMAT)}).` }
}

/**
 * Hỏi lại khi rời trang (bấm menu, Back, đóng tab) mà còn thay đổi chưa lưu.
 * dirtyRef: ref (không phải state) để "vừa lưu xong rồi chuyển trang" không bị chặn nhầm.
 */
function useLeaveGuard(dirtyRef) {
  const { modal } = App.useApp()
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirtyRef.current && currentLocation.pathname !== nextLocation.pathname)

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    modal.confirm({
      title: 'Rời trang khi chưa lưu?',
      content: 'Những thay đổi bạn vừa soạn sẽ bị mất.',
      okText: 'Rời trang',
      okButtonProps: { danger: true },
      cancelText: 'Ở lại',
      onOk: () => blocker.proceed(),
      onCancel: () => blocker.reset(),
    })
  }, [blocker, modal])

  useBeforeUnload((event) => {
    if (dirtyRef.current) event.preventDefault()
  })
}

function PostForm({ post }) {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const isEdit = Boolean(post)
  const { save } = useCrudMutations(adminPostsApi, POST_RELATED_KEYS)
  const dirtyRef = useRef(false)
  useLeaveGuard(dirtyRef)

  const isPublished = Form.useWatch('is_published', form)
  const publishedAt = Form.useWatch('published_at', form)
  const hint = publishHint(isPublished, publishedAt)

  const onFinish = (values) => {
    const payload = {
      title: values.title.trim(),
      slug: values.slug?.trim() || null,
      excerpt: values.excerpt?.trim() || null,
      content: normalizeEditorHtml(values.content),
      is_published: values.is_published,
      is_featured: values.is_featured,
      // format() = ISO kèm múi giờ máy (+07:00) → server đổi đúng về UTC.
      published_at: values.published_at ? values.published_at.format() : null,
      ...imagePayload('thumbnail', values.thumbnail, post?.thumbnail),
    }

    save.mutate(
      { id: post?.id, payload },
      {
        onSuccess: (saved) => {
          dirtyRef.current = false
          queryClient.setQueryData(adminPostKeys.detail(saved.id), saved)
          if (isEdit) {
            message.success(`Đã lưu — ${saved.status.label.toLowerCase()}`)
            form.setFieldsValue(toFormValues(saved))
          } else {
            message.success(`Đã tạo bài "${saved.title}"`)
            navigate(`/admin/posts/${saved.id}`, { replace: true })
          }
        },
        onError: (error) => applyFormErrors(form, error, message),
      },
    )
  }

  return (
    <>
      <title>{isEdit ? `Sửa: ${post.title} – Toy Store Admin` : 'Viết bài – Toy Store Admin'}</title>

      <Flex wrap justify="space-between" align="center" gap={12} style={{ marginBottom: 16 }}>
        <Flex align="center" gap={8} style={{ minWidth: 0 }}>
          <Button type="text" icon={<ArrowLeft size={18} />} aria-label="Về danh sách bài viết" onClick={() => navigate('/admin/posts')} />
          <Typography.Title level={4} style={{ margin: 0 }} ellipsis>
            {isEdit ? post.title : 'Viết bài mới'}
          </Typography.Title>
          {isEdit && <Tag color={POST_STATUS_COLORS[post.status.value]}>{post.status.label}</Tag>}
        </Flex>
        <Flex gap={8}>
          {isEdit && post.status.value === 'published' && (
            <Button icon={<ArrowSquareOut size={16} />} href={`/news/${post.slug}`} target="_blank">
              Xem trên cửa hàng
            </Button>
          )}
          <Button type="primary" htmlType="submit" form={FORM_ID} icon={<FloppyDisk size={16} />} loading={save.isPending}>
            {isEdit ? 'Lưu thay đổi' : 'Lưu bài'}
          </Button>
        </Flex>
      </Flex>

      <Form
        id={FORM_ID}
        form={form}
        layout="vertical"
        initialValues={isEdit ? toFormValues(post) : EMPTY}
        onValuesChange={() => {
          dirtyRef.current = true
        }}
        onFinish={onFinish}
        onFinishFailed={({ errorFields }) => errorFields[0] && form.scrollToField(errorFields[0].name, { block: 'center', focus: true })}
        disabled={save.isPending}
        requiredMark="optional"
        scrollToFirstError={false}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card>
              <Form.Item
                name="title"
                label="Tiêu đề"
                rules={[
                  { required: true, whitespace: true, message: 'Vui lòng nhập tiêu đề' },
                  { max: 200, message: 'Tối đa 200 ký tự' },
                ]}
              >
                <Input size="large" placeholder="VD: Gundam RX-78 bản kỷ niệm đã về hàng" autoFocus={!isEdit} />
              </Form.Item>
              <Form.Item
                label="Đường dẫn"
                htmlFor="post-slug"
                extra={
                  isEdit
                    ? 'Đổi đường dẫn thì link cũ (đã chia sẻ) sẽ không mở được nữa. Xoá trống → tạo lại từ tiêu đề.'
                    : 'Để trống → tự tạo từ tiêu đề.'
                }
              >
                <Space.Compact style={{ width: '100%' }}>
                  <Space.Addon>/news/</Space.Addon>
                  <Form.Item
                    name="slug"
                    noStyle
                    rules={[
                      { pattern: SLUG_PATTERN, message: 'Chỉ chữ thường không dấu, số và dấu gạch ngang (VD: gundam-moi-ve)' },
                      { max: 200, message: 'Tối đa 200 ký tự' },
                    ]}
                  >
                    <Input id="post-slug" placeholder="tu-dong-tao-tu-tieu-de" />
                  </Form.Item>
                </Space.Compact>
              </Form.Item>
              <Form.Item
                name="content"
                label="Nội dung"
                validateTrigger="onSubmit"
                rules={[
                  {
                    validator: (_, value) => (isBlankHtml(value) ? Promise.reject(new Error('Vui lòng nhập nội dung bài viết')) : Promise.resolve()),
                  },
                ]}
                extra="Ảnh chèn vào bài (nút ảnh, kéo-thả hoặc dán) được tải lên máy chủ — jpg, png, webp, gif, tối đa 5MB."
                style={{ marginBottom: 0 }}
              >
                <RichTextEditor placeholder="Viết nội dung bài ở đây…" />
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Flex vertical gap={16}>
              <Card title="Xuất bản">
                <Form.Item name="is_published" label="Hiển thị cho khách" valuePropName="checked">
                  <Switch checkedChildren="Xuất bản" unCheckedChildren="Nháp" />
                </Form.Item>
                <Form.Item
                  name="is_featured"
                  label="Ghim là tin hot"
                  valuePropName="checked"
                  extra="Bài ghim hiện to ở đầu trang Tin tức và khu Tin mới trên trang chủ. Ghim nhiều bài thì bài đăng mới nhất được hiện to; không ghim bài nào thì bài mới nhất hiện to."
                >
                  <Switch checkedChildren={<Fire size={14} weight="fill" style={{ verticalAlign: -2 }} />} unCheckedChildren="Không" />
                </Form.Item>
                <Form.Item
                  name="published_at"
                  label="Ngày đăng"
                  extra="Để trống → lấy giờ lúc lưu. Chọn giờ trong tương lai để hẹn giờ đăng."
                >
                  <DatePicker showTime={{ format: 'HH:mm' }} format={DATE_FORMAT} style={{ width: '100%' }} placeholder="Đăng ngay" />
                </Form.Item>
                <Alert type={hint.type} showIcon title={hint.text} />
                {isEdit && (
                  <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '12px 0 0' }}>
                    Tác giả: {post.author?.name ?? '—'} · Sửa lần cuối {formatDateTime(post.updated_at)}
                  </Typography.Paragraph>
                )}
              </Card>

              <Card title="Ảnh đại diện">
                <Form.Item name="thumbnail" extra="Nên dùng ảnh ngang 1200×630 px — hiện ở danh sách tin và khi chia sẻ link." style={{ marginBottom: 0 }}>
                  <ImagePicker width={200} height={105} maxMb={POST_IMAGE_MAX_MB} />
                </Form.Item>
              </Card>

              <Card title="Tóm tắt">
                <Form.Item
                  name="excerpt"
                  extra="Hiện dưới tiêu đề ở danh sách tin. Để trống → lấy ~200 ký tự đầu của nội dung."
                  rules={[{ max: 500, message: 'Tối đa 500 ký tự' }]}
                  style={{ marginBottom: 0 }}
                >
                  <Input.TextArea rows={4} showCount maxLength={500} placeholder="Một hai câu giới thiệu bài viết…" />
                </Form.Item>
              </Card>
            </Flex>
          </Col>
        </Row>
      </Form>
    </>
  )
}

/**
 * /admin/posts/new → viết bài · /admin/posts/:id → sửa (tải bài trước rồi mới dựng form).
 */
export default function PostFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: post, isPending, error, refetch } = useAdminPost(id)

  if (!id) return <PostForm />

  if (isPending) return <Skeleton active paragraph={{ rows: 14 }} />

  if (error) {
    const notFound = error.response?.status === 404
    return (
      <Result
        status={notFound ? '404' : 'error'}
        title={notFound ? 'Không tìm thấy bài viết' : 'Không tải được bài viết'}
        subTitle={notFound ? 'Bài viết không tồn tại hoặc đã bị xoá.' : undefined}
        extra={
          <Flex gap={8} justify="center">
            <Button onClick={() => navigate('/admin/posts')}>Về danh sách</Button>
            {!notFound && (
              <Button type="primary" onClick={() => refetch()}>
                Thử lại
              </Button>
            )}
          </Flex>
        }
      />
    )
  }

  // key: đổi sang bài khác → dựng lại form với giá trị mới.
  return <PostForm key={post.id} post={post} />
}
