import { ArrowDown, ArrowSquareOut, ArrowUp, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Card, Flex, Form, Image, Input, Popconfirm, Space, Switch, Table, Tooltip, Typography } from 'antd'
import { useState } from 'react'
import { getErrorMessage } from '../../api/client'
import { adminBannersApi } from '../../api/admin/banners'
import FormModal from '../../components/admin/FormModal'
import ImagePicker from '../../components/admin/ImagePicker'
import { applyFormErrors } from '../../features/admin/formErrors'
import { imagePayload, useCrudMutations } from '../../features/admin/useCrudMutations'

const ADMIN_KEY = ['admin', 'banners']
/** Slider trang chủ (useBanners) dùng key này → đổi gì ở đây thì trang chủ tải lại. */
const RELATED_KEYS = [ADMIN_KEY, ['banners']]

/** Khung slider trang chủ 16:6 → ảnh nên 1600×600. */
const PREVIEW = { width: 192, height: 72 }

const LINK_PATTERN = /^(\/(?!\/)|https?:\/\/)\S*$/

function useBannerActions() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const refresh = () => RELATED_KEYS.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }))
  const onError = (fallback) => (error) => {
    message.error(getErrorMessage(error, fallback))
    refresh()
  }

  const toggle = useMutation({
    mutationFn: adminBannersApi.toggleActive,
    onSuccess: (banner) => {
      message.success(banner.is_active ? `Đã bật "${banner.title}"` : `Đã tắt "${banner.title}" khỏi trang chủ`)
      refresh()
    },
    onError: onError('Không đổi được trạng thái banner'),
  })

  const reorder = useMutation({
    mutationFn: adminBannersApi.reorder,
    // Hiện thứ tự mới ngay, không chờ server.
    onMutate: (ids) => {
      queryClient.setQueryData(ADMIN_KEY, (list) => list && ids.map((id) => list.find((b) => b.id === id)))
    },
    onSuccess: (list) => {
      queryClient.setQueryData(ADMIN_KEY, list)
      queryClient.invalidateQueries({ queryKey: ['banners'] })
    },
    onError: onError('Không đổi được thứ tự'),
  })

  return { toggle, reorder }
}

