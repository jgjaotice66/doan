import { Link } from 'react-router'
import Button from '../components/ui/Button'

export default function NotFoundPage() {
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center">
      <title>Không tìm thấy trang – Toy Store</title>
      <p className="font-display text-7xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-xl font-semibold">Không tìm thấy trang</h1>
      <p className="mt-2 text-muted">Trang bạn tìm có thể đã bị xoá hoặc đường dẫn không đúng.</p>
      <Button as={Link} to="/" className="mt-6">
        Về trang chủ
      </Button>
    </section>
  )
}
