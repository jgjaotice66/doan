import {
  ArrowCounterClockwise,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUUpLeft,
  CurrencyCircleDollar,
  HourglassMedium,
  Package,
  Plus,
  Receipt,
  ShoppingBag,
  TrendUp,
  UserPlus,
} from '@phosphor-icons/react'
import { Area } from '@ant-design/plots'
import { useQuery } from '@tanstack/react-query'
import { Alert, Avatar, Button, Card, Col, Empty, Flex, Progress, Row, Segmented, Skeleton, Table, Tag, theme, Tooltip, Typography } from 'antd'
import { useState } from 'react'
import { Link } from 'react-router'
import { getErrorMessage } from '../../api/client'
import { adminDashboardApi } from '../../api/admin/dashboard'
import { adminInventoryApi } from '../../api/admin/inventory'
import StockAdjustModal from '../../components/admin/StockAdjustModal'
import { dashboardKeys, useDashboardSummary } from '../../features/admin/dashboard'
import { inventoryKeys } from '../../features/admin/inventory'
import { useAuthStore } from '../../stores/authStore'
import { formatVND } from '../../utils/format'


/** Màu chuỗi doanh thu (1 chuỗi → 1 màu); đã chạy kiểm tra tương phản ≥ 3:1 trên nền trắng. */
const SERIES_COLOR = '#2a78d6'

/**
 * Màu thanh trạng thái đơn. Không dùng lại màu Tag antd: xanh dương ↔ xanh đậm của antd gần như trùng
 * với người mù màu (đã chạy kiểm tra). Bộ này đạt kiểm tra; luôn đi kèm nhãn chữ + số nên không phụ thuộc màu.
 * Đã huỷ = xám trung tính (không phải "một loại" cần chú ý).
 */
const STATUS_CHART_COLORS = {
  pending: '#eda100',
  confirmed: '#2a78d6',
  shipping: '#e87ba4',
  completed: '#1baf7a',
  cancelled: '#a8a8a8',
}

const RANGE_OPTIONS = [
  { value: '30d', label: '30 ngày' },
  { value: '12m', label: '12 tháng' },
]

const TABULAR = { fontVariantNumeric: 'tabular-nums' }

/** Nhãn trục tiền gọn: 1500000 → "1,5 tr". */
function compactVND(value) {
  const n = Number(value)
  if (n >= 1e9) return `${+(n / 1e9).toFixed(1)} tỷ`.replace('.', ',')
  if (n >= 1e6) return `${+(n / 1e6).toFixed(1)} tr`.replace('.', ',')
  if (n >= 1e3) return `${Math.round(n / 1e3)}k`
  return String(n)
}

function greeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 11) return 'Chào buổi sáng'
  if (hour < 13) return 'Chào buổi trưa'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

const todayFormatter = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })

/** Ô vuông bo góc nền nhạt chứa icon — nhận diện nhanh từng thẻ (trang trí, đã có chữ bên cạnh). */
function IconBadge({ icon: Icon, color, background, size = 44 }) {
  return (
    <Flex align="center" justify="center" style={{ width: size, height: size, borderRadius: 12, background, color, flexShrink: 0 }}>
      <Icon aria-hidden size={size / 2} weight="duotone" />
    </Flex>
  )
}

/** Khung chung: đang tải → khung xám, lỗi → thông báo + "Thử lại"; khối này lỗi không ảnh hưởng khối khác. */
function QueryState({ query, rows = 4, children }) {
  if (query.isPending) return <Skeleton active paragraph={{ rows }} />
  if (query.error) {
    return (
      <Alert
        type="error"
        showIcon
        title="Không tải được số liệu"
        description={getErrorMessage(query.error)}
        action={
          <Button size="small" onClick={() => query.refetch()}>
            Thử lại
          </Button>
        }
      />
    )
  }
  return children(query.data)
}

// ---------- Đầu trang ----------

