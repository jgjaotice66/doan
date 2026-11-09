import { FloppyDisk } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Card, Col, Empty, Flex, Form, Image, Input, InputNumber, Result, Row, Select, Skeleton, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getErrorMessage } from '../../api/client'
import { adminSettingsApi } from '../../api/admin/settings'
import { applyFormErrors } from '../../features/admin/formErrors'
import { LOW_STOCK_RELATED_KEYS } from '../../features/admin/inventory'
import { formatVND } from '../../utils/format'

const settingsKey = ['admin', 'settings']

const SAMPLE_AMOUNT = 100000
const SAMPLE_CODE = 'TSDEMO'
const ACCOUNT_PATTERN = /^\d{6,20}$/
const NAME_PATTERN = /^[A-Z][A-Z ]*$/

/** "Trần Thị Đào" → "TRAN THI DAO" (đúng cách ngân hàng in tên chủ tài khoản). */
const toBankName = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z ]/g, '')
    .replace(/ {2,}/g, ' ')
    .replace(/^ /, '')

const digitsOnly = (value = '') => value.replace(/\D/g, '')

/** Giá trị chỉ "chốt" sau khi ngừng gõ một lúc → ảnh QR không tải lại theo từng phím. */
function useDebounced(value, delay = 500) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

const qrPreviewUrl = ({ bank, account, account_name: accountName }) =>
  `https://img.vietqr.io/image/${bank}-${account}-compact2.png?${new URLSearchParams({
    amount: SAMPLE_AMOUNT,
    addInfo: SAMPLE_CODE,
    accountName: accountName.trim(),
  })}`

function QrPreview({ form, saved, banks }) {
  const bank = Form.useWatch('bank', form)
  const account = Form.useWatch('account', form) ?? ''
  const accountName = Form.useWatch('account_name', form) ?? ''
  // Debounce 1 chuỗi (giá trị nguyên thuỷ) — object mới mỗi lần render sẽ làm hẹn giờ chạy mãi.
  const [debBank, debAccount, debName] = useDebounced([bank ?? '', account, accountName].join('|')).split('|')
  const values = { bank: debBank, account: debAccount, account_name: debName }

  const ready = values.bank && ACCOUNT_PATTERN.test(values.account) && NAME_PATTERN.test(values.account_name.trim())
  const changed =
    bank !== saved.bank || account !== saved.account || accountName.trim() !== saved.account_name
  const bankName = banks.find((b) => b.code === values.bank)?.name

  return (
    <Card
      title="Xem trước mã QR"
      extra={changed ? <Tag color="orange">Chưa lưu</Tag> : <Tag color="green">Đang dùng</Tag>}
    >
      {ready ? (
        <Flex vertical align="center" gap={12}>
          <Image
            src={qrPreviewUrl(values)}
            alt={`Mã QR mẫu chuyển ${formatVND(SAMPLE_AMOUNT)} vào ${bankName} ${values.account}`}
            width={240}
            height={240}
            style={{ objectFit: 'contain' }}
            preview={false}
            fallback="data:image/gif;base64,R0lGODlhAQABAAAAACw="
          />
          <Typography.Text type="secondary" style={{ textAlign: 'center' }}>
            {bankName} · {values.account} · {values.account_name.trim()}
            <br />
            Mẫu: {formatVND(SAMPLE_AMOUNT)}, nội dung “{SAMPLE_CODE}”. Quét thử bằng app ngân hàng để kiểm tra đúng tên chủ TK
            (không cần chuyển tiền).
          </Typography.Text>
        </Flex>
      ) : (
        <Empty description="Nhập đủ ngân hàng, số tài khoản và tên chủ tài khoản để xem trước." />
      )}
    </Card>
  )
}

