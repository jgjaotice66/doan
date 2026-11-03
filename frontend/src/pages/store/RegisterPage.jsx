import { useForm } from 'react-hook-form'
import { Link, Navigate, useSearchParams } from 'react-router'
import { authApi } from '../../api/auth'
import AuthCard from '../../components/AuthCard'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { useAuthForm } from '../../features/auth/useAuthForm'
import { useAuthStore } from '../../stores/authStore'
import { afterLoginPath } from '../../utils/redirect'

export default function RegisterPage() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const [searchParams] = useSearchParams()
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: { name: '', email: '', phone: '', password: '', password_confirmation: '' },
  })
  const { submit, isPending, formError } = useAuthForm(authApi.register, setError)

  if (token) {
    return <Navigate to={afterLoginPath(user, searchParams.get('redirect'))} replace />
  }

  const redirect = searchParams.get('redirect')
  const loginLink = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'

  const onSubmit = (values) => submit({ ...values, phone: values.phone.trim() || null })

  return (
    <AuthCard
      title="Tạo tài khoản"
      formError={formError}
      footer={
        <>
          Đã có tài khoản?{' '}
          <Link to={loginLink} className="font-semibold text-primary hover:underline">
            Đăng nhập
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          label="Họ tên"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name', { required: 'Vui lòng nhập họ tên' })}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', {
            required: 'Vui lòng nhập email',
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email không hợp lệ' },
          })}
        />
        <Input
          label="Số điện thoại (không bắt buộc)"
          type="tel"
          autoComplete="tel"
          inputMode="numeric"
          error={errors.phone?.message}
          {...register('phone', {
            validate: (v) => !v.trim() || /^0\d{9,10}$/.test(v.trim()) || 'Số điện thoại không hợp lệ',
          })}
        />
        <Input
          label="Mật khẩu"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password', {
            required: 'Vui lòng nhập mật khẩu',
            minLength: { value: 8, message: 'Mật khẩu tối thiểu 8 ký tự' },
          })}
        />
        <Input
          label="Nhập lại mật khẩu"
          type="password"
          autoComplete="new-password"
          error={errors.password_confirmation?.message}
          {...register('password_confirmation', {
            validate: (v) => v === getValues('password') || 'Mật khẩu nhập lại không khớp',
          })}
        />
        <Button type="submit" size="lg" fullWidth loading={isPending}>
          {isPending ? 'Đang tạo tài khoản…' : 'Đăng ký'}
        </Button>
      </form>
    </AuthCard>
  )
}
