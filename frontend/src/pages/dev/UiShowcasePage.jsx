import { ShoppingCartSimple } from '@phosphor-icons/react'
import { useState } from 'react'
import Price from '../../components/Price'
import ProductCard, { ProductCardSkeleton } from '../../components/ProductCard'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import Skeleton from '../../components/ui/Skeleton'
import { toast } from '../../stores/toastStore'

/**
 * Trang kiểm tra design system — chỉ có ở môi trường dev (npm run dev).
 */

const SWATCHES = [
  ['bg', 'bg-bg'],
  ['surface', 'bg-surface'],
  ['raised', 'bg-raised'],
  ['line', 'bg-line'],
  ['control', 'bg-control'],
  ['fg', 'bg-fg'],
  ['muted', 'bg-muted'],
  ['subtle', 'bg-subtle'],
  ['primary', 'bg-primary'],
  ['primary-hover', 'bg-primary-hover'],
  ['accent', 'bg-accent'],
  ['accent-soft', 'bg-accent-soft'],
  ['success', 'bg-success'],
  ['warning', 'bg-warning'],
  ['danger', 'bg-danger'],
  ['danger-strong', 'bg-danger-strong'],
]

const img = (text) => `https://placehold.co/800x800/1a1c22/f5b83d?text=${encodeURIComponent(text)}`
const brand = (name) => ({ id: 1, name, slug: name.toLowerCase(), logo: null })

const SAMPLE_PRODUCTS = [
  { id: 1, slug: 'mg-rx-78-2', name: 'MG 1/100 RX-78-2 Gundam Ver.3.0', price: 1250000, sale_price: null, thumbnail: img('MG RX-78-2'), in_stock: true, low_stock: false, brand: brand('Bandai') },
  { id: 2, slug: 'iron-man', name: 'Hot Toys Iron Man Mark LXXXV 1/6 – phiên bản giới hạn có đèn LED', price: 8990000, sale_price: 7490000, thumbnail: img('Iron Man'), in_stock: true, low_stock: false, brand: brand('Hot Toys') },
  { id: 3, slug: 'lego-falcon', name: 'LEGO Star Wars Millennium Falcon', price: 4290000, sale_price: 3860000, thumbnail: img('LEGO'), in_stock: true, low_stock: true, brand: brand('LEGO') },
  { id: 4, slug: 'nendoroid', name: 'Nendoroid Hatsune Miku', price: 1150000, sale_price: null, thumbnail: img('Nendoroid'), in_stock: false, low_stock: false, brand: brand('Good Smile') },
  { id: 5, slug: 'khong-anh', name: 'Sản phẩm chưa có ảnh', price: 350000, sale_price: null, thumbnail: null, in_stock: true, low_stock: false, brand: brand('Tamiya') },
]

function Section({ title, children }) {
  return (
    <section className="space-y-4">
      <h2 className="border-b border-line pb-2 text-xl font-bold">{title}</h2>
      {children}
    </section>
  )
}

