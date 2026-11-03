/**
 * Ghép class Tailwind, bỏ qua giá trị rỗng/false: cn('a', cond && 'b')
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
