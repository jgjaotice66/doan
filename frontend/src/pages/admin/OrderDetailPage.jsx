import { ArrowLeft, CheckCircle, Money, Package, Truck, XCircle } from '@phosphor-icons/react'
import { Alert, App, Avatar, Button, Card, Col, Descriptions, Flex, Popconfirm, Result, Row, Skeleton, Table, Tag, Typography } from 'antd'
import { useNavigate, useParams } from 'react-router'
import { getErrorMessage } from '../../api/client'
import { ORDER_STATUS_COLORS, useAdminOrder, useOrderActions } from '../../features/admin/orders'
import { formatDateTime, formatVND } from '../../utils/format'

/** Nút cho từng trạng thái kế tiếp (server gửi danh sách hợp lệ trong allowed_next). */
const STATUS_ACTIONS = {
  confirmed: {
    label: 'Xác nhận đơn',
    icon: CheckCircle,
    confirm: 'Xác nhận đơn này?',
  },
  shipping: {
    label: 'Bắt đầu giao',
    icon: Truck,
    confirm: 'Chuyển đơn sang “Đang giao”?',
  },
  completed: {
    label: 'Đã giao xong',
    icon: Package,
    confirm: 'Đánh dấu đơn đã giao thành công?',
  },
}

function ItemsCard({ order }) {
  const columns = [
    {
      title: 'Sản phẩm',
      dataIndex: 'product_name',
      render: (name, item) => (
        <Flex align="center" gap={12}>
          <Avatar shape="square" size={48} src={item.thumbnail} alt="">
            {name.charAt(0)}
          </Avatar>
          <Flex vertical gap={0} style={{ minWidth: 0 }}>
            {item.product_slug ? (
              <Typography.Link href={`/products/${item.product_slug}`} target="_blank" ellipsis>
                {name}
              </Typography.Link>
            ) : (
              <Typography.Text ellipsis>{name}</Typography.Text>
            )}
            {!item.product_slug && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Sản phẩm đã ngừng bán
              </Typography.Text>
            )}
          </Flex>
        </Flex>
      ),
    },
    { title: 'Đơn giá', dataIndex: 'price', align: 'right', render: formatVND },
    { title: 'SL', dataIndex: 'quantity', align: 'right' },
    {
      title: 'Thành tiền',
      dataIndex: 'line_total',
      align: 'right',
      render: (value) => <Typography.Text strong>{formatVND(value)}</Typography.Text>,
    },
  ]

  return (
    <Card title={`Sản phẩm (${order.item_count})`} styles={{ body: { padding: 0 } }}>
      <Table rowKey="id" columns={columns} dataSource={order.items} pagination={false} scroll={{ x: 'max-content' }} />
      <Flex vertical gap={6} style={{ padding: 16, maxWidth: 320, marginInlineStart: 'auto' }}>
        <Flex justify="space-between">
          <Typography.Text type="secondary">Tạm tính</Typography.Text>
          <span>{formatVND(order.subtotal)}</span>
        </Flex>
        <Flex justify="space-between">
          <Typography.Text type="secondary">Phí vận chuyển</Typography.Text>
          <span>{formatVND(order.shipping_fee)}</span>
        </Flex>
        <Flex justify="space-between" align="baseline">
          <Typography.Text strong>Tổng cộng</Typography.Text>
          <Typography.Text strong style={{ fontSize: 18 }}>
            {formatVND(order.total)}
          </Typography.Text>
        </Flex>
      </Flex>
    </Card>
  )
}

function PaymentCard({ order, onMarkPaid, loading }) {
  const isTransfer = order.payment_method.value === 'bank_qr'
  const paid = order.payment_status.value === 'paid'

  return (
    <Card title="Thanh toán">
      <Descriptions
        column={1}
        size="small"
        items={[
          { label: 'Hình thức', children: order.payment_method.label },
          {
            label: 'Tình trạng',
            children: <Tag color={paid ? 'green' : order.can_mark_paid ? 'orange' : 'default'}>{order.payment_status.label}</Tag>,
          },
          {
            label: 'Số tiền',
            children: <Typography.Text strong>{formatVND(order.total)}</Typography.Text>,
          },
          ...(isTransfer
            ? [
                {
                  label: 'Nội dung CK',
                  children: (
                    <Typography.Text code copyable={{ text: order.code }}>
                      {order.code}
                    </Typography.Text>
                  ),
                },
              ]
            : []),
        ]}
      />

      {order.can_mark_paid && (
        <>
          <Alert
            type="warning"
            showIcon
            title="Chưa nhận được tiền"
            description={`Kiểm tra tài khoản ngân hàng có khoản ${formatVND(order.total)} với nội dung ${order.code} rồi bấm xác nhận.`}
            style={{ margin: '12px 0' }}
          />
          <Button type="primary" block icon={<Money size={16} />} loading={loading} onClick={onMarkPaid}>
            Đã nhận tiền
          </Button>
        </>
      )}
      {!isTransfer && !paid && order.status.value !== 'cancelled' && (
        <Typography.Paragraph type="secondary" style={{ margin: '12px 0 0' }}>
          Đơn COD tự chuyển “Đã thanh toán” khi bấm “Đã giao xong”.
        </Typography.Paragraph>
      )}
    </Card>
  )
}

