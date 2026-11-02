import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { formatVND } from '../../utils/format'

/**
 * Trang chủ tạm: kiểm tra frontend gọi được API.
 */
export default function HomePage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['ping'],
    queryFn: () => api.get('/ping').then((res) => res.data),
  })

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Toy Store</h1>
        <p className="text-slate-400">Ví dụ giá: {formatVND(1250000)}</p>
        <p>
          API:{' '}
          {isPending ? 'đang kết nối…' : isError ? (
            <span className="text-red-400">không kết nối được</span>
          ) : (
            <span className="text-emerald-400">{data.status}</span>
          )}
        </p>
      </div>
    </main>
  )
}
