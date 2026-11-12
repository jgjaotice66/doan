import { Moon, Phone, Sun } from '@phosphor-icons/react'
import { useShopInfo } from '../features/catalog/queries'
import { useTheme } from '../utils/theme'
import { cn } from '../utils/cn'
import { formatHotline } from '../utils/format'

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
 * Cụm nút nổi góc dưới bên phải storefront: đổi giao diện sáng / tối và gọi hotline.
 * Nút gọi chỉ hiện khi admin đã nhập số ở Cài đặt.
 */
export default function FloatingActions() {
  const [theme, toggleTheme] = useTheme()
  const { data: shop } = useShopInfo()
  const hotline = shop?.hotline
  const toLight = theme === 'dark'
  const themeLabel = toLight ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'

  return (
    // --fab-offset: chừa chỗ cho thanh mua hàng dính đáy trên điện thoại (index.css).
    <div className="fixed right-4 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+var(--fab-offset,0px))] z-40 flex flex-col items-end gap-3">
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
    </div>
  )
}
