import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

/**
 * Tham số bảng admin (tìm kiếm, bộ lọc, trang) lưu trên URL → F5 / gửi link vẫn giữ nguyên.
 *
 *   const { params, setParams } = useTableParams()
 *   params   // { page: 2, q: 'gundam', status: 'pending' }
 *   setParams({ status: 'paid' })   // đổi lọc → tự về trang 1; giá trị rỗng thì bỏ khỏi URL
 */
export function useTableParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const params = useMemo(() => {
    const result = Object.fromEntries(searchParams)
    result.page = Math.max(1, Number(result.page) || 1)
    if (result.per_page) result.per_page = Number(result.per_page) || undefined
    return result
  }, [searchParams])

  const setParams = useCallback(
    (patch) =>
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        Object.entries(patch).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') next.delete(key)
          else next.set(key, String(value))
        })
        // Đổi tìm kiếm / bộ lọc thì kết quả khác hẳn → quay về trang 1.
        if (!('page' in patch)) next.delete('page')
        if (next.get('page') === '1') next.delete('page')
        return next
      }),
    [setSearchParams],
  )

  return { params, setParams }
}
