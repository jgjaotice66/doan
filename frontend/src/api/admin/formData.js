/**
 * Object → FormData để gửi kèm file. PHP không đọc multipart của PUT/PATCH,
 * nên sửa thì gửi POST + `_method` (Laravel tự hiểu là PUT).
 *
 *   toFormData({ name: 'LEGO', logo: file, remove_logo: false }, 'PUT')
 *
 * undefined = bỏ qua · null = gửi rỗng (Laravel đổi thành null) · boolean → '1' / '0'
 * · mảng → key[] (vd. images[] cho nhiều file).
 */
export function toFormData(fields, method = 'POST') {
  const formData = new FormData()
  if (method !== 'POST') formData.append('_method', method)

  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined) return
    if (Array.isArray(value)) value.forEach((item) => formData.append(`${key}[]`, item))
    else if (value === null) formData.append(key, '')
    else if (typeof value === 'boolean') formData.append(key, value ? '1' : '0')
    else formData.append(key, value)
  })

  return formData
}
