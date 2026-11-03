/**
 * Trả về các số trang cần hiện, '…' cho khoảng bị lược: pageWindow(5, 10) → [1, '…', 4, 5, 6, '…', 10]
 */
export function pageWindow(current, last, around = 1) {
  const pages = new Set([1, last])
  for (let p = current - around; p <= current + around; p++) {
    if (p >= 1 && p <= last) pages.add(p)
  }

  const sorted = [...pages].sort((a, b) => a - b)
  const result = []
  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1] > 1) result.push('…')
    result.push(page)
  })
  return result
}
