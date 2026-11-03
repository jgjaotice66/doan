import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { formatVND } from '../../utils/format'

/**
 * Trang chủ tạm: kiểm tra frontend gọi được API (làm thật ở task 15).
 */
export default function HomePage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['ping'],
    queryFn: () => api.get('/ping').then((res) => res.data),
  })

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 text-center space-y-2">
      <h1 className="text-3xl font-bold">Toy Store</h1>
      <p className="text-muted">Ví dụ giá: {formatVND(1250000)}</p>
      <p>
        API:{' '}
        {isPending ? 'đang kết nối…' : isError ? (
          <span className="text-danger">không kết nối được</span>
        ) : (
          <span className="text-success">{data.status}</span>
        )}
      </p>
    </section>
  )
}
