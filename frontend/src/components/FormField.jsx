import { forwardRef, useId } from 'react'

/**
 * Ô nhập có nhãn + thông báo lỗi, dùng với react-hook-form: <FormField {...register('email')} />
 */
const FormField = forwardRef(function FormField({ label, error, type = 'text', ...props }, ref) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-slate-300">
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        type={type}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-lg border bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 ${
          error ? 'border-red-500 focus:ring-red-500/40' : 'border-slate-700 focus:border-slate-400 focus:ring-slate-400/30'
        }`}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  )
})

export default FormField
