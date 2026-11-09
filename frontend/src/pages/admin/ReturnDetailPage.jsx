import { ArrowLeft, CheckCircle, Money, Package, XCircle } from '@phosphor-icons/react'
import {
  Alert,
  App,
  Avatar,
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Empty,
  Flex,
  Image,
  Input,
  InputNumber,
  Modal,
  Result,
  Row,
  Skeleton,
  Steps,
  Table,
  Tag,
  Typography,
} from 'antd'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { getErrorMessage } from '../../api/client'
import { RETURN_STATUS_COLORS, useAdminReturn, useReturnActions } from '../../features/admin/returns'
import { useBanks } from '../../features/orders/returns'
import { formatDateTime, formatVND } from '../../utils/format'

const STEP_ORDER = ['pending', 'approved', 'received', 'refunded']

/** 4 bước; bị từ chối thì chỉ còn "Khách gửi → Từ chối" (bước lỗi). */
function ProgressSteps({ request }) {
  const status = request.status.value
  const items =
    status === 'rejected'
      ? [
          { title: 'Khách gửi yêu cầu', description: formatDateTime(request.created_at) },
          { title: 'Từ chối', description: formatDateTime(request.reviewed_at) },
        ]
      : [
          { title: 'Khách gửi yêu cầu', description: formatDateTime(request.created_at) },
          { title: 'Đã duyệt', description: formatDateTime(request.reviewed_at) },
          { title: 'Đã nhận hàng', description: formatDateTime(request.received_at) },
          { title: 'Đã hoàn tiền', description: formatDateTime(request.refunded_at) },
        ]

  return (
    <Card size="small">
      <Steps
        size="small"
        current={status === 'rejected' ? 1 : STEP_ORDER.indexOf(status)}
        status={status === 'rejected' ? 'error' : status === 'refunded' ? 'finish' : 'process'}
        items={items}
        responsive
      />
    </Card>
  )
}

function ItemsCard({ request }) {
  const received = ['received', 'refunded'].includes(request.status.value)
  const columns = [
    {
      title: 'Sản phẩm',
      dataIndex: 'product_name',
      render: (name, item) => (
        <Flex align="center" gap={12}>
          <Avatar shape="square" size={48} src={item.thumbnail} alt="">
            {name.charAt(0)}
          </Avatar>
          <Typography.Text style={{ maxWidth: 280 }} ellipsis={{ tooltip: name }}>
            {name}
          </Typography.Text>
        </Flex>
      ),
    },
    { title: 'Đơn giá', dataIndex: 'price', align: 'right', render: formatVND },
    { title: 'SL trả', dataIndex: 'quantity', align: 'right' },
    { title: 'Thành tiền', dataIndex: 'line_total', align: 'right', render: (v) => <Typography.Text strong>{formatVND(v)}</Typography.Text> },
    ...(received
      ? [
          {
            title: 'Kho',
            dataIndex: 'restock',
            render: (restock) => (restock ? <Tag color="green">Đã nhập lại</Tag> : <Tag>Không nhập</Tag>),
          },
        ]
      : []),
  ]

  return (
    <Card title={`Sản phẩm trả (${request.item_count})`} styles={{ body: { padding: 0 } }}>
      <Table rowKey="id" columns={columns} dataSource={request.items} pagination={false} scroll={{ x: 'max-content' }} />
    </Card>
  )
}

