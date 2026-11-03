import { create } from 'zustand'

const DURATION_MS = 4000
let nextId = 1

export const useToastStore = create((set, get) => ({
  toasts: [],
  show: (type, message) => {
    const id = nextId++
    set({ toasts: [...get().toasts, { id, type, message }] })
    setTimeout(() => get().dismiss(id), DURATION_MS)
    return id
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

/**
 * Gọi được ở bất kỳ đâu (kể cả ngoài component): toast.success('Đã thêm vào giỏ')
 */
export const toast = {
  success: (message) => useToastStore.getState().show('success', message),
  error: (message) => useToastStore.getState().show('error', message),
  info: (message) => useToastStore.getState().show('info', message),
}
