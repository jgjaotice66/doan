import { ArrowSquareOut, PencilSimple, Plus, Star, Trash } from '@phosphor-icons/react'
import { App, Avatar, Button, Card, Flex, Popconfirm, Space, Tag, theme, Tooltip, Typography } from 'antd'
import { Link, useNavigate } from 'react-router'
import { getErrorMessage } from '../../api/client'
import { adminProductsApi } from '../../api/admin/products'
import AdminTable from '../../components/admin/AdminTable'
import { adminProductKeys, PRODUCT_RELATED_KEYS } from '../../features/admin/products'
import { categoryOptions } from '../../features/admin/categoryOptions'
import { useCrudMutations } from '../../features/admin/useCrudMutations'
import { useBrands, useCategories } from '../../features/catalog/queries'
import { formatVND } from '../../utils/format'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Đang bán' },
  { value: 'hidden', label: 'Ẩn' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'name', label: 'Tên A → Z' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'stock_asc', label: 'Tồn kho ít nhất' },
]

function StockCell({ product }) {
  if (product.stock === 0) return <Tag color="red">Hết hàng</Tag>
  return (
    <Typography.Text type={product.low_stock ? 'danger' : undefined} strong={product.low_stock}>
      {product.stock}
      {product.low_stock && ' · sắp hết'}
    </Typography.Text>
  )
}

/** Thẻ sản phẩm cho điện thoại; bấm cả thẻ để mở form sửa. */
function ProductCard({ product }) {
  return (
    <Link to={`/admin/products/${product.id}`} aria-label={`Sửa ${product.name}`}>
      <Card size="small" hoverable>
        <Flex gap={12} align="flex-start">
          <Avatar shape="square" size={56} src={product.thumbnail} alt="">
            {product.name.charAt(0)}
          </Avatar>
          <Flex vertical gap={4} style={{ flex: 1, minWidth: 0 }}>
            <Typography.Text strong ellipsis>
              {product.is_featured && '★ '}
              {product.name}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {product.sku} · {product.category?.name}
            </Typography.Text>
            <Flex justify="space-between" align="center" gap={8} wrap>
              <Typography.Text strong type={product.sale_price != null ? 'danger' : undefined}>
                {formatVND(product.sale_price ?? product.price)}
              </Typography.Text>
              <Flex gap={6} align="center">
                <StockCell product={product} />
                <Tag color={product.status.value === 'active' ? 'green' : 'default'} style={{ marginInlineEnd: 0 }}>
                  {product.status.label}
                </Tag>
              </Flex>
            </Flex>
          </Flex>
        </Flex>
      </Card>
    </Link>
  )
}

export default function ProductsPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const { data: tree = [] } = useCategories()
  const { data: brands = [] } = useBrands()
  const { remove } = useCrudMutations(adminProductsApi, PRODUCT_RELATED_KEYS)

  const onDelete = (product) =>
    remove.mutateAsync(product.id).then(
      () => message.success(`Đã xoá "${product.name}"`),
      (error) => message.error(getErrorMessage(error, 'Không xoá được sản phẩm')),
    )

  const columns = [
    {
      title: 'Ảnh',
      dataIndex: 'thumbnail',
      width: 72,
      render: (thumbnail, product) => (
        <Avatar shape="square" size={48} src={thumbnail} alt="">
          {product.name.charAt(0)}
        </Avatar>
      ),
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'name',
      render: (name, product) => (
        <Flex vertical gap={2} style={{ maxWidth: 320 }}>
          <Link to={`/admin/products/${product.id}`}>
            <Typography.Text strong ellipsis={{ tooltip: name }}>
              {product.is_featured && (
                <Tooltip title="Nổi bật">
                  <Star weight="fill" size={14} color={token.colorWarning} aria-label="Nổi bật" style={{ marginRight: 4, verticalAlign: -2 }} />
                </Tooltip>
              )}
              {name}
            </Typography.Text>
          </Link>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {product.sku}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Danh mục / Thương hiệu',
      key: 'taxonomy',
      render: (_, product) => (
        <Flex vertical gap={2}>
          <span>{product.category?.name}</span>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {product.brand?.name}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Giá',
      key: 'price',
      align: 'right',
      render: (_, product) =>
        product.sale_price != null ? (
          <Flex vertical align="flex-end" gap={0}>
            <Typography.Text strong type="danger">
              {formatVND(product.sale_price)}
            </Typography.Text>
            <Typography.Text delete type="secondary" style={{ fontSize: 12 }}>
              {formatVND(product.price)}
            </Typography.Text>
          </Flex>
        ) : (
          <Typography.Text strong>{formatVND(product.price)}</Typography.Text>
        ),
    },
    { title: 'Tồn kho', dataIndex: 'stock', align: 'right', render: (_, product) => <StockCell product={product} /> },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status) => <Tag color={status.value === 'active' ? 'green' : 'default'}>{status.label}</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      fixed: 'right',
      render: (_, product) => (
        <Space size={0}>
          <Tooltip title="Sửa">
            <Button
              type="text"
              icon={<PencilSimple size={18} />}
              aria-label={`Sửa ${product.name}`}
              onClick={() => navigate(`/admin/products/${product.id}`)}
            />
          </Tooltip>
          <Tooltip title={product.status.value === 'active' ? 'Xem trên cửa hàng' : 'Sản phẩm đang ẩn'}>
            <Button
              type="text"
              icon={<ArrowSquareOut size={18} />}
              aria-label={`Xem ${product.name} trên cửa hàng`}
              href={`/products/${product.slug}`}
              target="_blank"
              disabled={product.status.value !== 'active'}
            />
          </Tooltip>
          <Popconfirm
            title={`Xoá "${product.name}"?`}
            description="Sản phẩm biến mất khỏi cửa hàng; đơn hàng cũ vẫn giữ thông tin."
            okText="Xoá"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(product)}
          >
            <Tooltip title="Xoá">
              <Button type="text" danger icon={<Trash size={18} />} aria-label={`Xoá ${product.name}`} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <AdminTable
      queryKey={adminProductKeys.all}
      fetchFn={adminProductsApi.list}
      columns={columns}
      searchPlaceholder="Tìm theo tên hoặc SKU…"
      filters={[
        { name: 'category', placeholder: 'Danh mục', options: categoryOptions(tree, String), width: 200 },
        { name: 'brand', placeholder: 'Thương hiệu', options: brands.map((b) => ({ value: String(b.id), label: b.name })) },
        { name: 'status', placeholder: 'Trạng thái', options: STATUS_OPTIONS, width: 140 },
        { name: 'low_stock', placeholder: 'Tồn kho', options: [{ value: '1', label: 'Sắp hết hàng' }], width: 150 },
        { name: 'sort', placeholder: 'Sắp xếp: Mới nhất', options: SORT_OPTIONS, width: 180 },
      ]}
      toolbar={
        <Button type="primary" icon={<Plus size={16} />} onClick={() => navigate('/admin/products/new')}>
          Thêm sản phẩm
        </Button>
      }
      renderCard={(product) => <ProductCard product={product} />}
    />
  )
}
