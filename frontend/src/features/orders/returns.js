import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { catalogApi } from '../../api/catalog'
import { ordersApi } from '../../api/orders'
import { orderKeys } from './queries'

/** Khớp với StoreReturnRequest ở backend. */
export const RETURN_LIMITS = {
  maxFiles: 5,
  imageMaxMB: 5,
  videoMaxMB: 50,
  imageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  videoTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
}

export const EVIDENCE_ACCEPT = [...RETURN_LIMITS.imageTypes, ...RETURN_LIMITS.videoTypes].join(',')

export const RETURN_REASONS = [
  { value: 'defective', label: 'Lỗi / hỏng', hint: 'Gãy, nứt, trầy, không hoạt động' },
  { value: 'wrong_item', label: 'Giao sai sản phẩm', hint: 'Khác mẫu, màu hoặc phiên bản đã đặt' },
  { value: 'missing_parts', label: 'Thiếu phụ kiện', hint: 'Thiếu chi tiết, đế, sách hướng dẫn' },
  { value: 'other', label: 'Lý do khác', hint: 'Mô tả cụ thể giúp shop xử lý nhanh hơn' },
]

/** 4 bước của yêu cầu (Từ chối hiện riêng). */
export const RETURN_STEPS = [
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'received', label: 'Đã nhận hàng' },
  { value: 'refunded', label: 'Đã hoàn tiền' },
]

export const isOpenReturn = (request) => !['refunded', 'rejected'].includes(request.status.value)

/**
 * Kiểm tra 1 tệp bằng chứng ngay khi chọn (server kiểm tra lại) → chuỗi lỗi hoặc null.
 */
export function checkEvidenceFile(file) {
  const isImage = RETURN_LIMITS.imageTypes.includes(file.type)
  const isVideo = RETURN_LIMITS.videoTypes.includes(file.type)
  if (!isImage && !isVideo) return `“${file.name}”: chỉ nhận ảnh jpg, png, webp hoặc video mp4, webm, mov.`
  const maxMB = isImage ? RETURN_LIMITS.imageMaxMB : RETURN_LIMITS.videoMaxMB
  if (file.size > maxMB * 1024 * 1024) return `“${file.name}”: ${isImage ? 'ảnh' : 'video'} tối đa ${maxMB} MB.`
  return null
}

/** Số ngày còn lại tới hạn (làm tròn lên); hết hạn → 0. */
export function daysLeft(deadline, now = Date.now()) {
  if (!deadline) return 0
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 86_400_000))
}

export const formatFileSize = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)

export const useBanks = () => useQuery({ queryKey: ['banks'], queryFn: catalogApi.banks, staleTime: Infinity })

/**
 * Gửi yêu cầu: { formData, onProgress } → xong thì tải lại chi tiết đơn (hiện thẻ tiến độ, ẩn nút gửi).
 */
export function useRequestReturn(code) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ formData, onProgress }) => ordersApi.requestReturn(code, formData, onProgress),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.detail(code) }),
    onError: (error) => {
      // 422 do đơn (hết hạn / đã có yêu cầu mở) → tải lại để hiện trạng thái thật.
      if (error.response?.data?.errors?.order) queryClient.invalidateQueries({ queryKey: orderKeys.detail(code) })
    },
  })
}