function PageHeader({ pendingOrders }) {
  const name = useAuthStore((state) => state.user?.name)
  const now = new Date()

  return (
    <Flex justify="space-between" align="center" gap={16} wrap>
      <div>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {greeting(now)}
          {name ? `, ${name}` : ''}
        </Typography.Title>
        <Typography.Text type="secondary" style={{ textTransform: 'capitalize' }}>
          {todayFormatter.format(now)} · Tình hình cửa hàng hôm nay
        </Typography.Text>
      </div>
      <Flex gap={8} wrap>
        <Link to="/admin/orders?status=pending">
          <Button icon={<Receipt aria-hidden size={16} />}>
            Đơn chờ xác nhận{pendingOrders ? ` (${pendingOrders})` : ''}
          </Button>
        </Link>
        <Link to="/admin/products/new">
          <Button type="primary" icon={<Plus aria-hidden size={16} />}>
            Thêm sản phẩm
          </Button>
        </Link>
      </Flex>
    </Flex>
  )
}

// ---------- Thẻ số liệu ----------

/** Đường xu hướng mini (SVG tự vẽ, không cần thư viện); chỉ trang trí cho thẻ — số chính xác nằm ở biểu đồ lớn. */
function Sparkline({ values, color, width = 120, height = 36 }) {
  if (values.length < 2) return null
  const max = Math.max(1, ...values)
  const step = width / (values.length - 1)
  const points = values.map((v, i) => [i * step, height - 3 - (v / max) * (height - 6)])
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  const [lastX, lastY] = points[points.length - 1]

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ display: 'block', overflow: 'visible' }}>
      <path d={area} fill={color} opacity={0.12} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r={3} fill={color} />
    </svg>
  )
}

function ChangeChip({ change }) {
  if (change === null || change === undefined) {
    return <Typography.Text type="secondary">Tháng trước cùng kỳ chưa có doanh thu</Typography.Text>
  }
  const up = change >= 0
  const Icon = up ? ArrowUp : ArrowDown
  return (
    <Flex align="center" gap={6} wrap>
      <Tag color={up ? 'success' : 'error'} style={{ marginInlineEnd: 0, fontWeight: 600 }}>
        <Icon aria-hidden size={12} weight="bold" style={{ verticalAlign: -1 }} /> {up ? '+' : '−'}
        {Math.abs(change)}%
      </Tag>
      <Typography.Text type="secondary">so với cùng kỳ tháng trước</Typography.Text>
    </Flex>
  )
}

function StatTile({ title, value, icon, tone, footer, aside }) {
  return (
    <Card style={{ height: '100%' }} styles={{ body: { height: '100%', display: 'flex', flexDirection: 'column', gap: 12 } }}>
      <Flex justify="space-between" align="flex-start" gap={12}>
        <Flex vertical gap={4} style={{ minWidth: 0 }}>
          <Typography.Text type="secondary">{title}</Typography.Text>
          <Typography.Text strong style={{ fontSize: 26, lineHeight: 1.2, ...TABULAR }}>
            {value}
          </Typography.Text>
        </Flex>
        <IconBadge icon={icon} color={tone.color} background={tone.background} />
      </Flex>
      <Flex justify="space-between" align="flex-end" gap={8} style={{ marginTop: 'auto', fontSize: 13 }}>
        <div style={{ minWidth: 0 }}>{footer}</div>
        {aside}
      </Flex>
    </Card>
  )
}

