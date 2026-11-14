import { ChatCircleDots, Moon, Phone, Sun } from '@phosphor-icons/react'
import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import { useShopInfo } from '../features/catalog/queries'
import { useTheme } from '../utils/theme'
import { cn } from '../utils/cn'
import { formatHotline } from '../utils/format'

// Tách bundle: khung chat chỉ tải khi khách bấm mở lần đầu.
const ChatPanel = lazy(() => import('./chat/ChatPanel'))

const buttonClass =
  'relative inline-flex size-12 cursor-pointer items-center justify-center rounded-full shadow-glow motion-safe:transition-colors'

/** Nhãn bung sang trái khi di chuột / focus bàn phím (trên điện thoại bấm là thực hiện luôn). */
function HoverLabel({ children, className }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-control border border-line bg-raised px-3 py-1.5 text-sm font-semibold text-fg opacity-0 shadow-glow',
        'translate-x-2 motion-safe:transition motion-safe:duration-200 motion-safe:ease-out-soft',
        'group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100',
        className,
      )}
    >
      {children}
    </span>
  )
}

/**
 * Cụm nút nổi góc dưới bên phải storefront: đổi giao diện sáng / tối, gọi hotline và mở chatbot.
 * Nút gọi chỉ hiện khi admin đã nhập số ở Cài đặt. Mở chat thì cả cụm ẩn đi (khung chat nằm đúng chỗ đó).
 */
export default function FloatingActions() {
  const [theme, toggleTheme] = useTheme()
  const { data: shop } = useShopInfo()
  const hotline = shop?.hotline
  const toLight = theme === 'dark'
  const themeLabel = toLight ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'
  const [chatOpen, setChatOpen] = useState(false)
  const chatButtonRef = useRef(null)

  const closeChat = useCallback(() => {
    setChatOpen(false)
    // Đợi cụm nút hiện lại rồi mới trả focus về nút mở chat.
    requestAnimationFrame(() => chatButtonRef.current?.focus())
  }, [])

  return (
    <>
      {chatOpen && (
        <Suspense fallback={null}>
          <ChatPanel onClose={closeChat} />
        </Suspense>
      )}
      {/* --fab-offset: chừa chỗ cho thanh mua hàng dính đáy trên điện thoại (index.css). */}
      <div
        hidden={chatOpen}
        className="fixed right-4 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+var(--fab-offset,0px))] z-40 flex flex-col items-end gap-3"
      >
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={themeLabel}
          className={cn(buttonClass, 'group border border-line bg-raised text-fg hover:border-primary hover:text-primary')}
        >
          {toLight ? <Sun aria-hidden weight="bold" className="size-6" /> : <Moon aria-hidden weight="bold" className="size-6" />}
          <HoverLabel>{toLight ? 'Giao diện sáng' : 'Giao diện tối'}</HoverLabel>
        </button>

        {hotline && (
          <a
            href={`tel:${hotline}`}
            aria-label={`Gọi hotline ${formatHotline(hotline)}`}
            className={cn(buttonClass, 'group bg-primary text-on-primary hover:bg-primary-hover')}
          >
            <Phone aria-hidden weight="fill" className="size-6" />
            <HoverLabel className="tabular">
              <span className="mr-1.5 font-normal text-muted">Hotline</span>
              {formatHotline(hotline)}
            </HoverLabel>
          </a>
        )}

        <button
          ref={chatButtonRef}
          type="button"
          onClick={() => setChatOpen(true)}
          aria-label="Mở trò chuyện với trợ lý"
          aria-haspopup="dialog"
          className={cn(buttonClass, 'group bg-accent text-on-primary hover:bg-accent-soft')}
        >
          <ChatCircleDots aria-hidden weight="fill" className="size-6" />
          <HoverLabel>Hỏi trợ lý</HoverLabel>
        </button>
      </div>
    </>
  )
}
