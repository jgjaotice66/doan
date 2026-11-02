import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl font-extrabold">404</p>
      <h1 className="mt-4 text-xl font-semibold">Không tìm thấy trang</h1>
      <p className="mt-2 opacity-70">Trang bạn tìm có thể đã bị xoá hoặc đường dẫn không đúng.</p>
      <Link to="/" className="mt-6 inline-block rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900">
        Về trang chủ
      </Link>
    </section>
  )
}