function SummaryTiles({ summary }) {
  const { token } = theme.useToken()
  // Dùng chung cache với biểu đồ doanh thu 30 ngày → không gọi API thêm.
  const revenue30d = useQuery({ queryKey: dashboardKeys.revenue('30d'), queryFn: () => adminDashboardApi.revenue('30d') })
  const last7 = revenue30d.data?.points.slice(-7) ?? []
  const last7Total = last7.reduce((sum, p) => sum + p.revenue, 0)

  if (summary.isPending || summary.error) {
    return (
      <Card>
        <QueryState query={summary} rows={2}>
          {() => null}
        </QueryState>
      </Card>
    )
  }
  const s = summary.data

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} xl={6}>
        <StatTile
          title="Doanh thu hôm nay"
          value={formatVND(s.revenue_today)}
          icon={CurrencyCircleDollar}
          tone={{ color: token.colorPrimary, background: token.colorPrimaryBg }}
          footer={
            last7.length > 0 && (
              <Typography.Text type="secondary">
                7 ngày qua: <span style={TABULAR}>{formatVND(last7Total)}</span>
              </Typography.Text>
            )
          }
          aside={<Sparkline values={last7.map((p) => p.revenue)} color={SERIES_COLOR} width={88} height={32} />}
        />
      </Col>
      <Col xs={24} sm={12} xl={6}>
        <StatTile
          title="Doanh thu tháng này"
          value={formatVND(s.revenue_month)}
          icon={TrendUp}
          tone={{ color: token.colorSuccess, background: token.colorSuccessBg }}
          footer={<ChangeChip change={s.revenue_month_change} />}
        />
      </Col>
      <Col xs={24} sm={12} xl={6}>
        <StatTile
          title="Đơn mới hôm nay"
          value={s.orders_today}
          icon={ShoppingBag}
          tone={{ color: token.orange6, background: token.orange1 }}
          footer={<Link to="/admin/orders">Xem đơn hàng</Link>}
        />
      </Col>
      <Col xs={24} sm={12} xl={6}>
        <StatTile
          title="Khách đăng ký tháng này"
          value={s.new_customers_month}
          icon={UserPlus}
          tone={{ color: token.purple6, background: token.purple1 }}
          footer={<Link to="/admin/users">Xem người dùng</Link>}
        />
      </Col>
    </Row>
  )
}

// ---------- Cần xử lý ----------

/** 4 ô việc tồn đọng, luôn đủ 4 ô (bố cục không nhảy); ô có việc thì viền + nền màu cảnh báo, bấm sang trang đã lọc. */
function TodoCards({ summary }) {
  const { token } = theme.useToken()
  const s = summary.data
  if (!s) return null

  const warning = { color: token.colorWarning, background: token.colorWarningBg, border: token.colorWarningBorder }
  const danger = { color: token.colorError, background: token.colorErrorBg, border: token.colorErrorBorder }
  const items = [
    { count: s.pending_orders, label: 'Đơn chờ xác nhận', to: '/admin/orders?status=pending', icon: Receipt, tone: warning },
    { count: s.awaiting_payment, label: 'Chờ xác nhận tiền', to: '/admin/orders?awaiting_payment=1', icon: HourglassMedium, tone: warning },
    { count: s.needs_refund, label: 'Cần hoàn tiền', to: '/admin/orders?needs_refund=1', icon: ArrowCounterClockwise, tone: danger },
    { count: s.pending_returns, label: 'Trả hàng chờ duyệt', to: '/admin/returns?status=pending', icon: ArrowUUpLeft, tone: warning },
    {
      count: s.low_stock,
      label: s.out_of_stock ? `Sắp hết hàng · ${s.out_of_stock} đã hết` : 'Sắp hết hàng',
      to: '/admin/inventory?low_stock=1',
      icon: Package,
      tone: s.out_of_stock ? danger : warning,
    },
  ]

  return (
    <section aria-labelledby="todo-heading">
      <Typography.Title id="todo-heading" level={5} style={{ marginTop: 0, marginBottom: 12 }}>
        Cần xử lý
      </Typography.Title>
      <Row gutter={[16, 16]}>
        {items.map(({ count, label, to, icon, tone }) => {
          const active = count > 0
          return (
            <Col key={to} flex="1 1 200px">
              <Link to={to} aria-label={`${count} ${label.toLowerCase()} — xem danh sách`}>
                <Card
                  hoverable
                  size="small"
                  style={{
                    height: '100%',
                    borderColor: active ? tone.border : undefined,
                    background: active ? tone.background : undefined,
                  }}
                >
                  <Flex align="center" gap={12}>
                    <IconBadge
                      icon={icon}
                      size={40}
                      color={active ? tone.color : token.colorTextTertiary}
                      background={active ? token.colorBgContainer : token.colorFillTertiary}
                    />
                    <Flex vertical style={{ minWidth: 0, flex: 1 }}>
                      <Typography.Text strong style={{ fontSize: 22, lineHeight: 1.2, ...TABULAR }} type={active ? undefined : 'secondary'}>
                        {count}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                        {label}
                      </Typography.Text>
                    </Flex>
                    <ArrowRight aria-hidden size={16} style={{ color: token.colorTextTertiary, flexShrink: 0 }} />
                  </Flex>
                </Card>
              </Link>
            </Col>
          )
        })}
      </Row>
    </section>
  )
}

