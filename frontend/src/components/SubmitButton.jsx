export default function SubmitButton({ loading, children, loadingText = 'Đang xử lý…' }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-lg bg-slate-100 px-4 py-2.5 font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? loadingText : children}
    </button>
  )
}
