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

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * Chuỗi ISO -> "8 tháng 11, 2026"
 */
export function formatDate(value) {
  return value ? dateFormatter.format(new Date(value)) : ''
}

/**
 * Số điện thoại dễ đọc: 0901234567 → "0901 234 567", 02838123456 → "028 3812 3456", 19001234 → "1900 1234"
 */
export function formatHotline(number) {
  if (/^1[89]00/.test(number)) return `${number.slice(0, 4)} ${number.slice(4)}`
  return number.length === 10
    ? `${number.slice(0, 4)} ${number.slice(4, 7)} ${number.slice(7)}`
    : `${number.slice(0, 3)} ${number.slice(3, 7)} ${number.slice(7)}`
}
