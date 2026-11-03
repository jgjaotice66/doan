import { WarningCircle } from '@phosphor-icons/react'
import Card from './ui/Card'

/**
 * Khung chung cho trang đăng nhập / đăng ký.
 */
export default function AuthCard({ title, formError, children, footer }) {
  return (
    <section className="mx-auto w-full max-w-md px-4 py-12">
      <Card className="p-6 sm:p-8">
        <h1 className="mb-6 text-2xl font-bold">{title}</h1>
        {formError && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-control border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            <WarningCircle aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0" />
            {formError}
          </div>
        )}
        {children}
      </Card>
      {footer && <p className="mt-4 text-center text-sm text-muted">{footer}</p>}
    </section>
  )
}
