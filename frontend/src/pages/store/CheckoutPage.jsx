import { Bank, Money, ShoppingCartSimple, WarningCircle } from '@phosphor-icons/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import ErrorState from '../../components/ErrorState'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Skeleton from '../../components/ui/Skeleton'
import { useCart } from '../../features/cart/queries'
import { usePlaceOrder } from '../../features/orders/queries'
import { useAuthStore } from '../../stores/authStore'
import { cn } from '../../utils/cn'
import { formatVND } from '../../utils/format'

const PAYMENT_METHODS = [
  {
    value: 'cod',
    label: 'Thanh toán khi nhận hàng (COD)',
    description: 'Trả tiền mặt cho shipper khi nhận hàng.',
    icon: Money,
  },
  {
    value: 'bank_qr',
    label: 'Chuyển khoản qua mã QR',
    description: 'Quét mã VietQR bằng app ngân hàng sau khi đặt hàng.',
    icon: Bank,
  },
]

const FORM_FIELDS = ['recipient_name', 'phone', 'address', 'note', 'payment_method']

/**
 * Lỗi nghiệp vụ khi đặt (hết hàng, giỏ trống) — không gắn được vào ô nào nên hiện thành khối riêng.
 */
function OrderProblems({ problems }) {
  return (
    <div role="alert" className="space-y-2 rounded-card border border-danger/30 bg-danger/5 p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold text-danger">
        <WarningCircle aria-hidden weight="fill" className="size-5 shrink-0" />
        Không đặt được hàng
      </p>
      <ul className="list-disc space-y-1 pl-9 text-fg">
        {problems.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <Link to="/cart" className="inline-block pl-7 font-semibold text-primary hover:underline">
        Quay lại giỏ hàng để điều chỉnh
      </Link>
    </div>
  )
}

function PaymentOptions({ register, error }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-lg font-bold">Phương thức thanh toán</legend>
      {PAYMENT_METHODS.map(({ value, label, description, icon: Icon }) => (
        <label
          key={value}
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-card border border-line bg-surface p-4 transition-colors',
            'hover:border-control has-[:checked]:border-primary has-[:checked]:bg-primary/5',
            'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary',
          )}
        >
          <input
            type="radio"
            value={value}
            className="mt-1 size-4 shrink-0 accent-primary focus-visible:outline-none"
            {...register('payment_method', { required: 'Vui lòng chọn phương thức thanh toán.' })}
          />
          <Icon aria-hidden className="mt-0.5 size-6 shrink-0 text-primary" />
          <span>
            <span className="block font-semibold text-fg">{label}</span>
            <span className="block text-sm text-muted">{description}</span>
          </span>
        </label>
      ))}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  )
}

