/** Luật ảnh dùng chung — khớp với validate của backend (jpg/png/webp, ≤ 2MB, ≤ 10 ảnh/sản phẩm). */
export const IMAGE_ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
export const IMAGE_MAX_MB = 2
export const MAX_PRODUCT_IMAGES = 10

/** Trả câu lỗi nếu file không hợp lệ, null nếu dùng được. maxMb: mặc định 2MB (banner 10MB). */
export function checkImageFile(file, maxMb = IMAGE_MAX_MB) {
  if (!IMAGE_ACCEPT.includes(file.type)) return `"${file.name}": chỉ nhận ảnh jpg, png hoặc webp.`
  if (file.size > maxMb * 1024 * 1024) return `"${file.name}": ảnh tối đa ${maxMb}MB.`
  return null
}

/** File → data URL để xem trước (không cần object URL / thu hồi). */
export function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
