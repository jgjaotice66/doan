import { useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Lưu (tạo/sửa) + xoá cho trang quản trị; xong thì tải lại các query liên quan
 * (bảng admin + dữ liệu storefront dùng chung, vd. ['categories']).
 *
 *   const { save, remove } = useCrudMutations(adminBrandsApi, [['admin', 'brands'], ['brands']])
 *   save.mutate({ id: record?.id, payload })   // id rỗng → tạo mới
 *   remove.mutate(record.id)
 */
export function useCrudMutations(api, invalidateKeys) {
  const queryClient = useQueryClient()
  const onSuccess = () => invalidateKeys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }))

  const save = useMutation({
    mutationFn: ({ id, payload }) => (id ? api.update(id, payload) : api.create(payload)),
    onSuccess,
  })

  const remove = useMutation({ mutationFn: api.remove, onSuccess })

  return { save, remove }
}

/**
 * Giá trị ImagePicker → trường gửi API.
 * File mới → { [field]: file } · đã gỡ ảnh cũ → { remove_[field]: true } · không đổi → {}.
 */
export function imagePayload(field, value, originalUrl) {
  if (value instanceof File) return { [field]: value }
  if (value === null && originalUrl) return { [`remove_${field}`]: true }
  return {}
}
