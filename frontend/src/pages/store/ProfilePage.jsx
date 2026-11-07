import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { authApi } from '../../api/auth'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import { useAuthStore } from '../../stores/authStore'
import { toast } from '../../stores/toastStore'

const PHONE_RE = /^0\d{9,10}$/

/** Lỗi 422 → gắn vào từng ô; lỗi khác → toast. */
function showServerErrors(error, setError) {
  const fieldErrors = getFieldErrors(error)
  const fields = Object.keys(fieldErrors)
  if (error.response?.status === 422 && fields.length > 0) {
    fields.forEach((field) => setError(field, { type: 'server', message: fieldErrors[field] }, { shouldFocus: true }))
  } else {
    toast.error(getErrorMessage(error))
  }
}

function ProfileForm({ user }) {
  const setUser = useAuthStore((s) => s.setUser)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm({ defaultValues: { name: user.name, phone: user.phone ?? '' } })

  const mutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (updated) => {
      setUser(updated)
      reset({ name: updated.name, phone: updated.phone ?? '' })
      toast.success('Đã lưu thông tin tài khoản')
    },
    onError: (error) => showServerErrors(error, setError),
  })

  const onSubmit = (values) => mutation.mutate({ name: values.name.trim(), phone: values.phone.trim() || null })

  return (
    <Card as="section" className="p-5 sm:p-6" aria-labelledby="profile-heading">
      <h2 id="profile-heading" className="mb-4 text-lg font-bold">
        Thông tin cá nhân
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input label="Email" type="email" value={user.email} readOnly disabled hint="Email dùng để đăng nhập, không đổi được." />
        <Input
          label="Họ tên"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name', {
            validate: (v) => Boolean(v.trim()) || 'Vui lòng nhập họ tên',
            maxLength: { value: 255, message: 'Họ tên tối đa 255 ký tự' },
          })}
        />
        <Input
          label="Số điện thoại (không bắt buộc)"
          type="tel"
          autoComplete="tel"
          inputMode="numeric"
          error={errors.phone?.message}
          {...register('phone', {
            validate: (v) => !v.trim() || PHONE_RE.test(v.trim()) || 'Số điện thoại không hợp lệ',
          })}
        />
        <Button type="submit" loading={mutation.isPending} disabled={!isDirty}>
          {mutation.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
        </Button>
      </form>
    </Card>
  )
}

const EMPTY_PASSWORDS = { current_password: '', password: '', password_confirmation: '' }

function PasswordForm() {
  const email = useAuthStore((s) => s.user?.email)
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: EMPTY_PASSWORDS })

  const mutation = useMutation({
    mutationFn: authApi.updatePassword,
    onSuccess: () => {
      reset(EMPTY_PASSWORDS)
      toast.success('Đã đổi mật khẩu. Lần đăng nhập sau hãy dùng mật khẩu mới.')
    },
    onError: (error) => showServerErrors(error, setError),
  })

  return (
    <Card as="section" className="p-5 sm:p-6" aria-labelledby="password-heading">
      <h2 id="password-heading" className="mb-1 text-lg font-bold">
        Đổi mật khẩu
      </h2>
      <p className="mb-4 text-sm text-muted">Sau khi đổi, các thiết bị khác đang đăng nhập sẽ bị đăng xuất.</p>
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
        {/* Ô username ẩn giúp trình quản lý mật khẩu biết đang đổi mật khẩu cho tài khoản nào */}
        <input type="text" name="username" autoComplete="username" value={email ?? ''} readOnly hidden />
        <Input
          label="Mật khẩu hiện tại"
          type="password"
          autoComplete="current-password"
          error={errors.current_password?.message}
          {...register('current_password', { required: 'Vui lòng nhập mật khẩu hiện tại' })}
        />
        <Input
          label="Mật khẩu mới"
          type="password"
          autoComplete="new-password"
          hint="Tối thiểu 8 ký tự."
          error={errors.password?.message}
          {...register('password', {
            required: 'Vui lòng nhập mật khẩu mới',
            minLength: { value: 8, message: 'Mật khẩu mới tối thiểu 8 ký tự' },
            validate: (v) => v !== getValues('current_password') || 'Mật khẩu mới phải khác mật khẩu hiện tại',
          })}
        />
        <Input
          label="Nhập lại mật khẩu mới"
          type="password"
          autoComplete="new-password"
          error={errors.password_confirmation?.message}
          {...register('password_confirmation', {
            validate: (v) => v === getValues('password') || 'Mật khẩu nhập lại không khớp',
          })}
        />
        <Button type="submit" loading={mutation.isPending}>
          {mutation.isPending ? 'Đang đổi…' : 'Đổi mật khẩu'}
        </Button>
      </form>
    </Card>
  )
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <title>Tài khoản – Toy Store</title>
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Tài khoản của tôi</h1>
      <div className="space-y-6">
        {/* key: đổi người dùng (đăng nhập tài khoản khác) → form nhận giá trị mới */}
        {user && <ProfileForm key={user.id} user={user} />}
        <PasswordForm />
      </div>
    </div>
  )
}
