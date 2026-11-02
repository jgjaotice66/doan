const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

/**
 * 1250000 -> "1.250.000 ₫"
 */
export function formatVND(amount) {
  return vndFormatter.format(Number(amount) || 0)
}

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
})

/**
 * Chuỗi ISO -> "02/11/2026, 14:30"
 */
export function formatDateTime(value) {
  return value ? dateTimeFormatter.format(new Date(value)) : ''
}
