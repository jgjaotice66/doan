import { FloppyDisk } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Card, Col, Empty, Flex, Form, Image, Input, Result, Row, Select, Skeleton, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../api/client'
import { adminSettingsApi } from '../../api/admin/settings'
import { applyFormErrors } from '../../features/admin/formErrors'
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
        <SettingsForm settings={settings} />
      )}
    </>
  )
}