/** Ảnh bấm để phóng to (xem lần lượt cả nhóm), video phát ngay trên trang. */
function EvidenceCard({ request }) {
  const images = request.media.filter((m) => m.type === 'image')
  const videos = request.media.filter((m) => m.type === 'video')

  return (
    <Card title={`Bằng chứng của khách (${request.media.length})`}>
      <Flex vertical gap={16}>
        <div>
          <Typography.Text type="secondary">Lý do</Typography.Text>
          <div>
            <Typography.Text strong>{request.reason.label}</Typography.Text>
          </div>
          {request.description ? (
            <Typography.Paragraph style={{ marginTop: 4, marginBottom: 0, whiteSpace: 'pre-line' }}>{request.description}</Typography.Paragraph>
          ) : (
            <Typography.Text type="secondary">Khách không ghi mô tả.</Typography.Text>
          )}
        </div>
        {images.length > 0 && (
          <Image.PreviewGroup>
            <Flex gap={8} wrap>
              {images.map((m, i) => (
                <Image
                  key={m.id}
                  src={m.url}
                  alt={`Ảnh bằng chứng ${i + 1}`}
                  width={112}
                  height={112}
                  style={{ objectFit: 'cover', borderRadius: 8 }}
                />
              ))}
            </Flex>
          </Image.PreviewGroup>
        )}
        {videos.map((m, i) => (
          <video
            key={m.id}
            src={m.url}
            controls
            preload="metadata"
            aria-label={`Video bằng chứng ${i + 1}`}
            style={{ width: '100%', maxHeight: 360, borderRadius: 8, background: '#000' }}
          />
        ))}
      </Flex>
    </Card>
  )
}

// ---------- Việc cần làm ----------

function ApproveRejectActions({ request, actions, message }) {
  const [note, setNote] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const can = (action) => request.allowed_actions.includes(action)
  const fail = (error) => message.error(getErrorMessage(error, 'Không thực hiện được, vui lòng thử lại.'))

  return (
    <Flex vertical gap={12}>
      {can('approve') && (
        <>
          <Typography.Text type="secondary">Xem bằng chứng rồi duyệt. Lời nhắn (nếu có) hiện cho khách, VD: địa chỉ gửi hàng về.</Typography.Text>
          <Input.TextArea
            rows={3}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Lời nhắn cho khách (không bắt buộc)"
            aria-label="Lời nhắn cho khách"
          />
          <Button
            type="primary"
            icon={<CheckCircle aria-hidden size={16} />}
            loading={actions.approve.isPending}
            onClick={() => actions.approve.mutate(note.trim(), { onSuccess: () => message.success('Đã duyệt yêu cầu'), onError: fail })}
            block
          >
            Duyệt yêu cầu
          </Button>
        </>
      )}
      {can('reject') && (
        <Button danger icon={<XCircle aria-hidden size={16} />} onClick={() => setRejecting(true)} block>
          Từ chối
        </Button>
      )}
      <Modal
        open={rejecting}
        title="Từ chối yêu cầu trả hàng?"
        okText="Từ chối"
        okButtonProps={{ danger: true, disabled: !rejectNote.trim(), loading: actions.reject.isPending }}
        cancelText="Huỷ"
        onCancel={() => setRejecting(false)}
        onOk={() =>
          actions.reject.mutate(rejectNote.trim(), {
            onSuccess: () => {
              setRejecting(false)
              message.success('Đã từ chối yêu cầu')
            },
            onError: fail,
          })
        }
      >
        <Typography.Paragraph type="secondary">Lý do sẽ hiện cho khách trong trang chi tiết đơn.</Typography.Paragraph>
        <Input.TextArea
          rows={4}
          maxLength={1000}
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
          placeholder="VD: Ảnh chưa cho thấy lỗi của sản phẩm, vui lòng gửi lại ảnh rõ hơn."
          aria-label="Lý do từ chối"
          status={rejectNote.trim() ? undefined : 'warning'}
        />
      </Modal>
    </Flex>
  )
}

