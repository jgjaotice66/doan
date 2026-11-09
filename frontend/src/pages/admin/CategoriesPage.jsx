import { ArrowElbowDownRight, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { App, Avatar, Button, Form, Input, InputNumber, Popconfirm, Select, Space, Tag, Tooltip, Typography } from 'antd'
import { useState } from 'react'
import { getErrorMessage } from '../../api/client'
import { adminCategoriesApi } from '../../api/admin/categories'
import AdminTable from '../../components/admin/AdminTable'
import FormModal from '../../components/admin/FormModal'
import ImagePicker from '../../components/admin/ImagePicker'
import { useCategories } from '../../features/catalog/queries'
import { applyFormErrors } from '../../features/admin/formErrors'
import { LOW_STOCK_RELATED_KEYS, useGlobalLowStockThreshold } from '../../features/admin/inventory'
import { imagePayload, useCrudMutations } from '../../features/admin/useCrudMutations'

const QUERY_KEY = ['admin', 'categories']

export default function CategoriesPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  // editing: null = đóng · {} = thêm mới · bản ghi = đang sửa
  const [editing, setEditing] = useState(null)
  // Đổi ngưỡng của danh mục → Kho, Dashboard, nhãn "sắp hết" ở sản phẩm đều đổi theo.
  const { save, remove } = useCrudMutations(adminCategoriesApi, [QUERY_KEY, ['categories'], ...LOW_STOCK_RELATED_KEYS])
  const globalThreshold = useGlobalLowStockThreshold()
  const thresholdOf = (id) => tree.find((c) => c.id === id)?.low_stock_threshold ?? null
  const formParentId = Form.useWatch('parent_id', form)
  // Bỏ trống thì danh mục này dùng ngưỡng của cha (nếu cha có đặt), không thì ngưỡng chung.
  const inherited = (parentId) => {
    const fromParent = parentId ? thresholdOf(parentId) : null
    return fromParent !== null ? { value: fromParent, label: 'theo danh mục cha' } : { value: globalThreshold, label: 'ngưỡng chung' }
  }

  // Cây danh mục công khai: danh mục gốc làm lựa chọn "danh mục cha" (chỉ 2 cấp).
  const { data: tree = [], isPending: treeLoading } = useCategories()
  const editingNode = tree.find((c) => c.id === editing?.id)
  const hasChildren = Boolean(editingNode?.children?.length)
  const parentOptions = tree.filter((c) => c.id !== editing?.id).map((c) => ({ value: c.id, label: c.name }))

  const close = () => setEditing(null)

  const onSubmit = (values) =>
    save.mutate(
      {
        id: editing?.id,
        payload: {
          name: values.name.trim(),
          parent_id: values.parent_id ?? null,
          low_stock_threshold: values.low_stock_threshold ?? null,
          ...imagePayload('image', values.image, editing?.image),
        },
      },
      {
        onSuccess: (category) => {
          message.success(editing?.id ? `Đã lưu "${category.name}"` : `Đã thêm "${category.name}"`)
          close()
        },
        onError: (error) => applyFormErrors(form, error, message),
      },
    )

  const onDelete = (category) =>
    remove.mutateAsync(category.id).then(
      () => message.success(`Đã xoá "${category.name}"`),
      (error) => message.error(getErrorMessage(error, 'Không xoá được danh mục')),
    )

  const columns = [
    {
      title: 'Ảnh',
      dataIndex: 'image',
      width: 72,
      render: (image, category) => (
        <Avatar shape="square" size={44} src={image} alt="">
          {category.name.charAt(0)}
        </Avatar>
      ),
    },
    {
      title: 'Tên danh mục',
      dataIndex: 'name',
      render: (name, category) =>
        category.parent_id ? (
          <Space size={6} style={{ paddingLeft: 12 }}>
            <ArrowElbowDownRight aria-hidden size={14} />
            <span>{name}</span>
          </Space>
        ) : (
          <Typography.Text strong>{name}</Typography.Text>
        ),
    },
    {
      title: 'Danh mục cha',
      dataIndex: 'parent',
      render: (parent) => (parent ? <Tag>{parent.name}</Tag> : <Typography.Text type="secondary">— Gốc —</Typography.Text>),
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      render: (slug) => (
        <Typography.Text type="secondary" copyable={{ text: slug, tooltips: ['Sao chép', 'Đã sao chép'] }}>
          {slug}
        </Typography.Text>
      ),
    },
    {
      title: 'Ngưỡng sắp hết',
      dataIndex: 'low_stock_threshold',
      render: (value, category) => {
        if (value !== null) return <Tag color="blue">Tồn ≤ {value}</Tag>
        const { value: used, label } = inherited(category.parent_id)
        return (
          <Typography.Text type="secondary">
            ≤ {used ?? '…'} <span style={{ fontSize: 12 }}>({label})</span>
          </Typography.Text>
        )
      },
    },
    { title: 'Số sản phẩm', dataIndex: 'products_count', align: 'right', width: 130 },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      width: 120,
      render: (_, category) => (
        <Space>
          <Tooltip title="Sửa">
            <Button
              type="text"
              icon={<PencilSimple size={18} />}
              aria-label={`Sửa ${category.name}`}
              onClick={() => setEditing(category)}
            />
          </Tooltip>
          <Popconfirm
            title={`Xoá danh mục "${category.name}"?`}
            description={
              category.products_count > 0 ? `Đang có ${category.products_count} sản phẩm — sẽ không xoá được.` : 'Không thể hoàn tác.'
            }
            okText="Xoá"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(category)}
          >
            <Tooltip title="Xoá">
              <Button type="text" danger icon={<Trash size={18} />} aria-label={`Xoá ${category.name}`} />
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
        fetchFn={adminCategoriesApi.list}
        columns={columns}
        searchPlaceholder="Tìm theo tên danh mục…"
        toolbar={
          <Button type="primary" icon={<Plus size={16} />} onClick={() => setEditing({})}>
            Thêm danh mục
          </Button>
        }
      />

      <FormModal
        open={editing !== null}
        title={editing?.id ? `Sửa danh mục "${editing.name}"` : 'Thêm danh mục'}
        form={form}
        initialValues={{
          name: editing?.name ?? '',
          parent_id: editing?.parent_id ?? null,
          low_stock_threshold: editing?.low_stock_threshold ?? null,
          image: editing?.image ?? null,
        }}
        onCancel={close}
        onSubmit={onSubmit}
        loading={save.isPending}
      >
        <Form.Item
          name="name"
          label="Tên danh mục"
          rules={[
            { required: true, whitespace: true, message: 'Vui lòng nhập tên danh mục' },
            { max: 100, message: 'Tối đa 100 ký tự' },
          ]}
          extra="Slug (đường dẫn) được tạo tự động từ tên."
        >
          <Input autoFocus />
        </Form.Item>
        <Form.Item
          name="parent_id"
          label="Danh mục cha"
          extra={
            hasChildren
              ? 'Danh mục này đang có danh mục con nên phải là danh mục gốc.'
              : 'Để trống nếu là danh mục gốc. Chỉ hỗ trợ 2 cấp.'
          }
        >
          <Select
            allowClear
            showSearch={{ optionFilterProp: 'label' }}
            placeholder="— Danh mục gốc —"
            options={parentOptions}
            loading={treeLoading}
            disabled={hasChildren}
          />
        </Form.Item>
        <Form.Item
          name="low_stock_threshold"
          label="Ngưỡng sắp hết hàng"
          extra={
            `Sản phẩm trong danh mục${formParentId ? '' : ' (và danh mục con)'} có tồn ≤ số này thì báo “sắp hết”. ` +
            `Bỏ trống = dùng ${inherited(formParentId).label} (${inherited(formParentId).value ?? '…'}). Sản phẩm đặt riêng vẫn được ưu tiên.`
          }
        >
          <InputNumber
            min={0}
            max={1000}
            precision={0}
            prefix="Tồn ≤"
            placeholder={`${inherited(formParentId).value ?? ''}`}
            style={{ width: 200 }}
          />
        </Form.Item>
        <Form.Item name="image" label="Ảnh danh mục">
          <ImagePicker />
        </Form.Item>
      </FormModal>
    </>
  )
}
