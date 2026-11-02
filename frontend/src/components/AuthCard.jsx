/**
 * Khung chung cho trang đăng nhập / đăng ký.
 */
export default function AuthCard({ title, formError, children, footer }) {
  return (
    <section className="mx-auto w-full max-w-md px-4 py-12">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-xl">
        <h1 className="mb-6 text-2xl font-bold">{title}</h1>
        {formError && (
          <div role="alert" className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {formError}
          </div>
        )}
        {children}
      </div>
      {footer && <p className="mt-4 text-center text-sm text-slate-400">{footer}</p>}
    </section>
  )
}
