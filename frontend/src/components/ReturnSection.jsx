import { ArrowUUpLeft, Check, CheckCircle, ChatCircleText, Clock, PlayCircle, XCircle } from '@phosphor-icons/react'
import { useState } from 'react'
import { daysLeft, isOpenReturn, RETURN_STEPS } from '../features/orders/returns'
import { cn } from '../utils/cn'
import { formatDate, formatDateTime, formatVND } from '../utils/format'
import ReturnRequestModal from './ReturnRequestModal'
import Badge from './ui/Badge'
import Button from './ui/Button'
import Card from './ui/Card'

const STATUS_BADGE = { pending: 'warning', approved: 'accent', received: 'accent', refunded: 'success', rejected: 'danger' }

/**
 * Thẻ ở cột phải trang chi tiết đơn (chỉ đơn đã hoàn thành): còn bao nhiêu ngày để trả hàng + nút gửi yêu cầu,
 * hoặc giải thích vì sao không gửi được nữa.
 */
export function ReturnEntryCard({ order }) {
  const [open, setOpen] = useState(false)
  if (order.status.value !== 'completed' || order.can_request_return === undefined) return null

  const left = daysLeft(order.return_deadline)
  const hasOpen = order.returns?.some(isOpenReturn)
  const allReturned = order.items.every((i) => (i.returnable_quantity ?? 0) === 0)

  let note = null
  if (hasOpen) note = 'Bạn đang có 1 yêu cầu trả hàng được xử lý — theo dõi tiến độ bên dưới.'
  else if (allReturned) note = 'Tất cả sản phẩm của đơn đã được trả.'
  else if (left === 0) note = `Đã hết hạn trả hàng (${formatDate(order.return_deadline)}).`

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-raised text-primary" aria-hidden>
          <ArrowUUpLeft weight="bold" className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-bold">Trả hàng</h2>
          {order.can_request_return ? (
            <p className="text-sm text-muted">
              Còn <strong className="text-fg tabular">{left} ngày</strong> để gửi yêu cầu (đến {formatDate(order.return_deadline)}) nếu sản phẩm lỗi, giao sai
              hoặc thiếu phụ kiện.
            </p>
          ) : (
            <p className="text-sm text-muted">{note}</p>
          )}
        </div>
      </div>
      {order.can_request_return && (
        <>
          <Button variant="outline" fullWidth className="mt-4" onClick={() => setOpen(true)}>
            Yêu cầu trả hàng
          </Button>
          <ReturnRequestModal order={order} open={open} onClose={() => setOpen(false)} />
        </>
      )}
    </Card>
  )
}

function ReturnTimeline({ request }) {
  const current = RETURN_STEPS.findIndex((s) => s.value === request.status.value)
  const times = [request.created_at, request.reviewed_at, request.received_at, request.refunded_at]

  return (
    <ol className="grid grid-cols-4" aria-label="Tiến trình trả hàng">
      {RETURN_STEPS.map((step, i) => {
        const done = i < current || (i === current && step.value === 'refunded')
        const active = i === current
        return (
          <li key={step.value} className="relative flex flex-col items-center gap-1.5 text-center" aria-current={active ? 'step' : undefined}>
            {i > 0 && <span aria-hidden className={cn('absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2', i <= current ? 'bg-primary' : 'bg-line')} />}
            <span
              className={cn(
                'relative z-10 flex size-7 items-center justify-center rounded-full border-2 text-xs font-bold tabular',
                done && 'border-primary bg-primary text-on-primary',
                active && !done && 'border-primary bg-surface text-primary shadow-glow',
                !done && !active && 'border-line bg-surface text-subtle',
              )}
            >
              {done ? <Check aria-hidden weight="bold" className="size-3.5" /> : i + 1}
            </span>
            <span className={cn('text-xs font-semibold', i <= current ? 'text-fg' : 'text-subtle')}>{step.label}</span>
            {times[i] && i <= current && <span className="hidden text-xs text-subtle tabular sm:block">{formatDateTime(times[i])}</span>}
          </li>
        )
      })}
    </ol>
  )
}