export default function UiShowcasePage() {
  const [page, setPage] = useState(5)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [wishlist, setWishlist] = useState(new Set([2]))

  const toggleWishlist = (product) =>
    setWishlist((prev) => {
      const next = new Set(prev)
      if (next.has(product.id)) next.delete(product.id)
      else next.add(product.id)
      return next
    })

  const fakeLoad = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 1500)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-10">
      <header>
        <Badge variant="accent">Chỉ có ở môi trường dev</Badge>
        <h1 className="mt-3 text-3xl font-bold">Design system – Mecha Gold</h1>
        <p className="mt-2 text-muted">Tất cả component dùng chung của storefront.</p>
      </header>

      <Section title="Màu (token)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {SWATCHES.map(([name, cls]) => (
            <div key={name} className="space-y-1">
              <div className={`h-14 rounded-control border border-line ${cls}`} />
              <p className="text-xs text-muted">{name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Chữ">
        <div className="space-y-2">
          <p className="font-display text-4xl font-bold">Chakra Petch – Tiêu đề đậm chất mecha</p>
          <p className="text-lg">Be Vietnam Pro – Nội dung: Mô hình Gundam lắp ráp tỉ lệ 1/100, chi tiết sắc nét.</p>
          <p className="text-muted">Chữ phụ (muted): Giao hàng toàn quốc, đổi trả trong 7 ngày.</p>
          <p className="text-sm text-subtle">Chữ mờ (subtle): Cập nhật lúc 10:30, 03/11/2026.</p>
          <p className="text-accent-soft">Link / nhấn phụ (accent-soft)</p>
        </div>
      </Section>

      <Section title="Button">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Xoá</Button>
          <Button disabled>Disabled</Button>
          <Button loading={loading} onClick={fakeLoad}>
            {loading ? 'Đang xử lý…' : 'Bấm để thử loading'}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Nhỏ</Button>
          <Button size="md">Vừa</Button>
          <Button size="lg">
            <ShoppingCartSimple aria-hidden className="size-5" />
            Thêm vào giỏ
          </Button>
          <Button size="icon" variant="secondary" aria-label="Giỏ hàng">
            <ShoppingCartSimple aria-hidden className="size-5" />
          </Button>
        </div>
      </Section>

      <Section title="Input">
        <div className="grid max-w-3xl gap-4 sm:grid-cols-3">
          <Input label="Họ tên" placeholder="Nguyễn Văn A" />
          <Input label="Số điện thoại" hint="10–11 số, bắt đầu bằng 0" inputMode="numeric" />
          <Input label="Email" defaultValue="sai-email" error="Email không hợp lệ" />
        </div>
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge>
          <Badge variant="primary">-20%</Badge>
          <Badge variant="accent">Mới</Badge>
          <Badge variant="success">Đã thanh toán</Badge>
          <Badge variant="warning">Sắp hết</Badge>
          <Badge variant="danger">Hết hàng</Badge>
        </div>
      </Section>

      <Section title="Card & Price">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <h3 className="font-bold">Card thường</h3>
            <p className="mt-1 text-sm text-muted">Bề mặt surface, viền line.</p>
          </Card>
          <Card interactive className="p-5">
            <h3 className="font-bold">Card interactive</h3>
            <p className="mt-1 text-sm text-muted">Di chuột vào để thấy viền vàng.</p>
          </Card>
          <Card className="space-y-2 p-5">
            <Price price={500000} size="md" />
            <Price price={8990000} salePrice={7490000} size="lg" />
          </Card>
        </div>
      </Section>

      <Section title="Skeleton">
        <div className="max-w-md space-y-2">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </Section>

      <Section title="ProductCard">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {SAMPLE_PRODUCTS.map((p) => (
            <ProductCard key={p.id} product={p} wishlisted={wishlist.has(p.id)} onToggleWishlist={toggleWishlist} />
          ))}
          <ProductCardSkeleton />
        </div>
      </Section>

      <Section title="Pagination">
        <Pagination page={page} lastPage={10} onPageChange={setPage} />
        <p className="text-center text-sm text-muted">Đang ở trang {page}</p>
      </Section>

      <Section title="Modal & Toast">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setModalOpen(true)}>
            Mở modal
          </Button>
          <Button variant="secondary" onClick={() => toast.success('Đã thêm vào giỏ hàng')}>
            Toast thành công
          </Button>
          <Button variant="secondary" onClick={() => toast.error('Sản phẩm đã hết hàng')}>
            Toast lỗi
          </Button>
          <Button variant="secondary" onClick={() => toast.info('Đơn hàng đang được xử lý')}>
            Toast thông tin
          </Button>
        </div>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Huỷ đơn hàng?"
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Giữ đơn
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setModalOpen(false)
                  toast.success('Đã huỷ đơn hàng')
                }}
              >
                Huỷ đơn
              </Button>
            </>
          }
        >
          Đơn <strong className="text-fg">TS-20261103-0001</strong> sẽ bị huỷ và hàng được hoàn lại kho. Thao tác này không thể hoàn tác.
        </Modal>
      </Section>
    </div>
  )
}