function ReceiveAction({ request, actions, message }) {
  // Hàng lỗi/hỏng mặc định không nhập lại kho; giao sai / thiếu phụ kiện thì hàng còn bán được.
  const [restock, setRestock] = useState(() => Object.fromEntries(request.items.map((i) => [i.id, request.reason.value !== 'defective'])))

  return (
    <Flex vertical gap={12}>
      <Typography.Text type="secondary">Đã nhận hàng khách gửi về? Chọn món còn bán được để nhập lại kho.</Typography.Text>
      <Flex vertical gap={8}>
        {request.items.map((item) => (
          <Checkbox key={item.id} checked={restock[item.id]} onChange={(e) => setRestock((prev) => ({ ...prev, [item.id]: e.target.checked }))}>
            Nhập lại kho: {item.product_name} <Typography.Text type="secondary">×{item.quantity}</Typography.Text>
          </Checkbox>
        ))}
      </Flex>
      <Button
        type="primary"
        icon={<Package aria-hidden size={16} />}
        loading={actions.receive.isPending}
        block
        onClick={() =>
          actions.receive.mutate(
            request.items.map((i) => ({ id: i.id, restock: restock[i.id] })),
            {
              onSuccess: () => message.success('Đã ghi nhận nhận hàng'),
              onError: (error) => message.error(getErrorMessage(error)),
            },
          )
        }
      >
        Xác nhận đã nhận hàng
      </Button>
    </Flex>
  )
}

/** QR VietQR tới tài khoản của khách (nếu ngân hàng khớp danh sách) — admin quét bằng app ngân hàng để chuyển nhanh. */
function RefundQr({ request, amount }) {
  const { data: banks = [] } = useBanks()
  const bank = banks.find((b) => b.name.toLowerCase() === request.bank_name.toLowerCase() || b.code.toLowerCase() === request.bank_name.toLowerCase())
  if (!bank || !amount) return null

  const url = `https://img.vietqr.io/image/${bank.code}-${request.bank_account}-compact2.png?${new URLSearchParams({
    amount: String(amount),
    addInfo: `Hoan tien ${request.order.code}`,
    accountName: request.account_name,
  })}`

  return (
    <Flex vertical align="center" gap={4}>
      <img src={url} alt={`Mã QR chuyển ${formatVND(amount)} tới ${request.account_name}`} width={200} height={200} style={{ borderRadius: 8 }} />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Quét bằng app ngân hàng để chuyển đúng số tiền
      </Typography.Text>
    </Flex>
  )
}

function RefundAction({ request, actions, message }) {
  const [amount, setAmount] = useState(request.suggested_refund)

  return (
    <Flex vertical gap={12}>
      <Typography.Text type="secondary">
        Chuyển khoản cho khách rồi bấm xác nhận. Gợi ý = tiền hàng các món trả, không gồm phí ship.
      </Typography.Text>
      <div>
        <label htmlFor="refund-amount">
          <Typography.Text strong>Số tiền hoàn</Typography.Text>
        </label>
        <InputNumber
          id="refund-amount"
          value={amount}
          onChange={setAmount}
          min={1}
          max={request.max_refund}
          step={10000}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
          parser={(v) => Number(String(v).replace(/\D/g, ''))}
          suffix="₫"
          style={{ width: '100%', marginTop: 4 }}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Tối đa {formatVND(request.max_refund)} (tổng đơn trừ số đã hoàn trước đó)
        </Typography.Text>
      </div>
      <RefundQr request={request} amount={amount} />
      <Button
        type="primary"
        icon={<Money aria-hidden size={16} />}
        loading={actions.refund.isPending}
        disabled={!amount}
        block
        onClick={() =>
          actions.refund.mutate(amount, {
            onSuccess: () => message.success(`Đã ghi nhận hoàn ${formatVND(amount)}`),
            onError: (error) => message.error(getErrorMessage(error)),
          })
        }
      >
        Đã chuyển tiền hoàn
      </Button>
    </Flex>
  )
}

function ActionCard({ request }) {
  const { message } = App.useApp()
  const actions = useReturnActions(request.id)
  const can = (action) => request.allowed_actions.includes(action)
  const props = { request, actions, message }

  let body
  if (can('approve')) body = <ApproveRejectActions {...props} />
  else if (can('receive'))
    body = (
      <Flex vertical gap={16}>
        <ReceiveAction {...props} />
        <ApproveRejectActions {...props} />
      </Flex>
    )
  else if (can('refund')) body = <RefundAction {...props} />
  else if (request.status.value === 'refunded')
    body = (
      <Alert
        type="success"
        showIcon
        title={`Đã hoàn ${formatVND(request.refund_amount)}`}
        description={`Lúc ${formatDateTime(request.refunded_at)}. Yêu cầu đã xử lý xong.`}
      />
    )
  else body = <Alert type="error" showIcon title="Đã từ chối" description={request.admin_note} />

  return <Card title="Việc cần làm">{body}</Card>
}