// ---------- Biểu đồ doanh thu ----------

function RevenueChart({ points }) {
  const { token } = theme.useToken()
  return (
    <Area
      data={points}
      xField="label"
      yField="revenue"
      height={280}
      autoFit
      style={{ fill: `linear-gradient(-90deg, ${SERIES_COLOR}00 0%, ${SERIES_COLOR}40 100%)` }}
      line={{ style: { stroke: SERIES_COLOR, lineWidth: 2 } }}
      axis={{
        x: { title: false, labelAutoHide: true, labelFill: token.colorTextSecondary, line: true, lineStroke: token.colorBorder, tick: false },
        y: {
          title: false,
          labelFormatter: compactVND,
          labelFill: token.colorTextSecondary,
          gridStroke: token.colorBorderSecondary,
          gridLineDash: null,
          gridStrokeOpacity: 1,
        },
      }}
      scale={{ y: { nice: true, domainMin: 0 } }}
      tooltip={{
        title: 'label',
        items: [
          { field: 'revenue', name: 'Doanh thu', valueFormatter: formatVND, color: SERIES_COLOR },
          { field: 'orders', name: 'Số đơn', color: SERIES_COLOR },
        ],
      }}
    />
  )
}

function Figure({ label, children }) {
  return (
    <Flex vertical gap={2}>
      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
        {label}
      </Typography.Text>
      <Typography.Text strong style={{ fontSize: 18, ...TABULAR }}>
        {children}
      </Typography.Text>
    </Flex>
  )
}

function RevenueCard() {
  const [range, setRange] = useState('30d')
  const query = useQuery({
    queryKey: dashboardKeys.revenue(range),
    queryFn: () => adminDashboardApi.revenue(range),
    placeholderData: (previous) => previous, // đổi khoảng: giữ biểu đồ cũ tới khi có số mới, không nháy khung trống
  })
  const unit = range === '12m' ? 'tháng' : 'ngày'

  return (
    <Card
      title="Doanh thu"
      extra={<Segmented options={RANGE_OPTIONS} value={range} onChange={setRange} aria-label="Khoảng thời gian" />}
      style={{ height: '100%' }}
    >
      <QueryState query={query} rows={7}>
        {(data) => {
          const best = data.points.reduce((top, p) => (p.revenue > top.revenue ? p : top), data.points[0])
          return (
            <>
              <Flex gap={32} wrap style={{ marginBottom: 16 }}>
                <Figure label={`Tổng ${range === '12m' ? '12 tháng' : '30 ngày'}`}>{formatVND(data.total_revenue)}</Figure>
                <Figure label="Đơn hoàn thành">{data.total_orders}</Figure>
                {best?.revenue > 0 && (
                  <Figure label={`${unit === 'ngày' ? 'Ngày' : 'Tháng'} cao nhất`}>
                    {best.label} · {formatVND(best.revenue)}
                  </Figure>
                )}
              </Flex>
              {data.total_orders === 0 ? (
                <Empty description="Chưa có đơn hoàn thành nào trong khoảng này" style={{ padding: '56px 0' }} />
              ) : (
                <RevenueChart points={data.points} />
              )}
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Tính đơn đã hoàn thành và đã thu tiền, theo ngày hoàn thành. Di chuột lên biểu đồ để xem từng {unit}.
              </Typography.Text>
            </>
          )
        }}
      </QueryState>
    </Card>
  )
}

// ---------- Trạng thái đơn ----------

