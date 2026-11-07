import { getErrorMessage } from '../../api/client'

/** 'images.0.path' → ['images', 0, 'path'] (tên field dạng mảng của antd Form). */
const toNamePath = (key) => key.split('.').map((part) => (/^\d+$/.test(part) ? Number(part) : part))

/**
 * Lỗi 422 của Laravel → hiện ngay dưới từng ô của antd Form, cuộn tới ô lỗi đầu tiên.
 * Lỗi khác (500, mất mạng…) → message.error. Trả true nếu là lỗi validate.
 *
 *   const { message } = App.useApp()
 *   mutation.mutate(values, { onError: (error) => applyFormErrors(form, error, message) })
 */
export function applyFormErrors(form, error, message) {
  const errors = error?.response?.data?.errors

  if (error?.response?.status === 422 && errors && Object.keys(errors).length > 0) {
    const fields = Object.entries(errors).map(([key, messages]) => ({ name: toNamePath(key), errors: messages }))
    form.setFields(fields)
    form.scrollToField(fields[0].name, { block: 'center', focus: true })
    return true
  }

  message?.error(getErrorMessage(error))
  return false
}
