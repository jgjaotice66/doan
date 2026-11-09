import { useMutation, useQueryClient } from '@tanstack/react-query'
import { App, Flex, Form, Input, InputNumber, Radio, theme, Typography } from 'antd'
import { adminInventoryApi } from '../../api/admin/inventory'
import { applyFormErrors } from '../../features/admin/formErrors'
import { inventoryKeys } from '../../features/admin/inventory'
import { PRODUCT_RELATED_KEYS } from '../../features/admin/products'
import FormModal from './FormModal'

const TITLES = { import: 'Nhập hàng', adjust: 'Điều chỉnh tồn kho' }

/**
 * Hộp nhập hàng / điều chỉnh cho 1 sản phẩm.
 *   type = 'import' → chỉ cộng; 'adjust' → chọn Tăng / Giảm, bắt buộc lý do.
 * Số lượng luôn nhập số dương; dấu do lựa chọn Tăng/Giảm quyết định → khỏi gõ nhầm dấu trừ.
 */
export default function StockAdjustModal({ product, type, onClose }) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const { token } = theme.useToken()
  const isImport = type === 'import'

  const direction = Form.useWatch('direction', form) ?? 'increase'
  const amount = Form.useWatch('quantity', form) ?? 0
  const change = isImport || direction === 'increase' ? amount : -amount
  const after = product.stock + change

  const save = useMutation({
    mutationFn: (payload) => adminInventoryApi.adjust(product.id, payload),
    onSuccess: ({ product: updated }) => {
      // + dashboard: số "sắp hết hàng" ở trang tổng quan đổi theo.
      ;[inventoryKeys.all, ['admin', 'dashboard'], ...PRODUCT_RELATED_KEYS].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }))
      message.success(`${updated.name}: tồn kho ${product.stock} → ${updated.stock}`)
      onClose()
    },
    onError: (error) => applyFormErrors(form, error, message),
  })

  const onSubmit = ({ quantity: qty, note }) =>
    save.mutate({ type, quantity: isImport || direction === 'increase' ? qty : -qty, note: note?.trim() || null })

  return (
    <FormModal
      open
      title={`${TITLES[type]}: ${product.name}`}
      form={form}
      onSubmit={onSubmit}
      onCancel={onClose}
      loading={save.isPending}
      okText={isImport ? 'Nhập kho' : 'Lưu điều chỉnh'}
      initialValues={{ direction: 'increase', quantity: null, note: '' }}
    >
      {!isImport && (
        <Form.Item name="direction" label="Loại điều chỉnh">
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            options={[
              { value: 'increase', label: 'Tăng' },
              { value: 'decrease', label: 'Giảm' },
            ]}
          />
        </Form.Item>
      )}
      <Form.Item
        name="quantity"
        label="Số lượng"
        dependencies={['direction']}
        rules={[
          { required: true, message: 'Vui lòng nhập số lượng' },
          {
            validator: (_, value) =>
              !isImport && direction === 'decrease' && value > product.stock
                ? Promise.reject(new Error(`Tồn kho hiện có ${product.stock}, không thể giảm ${value}`))
                : Promise.resolve(),
          },
        ]}
      >
        <InputNumber min={1} max={100000} precision={0} style={{ width: '100%' }} autoFocus />
      </Form.Item>
      <Form.Item
        name="note"
        label={isImport ? 'Ghi chú' : 'Lý do'}
        rules={isImport ? [] : [{ required: true, whitespace: true, message: 'Vui lòng ghi lý do điều chỉnh' }]}
      >
        <Input.TextArea
          rows={2}
          maxLength={255}
          showCount
          placeholder={isImport ? 'VD: Lô hàng tháng 11 từ nhà phân phối' : 'VD: Kiểm kê thiếu 2 hộp, 1 hộp móp'}
        />
      </Form.Item>
      <Flex justify="space-between" align="center" style={{ padding: '8px 12px', borderRadius: token.borderRadius, background: token.colorFillQuaternary }}>
        <Typography.Text type="secondary">Tồn kho sau thao tác</Typography.Text>
        <Typography.Text strong type={after < 0 ? 'danger' : undefined} style={{ fontSize: 16 }}>
          {product.stock} → {after}
        </Typography.Text>
      </Flex>
    </FormModal>
  )
}