function RefundAccountCard({ request }) {
  return (
    <Card title="Tài khoản nhận tiền hoàn">
      <Descriptions
        column={1}
        size="small"
        items={[
          { key: 'bank', label: 'Ngân hàng', children: request.bank_name },
          { key: 'account', label: 'Số TK', children: <Typography.Text copyable strong>{request.bank_account}</Typography.Text> },
          { key: 'name', label: 'Chủ TK', children: <Typography.Text copyable>{request.account_name}</Typography.Text> },
        ]}
      />
    </Card>
  )
}

function CustomerCard({ request }) {
  return (
    <Card title="Khách hàng & đơn gốc">
      <Descriptions
        column={1}
        size="small"
        items={[
          { key: 'name', label: 'Khách', children: request.customer?.name },
          { key: 'email', label: 'Email', children: request.customer?.email },
          ...(request.customer?.phone ? [{ key: 'phone', label: 'SĐT', children: request.customer.phone }] : []),
          { key: 'order', label: 'Đơn', children: <Link to={`/admin/orders/${request.order.id}`}>{request.order.code}</Link> },
          { key: 'total', label: 'Tổng đơn', children: formatVND(request.order.total) },
          { key: 'pay', label: 'Thanh toán', children: request.order.payment_method.label },
          { key: 'done', label: 'Hoàn thành', children: formatDateTime(request.order.completed_at) },
        ]}
      />
      {request.admin_note && request.status.value !== 'rejected' && (
        <Alert type="info" showIcon title="Lời nhắn đã gửi khách" description={request.admin_note} style={{ marginTop: 12 }} />
      )}
    </Card>
  )
}

function ReturnView({ request }) {
  return (
    <Flex vertical gap={16}>
      <title>{`Trả hàng #${request.id} – Toy Store Admin`}</title>
      <div>
        <Link to="/admin/returns">
          <ArrowLeft aria-hidden size={14} style={{ verticalAlign: -2 }} /> Danh sách trả hàng
        </Link>
        <Flex align="center" gap={12} wrap style={{ marginTop: 8 }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Yêu cầu trả hàng #{request.id}
          </Typography.Title>
          <Tag color={RETURN_STATUS_COLORS[request.status.value]} style={{ fontSize: 14, padding: '2px 10px' }}>
            {request.status.label}
          </Tag>
        </Flex>
        <Typography.Text type="secondary">
          Đơn <Link to={`/admin/orders/${request.order.id}`}>{request.order.code}</Link> · gửi lúc {formatDateTime(request.created_at)}
        </Typography.Text>
      </div>

      <ProgressSteps request={request} />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Flex vertical gap={16}>
            <ItemsCard request={request} />
            <EvidenceCard request={request} />
          </Flex>
        </Col>
        <Col xs={24} lg={8}>
          <Flex vertical gap={16}>
            <ActionCard key={request.status.value} request={request} />
            <RefundAccountCard request={request} />
            <CustomerCard request={request} />
          </Flex>
        </Col>
      </Row>
    </Flex>
  )
}

export default function ReturnDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: request, isPending, error, refetch } = useAdminReturn(id)

  if (isPending) return <Skeleton active paragraph={{ rows: 12 }} />

  if (error) {
    const notFound = error.response?.status === 404
    return (
      <Result
        status={notFound ? '404' : 'error'}
        title={notFound ? 'Không tìm thấy yêu cầu trả hàng' : 'Không tải được yêu cầu'}
        extra={
          <Flex gap={8} justify="center">
            <Button onClick={() => navigate('/admin/returns')}>Về danh sách</Button>
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

  if (!request) return <Empty />
  return <ReturnView request={request} />
}
