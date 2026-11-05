import { Check, Copy, Info } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { toast } from '../stores/toastStore'
import { formatVND } from '../utils/format'
import Card from './ui/Card'

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(value))
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Không copy được, vui lòng chép tay.')
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={copied ? `Đã copy ${label}` : `Copy ${label}`}
      className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-control text-muted transition-colors hover:bg-raised hover:text-primary"
    >
      {copied ? <Check aria-hidden weight="bold" className="size-5 text-success" /> : <Copy aria-hidden className="size-5" />}
    </button>
  )
}

function Row({ label, value, display, copyable = false, highlight = false }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-1.5 last:border-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1">
        <span className={highlight ? 'font-bold text-primary tabular' : 'font-semibold text-fg tabular [overflow-wrap:anywhere]'}>
          {display ?? value}
        </span>
        {copyable ? <CopyButton value={value} label={label.toLowerCase()} /> : <span className="size-11 shrink-0" aria-hidden />}
      </dd>
    </div>
  )
}

/**
 * Khung chuyển khoản: ảnh VietQR (app ngân hàng quét ra sẵn số tiền + nội dung)
 * và thông tin tài khoản để chuyển tay, nội dung chuyển khoản = mã đơn.
 */
export default function BankQrBox({ order }) {
  const { bank } = order

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-bold">Quét mã để chuyển khoản</h2>
      <div className="grid items-start gap-6 md:grid-cols-[auto_1fr]">
        <div className="mx-auto w-full max-w-72 overflow-hidden rounded-card bg-qr-paper p-2">
          <img
            src={order.qr_url}
            alt={`Mã QR chuyển ${formatVND(order.total)} tới ${bank.bank} ${bank.account}, nội dung ${order.code}`}
            width="540"
            height="640"
            className="h-auto w-full"
          />
        </div>

        <div className="space-y-4">
          <dl>
            <Row label="Ngân hàng" value={bank.bank} />
            <Row label="Số tài khoản" value={bank.account} copyable />
            <Row label="Chủ tài khoản" value={bank.account_name} />
            <Row label="Số tiền" value={order.total} display={formatVND(order.total)} copyable highlight />
            <Row label="Nội dung" value={order.code} copyable highlight />
          </dl>
          <p className="flex gap-2 rounded-control border border-accent/40 bg-accent/10 p-3 text-sm text-fg">
            <Info aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0 text-accent-soft" />
            <span>
              Vui lòng ghi đúng nội dung <strong className="tabular">{order.code}</strong> để cửa hàng đối soát. Đơn sẽ được xác
              nhận sau khi cửa hàng nhận được tiền.
            </span>
          </p>
        </div>
      </div>
    </Card>
  )
}
