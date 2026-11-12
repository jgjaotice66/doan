import { useShopPolicies } from '../features/catalog/useShopPolicies'
import { cn } from '../utils/cn'

/** Khối cam kết (ship, đổi trả, thanh toán) dưới nút mua ở trang chi tiết sản phẩm. */
export default function ShopPolicies({ className }) {
  const policies = useShopPolicies()

  return (
    <ul className={cn('divide-y divide-line rounded-card border border-line bg-surface', className)}>
      {policies.map(({ icon: Icon, title, text }) => (
        <li key={text} className="flex items-start gap-3 p-4">
          <Icon aria-hidden className="mt-0.5 size-6 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-fg">{title}</p>
            <p className="text-sm text-muted">{text}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
