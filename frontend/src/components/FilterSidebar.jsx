import { useId, useState } from 'react'
import { AGE_GROUPS } from '../features/catalog/useProductFilters'
import { cn } from '../utils/cn'
import { ageLabel } from '../utils/product'
import Button from './ui/Button'
import Skeleton from './ui/Skeleton'

const PRICE_PRESETS = [
  { label: 'Dưới 500K', min: null, max: 500000 },
  { label: '500K – 1 triệu', min: 500000, max: 1000000 },
  { label: '1 – 3 triệu', min: 1000000, max: 3000000 },
  { label: 'Trên 3 triệu', min: 3000000, max: null },
]

function Group({ title, children }) {
  return (
    <fieldset className="border-b border-line pb-5 last:border-0">
      <legend className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-fg">{title}</legend>
      {children}
    </fieldset>
  )
}

const optionClass = 'flex min-h-10 cursor-pointer items-center gap-3 rounded-control px-2 text-sm text-muted hover:bg-raised hover:text-fg'
const checkClass = 'size-4 shrink-0 cursor-pointer accent-primary'

// Nhãn dạng "chip" cho radio (độ tuổi, mức giá): ô radio thật bị ẩn nhưng vẫn focus được.
const chipClass = cn(
  'inline-flex min-h-10 cursor-pointer items-center rounded-full border border-control px-3 text-sm text-muted transition-colors',
  'hover:border-primary hover:text-fg',
  'has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-on-primary',
  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary',
)

function CategoryOptions({ name, categories, value, onChange }) {
  const renderOption = (category, depth = 0) => (
    <li key={category.id}>
      <label className={cn(optionClass, depth && 'pl-7')}>
        <input
          type="radio"
          name={name}
          className={checkClass}
          checked={value === category.slug}
          onChange={() => onChange(category.slug)}
        />
        <span className="flex-1">{category.name}</span>
        <span className="text-xs text-subtle tabular">{category.products_count}</span>
      </label>
      {category.children?.length > 0 && <ul>{category.children.map((child) => renderOption(child, depth + 1))}</ul>}
    </li>
  )

  return (
    <ul>
      <li>
        <label className={optionClass}>
          <input type="radio" name={name} className={checkClass} checked={!value} onChange={() => onChange('')} />
          Tất cả danh mục
        </label>
      </li>
      {categories.map((category) => renderOption(category))}
    </ul>
  )
}

/**
 * Ô nhập khoảng giá tự chọn — chỉ áp dụng khi bấm nút, không gọi API mỗi lần gõ phím.
 */
function PriceRangeForm({ min, max, onApply }) {
  const id = useId()
  const [from, setFrom] = useState(min ?? '')
  const [to, setTo] = useState(max ?? '')

  const toNumber = (v) => (String(v).trim() === '' ? null : Math.max(0, Math.floor(Number(v)) || 0))

  const onSubmit = (e) => {
    e.preventDefault()
    let [a, b] = [toNumber(from), toNumber(to)]
    if (a != null && b != null && a > b) [a, b] = [b, a]
    onApply(a, b)
  }

  const inputClass =
    'h-10 w-full min-w-0 rounded-control border border-control bg-surface px-2 text-sm text-fg placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 tabular'

  return (
    <form onSubmit={onSubmit} className="mt-3 flex items-center gap-2">
      <label className="sr-only" htmlFor={`${id}-from`}>
        Giá từ
      </label>
      <input id={`${id}-from`}type="number" min="0" step="10000" inputMode="numeric" placeholder="Từ" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
      <span aria-hidden className="text-subtle">
        –
      </span>
      <label className="sr-only" htmlFor={`${id}-to`}>
        Giá đến
      </label>
      <input id={`${id}-to`}type="number" min="0" step="10000" inputMode="numeric" placeholder="Đến" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
      <Button type="submit" size="sm" variant="secondary" className="h-10">
        Áp dụng
      </Button>
    </form>
  )
}

/**
 * Bộ lọc sản phẩm: danh mục · thương hiệu · độ tuổi · giá · nổi bật.
 * Mọi thay đổi đi thẳng lên URL qua setFilters.
 */
export default function FilterSidebar({ filters, setFilters, categories, brands, isPending }) {
  // Sidebar có thể render 2 nơi (cột bên + ngăn kéo mobile) → tên nhóm radio phải riêng.
  const uid = useId()

  if (isPending) {
    return (
      <div className="space-y-3" aria-busy="true">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    )
  }

  const toggleBrand = (slug) =>
    setFilters({
      brand: filters.brand.includes(slug) ? filters.brand.filter((b) => b !== slug) : [...filters.brand, slug],
    })

  const presetChecked = (p) => filters.price_min === p.min && filters.price_max === p.max

  return (
    <div className="space-y-5">
      <Group title="Danh mục">
        <CategoryOptions name={`${uid}-category`} categories={categories ?? []} value={filters.category} onChange={(category) => setFilters({ category })} />
      </Group>

      <Group title="Thương hiệu">
        <ul>
          {(brands ?? []).map((brand) => (
            <li key={brand.id}>
              <label className={optionClass}>
                <input type="checkbox" className={checkClass} checked={filters.brand.includes(brand.slug)} onChange={() => toggleBrand(brand.slug)} />
                {brand.name}
              </label>
            </li>
          ))}
        </ul>
      </Group>

      <Group title="Độ tuổi">
        <div className="flex flex-wrap gap-2">
          {AGE_GROUPS.map((age) => (
            <label key={age} className={chipClass}>
              <input
                type="radio"
                name={`${uid}-age`}
                className="sr-only"
                checked={filters.min_age === age}
                onChange={() => setFilters({ min_age: age })}
                // Bấm lại vào chip đang chọn để bỏ chọn.
                onClick={() => filters.min_age === age && setFilters({ min_age: null })}
              />
              {ageLabel(age)}
            </label>
          ))}
        </div>
      </Group>

      <Group title="Khoảng giá">
        <div className="flex flex-wrap gap-2">
          {PRICE_PRESETS.map((preset) => (
            <label key={preset.label} className={chipClass}>
              <input
                type="radio"
                name={`${uid}-price`}
                className="sr-only"
                checked={presetChecked(preset)}
                onChange={() => setFilters({ price_min: preset.min, price_max: preset.max })}
                onClick={() => presetChecked(preset) && setFilters({ price_min: null, price_max: null })}
              />
              {preset.label}
            </label>
          ))}
        </div>
        {/* key: khi URL đổi giá (bấm chip/xoá lọc) thì ô nhập lấy lại giá trị mới */}
        <PriceRangeForm
          key={`${filters.price_min}-${filters.price_max}`}
          min={filters.price_min}
          max={filters.price_max}
          onApply={(price_min, price_max) => setFilters({ price_min, price_max })}
        />
      </Group>

      <Group title="Khác">
        <label className={optionClass}>
          <input type="checkbox" className={checkClass} checked={filters.featured} onChange={(e) => setFilters({ featured: e.target.checked })} />
          Chỉ sản phẩm nổi bật
        </label>
      </Group>
    </div>
  )
}
