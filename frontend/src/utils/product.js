/**
 * Phần trăm giảm giá làm tròn, null nếu không giảm: discountPercent(500000, 400000) → 20
 */
export function discountPercent(price, salePrice) {
  if (salePrice == null || salePrice >= price) return null
  return Math.round((1 - salePrice / price) * 100)
}

/** Các mốc độ tuổi hợp lệ — khớp Product::AGE_GROUPS ở backend. */
export const AGE_GROUPS = [0, 3, 6, 8, 14, 18]

/**
 * Nhãn độ tuổi: 0 → 'Mọi lứa tuổi', 14 → '14+'
 */
export function ageLabel(minAge) {
  return minAge ? `${minAge}+` : 'Mọi lứa tuổi'
}