function RecipientCard({ order }) {
  return (
    <Card title="Giao hàng">
      <Descriptions
        column={1}
        size="small"
        items={[
          { label: 'Người nhận', children: order.recipient_name },
          {
            label: 'Điện thoại',
            children: <Typography.Link href={`tel:${order.phone}`}>{order.phone}</Typography.Link>,
          },
          { label: 'Địa chỉ', children: order.address },
          ...(order.note ? [{ label: 'Ghi chú', children: order.note }] : []),
          ...(order.customer
            ? [
                {
                  label: 'Tài khoản',
                  children: `${order.customer.name} · ${order.customer.email}`,
                },
              ]
            : []),
        ]}
      />
    </Card>
  )
}

function OrderView({ order }) {
  const { message, modal } = App.useApp()
  const navigate = useNavigate()
  const { changeStatus, markPaid } = useOrderActions(order.id)
  const busy = changeStatus.isPending || markPaid.isPending

  const showError = (fallback) => (error) => message.error(getErrorMessage(error, fallback))

  const runStatus = (status) =>
    changeStatus
      .mutateAsync(status)
      .then((updated) => message.success(`Đơn ${updated.code}: ${updated.status.label}`), showError('Không đổi được trạng thái'))

  const onCancel = () =>
    modal.confirm({
      title: `Huỷ đơn ${order.code}?`,
      content: (
        <>
          Số lượng sản phẩm trong đơn được hoàn lại kho. Không thể hoàn tác.
          {order.payment_status.value === 'paid' && (
            <Typography.Paragraph type="danger" strong style={{ margin: '8px 0 0' }}>
              Khách đã chuyển khoản {formatVND(order.total)} — nhớ hoàn tiền cho khách.
            </Typography.Paragraph>
          )}
        </>
      ),
      okText: 'Huỷ đơn',
      okButtonProps: { danger: true },
      cancelText: 'Không',
      onOk: () => runStatus('cancelled'),
    })

  const onMarkPaid = () =>
    modal.confirm({
      title: 'Xác nhận đã nhận tiền?',
      content: `Đã nhận ${formatVND(order.total)} với nội dung “${order.code}”. Khách sẽ thấy đơn “Đã thanh toán”.`,
      okText: 'Đã nhận tiền',
      cancelText: 'Chưa',
      onOk: () => markPaid.mutateAsync().then(() => message.success('Đã xác nhận thanh toán'), showError('Không xác nhận được thanh toán')),
    })

  const forward = order.allowed_next.filter((next) => STATUS_ACTIONS[next.value])
  const canCancel = order.allowed_next.some((next) => next.value === 'cancelled')

  return (
    <>
      <title>{`Đơn ${order.code} – Toy Store Admin`}</title>

      <Flex wrap justify="space-between" align="center" gap={12} style={{ marginBottom: 16 }}>
        <Flex align="center" gap={8} wrap>
          <Button type="text" icon={<ArrowLeft size={18} />} aria-label="Về danh sách đơn" onClick={() => navigate('/admin/orders')} />
          <Typography.Title level={4} style={{ margin: 0 }}>
            Đơn {order.code}
          </Typography.Title>
          <Tag color={ORDER_STATUS_COLORS[order.status.value]}>{order.status.label}</Tag>
          <Typography.Text type="secondary">Đặt lúc {formatDateTime(order.created_at)}</Typography.Text>
        </Flex>

        <Flex gap={8} wrap>
          {canCancel && (
            <Button danger icon={<XCircle size={16} />} disabled={busy} onClick={onCancel}>
              Huỷ đơn
            </Button>
          )}
          {forward.map((next) => {
            const action = STATUS_ACTIONS[next.value]
            const Icon = action.icon
            // Đơn chuyển khoản chưa có tiền: vẫn cho xác nhận (admin tự quyết) nhưng nhắc trước.
            const warn = next.value === 'confirmed' && order.can_mark_paid
            return (
              <Popconfirm
                key={next.value}
                title={action.confirm}
                description={warn ? 'Đơn chuyển khoản này chưa nhận được tiền.' : undefined}
                okText="Đồng ý"
                cancelText="Không"
                onConfirm={() => runStatus(next.value)}
              >
                <Button
                  type="primary"
                  icon={<Icon size={16} />}
                  loading={changeStatus.isPending && changeStatus.variables === next.value}
                  disabled={busy}
                >
                  {action.label}
                </Button>
              </Popconfirm>
            )
          })}
        </Flex>
      </Flex>

      {order.status.value === 'cancelled' && (
        <Alert type="error" showIcon title="Đơn đã huỷ — tồn kho đã được hoàn lại." style={{ marginBottom: 16 }} />
      )}
      {order.status.value === 'completed' && <Alert type="success" showIcon title="Đơn đã hoàn thành." style={{ marginBottom: 16 }} />}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <ItemsCard order={order} />
        </Col>
        <Col xs={24} lg={8}>
          <Flex vertical gap={16}>
            <PaymentCard order={order} onMarkPaid={onMarkPaid} loading={markPaid.isPending} />
            <RecipientCard order={order} />
          </Flex>
        </Col>
      </Row>
    </>
  )
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: order, isPending, error, refetch } = useAdminOrder(id)

  if (isPending) return <Skeleton active paragraph={{ rows: 12 }} />

  if (error) {
    const notFound = error.response?.status === 404
    return (
      <Result
        status={notFound ? '404' : 'error'}
        title={notFound ? 'Không tìm thấy đơn hàng' : 'Không tải được đơn hàng'}
        extra={
          <Flex gap={8} justify="center">
            <Button onClick={() => navigate('/admin/orders')}>Về danh sách</Button>
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

  return <OrderView order={order} />
}