function SettingsForm({ settings }) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const save = useMutation({
    mutationFn: adminSettingsApi.update,
    onSuccess: (saved) => {
      queryClient.setQueryData(settingsKey, saved)
      // QR / số TK trên các trang đơn chưa thanh toán đổi theo.
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      message.success('Đã lưu tài khoản nhận tiền')
    },
    onError: (error) => applyFormErrors(form, error, message),
  })

  const onFinish = (values) => save.mutate({ ...values, account_name: values.account_name.trim() })

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={14}>
        <Card title="Tài khoản nhận chuyển khoản">
          <Alert
            type="info"
            showIcon
            title="Áp dụng ngay cho mọi đơn chuyển khoản chưa thanh toán"
            description="Khách mở trang đơn sẽ thấy mã QR và số tài khoản mới. Đơn vẫn chỉ thành “Đã thanh toán” khi bạn bấm “Đã nhận tiền” ở trang đơn hàng."
            style={{ marginBottom: 16 }}
          />
          <Form
            form={form}
            layout="vertical"
            initialValues={{ bank: settings.bank || undefined, account: settings.account, account_name: settings.account_name }}
            onFinish={onFinish}
            disabled={save.isPending}
            requiredMark="optional"
          >
            <Form.Item name="bank" label="Ngân hàng" rules={[{ required: true, message: 'Vui lòng chọn ngân hàng' }]}>
              <Select
                options={settings.banks.map((b) => ({ value: b.code, label: `${b.name} (${b.code})` }))}
                placeholder="Chọn ngân hàng"
                showSearch={{ optionFilterProp: 'label' }}
              />
            </Form.Item>
            <Form.Item
              name="account"
              label="Số tài khoản"
              normalize={digitsOnly}
              rules={[
                { required: true, message: 'Vui lòng nhập số tài khoản' },
                { pattern: ACCOUNT_PATTERN, message: 'Chỉ gồm chữ số, dài 6–20 ký tự' },
              ]}
            >
              <Input inputMode="numeric" maxLength={20} autoComplete="off" />
            </Form.Item>
            <Form.Item
              name="account_name"
              label="Tên chủ tài khoản"
              normalize={toBankName}
              extra="Tự chuyển sang IN HOA không dấu, giống tên ngân hàng hiển thị khi chuyển tiền."
              rules={[
                { required: true, whitespace: true, message: 'Vui lòng nhập tên chủ tài khoản' },
                { max: 50, message: 'Tối đa 50 ký tự' },
              ]}
            >
              <Input maxLength={50} autoComplete="off" placeholder="NGUYEN VAN A" />
            </Form.Item>
            <Button type="primary" htmlType="submit" icon={<FloppyDisk size={16} />} loading={save.isPending}>
              Lưu thay đổi
            </Button>
          </Form>
        </Card>
      </Col>
      <Col xs={24} lg={10}>
        <QrPreview form={form} saved={settings} banks={settings.banks} />
      </Col>
    </Row>
  )
}

/**
 * Ngưỡng "sắp hết hàng" chung. Danh mục / sản phẩm đặt riêng thì ưu tiên số của chúng
 * (sản phẩm → danh mục → danh mục cha → số này).
 */
function LowStockCard({ settings }) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const save = useMutation({
    mutationFn: ({ low_stock_threshold: value }) => adminSettingsApi.updateLowStock(value),
    onSuccess: (saved) => {
      queryClient.setQueryData(settingsKey, saved)
      LOW_STOCK_RELATED_KEYS.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }))
      message.success(`Đã lưu: tồn ≤ ${saved.low_stock_threshold} là sắp hết hàng`)
    },
    onError: (error) => applyFormErrors(form, error, message),
  })

  return (
    <Card title="Kho hàng">
      <Flex gap={24} wrap align="flex-start">
        <Form
          form={form}
          layout="vertical"
          initialValues={{ low_stock_threshold: settings.low_stock_threshold }}
          onFinish={save.mutate}
          disabled={save.isPending}
          style={{ flex: '1 1 280px', maxWidth: 360 }}
        >
          <Form.Item
            name="low_stock_threshold"
            label="Ngưỡng sắp hết hàng (chung)"
            extra="Tồn kho bằng hoặc dưới số này thì báo “sắp hết”. Đặt 0 = chỉ báo khi hết hẳn."
            rules={[{ required: true, message: 'Vui lòng nhập ngưỡng' }]}
          >
            <InputNumber min={0} max={1000} precision={0} style={{ width: '100%' }} prefix="Tồn ≤" />
          </Form.Item>
          <Button type="primary" htmlType="submit" icon={<FloppyDisk size={16} />} loading={save.isPending}>
            Lưu ngưỡng
          </Button>
        </Form>
        <Alert
          type="info"
          showIcon
          style={{ flex: '1 1 280px' }}
          title="Muốn đặt riêng?"
          description={
            <>
              Đặt ở <Link to="/admin/categories">Danh mục</Link> (áp dụng cho cả danh mục con), ở form sản phẩm hoặc sửa nhanh ngay trong{' '}
              <Link to="/admin/inventory">Kho</Link>. Thứ tự ưu tiên: sản phẩm → danh mục → danh mục cha → ngưỡng chung.
            </>
          }
        />
      </Flex>
    </Card>
  )
}

export default function SettingsPage() {
  const { data: settings, isPending, error, refetch } = useQuery({ queryKey: settingsKey, queryFn: adminSettingsApi.get })

  return (
    <>
      <title>Cài đặt cửa hàng – Toy Store Admin</title>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Cài đặt cửa hàng
      </Typography.Title>
      {isPending ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : error ? (
        <Result
          status="error"
          title="Không tải được cài đặt"
          subTitle={getErrorMessage(error)}
          extra={
            <Button type="primary" onClick={() => refetch()}>
              Thử lại
            </Button>
          }
        />
      ) : (
        <Flex vertical gap={16}>
          <SettingsForm settings={settings} />
          <LowStockCard settings={settings} />
        </Flex>
      )}
    </>
  )
}
