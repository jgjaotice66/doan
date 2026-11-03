import { forwardRef, useId } from 'react'
import { cn } from '../../utils/cn'

/**
 * Ô nhập có nhãn, gợi ý và lỗi; dùng trực tiếp với react-hook-form: <Input {...register('email')} />
 * Lỗi nối với ô qua aria-describedby để trình đọc màn hình đọc được.
 */
const Input = forwardRef(function Input({ label, hint, error, type = 'text', className, id: idProp, ...props }, ref) {
  const autoId = useId()
  const id = idProp ?? autoId
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-fg">
          {label}
        </label>
      )}
      <input
        id={id}
        ref={ref}
        type={type}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
        className={cn(
          'h-11 w-full rounded-control border bg-surface px-3 text-base text-fg placeholder:text-subtle',
          'transition-colors focus:outline-none focus-visible:outline-none focus:ring-2',
          error ? 'border-danger focus:ring-danger/40' : 'border-control focus:border-primary focus:ring-primary/30',
        )}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
})

export default Input
