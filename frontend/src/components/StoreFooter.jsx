import { Phone } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { useCategories, useShopInfo } from '../features/catalog/queries'
import { useShopPolicies } from '../features/catalog/useShopPolicies'
import { formatHotline } from '../utils/format'

const linkClass = 'inline-flex min-h-9 items-center text-sm text-muted transition-colors hover:text-primary'

function Column({ title, children }) {
  return (
    <div>
      <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-fg">{title}</h2>
      {children}
    </div>
  )
}

/**
 * Footer storefront: giới thiệu · danh mục · chính sách (lấy từ cấu hình thật) · liên hệ.
 */
export default function StoreFooter() {
  const { data: categories } = useCategories()
  const { data: shop } = useShopInfo()
  const policies = useShopPolicies()

  return (
    // pb lớn hơn trên điện thoại: chừa chỗ cho cụm nút nổi góc dưới bên phải.
    <footer className="border-t border-line bg-surface pb-24 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1.3fr_1fr]">
        <div className="space-y-3">
          <Link to="/" className="font-display text-xl font-bold tracking-wide text-primary">
            TOY<span className="text-fg">STORE</span>
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            Đồ chơi sưu tầm chính hãng: figure, Gundam, LEGO, Funko… nhập trực tiếp từ hãng, đóng gói kỹ cho tủ trưng bày của bạn.
          </p>
        </div>

        <Column title="Danh mục">
          <ul className="grid grid-cols-2 gap-x-4 sm:grid-cols-1">
            {(categories ?? []).map((category) => (
              <li key={category.id}>
                <Link to={`/products?category=${category.slug}`} className={linkClass}>
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </Column>

        <Column title="Chính sách">
          <ul className="space-y-3">
            {policies.map(({ icon: Icon, title, text }) => (
              <li key={text} className="flex gap-2.5">
                <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium text-fg">{title}</p>
                  <p className="text-sm text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Column>

        <Column title="Hỗ trợ">
          <ul>
            {shop?.hotline && (
              <li>
                <a href={`tel:${shop.hotline}`} className="mb-2 inline-flex min-h-11 items-center gap-2 font-semibold text-fg hover:text-primary">
                  <Phone aria-hidden weight="fill" className="size-5 text-primary" />
                  <span className="tabular">{formatHotline(shop.hotline)}</span>
                </a>
              </li>
            )}
            <li>
              <Link to="/orders" className={linkClass}>
                Tra cứu đơn hàng
              </Link>
            </li>
            <li>
              <Link to="/wishlist" className={linkClass}>
                Danh sách yêu thích
              </Link>
            </li>
            <li>
              <Link to="/news" className={linkClass}>
                Tin tức &amp; hướng dẫn
              </Link>
            </li>
            <li>
              <Link to="/account" className={linkClass}>
                Tài khoản
              </Link>
            </li>
          </ul>
        </Column>
      </div>

      <p className="border-t border-line px-4 py-5 text-center text-sm text-muted">
        © {new Date().getFullYear()} Toy Store – Đồ chơi sưu tầm
      </p>
    </footer>
  )
}