/** Thanh ghép cho thấy tỉ lệ tổng thể + danh sách có nhãn/số/% (đọc được cả khi không phân biệt màu). */
function OrderStatusCard() {
  const { token } = theme.useToken()
  const query = useQuery({ queryKey: dashboardKeys.orderStatus, queryFn: adminDashboardApi.orderStatus })

  return (
    <Card title="Đơn hàng theo trạng thái" style={{ height: '100%' }}>
      <QueryState query={query} rows={6}>
        {(statuses) => {
          const total = statuses.reduce((sum, s) => sum + s.count, 0)
          const percent = (count) => (total ? Math.round((count / total) * 100) : 0)
          return (
            <Flex vertical gap={20}>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  Tổng số đơn
                </Typography.Text>
                <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.2, ...TABULAR }}>{total}</div>
              </div>
              <Flex
                gap={2}
                role="img"
                aria-label={statuses.map((s) => `${s.label} ${s.count}`).join(', ')}
                style={{ height: 12, borderRadius: 6, overflow: 'hidden', background: token.colorFillSecondary }}
              >
                {statuses
                  .filter((s) => s.count > 0)
                  .map((s) => (
                    <Tooltip key={s.value} title={`${s.label}: ${s.count} đơn (${percent(s.count)}%)`}>
                      <div style={{ flex: s.count, background: STATUS_CHART_COLORS[s.value] }} />
                    </Tooltip>
                  ))}
              </Flex>
              <Flex vertical gap={4}>
                {statuses.map((s) => (
                  <Link
                    key={s.value}
                    to={`/admin/orders?status=${s.value}`}
                    className="dashboard-row-link"
                    style={{ color: 'inherit', padding: '8px 8px', margin: '0 -8px', borderRadius: 8 }}
                  >
                    <Flex align="center" gap={10}>
                      <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_CHART_COLORS[s.value], flexShrink: 0 }} />
                      <Typography.Text style={{ flex: 1 }}>{s.label}</Typography.Text>
                      <Typography.Text strong style={TABULAR}>
                        {s.count}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ width: 40, textAlign: 'right', ...TABULAR }}>
                        {percent(s.count)}%
                      </Typography.Text>
                    </Flex>
                  </Link>
                ))}
              </Flex>
            </Flex>
          )
        }}
      </QueryState>
    </Card>
  )
}

// ---------- Bán chạy / sắp hết hàng ----------

/** Huy hiệu hạng: 3 hạng đầu vàng / bạc / đồng, còn lại xám. */
const RANK_STYLES = [
  { background: '#fdf0c4', color: '#8a6100' },
  { background: '#e9ecef', color: '#4a5056' },
  { background: '#f6dfcc', color: '#8a4b1c' },
]

function RankBadge({ rank }) {
  const { token } = theme.useToken()
  const style = RANK_STYLES[rank - 1] ?? { background: token.colorFillTertiary, color: token.colorTextSecondary }
  return (
    <Flex align="center" justify="center" style={{ width: 28, height: 28, borderRadius: 8, fontWeight: 700, fontSize: 13, ...style }}>
      {rank}
    </Flex>
  )
}

function ProductCell({ id, name, sku, thumbnail }) {
  return (
    <Flex align="center" gap={12} style={{ minWidth: 0 }}>
      <Avatar shape="square" size={40} src={thumbnail} alt="">
        {name.charAt(0)}
      </Avatar>
      <Flex vertical style={{ minWidth: 0 }}>
        <Link to={`/admin/products/${id}`}>
          <Typography.Text strong ellipsis={{ tooltip: name }} style={{ maxWidth: 240 }}>
            {name}
          </Typography.Text>
        </Link>
        {sku && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {sku}
          </Typography.Text>
        )}
      </Flex>
    </Flex>
  )
}

function TopProductsCard() {
  const { token } = theme.useToken()
  const query = useQuery({ queryKey: dashboardKeys.topProducts, queryFn: () => adminDashboardApi.topProducts(10) })
  const maxRevenue = Math.max(1, ...(query.data ?? []).map((p) => p.revenue))

  const columns = [
    { title: 'Hạng', key: 'rank', width: 56, render: (_, __, index) => <RankBadge rank={index + 1} /> },
    { title: 'Sản phẩm', key: 'product', render: (_, p) => <ProductCell id={p.product_id} name={p.name} sku={p.sku} thumbnail={p.thumbnail} /> },
    { title: 'Đã bán', dataIndex: 'quantity', align: 'right', render: (qty) => <span style={TABULAR}>{qty}</span> },
    {
      title: 'Doanh thu',
      dataIndex: 'revenue',
      align: 'right',
      width: 180,
      render: (revenue) => (
        <Flex vertical gap={4} align="flex-end">
          <Typography.Text strong style={TABULAR}>
            {formatVND(revenue)}
          </Typography.Text>
          <div aria-hidden style={{ width: 120, height: 4, borderRadius: 2, background: token.colorFillSecondary }}>
            <div style={{ width: `${(revenue / maxRevenue) * 100}%`, height: '100%', borderRadius: 2, background: SERIES_COLOR }} />
          </div>
        </Flex>
      ),
    },
  ]

  return (
    <Card
      title="Top 10 bán chạy"
      extra={<Typography.Text type="secondary">Theo số lượng, đơn đã hoàn thành</Typography.Text>}
      styles={{ body: { padding: query.error ? 24 : 0 } }}
      style={{ height: '100%' }}
    >
      {query.error ? (
        <QueryState query={query}>{() => null}</QueryState>
      ) : (
        <Table
          rowKey="product_id"
          columns={columns}
          dataSource={query.data}
          loading={query.isPending}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có đơn hoàn thành nào." /> }}
        />
      )}
    </Card>
  )
}