function ReturnCard({ request }) {
  const status = request.status.value
  const count = request.items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <Card className="space-y-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">Yêu cầu trả hàng #{request.id}</h2>
          <p className="text-sm text-muted">
            Gửi lúc <span className="tabular">{formatDateTime(request.created_at)}</span> · {request.reason.label} · {count} sản phẩm
          </p>
        </div>
        <Badge variant={STATUS_BADGE[status]}>{request.status.label}</Badge>
      </div>

      {status === 'rejected' ? (
        <div className="flex gap-3 rounded-control border border-danger/40 bg-danger/10 p-4" role="status">
          <XCircle aria-hidden weight="fill" className="size-6 shrink-0 text-danger" />
          <div>
            <p className="font-semibold text-danger">Cửa hàng đã từ chối yêu cầu này</p>
            {request.admin_note && <p className="mt-1 text-sm text-fg">Lý do: {request.admin_note}</p>}
          </div>
        </div>
      ) : (
        <ReturnTimeline request={request} />
      )}

      {status === 'approved' && (
        <div className="flex gap-3 rounded-control border border-accent/40 bg-accent/10 p-4">
          <Clock aria-hidden weight="duotone" className="size-6 shrink-0 text-accent-soft" />
          <div className="text-sm">
            <p className="font-semibold text-fg">Yêu cầu đã được duyệt — vui lòng gửi hàng về cửa hàng</p>
            <p className="mt-1 text-muted">Đóng gói kèm mã đơn. Cửa hàng hoàn tiền ngay sau khi nhận và kiểm tra hàng.</p>
          </div>
        </div>
      )}
      {status === 'refunded' && (
        <div className="flex gap-3 rounded-control border border-success/40 bg-success/10 p-4" role="status">
          <CheckCircle aria-hidden weight="fill" className="size-6 shrink-0 text-success" />
          <p className="text-sm text-fg">
            Đã hoàn <strong className="tabular">{formatVND(request.refund_amount)}</strong> vào tài khoản {request.bank_name} ·{' '}
            <span className="tabular">{request.bank_account}</span>.
          </p>
        </div>
      )}
      {request.admin_note && status !== 'rejected' && (
        <p className="flex gap-2 text-sm text-muted">
          <ChatCircleText aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            Lời nhắn của cửa hàng: <span className="text-fg">{request.admin_note}</span>
          </span>
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        {request.items.map((item) => (
          <span key={item.id} className="inline-flex items-center gap-2 rounded-full bg-raised py-1 pl-1 pr-3 text-sm">
            {item.thumbnail ? (
              <img src={item.thumbnail} alt="" width="24" height="24" className="size-6 rounded-full object-cover" />
            ) : (
              <span className="size-6 rounded-full bg-line" aria-hidden />
            )}
            <span className="max-w-48 truncate">{item.product_name}</span>
            <span className="text-muted tabular">×{item.quantity}</span>
          </span>
        ))}
        {request.media.map((media, index) => (
          <a
            key={media.id}
            href={media.url}
            target="_blank"
            rel="noreferrer"
            className="relative size-12 overflow-hidden rounded-control border border-line bg-raised transition-colors hover:border-primary"
            aria-label={`Xem ${media.type === 'video' ? 'video' : 'ảnh'} bằng chứng ${index + 1}`}
          >
            {media.type === 'video' ? (
              <PlayCircle aria-hidden weight="fill" className="m-auto mt-3 size-6 text-accent-soft" />
            ) : (
              <img src={media.url} alt="" className="size-full object-cover" loading="lazy" />
            )}
          </a>
        ))}
      </div>
    </Card>
  )
}

/** Danh sách yêu cầu trả hàng của đơn (mới nhất trước). */
export function ReturnList({ returns }) {
  if (!returns?.length) return null
  return (
    <section className="space-y-4" aria-label="Yêu cầu trả hàng">
      {returns.map((request) => (
        <ReturnCard key={request.id} request={request} />
      ))}
    </section>
  )
}