export default function BannersPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [editing, setEditing] = useState(null) // null = đóng · {} = thêm mới · banner = sửa
  const { data: banners = [], isPending, error, refetch } = useQuery({ queryKey: ADMIN_KEY, queryFn: adminBannersApi.list })
  const { save, remove } = useCrudMutations(adminBannersApi, RELATED_KEYS)
  const { toggle, reorder } = useBannerActions()

  const isEdit = Boolean(editing?.id)
  const activeCount = banners.filter((b) => b.is_active).length

  const move = (index, delta) => {
    const ids = banners.map((b) => b.id)
    ;[ids[index], ids[index + delta]] = [ids[index + delta], ids[index]]
    reorder.mutate(ids)
  }

  const onSubmit = (values) =>
    save.mutate(
      {
        id: editing?.id,
        payload: {
          title: values.title.trim(),
          link: values.link?.trim() || null,
          is_active: values.is_active,
          ...imagePayload('image', values.image, editing?.image),
        },
      },
      {
        onSuccess: (banner) => {
          message.success(isEdit ? 'Đã lưu banner' : `Đã thêm "${banner.title}" vào cuối slider`)
          setEditing(null)
        },
        onError: (err) => applyFormErrors(form, err, message),
      },
    )

  const onDelete = (banner) =>
    remove.mutateAsync(banner.id).then(
      () => message.success(`Đã xoá "${banner.title}"`),
      (err) => message.error(getErrorMessage(err, 'Không xoá được banner')),
    )

  const columns = [
    {
      title: 'Thứ tự',
      key: 'order',
      width: 96,
      render: (_, banner, index) => (
        <Space size={0}>
          <Button
            type="text"
            size="small"
            icon={<ArrowUp size={16} />}
            aria-label={`Đưa "${banner.title}" lên trước`}
            disabled={index === 0 || reorder.isPending}
            onClick={() => move(index, -1)}
          />
          <Button
            type="text"
            size="small"
            icon={<ArrowDown size={16} />}
            aria-label={`Đưa "${banner.title}" xuống sau`}
            disabled={index === banners.length - 1 || reorder.isPending}
            onClick={() => move(index, 1)}
          />
        </Space>
      ),
    },
    {
      title: 'Ảnh',
      dataIndex: 'image',
      render: (image, banner) => (
        <Image
          src={image}
          alt={banner.title}
          width={PREVIEW.width}
          height={PREVIEW.height}
          style={{ objectFit: 'cover', borderRadius: 6, opacity: banner.is_active ? 1 : 0.45 }}
        />
      ),
    },
    {
      title: 'Tiêu đề / Link',
      dataIndex: 'title',
      render: (title, banner) => (
        <Flex vertical gap={2} style={{ maxWidth: 320 }}>
          <Typography.Text strong ellipsis={{ tooltip: title }}>
            {title}
          </Typography.Text>
          {banner.link ? (
            <Typography.Link href={banner.link} target="_blank" ellipsis style={{ fontSize: 12 }}>
              <ArrowSquareOut size={12} style={{ marginRight: 4, verticalAlign: -1 }} aria-hidden />
              {banner.link}
            </Typography.Link>
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Không có link
            </Typography.Text>
          )}
        </Flex>
      ),
    },
    {
      title: 'Hiển thị',
      dataIndex: 'is_active',
      render: (isActive, banner) => (
        <Switch
          checked={isActive}
          loading={toggle.isPending && toggle.variables === banner.id}
          onChange={() => toggle.mutate(banner.id)}
          checkedChildren="Bật"
          unCheckedChildren="Tắt"
          aria-label={isActive ? `Tắt banner "${banner.title}"` : `Bật banner "${banner.title}"`}
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      fixed: 'right',
      render: (_, banner) => (
        <Space size={0}>
          <Tooltip title="Sửa">
            <Button type="text" icon={<PencilSimple size={18} />} aria-label={`Sửa ${banner.title}`} onClick={() => setEditing(banner)} />
          </Tooltip>
          <Popconfirm
            title={`Xoá banner "${banner.title}"?`}
            description="Ảnh banner cũng bị xoá khỏi máy chủ."
            okText="Xoá"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(banner)}
          >
            <Tooltip title="Xoá">
              <Button type="text" danger icon={<Trash size={18} />} aria-label={`Xoá ${banner.title}`} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <title>Banner – Toy Store Admin</title>
      <Card
        title="Banner trang chủ"
        extra={
          <Button type="primary" icon={<Plus size={16} />} onClick={() => setEditing({})}>
            Thêm banner
          </Button>
        }
        styles={{ body: { padding: 0 } }}
      >
        {error ? (
          <Alert
            type="error"
            showIcon
            title="Không tải được banner"
            description={getErrorMessage(error)}
            action={<Button onClick={() => refetch()}>Thử lại</Button>}
            style={{ margin: 16 }}
          />
        ) : (
          !isPending &&
          activeCount === 0 && (
            <Alert
              type="warning"
              showIcon
              title="Chưa có banner nào đang bật — trang chủ sẽ không hiện slider."
              style={{ margin: 16 }}
            />
          )
        )}
        <Table
          rowKey="id"
          columns={columns}
          dataSource={banners}
          loading={isPending}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'Chưa có banner. Bấm "Thêm banner" để tạo cái đầu tiên.' }}
          footer={() => (
            <Typography.Text type="secondary">
              Slider hiện {activeCount}/{banners.length} banner, theo thứ tự từ trên xuống. Dùng ↑ ↓ để đổi thứ tự.
            </Typography.Text>
          )}
        />
      </Card>

      <FormModal
        open={editing !== null}
        title={isEdit ? 'Sửa banner' : 'Thêm banner'}
        form={form}
        initialValues={{
          title: editing?.title ?? '',
          link: editing?.link ?? '',
          is_active: editing?.is_active ?? true,
          image: editing?.image ?? null,
        }}
        onCancel={() => setEditing(null)}
        onSubmit={onSubmit}
        loading={save.isPending}
      >
        <Form.Item
          name="image"
          label="Ảnh banner"
          extra="Nên dùng ảnh ngang 1600×600 px (tỉ lệ 16:6); chữ quan trọng đặt giữa ảnh để không bị cắt trên điện thoại."
          rules={[{ required: true, message: 'Vui lòng chọn ảnh banner' }]}
        >
          <ImagePicker width={240} height={90} maxMb={10} removable={false} />
        </Form.Item>
        <Form.Item
          name="title"
          label="Tiêu đề"
          extra="Dùng làm mô tả ảnh cho trình đọc màn hình."
          rules={[
            { required: true, whitespace: true, message: 'Vui lòng nhập tiêu đề' },
            { max: 150, message: 'Tối đa 150 ký tự' },
          ]}
        >
          <Input placeholder="VD: Gundam mới về – giảm 20%" />
        </Form.Item>
        <Form.Item
          name="link"
          label="Link khi bấm vào"
          extra="Trang trong cửa hàng (VD: /products?brand=3) hoặc trang ngoài (https://…). Để trống nếu không cần."
          rules={[
            { pattern: LINK_PATTERN, message: 'Link phải bắt đầu bằng / hoặc http(s)://' },
            { max: 255, message: 'Tối đa 255 ký tự' },
          ]}
        >
          <Input placeholder="/products?category=2" />
        </Form.Item>
        <Form.Item name="is_active" label="Hiển thị trên trang chủ" valuePropName="checked" style={{ marginBottom: 0 }}>
          <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
        </Form.Item>
      </FormModal>
    </>
  )
}
