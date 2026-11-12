import { useSyncExternalStore } from 'react'

/**
 * Giao diện sáng / tối của storefront.
 * Lưu lựa chọn trong localStorage; chưa chọn thì theo hệ điều hành, không xác định được thì tối.
 * index.html có script nhỏ gắn data-theme trước khi React chạy để trang không nháy màu.
 */
const STORAGE_KEY = 'theme'
const META_COLORS = { dark: '#0e0f12', light: '#f5f4ef' }
const listeners = new Set()

const readTheme = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLORS[theme])
}

export function setTheme(theme) {
  applyTheme(theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Trình duyệt chặn lưu trữ: vẫn đổi được trong phiên này.
  }
  listeners.forEach((listener) => listener())
}

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** @returns {['dark' | 'light', () => void]} theme hiện tại và hàm đảo sáng / tối */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme)
  return [theme, () => setTheme(theme === 'dark' ? 'light' : 'dark')]
}
