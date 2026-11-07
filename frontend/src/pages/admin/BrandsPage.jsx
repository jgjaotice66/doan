import { PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { App, Avatar, Button, Form, Input, Popconfirm, Space, Tooltip, Typography } from 'antd'
import { useState } from 'react'
import { getErrorMessage } from '../../api/client'
import { adminBrandsApi } from '../../api/admin/brands'
import AdminTable from '../../components/admin/AdminTable'
import FormModal from '../../components/admin/FormModal'
import ImagePicker from '../../components/admin/ImagePicker'
import { applyFormErrors } from '../../features/admin/formErrors'
import { imagePayload, useCrudMutations } from '../../features/admin/useCrudMutations'

const QUERY_KEY = ['admin', 'brands']

export default function BrandsPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  // editing: null = đóng · {} = thêm mới · bản ghi = đang sửa
  const [editing, setEditing] = useState(null)
  const { save, remove } = useCrudMutations(adminBrandsApi, [QUERY_KEY, ['brands'], ['products']])

  const close = () => setEditing(null)

  const onSubmit = (values) =>
    save.mutate(
      {
        id: editing?.id,
        payload: { name: values.name.trim(), ...imagePayload('logo', values.logo, editing?.logo) },
      },
      {
        onSuccess: (brand) => {
          message.success(editing?.id ? `Đã lưu "${brand.name}"` : `Đã thêm "${brand.name}"`)
          close()
        },
        onError: (error) => applyFormErrors(form, error, message),
      },
    )

  const onDelete = (brand) =>
    remove.mutateAsync(brand.id).then(
      () => message.success(`Đã xoá "${brand.name}"`),
      (error) => message.error(getErrorMessage(error, 'Không xoá được thương hiệu')),
    )

  const columns = [
    {
      title: 'Logo',
      dataIndex: 'logo',
      width: 72,
      render: (logo, brand) => (
        <Avatar shape="square" size={44} src={logo} alt="">
          {brand.name.charAt(0)}
        </Avatar>
      ),
    },
    { title: 'Tên thương hiệu', dataIndex: 'name', render: (name) => <Typography.Text strong>{name}</Typography.Text> },
    {
      title: 'Slug',
      dataIndex: 'slug',
      render: (slug) => (
        <Typography.Text type="secondary" copyable={{ text: slug, tooltips: ['Sao chép', 'Đã sao chép'] }}>
          {slug}
        </Typography.Text>
      ),
    },
    { title: 'Số sản phẩm', dataIndex: 'products_count', align: 'right', width: 130 },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      width: 120,
      render: (_, brand) => (
        <Space>
          <Tooltip title="Sửa">
            <Button type="text" icon={<PencilSimple size={18} />} aria-label={`Sửa ${brand.name}`} onClick={() => setEditing(brand)} />
          </Tooltip>
          <Popconfirm
            title={`Xoá thương hiệu "${brand.name}"?`}
            description={brand.products_count > 0 ? `Đang có ${brand.products_count} sản phẩm — sẽ không xoá được.` : 'Không thể hoàn tác.'}
            okText="Xoá"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(brand)}
          >
            <Tooltip title="Xoá">
              <Button type="text" danger icon={<Trash size={18} />} aria-label={`Xoá ${brand.name}`} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <AdminTable
        queryKey={QUERY_KEY}
        fetchFn={adminBrandsApi.list}
        columns={columns}
        searchPlaceholder="Tìm theo tên thương hiệu…"
        toolbar={
          <Button type="primary" icon={<Plus size={16} />} onClick={() => setEditing({})}>
            Thêm thương hiệu
          </Button>
        }
      />

      <FormModal
        open={editing !== null}
        title={editing?.id ? `Sửa thương hiệu "${editing.name}"` : 'Thêm thương hiệu'}
        form={form}
        initialValues={{ name: editing?.name ?? '', logo: editing?.logo ?? null }}
        onCancel={close}
        onSubmit={onSubmit}
        loading={save.isPending}
      >
        <Form.Item
          name="name"
          label="Tên thương hiệu"
          rules={[
            { required: true, whitespace: true, message: 'Vui lòng nhập tên thương hiệu' },
            { max: 100, message: 'Tối đa 100 ký tự' },
          ]}
          extra="Slug (đường dẫn) được tạo tự động từ tên."
        >
          <Input autoFocus />
        </Form.Item>
        <Form.Item name="logo" label="Logo">
          <ImagePicker />
        </Form.Item>
      </FormModal>
    </>
  )
}
