/**
 * Khung tạm cho trang chưa làm; ghi rõ task sẽ hoàn thiện.
 */
export default function PagePlaceholder({ title, task }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      {task && <p className="mt-2 text-sm opacity-60">Đang xây dựng (task {task})</p>}
    </section>
  )
}