function OrderSummary({ cart, isPending }) {
  return (
    <Card className="space-y-4 p-5 lg:sticky lg:top-24">
      <h2 className="text-lg font-bold">
        Đơn hàng <span className="text-sm font-medium text-muted tabular">({cart.count} sản phẩm)</span>
      </h2>
      <ul className="max-h-80 space-y-3 overflow-y-auto pr-1">
        {cart.items.map((item) => (
          <li key={item.id} className="flex gap-3 text-sm">
            <span className="relative size-14 shrink-0 overflow-hidden rounded-control bg-raised">
              {item.product?.thumbnail && (
                <img src={item.product.thumbnail} alt="" width="56" height="56" className="size-full object-cover" />
              )}
              <span className="absolute right-0 top-0 rounded-bl-control bg-primary px-1.5 text-xs font-bold text-on-primary tabular">
                <span className="sr-only">Số lượng </span>
                {item.quantity}
              </span>
            </span>
            <span className="line-clamp-2 flex-1 text-fg">{item.product?.name}</span>
            <span className="font-semibold tabular">{formatVND(item.line_total)}</span>
          </li>
        ))}
      </ul>

      <dl className="space-y-2 border-t border-line pt-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Tạm tính</dt>
          <dd className="font-semibold tabular">{formatVND(cart.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Phí vận chuyển</dt>
          <dd className="font-semibold tabular">{formatVND(cart.shipping_fee)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <dt className="font-semibold">Tổng cộng</dt>
          <dd className="text-2xl font-bold text-primary tabular">{formatVND(cart.total)}</dd>
        </div>
      </dl>

      {/* form="checkout-form": nút nằm ngoài <form> (cột tóm tắt) nhưng vẫn submit form */}
      <Button type="submit" form="checkout-form" size="lg" fullWidth loading={isPending}>
        {isPending ? 'Đang đặt hàng…' : 'Đặt hàng'}
      </Button>
      <p className="text-center text-xs text-muted">Bấm “Đặt hàng” nghĩa là bạn đồng ý mua các sản phẩm trên.</p>
    </Card>
  )
}

function CheckoutForm({ cart }) {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const placeOrder = usePlaceOrder()
  const [problems, setProblems] = useState([])
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      recipient_name: user?.name ?? '',
      phone: user?.phone ?? '',
      address: '',
      note: '',
      payment_method: 'cod',
    },
  })

  const onSubmit = (values) => {
    // isPending đã khoá nút; chặn thêm trường hợp Enter liên tục trong ô nhập.
    if (placeOrder.isPending) return
    setProblems([])
    placeOrder.mutate(
      { ...values, phone: values.phone.trim(), note: values.note.trim() || null },
      {
        // replace: bấm Back từ trang thành công không quay lại form đã gửi.
        onSuccess: (order) => navigate(`/orders/${order.code}/success`, { replace: true, state: { justPlaced: true } }),
        onError: (error) => {
          const data = error.response?.data
          if (error.response?.status !== 422) {
            setProblems([getErrorMessage(error)])
            return
          }
          const fieldErrors = getFieldErrors(error)
          FORM_FIELDS.filter((f) => fieldErrors[f]).forEach((f) => setError(f, { type: 'server', message: fieldErrors[f] }))
          // items: mỗi phần tử "Tên SP: lý do"; cart: giỏ trống.
          const business = [...(data?.errors?.items ?? []), ...(data?.errors?.cart ?? [])]
          if (business.length) setProblems(business)
        },
      },
    )
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_400px]">
      <form id="checkout-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {problems.length > 0 && <OrderProblems problems={problems} />}

        <Card as="section" className="space-y-4 p-5" aria-labelledby="shipping-heading">
          <h2 id="shipping-heading" className="text-lg font-bold">
            Thông tin nhận hàng
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Họ tên người nhận *"
              autoComplete="name"
              error={errors.recipient_name?.message}
              {...register('recipient_name', { required: 'Vui lòng nhập tên người nhận.', maxLength: 255 })}
            />
            <Input
              label="Số điện thoại *"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="09xxxxxxxx"
              error={errors.phone?.message}
              {...register('phone', {
                required: 'Vui lòng nhập số điện thoại.',
                pattern: { value: /^\s*0\d{9,10}\s*$/, message: 'Số điện thoại không hợp lệ (10–11 số, bắt đầu bằng 0).' },
              })}
            />
          </div>
          <Input
            label="Địa chỉ nhận hàng *"
            autoComplete="street-address"
            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
            error={errors.address?.message}
            {...register('address', {
              required: 'Vui lòng nhập địa chỉ nhận hàng.',
              maxLength: { value: 255, message: 'Địa chỉ tối đa 255 ký tự.' },
            })}
          />
          <div className="space-y-1.5">
            <label htmlFor="checkout-note" className="block text-sm font-medium text-fg">
              Ghi chú (không bắt buộc)
            </label>
            <textarea
              id="checkout-note"
              rows={3}
              placeholder="Ví dụ: giao giờ hành chính, gọi trước khi giao…"
              aria-invalid={Boolean(errors.note) || undefined}
              className="w-full rounded-control border border-control bg-surface px-3 py-2 text-base text-fg placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              {...register('note', { maxLength: { value: 1000, message: 'Ghi chú tối đa 1000 ký tự.' } })}
            />
            {errors.note && (
              <p role="alert" className="text-sm text-danger">
                {errors.note.message}
              </p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <PaymentOptions register={register} error={errors.payment_method?.message} />
        </Card>
      </form>

      <OrderSummary cart={cart} isPending={placeOrder.isPending} />
    </div>
  )
}

function Blocked({ title, children, action }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-line px-4 py-16 text-center">
      <ShoppingCartSimple aria-hidden className="size-12 text-subtle" />
      <div>
        <p className="text-lg font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted">{children}</p>
      </div>
      {action}
    </div>
  )
}

export default function CheckoutPage() {
  const { data: cart, isPending, error, refetch } = useCart()

  let content
  if (isPending) {
    content = (
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]" aria-busy="true" aria-label="Đang tải">
        <Skeleton className="h-96 rounded-card" />
        <Skeleton className="h-80 rounded-card" />
      </div>
    )
  } else if (error) {
    content = <ErrorState error={error} onRetry={refetch} title="Không tải được giỏ hàng" />
  } else if (cart.items.length === 0) {
    content = (
      <Blocked
        title="Giỏ hàng đang trống"
        action={
          <Button as={Link} to="/products">
            Xem sản phẩm
          </Button>
        }
      >
        Hãy thêm sản phẩm vào giỏ trước khi thanh toán.
      </Blocked>
    )
  } else if (cart.has_unavailable) {
    content = (
      <Blocked
        title="Giỏ có sản phẩm không mua được"
        action={
          <Button as={Link} to="/cart">
            Về giỏ hàng
          </Button>
        }
      >
        Một số sản phẩm đã hết hàng hoặc vượt tồn kho. Vui lòng điều chỉnh giỏ trước khi đặt.
      </Blocked>
    )
  } else {
    content = <CheckoutForm cart={cart} />
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <title>Thanh toán – Toy Store</title>
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Thanh toán</h1>
      {content}
    </div>
  )
}
