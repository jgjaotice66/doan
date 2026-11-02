import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'
import { afterLoginPath } from '../../utils/redirect'

/**
 * Logic chung cho form đăng nhập / đăng ký:
 * gọi API -> lưu token -> chuyển trang; lỗi 422 gắn vào từng ô, lỗi khác hiện ở đầu form.
 */
export function useAuthForm(mutationFn, setError) {
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [formError, setFormError] = useState('')

  const mutation = useMutation({
    mutationFn,
    onMutate: () => setFormError(''),
    onSuccess: ({ user, token }) => {
      setAuth({ user, token })
      navigate(afterLoginPath(user, searchParams.get('redirect')), { replace: true })
    },
    onError: (error) => {
      const fieldErrors = getFieldErrors(error)
      const fields = Object.keys(fieldErrors)
      if (error.response?.status === 422 && fields.length > 0) {
        fields.forEach((field) => setError(field, { type: 'server', message: fieldErrors[field] }))
      } else {
        setFormError(getErrorMessage(error))
      }
    },
  })

  return { submit: mutation.mutate, isPending: mutation.isPending, formError }
}
