import { ArrowClockwise, ArrowCounterClockwise, ArrowRight, ImageBroken, PaperPlaneRight, Phone, Robot, X } from '@phosphor-icons/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useChat } from '../../features/chat/useChat'
import { cn } from '../../utils/cn'
import { formatDate, formatVND } from '../../utils/format'
import OrderStatusBadge from '../OrderStatusBadge'
import Price from '../Price'

/** Trên điện thoại khung chat phủ kín màn hình → bấm link sang trang khác thì đóng lại để thấy trang. */
const isFullScreen = () => window.matchMedia('(max-width: 47.99rem)').matches

function BotAvatar() {
  return (
    <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/40">
      <Robot weight="fill" className="size-4.5" />
    </span>
  )
}

function ProductRow({ product, onNavigate }) {
  return (
    <li>
      <Link
        to={`/products/${product.slug}`}
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-control border border-line bg-surface p-2 hover:border-primary motion-safe:transition-colors"
      >
        <span className="size-14 shrink-0 overflow-hidden rounded-control bg-raised">
          {product.thumbnail ? (
            <img src={product.thumbnail} alt="" width="56" height="56" loading="lazy" className="size-full object-cover" />
          ) : (
            <ImageBroken aria-hidden className="m-auto mt-4 size-6 text-subtle" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-semibold text-fg">{product.name}</span>
          <span className="mt-0.5 flex items-center gap-2">
            <Price price={product.price} salePrice={product.sale_price} size="sm" />
            {!product.in_stock && <span className="text-xs font-semibold text-danger">Hết hàng</span>}
          </span>
        </span>
      </Link>
    </li>
  )
}

function OrderRow({ order, onNavigate }) {
  return (
    <li>
      <Link
        to={`/orders/${order.code}`}
        onClick={onNavigate}
        className="flex items-center justify-between gap-3 rounded-control border border-line bg-surface p-3 hover:border-primary motion-safe:transition-colors"
      >
        <span className="min-w-0">
          <span className="block font-semibold text-fg tabular">{order.code}</span>
          <span className="text-xs text-muted tabular">
            {formatDate(order.created_at)} · {order.item_count} SP
          </span>
        </span>
        <span className="flex flex-col items-end gap-1">
          <OrderStatusBadge status={order.status} />
          <span className="text-sm font-bold text-fg tabular">{formatVND(order.total)}</span>
        </span>
      </Link>
    </li>
  )
}

function ActionLink({ link, onNavigate }) {
  const className =
    'inline-flex min-h-11 items-center gap-1.5 rounded-control border border-control px-3 text-sm font-semibold text-fg hover:border-primary hover:text-primary motion-safe:transition-colors'

  if (link.to.startsWith('tel:')) {
    return (
      <a href={link.to} className={className}>
        <Phone aria-hidden weight="fill" className="size-4" />
        {link.label}
      </a>
    )
  }

  return (
    <Link to={link.to} onClick={onNavigate} className={className}>
      {link.label}
      <ArrowRight aria-hidden weight="bold" className="size-4" />
    </Link>
  )
}

function BotMessage({ message, onNavigate }) {
  return (
    <div className="flex items-start gap-2">
      <BotAvatar />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="w-fit max-w-full rounded-card rounded-tl-sm bg-raised px-3.5 py-2.5 text-[0.9375rem] leading-relaxed text-fg [overflow-wrap:anywhere]">
          {message.text}
        </p>
        {message.products?.length > 0 && (
          <ul className="space-y-2" aria-label="Sản phẩm gợi ý">
            {message.products.map((product) => (
              <ProductRow key={product.id} product={product} onNavigate={onNavigate} />
            ))}
          </ul>
        )}
        {message.orders?.length > 0 && (
          <ul className="space-y-2" aria-label="Đơn hàng">
            {message.orders.map((order) => (
              <OrderRow key={order.code} order={order} onNavigate={onNavigate} />
            ))}
          </ul>
        )}
        {message.link && <ActionLink link={message.link} onNavigate={onNavigate} />}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <BotAvatar />
      <p className="flex h-10 items-center gap-1 rounded-card rounded-tl-sm bg-raised px-4">
        <span className="sr-only">Trợ lý đang trả lời…</span>
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            aria-hidden
            className="size-1.5 rounded-full bg-muted motion-safe:animate-typing"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </p>
    </div>
  )
}

/**
 * Khung chat với trợ lý tự động. Máy tính: khung nổi góc phải dưới; điện thoại: phủ kín màn hình.
 * Esc hoặc nút X để đóng (focus trả về nút mở — do ChatLauncher lo).
 */
export default function ChatPanel({ onClose }) {
  const { messages, send, retry, reset, pending } = useChat()
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)
  const logRef = useRef(null)
  const lastBot = messages.findLast((m) => m.from === 'bot')

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Luôn cuộn xuống tin mới nhất.
  useLayoutEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [messages, pending])

  const onNavigate = () => isFullScreen() && onClose()

  const submit = (event) => {
    event.preventDefault()
    if (!draft.trim() || pending) return
    send(draft)
    setDraft('')
  }

  const ask = (text) => {
    send(text)
    inputRef.current?.focus()
  }

  return (
    <section
      role="dialog"
      aria-label="Trò chuyện với trợ lý Toy Store"
      className={cn(
        'fixed inset-0 z-50 flex flex-col bg-bg',
        'md:inset-auto md:right-4 md:bottom-[calc(max(1rem,env(safe-area-inset-bottom))+var(--fab-offset,0px))] md:h-[min(38rem,calc(100dvh-2rem))] md:w-[24rem]',
        'md:overflow-hidden md:rounded-card md:border md:border-line md:shadow-glow',
        'origin-bottom-right motion-safe:animate-chat-in',
      )}
    >
      <header className="flex items-center gap-3 border-b border-line bg-header px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:pt-3">
        <BotAvatar />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-bold leading-tight text-fg">Trợ lý Toy Store</h2>
          <p className="truncate text-xs text-muted">Trả lời tự động từ dữ liệu shop</p>
        </div>
        <button
          type="button"
          onClick={() => {
            reset()
            inputRef.current?.focus()
          }}
          aria-label="Bắt đầu cuộc trò chuyện mới"
          title="Bắt đầu lại"
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-control text-muted hover:bg-raised hover:text-fg"
        >
          <ArrowCounterClockwise aria-hidden weight="bold" className="size-5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng khung chat"
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-control text-muted hover:bg-raised hover:text-fg"
        >
          <X aria-hidden weight="bold" className="size-5" />
        </button>
      </header>

      <div ref={logRef} role="log" aria-live="polite" aria-relevant="additions" className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
        {messages.map((message) => {
          if (message.from === 'user') {
            return (
              <p
                key={message.id}
                className="ml-auto w-fit max-w-[85%] rounded-card rounded-br-sm bg-primary px-3.5 py-2.5 text-[0.9375rem] leading-relaxed text-on-primary [overflow-wrap:anywhere]"
              >
                <span className="sr-only">Bạn: </span>
                {message.text}
              </p>
            )
          }
          if (message.from === 'error') {
            return (
              <div key={message.id} role="alert" className="flex flex-wrap items-center gap-2 rounded-card border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-fg">
                <span className="flex-1">{message.text}</span>
                <button
                  type="button"
                  onClick={retry}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-control px-2 font-semibold text-danger hover:bg-danger/10"
                >
                  <ArrowClockwise aria-hidden weight="bold" className="size-4" />
                  Thử lại
                </button>
              </div>
            )
          }
          return <BotMessage key={message.id} message={message} onNavigate={onNavigate} />
        })}
        {pending && <TypingIndicator />}
      </div>

      {!pending && lastBot?.suggestions?.length > 0 && messages.at(-1) === lastBot && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]" aria-label="Câu hỏi gợi ý" role="group">
          {lastBot.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => ask(suggestion)}
              className="min-h-9 shrink-0 cursor-pointer rounded-full border border-control px-3 text-sm text-fg hover:border-primary hover:text-primary motion-safe:transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-line bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-3">
        <label htmlFor="chat-input" className="sr-only">
          Nhập câu hỏi
        </label>
        <input
          id="chat-input"
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={500}
          autoComplete="off"
          enterKeyHint="send"
          placeholder="Hỏi về sản phẩm, đơn hàng…"
          className="h-11 min-w-0 flex-1 rounded-control border border-control bg-bg px-3 text-base text-fg placeholder:text-subtle transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          disabled={!draft.trim() || pending}
          aria-label="Gửi"
          className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-control bg-primary text-on-primary hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PaperPlaneRight aria-hidden weight="fill" className="size-5" />
        </button>
      </form>
    </section>
  )
}
