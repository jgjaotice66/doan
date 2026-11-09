import { ChatText, Check, ImageBroken, PlayCircle, PuzzlePiece, Swap, Trash, UploadSimple, Warning, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useId, useRef, useState } from 'react'
import { getErrorMessage } from '../api/client'
import {
  checkEvidenceFile,
  EVIDENCE_ACCEPT,
  formatFileSize,
  RETURN_LIMITS,
  RETURN_REASONS,
  useBanks,
  useRequestReturn,
} from '../features/orders/returns'
import { toast } from '../stores/toastStore'
import { cn } from '../utils/cn'
import { formatVND } from '../utils/format'
import Button from './ui/Button'
import Input from './ui/Input'
import Modal from './ui/Modal'
import QuantityInput from './ui/QuantityInput'

const REASON_ICONS = { defective: Warning, wrong_item: Swap, missing_parts: PuzzlePiece, other: ChatText }

const STEPS = ['Sản phẩm', 'Lý do & bằng chứng', 'Nhận tiền hoàn']

/** Lỗi server → bước chứa ô đó (để nhảy về đúng chỗ khách cần sửa). */
const stepOfField = (field) => (field.startsWith('items') ? 0 : /^(reason|description|media)/.test(field) ? 1 : 2)

function StepIndicator({ step }) {
  return (
    <ol className="mb-6 grid grid-cols-3 gap-2" aria-label="Các bước gửi yêu cầu">
      {STEPS.map((label, i) => (
        <li key={label} aria-current={i === step ? 'step' : undefined} className="min-w-0">
          <span className={cn('block h-1 rounded-full transition-colors duration-200', i <= step ? 'bg-primary' : 'bg-line')} aria-hidden />
          <span className={cn('mt-2 block truncate text-xs font-semibold sm:text-sm', i === step ? 'text-fg' : i < step ? 'text-muted' : 'text-subtle')}>
            <span className="tabular">{i + 1}.</span> {label}
            {i < step && <span className="sr-only"> (xong)</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}

function FieldError({ children, id }) {
  if (!children) return null
  return (
    <p id={id} role="alert" className="mt-2 flex items-start gap-1.5 text-sm text-danger">
      <WarningCircle aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0" /> {children}
    </p>
  )
}

// ---------- Bước 1: chọn món ----------

function ItemsStep({ items, quantities, setQuantities, error }) {
  return (
    <fieldset>
      <legend className="mb-3 font-semibold text-fg">Chọn sản phẩm muốn trả</legend>
      <ul className="space-y-3">
        {items.map((item) => {
          const left = item.returnable_quantity ?? 0
          const qty = quantities[item.id] ?? 0
          const selected = qty > 0
          const disabled = left === 0
          return (
            <li
              key={item.id}
              className={cn(
                'rounded-card border p-3 transition-[border-color,background-color] duration-150',
                selected ? 'border-primary bg-primary/5' : 'border-line',
                disabled && 'opacity-50',
              )}
            >
              <label className={cn('flex items-center gap-3', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}>
                <input
                  type="checkbox"
                  className="size-5 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed"
                  checked={selected}
                  disabled={disabled}
                  onChange={(e) => setQuantities((prev) => ({ ...prev, [item.id]: e.target.checked ? 1 : 0 }))}
                />
                <span className="size-14 shrink-0 overflow-hidden rounded-control bg-raised" aria-hidden>
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" width="56" height="56" className="size-full object-cover" />
                  ) : (
                    <ImageBroken className="m-auto mt-4 size-6 text-subtle" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 font-semibold text-fg">{item.product_name}</span>
                  <span className="block text-sm text-muted tabular">
                    {formatVND(item.price)} · {disabled ? 'đã trả hết' : `còn trả được ${left}/${item.quantity}`}
                  </span>
                </span>
              </label>
              {selected && left > 1 && (
                <div className="mt-3 flex items-end justify-between gap-3 border-t border-line pt-3">
                  <QuantityInput
                    label="Số lượng trả"
                    value={qty}
                    min={1}
                    max={left}
                    onChange={(value) => setQuantities((prev) => ({ ...prev, [item.id]: value }))}
                  />
                  <span className="pb-2.5 font-semibold text-fg tabular">{formatVND(item.price * qty)}</span>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <FieldError>{error}</FieldError>
    </fieldset>
  )
}

// ---------- Bước 2: lý do + bằng chứng ----------

function ReasonPicker({ value, onChange, error }) {
  const name = useId()
  return (
    <fieldset>
      <legend className="mb-3 font-semibold text-fg">Lý do trả hàng</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {RETURN_REASONS.map((reason) => {
          const Icon = REASON_ICONS[reason.value]
          const checked = value === reason.value
          return (
            <label
              key={reason.value}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-card border p-3 transition-[border-color,background-color] duration-150',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50',
                checked ? 'border-primary bg-primary/5' : 'border-line hover:border-control',
              )}
            >
              <input type="radio" name={name} value={reason.value} checked={checked} onChange={() => onChange(reason.value)} className="sr-only" />
              <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-control', checked ? 'bg-primary text-on-primary' : 'bg-raised text-muted')}>
                <Icon aria-hidden weight="duotone" className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-fg">{reason.label}</span>
                <span className="block text-sm text-muted">{reason.hint}</span>
              </span>
            </label>
          )
        })}
      </div>
      <FieldError>{error}</FieldError>
    </fieldset>
  )
}

/** Vùng kéo-thả / bấm chọn tệp + lưới xem trước (ảnh, video phát được), xoá từng tệp. */
function EvidencePicker({ files, setFiles, error }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [rejected, setRejected] = useState([])
  const hintId = useId()
  const full = files.length >= RETURN_LIMITS.maxFiles

  const addFiles = (list) => {
    const incoming = Array.from(list)
    const problems = []
    const accepted = []
    for (const file of incoming) {
      const problem = checkEvidenceFile(file)
      if (problem) problems.push(problem)
      else accepted.push(file)
    }
    const room = RETURN_LIMITS.maxFiles - files.length
    if (accepted.length > room) problems.push(`Chỉ đính kèm tối đa ${RETURN_LIMITS.maxFiles} tệp — đã bỏ ${accepted.length - room} tệp.`)
    const added = accepted.slice(0, Math.max(0, room)).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
    }))
    setRejected(problems)
    if (added.length) setFiles((prev) => [...prev, ...added])
  }

  const remove = (id) =>
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((f) => f.id !== id)
    })

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="font-semibold text-fg">Ảnh / video bằng chứng</p>
        <span className="text-sm text-muted tabular" aria-live="polite">
          {files.length}/{RETURN_LIMITS.maxFiles} tệp
        </span>
      </div>

      {!full && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            addFiles(e.dataTransfer.files)
          }}
          aria-describedby={hintId}
          className={cn(
            'flex w-full cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed px-4 py-6 text-center transition-colors duration-150',
            dragging ? 'border-primary bg-primary/10' : error ? 'border-danger/60' : 'border-control hover:border-primary hover:bg-raised',
          )}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-raised text-primary">
            <UploadSimple aria-hidden weight="bold" className="size-6" />
          </span>
          <span className="font-semibold text-fg">Bấm để chọn hoặc kéo thả tệp vào đây</span>
          <span id={hintId} className="text-sm text-muted">
            Ảnh jpg/png/webp tối đa {RETURN_LIMITS.imageMaxMB} MB · video mp4/webm/mov tối đa {RETURN_LIMITS.videoMaxMB} MB
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={EVIDENCE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = '' // chọn lại đúng tệp vừa xoá vẫn nhận
        }}
      />

      {files.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((item, index) => (
            <li key={item.id} className="group relative overflow-hidden rounded-control border border-line bg-raised">
              {item.type === 'video' ? (
                <video src={item.url} controls muted playsInline preload="metadata" className="aspect-square w-full bg-bg object-cover" />
              ) : (
                <img src={item.url} alt={`Bằng chứng ${index + 1}`} className="aspect-square w-full object-cover" />
              )}
              <div className="flex items-center justify-between gap-1 px-2 py-1.5 text-xs text-muted">
                <span className="flex min-w-0 items-center gap-1">
                  {item.type === 'video' && <PlayCircle aria-hidden className="size-4 shrink-0 text-accent-soft" />}
                  <span className="truncate">{formatFileSize(item.file.size)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  aria-label={`Xoá tệp ${item.file.name}`}
                  className="-m-1 inline-flex size-8 cursor-pointer items-center justify-center rounded-control text-muted transition-colors hover:bg-danger/15 hover:text-danger"
                >
                  <Trash aria-hidden className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {rejected.length > 0 && (
        <ul role="alert" className="mt-3 space-y-1 rounded-control border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
          {rejected.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
      <FieldError>{error}</FieldError>
    </div>
  )
}

function DetailsStep({ reason, setReason, description, setDescription, files, setFiles, errors }) {
  const id = useId()
  const required = reason === 'other'
  return (
    <div className="space-y-6">
      <ReasonPicker value={reason} onChange={setReason} error={errors.reason} />
      <div>
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-fg">
          Mô tả {required ? <span className="text-danger">(bắt buộc)</span> : <span className="text-muted">(không bắt buộc)</span>}
        </label>
        <textarea
          id={id}
          rows={3}
          maxLength={1000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="VD: Tay phải của figure bị gãy ngay khi mở hộp."
          aria-invalid={Boolean(errors.description) || undefined}
          className={cn(
            'w-full rounded-control border bg-surface px-3 py-2.5 text-base text-fg placeholder:text-subtle focus:outline-none focus:ring-2',
            errors.description ? 'border-danger focus:ring-danger/40' : 'border-control focus:border-primary focus:ring-primary/30',
          )}
        />
        <FieldError>{errors.description}</FieldError>
      </div>
      <EvidencePicker files={files} setFiles={setFiles} error={errors.media} />
    </div>
  )
}

// ---------- Bước 3: tài khoản nhận tiền + tóm tắt ----------

function BankStep({ bank, setBank, errors, summary }) {
  const listId = useId()
  const { data: banks = [] } = useBanks()
  const set = (field) => (e) => setBank((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Cửa hàng sẽ chuyển khoản tiền hoàn vào tài khoản này sau khi nhận lại hàng (kể cả đơn đã trả bằng COD).
      </p>
      <div>
        <Input
          label="Ngân hàng"
          list={listId}
          value={bank.bank_name}
          onChange={set('bank_name')}
          placeholder="Gõ để tìm, VD: Vietcombank"
          autoComplete="off"
          error={errors.bank_name}
        />
        <datalist id={listId}>
          {banks.map((b) => (
            <option key={b.code} value={b.name} />
          ))}
        </datalist>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Số tài khoản"
          inputMode="numeric"
          autoComplete="off"
          value={bank.bank_account}
          onChange={(e) => setBank((prev) => ({ ...prev, bank_account: e.target.value.replace(/\D/g, '').slice(0, 20) }))}
          placeholder="Chỉ gồm chữ số"
          error={errors.bank_account}
        />
        <Input
          label="Chủ tài khoản"
          autoComplete="name"
          value={bank.account_name}
          onChange={set('account_name')}
          placeholder="NGUYEN VAN A"
          hint="Viết như trên thẻ, không cần dấu"
          error={errors.account_name}
          className="[&_input]:uppercase"
        />
      </div>

      <dl className="grid grid-cols-[1fr_auto] gap-y-2 rounded-card border border-line bg-raised/40 p-4 text-sm">
        <dt className="text-muted">Sản phẩm trả</dt>
        <dd className="text-right font-medium text-fg tabular">{summary.count} món</dd>
        <dt className="text-muted">Lý do</dt>
        <dd className="text-right font-medium text-fg">{summary.reason}</dd>
        <dt className="text-muted">Bằng chứng</dt>
        <dd className="text-right font-medium text-fg tabular">{summary.files} tệp</dd>
        <dt className="border-t border-line pt-2 font-semibold text-fg">Dự kiến hoàn</dt>
        <dd className="border-t border-line pt-2 text-right text-lg font-bold text-primary tabular">{formatVND(summary.amount)}</dd>
        <dd className="col-span-2 text-xs text-subtle">Chưa gồm phí vận chuyển. Số tiền cuối cùng do cửa hàng xác nhận sau khi kiểm tra hàng.</dd>
      </dl>
    </div>
  )
}

// ---------- Khung chính ----------

function ReturnForm({ order, onDone, onBusyChange }) {
  const returnable = order.items
  const [step, setStep] = useState(0)
  const [quantities, setQuantities] = useState(() => {
    // Đơn chỉ có 1 món còn trả được → chọn sẵn.
    const open = returnable.filter((i) => i.returnable_quantity > 0)
    return open.length === 1 ? { [open[0].id]: 1 } : {}
  })
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState([])
  const [bank, setBank] = useState({ bank_name: '', bank_account: '', account_name: '' })
  const [errors, setErrors] = useState({})
  const [progress, setProgress] = useState(0)
  const request = useRequestReturn(order.code)
  const filesRef = useRef(files)

  useEffect(() => {
    filesRef.current = files
  }, [files])
  useEffect(() => onBusyChange(request.isPending), [request.isPending, onBusyChange])
  // Đóng hộp thoại → giải phóng bộ nhớ của các ảnh/video xem trước.
  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.url)), [])

  const chosen = returnable.filter((i) => (quantities[i.id] ?? 0) > 0)
  const amount = chosen.reduce((sum, i) => sum + i.price * quantities[i.id], 0)

  const validate = (target) => {
    const next = {}
    if (target === 0 && chosen.length === 0) next.items = 'Vui lòng chọn ít nhất 1 sản phẩm cần trả.'
    if (target === 1) {
      if (!reason) next.reason = 'Vui lòng chọn lý do trả hàng.'
      if (reason === 'other' && !description.trim()) next.description = 'Vui lòng mô tả lý do trả hàng.'
      if (files.length === 0) next.media = 'Vui lòng đính kèm ít nhất 1 ảnh hoặc video làm bằng chứng.'
    }
    if (target === 2) {
      if (!bank.bank_name.trim()) next.bank_name = 'Vui lòng nhập ngân hàng nhận tiền hoàn.'
      if (!/^\d{6,20}$/.test(bank.bank_account)) next.bank_account = 'Số tài khoản gồm 6–20 chữ số.'
      if (!bank.account_name.trim()) next.account_name = 'Vui lòng nhập tên chủ tài khoản.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const next = () => validate(step) && setStep((s) => s + 1)

  const submit = () => {
    if (!validate(2)) return
    const formData = new FormData()
    chosen.forEach((item, i) => {
      formData.append(`items[${i}][order_item_id]`, item.id)
      formData.append(`items[${i}][quantity]`, quantities[item.id])
    })
    formData.append('reason', reason)
    formData.append('description', description.trim())
    files.forEach((f) => formData.append('media[]', f.file))
    Object.entries(bank).forEach(([key, value]) => formData.append(key, value.trim()))

    setProgress(0)
    request.mutate(
      { formData, onProgress: setProgress },
      {
        onSuccess: () => {
          toast.success('Đã gửi yêu cầu trả hàng. Cửa hàng sẽ phản hồi sớm.')
          onDone()
        },
        onError: (error) => {
          const serverErrors = error.response?.data?.errors
          if (!serverErrors) return toast.error(getErrorMessage(error, 'Không gửi được yêu cầu, vui lòng thử lại.'))
          if (serverErrors.order) {
            toast.error(serverErrors.order[0])
            return onDone()
          }
          // Gom lỗi theo ô (items.0.quantity → items, media.2 → media) rồi đưa khách về bước đầu tiên có lỗi.
          const mapped = {}
          Object.entries(serverErrors).forEach(([field, [message]]) => {
            const key = field.split('.')[0]
            mapped[key] ??= message
          })
          setErrors(mapped)
          setStep(Math.min(...Object.keys(serverErrors).map(stepOfField)))
        },
      },
    )
  }

  return (
    <div className="text-fg">
      <StepIndicator step={step} />

      {step === 0 && <ItemsStep items={returnable} quantities={quantities} setQuantities={setQuantities} error={errors.items} />}
      {step === 1 && (
        <DetailsStep
          reason={reason}
          setReason={setReason}
          description={description}
          setDescription={setDescription}
          files={files}
          setFiles={setFiles}
          errors={errors}
        />
      )}
      {step === 2 && (
        <BankStep
          bank={bank}
          setBank={setBank}
          errors={errors}
          summary={{ count: chosen.reduce((s, i) => s + quantities[i.id], 0), reason: RETURN_REASONS.find((r) => r.value === reason)?.label, files: files.length, amount }}
        />
      )}

      {request.isPending && (
        <div className="mt-5" role="status" aria-live="polite">
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="text-muted">{progress < 100 ? 'Đang tải tệp lên…' : 'Đang xử lý…'}</span>
            <span className="font-semibold tabular">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-raised">
            <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-5">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={request.isPending}>
            Quay lại
          </Button>
        ) : (
          <span className="text-sm text-muted">
            Tạm tính hoàn: <strong className="text-fg tabular">{formatVND(amount)}</strong>
          </span>
        )}
        {step < STEPS.length - 1 ? (
          <Button onClick={next}>Tiếp tục</Button>
        ) : (
          <Button onClick={submit} loading={request.isPending}>
            <Check aria-hidden weight="bold" className="size-4" /> Gửi yêu cầu
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Hộp thoại "Yêu cầu trả hàng": 3 bước (chọn món → lý do + bằng chứng → tài khoản nhận tiền).
 * Trên điện thoại chiếm toàn màn hình. Đang tải tệp lên thì không đóng được (tránh mất dữ liệu giữa chừng).
 */
export default function ReturnRequestModal({ order, open, onClose }) {
  const [busy, setBusy] = useState(false)

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title={`Yêu cầu trả hàng · ${order.code}`}
      className="max-w-2xl max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:rounded-none"
    >
      <ReturnForm order={order} onDone={onClose} onBusyChange={setBusy} />
    </Modal>
  )
}
