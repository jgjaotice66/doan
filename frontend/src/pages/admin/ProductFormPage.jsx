import { ArrowLeft, ArrowSquareOut, FloppyDisk } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import { App, Button, Card, Col, Flex, Form, Input, InputNumber, Radio, Result, Row, Select, Skeleton, Switch, Typography } from 'antd'
import { Link, useNavigate, useParams } from 'react-router'
import { adminProductsApi } from '../../api/admin/products'
import { PendingImagesField, ProductImagesManager } from '../../components/admin/ProductImages'
import { applyFormErrors } from '../../features/admin/formErrors'
import { adminProductKeys, PRODUCT_RELATED_KEYS, useAdminProduct } from '../../features/admin/products'
import { categoryOptions } from '../../features/admin/categoryOptions'
import { useCrudMutations } from '../../features/admin/useCrudMutations'
import { useBrands, useCategories } from '../../features/catalog/queries'
import { AGE_GROUPS, ageLabel } from '../../utils/product'

const FORM_ID = 'product-form'

/** 1250000 ⇄ "1.250.000" */
const moneyFormatter = (value) => (value == null || value === '' ? '' : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
const moneyParser = (value) => (value ? value.replace(/\D/g, '') : '')

const AGE_OPTIONS = AGE_GROUPS.map((age) => ({ value: age, label: ageLabel(age) }))

const EMPTY = {
  name: '',
  sku: '',
  category_id: undefined,
  brand_id: undefined,
  description: '',
  price: null,
  sale_price: null,
  stock: 0,
  min_age: 0,
  is_featured: false,
  status: 'active',
  images: [],
}

/** Dữ liệu API → giá trị form. */
const toFormValues = (product) => ({
  name: product.name,
  sku: product.sku,
  category_id: product.category?.id,
  brand_id: product.brand?.id,
  description: product.description ?? '',
  price: product.price,
  sale_price: product.sale_price,
  min_age: product.min_age,
  is_featured: product.is_featured,
  status: product.status.value,
})

function ProductForm({ product }) {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const isEdit = Boolean(product)
  const { data: tree = [], isPending: loadingCategories } = useCategories()
  const { data: brands = [], isPending: loadingBrands } = useBrands()
  const { save } = useCrudMutations(adminProductsApi, PRODUCT_RELATED_KEYS)

  const onFinish = (values) => {
    const { images = [], stock, ...rest } = values
    const payload = {
      ...rest,
      name: rest.name.trim(),
      sku: rest.sku.trim(),
      description: rest.description?.trim() || null,
      sale_price: rest.sale_price ?? null,
      // Tồn kho + ảnh chỉ gửi lúc tạo; khi sửa có màn Kho / khu ảnh riêng.
      ...(isEdit ? {} : { stock, images: images.map((item) => item.file) }),
    }

    save.mutate(
      { id: product?.id, payload },
      {
        onSuccess: (saved) => {
          queryClient.setQueryData(adminProductKeys.detail(saved.id), saved)
          if (isEdit) {
            message.success('Đã lưu thay đổi')
          } else {
            message.success(`Đã thêm "${saved.name}"`)
            navigate('/admin/products', { replace: true })
          }
        },
        onError: (error) => applyFormErrors(form, error, message),
      },
    )
  }

  return (
    <>
      <title>{isEdit ? `Sửa: ${product.name} – Toy Store Admin` : 'Thêm sản phẩm – Toy Store Admin'}</title>

      <Flex wrap justify="space-between" align="center" gap={12} style={{ marginBottom: 16 }}>
        <Flex align="center" gap={8} style={{ minWidth: 0 }}>
          <Button type="text" icon={<ArrowLeft size={18} />} aria-label="Về danh sách sản phẩm" onClick={() => navigate('/admin/products')} />
          <Typography.Title level={4} style={{ margin: 0 }} ellipsis>
            {isEdit ? product.name : 'Thêm sản phẩm'}
          </Typography.Title>
        </Flex>
        <Flex gap={8}>
          {isEdit && product.status.value === 'active' && (
            <Button icon={<ArrowSquareOut size={16} />} href={`/products/${product.slug}`} target="_blank">
              Xem trên cửa hàng
            </Button>
          )}
          <Button type="primary" htmlType="submit" form={FORM_ID} icon={<FloppyDisk size={16} />} loading={save.isPending}>
            {isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
          </Button>
        </Flex>
      </Flex>

      <Form
        id={FORM_ID}
        form={form}
        layout="vertical"
        initialValues={isEdit ? toFormValues(product) : EMPTY}
        onFinish={onFinish}
        onFinishFailed={({ errorFields }) => errorFields[0] && form.scrollToField(errorFields[0].name, { block: 'center', focus: true })}
        disabled={save.isPending}
        requiredMark="optional"
        scrollToFirstError={false}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Flex vertical gap={16}>
              <Card title="Thông tin chung">
                <Form.Item
                  name="name"
                  label="Tên sản phẩm"
                  rules={[
                    { required: true, whitespace: true, message: 'Vui lòng nhập tên sản phẩm' },
                    { max: 255, message: 'Tối đa 255 ký tự' },
                  ]}
                  extra={isEdit ? `Đường dẫn: /products/${product.slug} (đổi tên thì đường dẫn đổi theo)` : 'Đường dẫn được tạo tự động từ tên.'}
                >
                  <Input autoFocus={!isEdit} />
                </Form.Item>
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="sku"
                      label="Mã SKU"
                      rules={[
                        { required: true, whitespace: true, message: 'Vui lòng nhập SKU' },
                        { pattern: /^[A-Za-z0-9._-]+$/, message: 'Chỉ chữ không dấu, số và . _ -' },
                        { max: 50, message: 'Tối đa 50 ký tự' },
                      ]}
                    >
                      <Input placeholder="VD: GD-RX78" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="category_id" label="Danh mục" rules={[{ required: true, message: 'Vui lòng chọn danh mục' }]}>
                      <Select
                        options={categoryOptions(tree)}
                        loading={loadingCategories}
                        placeholder="Chọn danh mục"
                        showSearch={{ optionFilterProp: 'search' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="brand_id" label="Thương hiệu" rules={[{ required: true, message: 'Vui lòng chọn thương hiệu' }]}>
                      <Select
                        options={brands.map((b) => ({ value: b.id, label: b.name }))}
                        loading={loadingBrands}
                        placeholder="Chọn thương hiệu"
                        showSearch={{ optionFilterProp: 'label' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="description" label="Mô tả" rules={[{ max: 20000, message: 'Tối đa 20.000 ký tự' }]} style={{ marginBottom: 0 }}>
                  <Input.TextArea rows={6} showCount maxLength={20000} placeholder="Chất liệu, kích thước, phụ kiện đi kèm…" />
                </Form.Item>
              </Card>

              <Card title="Ảnh sản phẩm">
                {isEdit ? (
                  <ProductImagesManager productId={product.id} images={product.images} />
                ) : (
                  <Form.Item name="images" style={{ marginBottom: 0 }}>
                    <PendingImagesField />
                  </Form.Item>
                )}
              </Card>
            </Flex>
          </Col>

          <Col xs={24} lg={8}>
            <Flex vertical gap={16}>
              <Card title="Giá & kho">
                <Form.Item
                  name="price"
                  label="Giá bán"
                  rules={[
                    { required: true, message: 'Vui lòng nhập giá bán' },
                    { type: 'number', min: 1000, message: 'Tối thiểu 1.000 ₫' },
                  ]}
                >
                  <InputNumber style={{ width: '100%' }} min={0} step={1000} suffix="₫" formatter={moneyFormatter} parser={moneyParser} />
                </Form.Item>
                <Form.Item
                  name="sale_price"
                  label="Giá khuyến mãi"
                  dependencies={['price']}
                  extra="Để trống nếu không giảm giá."
                  rules={[
                    ({ getFieldValue }) => ({
                      validator: (_, value) =>
                        value == null || value < getFieldValue('price')
                          ? Promise.resolve()
                          : Promise.reject(new Error('Giá khuyến mãi phải nhỏ hơn giá gốc')),
                    }),
                  ]}
                >
                  <InputNumber style={{ width: '100%' }} min={0} step={1000} suffix="₫" formatter={moneyFormatter} parser={moneyParser} />
                </Form.Item>
                {isEdit ? (
                  <Form.Item label="Tồn kho hiện tại" style={{ marginBottom: 0 }} extra={<Link to={`/admin/inventory?q=${encodeURIComponent(product.sku)}`}>Nhập / điều chỉnh ở màn Kho →</Link>}>
                    <Typography.Text strong type={product.low_stock ? 'danger' : undefined} style={{ fontSize: 18 }}>
                      {product.stock}
                    </Typography.Text>
                  </Form.Item>
                ) : (
                  <Form.Item
                    name="stock"
                    label="Tồn kho ban đầu"
                    rules={[{ required: true, message: 'Vui lòng nhập tồn kho' }]}
                    extra="Ghi vào lịch sử kho là “Nhập kho”. Sau này thay đổi ở màn Kho."
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber style={{ width: '100%' }} min={0} max={100000} precision={0} />
                  </Form.Item>
                )}
              </Card>

              <Card title="Hiển thị">
                <Form.Item name="status" label="Trạng thái">
                  <Radio.Group
                    optionType="button"
                    buttonStyle="solid"
                    options={[
                      { value: 'active', label: 'Đang bán' },
                      { value: 'hidden', label: 'Ẩn' },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="min_age" label="Độ tuổi phù hợp">
                  <Select options={AGE_OPTIONS} />
                </Form.Item>
                <Form.Item name="is_featured" label="Sản phẩm nổi bật" valuePropName="checked" extra="Hiện ở mục Nổi bật trên trang chủ." style={{ marginBottom: 0 }}>
                  <Switch />
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
 * /admin/products/new → tạo · /admin/products/:id → sửa (tải sản phẩm trước rồi mới dựng form).
 */
export default function ProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: product, isPending, error, refetch } = useAdminProduct(id)

  if (!id) return <ProductForm />

  if (isPending) return <Skeleton active paragraph={{ rows: 12 }} />

  if (error) {
    const notFound = error.response?.status === 404
    return (
      <Result
        status={notFound ? '404' : 'error'}
        title={notFound ? 'Không tìm thấy sản phẩm' : 'Không tải được sản phẩm'}
        subTitle={notFound ? 'Sản phẩm không tồn tại hoặc đã bị xoá.' : undefined}
        extra={
          <Flex gap={8} justify="center">
            <Button onClick={() => navigate('/admin/products')}>Về danh sách</Button>
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

  // key: đổi sang sản phẩm khác → dựng lại form với giá trị mới.
  return <ProductForm key={product.id} product={product} />
}
