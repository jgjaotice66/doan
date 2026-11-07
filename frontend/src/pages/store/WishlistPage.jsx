import { Heart } from '@phosphor-icons/react'
import { Link } from 'react-router'
import ProductGrid from '../../components/ProductGrid'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import { useWishlist } from '../../features/wishlist/queries'

function EmptyWishlist() {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <Heart aria-hidden className="size-14 text-subtle" />
      <h2 className="text-lg font-bold">Chưa có sản phẩm yêu thích</h2>
      <p className="max-w-md text-muted">Bấm vào biểu tượng trái tim trên sản phẩm để lưu lại những mẫu bạn muốn săn.</p>
      <Button as={Link} to="/products" className="mt-2">
        Khám phá sản phẩm
      </Button>
    </Card>
  )
}

export default function WishlistPage() {
  const { data: products, isPending, error, refetch } = useWishlist()
  const count = products?.length ?? 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      <title>Yêu thích – Toy Store</title>
      <div className="mb-6 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Yêu thích</h1>
        {count > 0 && <span className="text-muted tabular">{count} sản phẩm</span>}
      </div>

      {!isPending && !error && count === 0 ? (
        <EmptyWishlist />
      ) : (
        <ProductGrid products={products} isPending={isPending} error={error} onRetry={refetch} skeletonCount={4} />
      )}
    </div>
  )
}