function LowStockCard() {
  const { token } = theme.useToken()
  const [importing, setImporting] = useState(null)
  const query = useQuery({
    queryKey: [...inventoryKeys.all, 'dashboard-low-stock'],
    queryFn: () => adminInventoryApi.list({ low_stock: 1, per_page: 6 }),
  })

  return (
    <Card
      title="Sắp hết hàng"
      extra={
        <Link to="/admin/inventory?low_stock=1">
          Xem kho <ArrowRight aria-hidden size={14} style={{ verticalAlign: -2 }} />
        </Link>
      }
      style={{ height: '100%' }}
    >
      <QueryState query={query} rows={6}>
        {({ data: products, meta, summary }) =>
          products.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tồn kho ổn, chưa có món nào sắp hết." />
          ) : (
            <Flex vertical gap={16}>
              {products.map((p) => {
                const out = p.stock === 0
                return (
                  <Flex key={p.id} align="center" gap={12}>
                    <Flex vertical gap={6} style={{ flex: 1, minWidth: 0 }}>
                      <ProductCell id={p.id} name={p.name} sku={null} thumbnail={p.thumbnail} />
                      <Flex align="center" gap={8}>
                        <Progress
                          percent={Math.min(100, (p.stock / summary.threshold) * 100)}
                          showInfo={false}
                          size="small"
                          strokeColor={out ? token.colorError : token.colorWarning}
                          style={{ flex: 1, margin: 0 }}
                          aria-label={`Tồn ${p.stock} trên ngưỡng ${summary.threshold}`}
                        />
                        <Typography.Text type={out ? 'danger' : 'warning'} strong style={{ fontSize: 12, whiteSpace: 'nowrap', ...TABULAR }}>
                          {out ? 'Hết hàng' : `Còn ${p.stock}`}
                        </Typography.Text>
                      </Flex>
                    </Flex>
                    <Button size="small" icon={<Plus aria-hidden size={14} />} onClick={() => setImporting(p)} aria-label={`Nhập hàng ${p.name}`}>
                      Nhập
                    </Button>
                  </Flex>
                )
              })}
              {meta.total > products.length && (
                <Link to="/admin/inventory?low_stock=1">
                  Xem tất cả {meta.total} sản phẩm <ArrowRight aria-hidden size={14} style={{ verticalAlign: -2 }} />
                </Link>
              )}
            </Flex>
          )
        }
      </QueryState>
      {importing && <StockAdjustModal product={importing} type="import" onClose={() => setImporting(null)} />}
    </Card>
  )
}

export default function DashboardPage() {
  const summary = useDashboardSummary()

  return (
    <Flex vertical gap={24}>
      <title>Tổng quan – Toy Store Admin</title>
      <PageHeader pendingOrders={summary.data?.pending_orders} />
      <SummaryTiles summary={summary} />
      <TodoCards summary={summary} />
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <RevenueCard />
        </Col>
        <Col xs={24} xl={8}>
          <OrderStatusCard />
        </Col>
        <Col xs={24} xl={16}>
          <TopProductsCard />
        </Col>
        <Col xs={24} xl={8}>
          <LowStockCard />
        </Col>
      </Row>
    </Flex>
  )
}
