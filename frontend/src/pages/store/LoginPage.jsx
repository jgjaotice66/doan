import { useForm } from 'react-hook-form'
import { Link, Navigate, useSearchParams } from 'react-router'
import { authApi } from '../../api/auth'
import AuthCard from '../../components/AuthCard'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { useAuthForm } from '../../features/auth/useAuthForm'
import { useAuthStore } from '../../stores/authStore'
import { afterLoginPath } from '../../utils/redirect'

export default function LoginPage() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const [searchParams] = useSearchParams()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ defaultValues: { email: '', password: '' } })
  const { submit, isPending, formError } = useAuthForm(authApi.login, setError)

  if (token) {
    return <Navigate to={afterLoginPath(user, searchParams.get('redirect'))} replace />
  }

  const redirect = searchParams.get('redirect')
  const registerLink = redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : '/register'

  return (
    <AuthCard
      title="Đăng nhập"
      formError={formError}
      footer={
        <>
          Chưa có tài khoản?{' '}
          <Link to={registerLink} className="font-semibold text-primary hover:underline">
            Đăng ký
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit((values) => submit(values))} noValidate className="space-y-4">
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
          label="Mật khẩu"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password', { required: 'Vui lòng nhập mật khẩu' })}
        />
        <Button type="submit" size="lg" fullWidth loading={isPending}>
          {isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </Button>
      </form>
    </AuthCard>
  )
}
