import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { chatApi } from '../../api/chat'
import { useAuthStore } from '../../stores/authStore'

const STORAGE_KEY = 'chat'
const MAX_MESSAGES = 60

export const WELCOME = {
  id: 'welcome',
  from: 'bot',
  text: 'Chào bạn! Mình là trợ lý của Toy Store. Bạn cứ gõ tự nhiên, ví dụ “Gundam dưới 1 triệu” hay “đơn hàng của tôi” nhé.',
  suggestions: ['Gundam dưới 1 triệu', 'Quà cho bé 6 tuổi', 'Đơn hàng của tôi', 'Chính sách đổi trả'],
}

/** Lịch sử chat giữ trong phiên trình duyệt (đóng tab là mất); đổi tài khoản thì bắt đầu lại. */
function load(owner) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY))
    if (saved?.owner === owner && Array.isArray(saved.messages)) return saved
  } catch {
    // sessionStorage bị chặn hoặc dữ liệu hỏng → bắt đầu mới
  }
  return { owner, messages: [WELCOME], context: null }
}

function save(state) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // không lưu được thì thôi, chat vẫn chạy
  }
}

let nextId = Date.now()
const newId = () => String(nextId++)

/**
 * Trạng thái cuộc trò chuyện với chatbot: danh sách tin, gửi tin, thử lại khi lỗi.
 */
export function useChat() {
  const owner = useAuthStore((s) => s.user?.id ?? null)
  const [state, setState] = useState(() => load(owner))
  const lastFailed = useRef(null)

  // Đăng nhập / đăng xuất giữa chừng → không để lộ đơn hàng của tài khoản trước.
  if (state.owner !== owner) {
    setState({ owner, messages: [WELCOME], context: null })
  }

  useEffect(() => save(state), [state])

  const mutation = useMutation({ mutationFn: chatApi.send })

  const send = useCallback(
    (raw) => {
      const message = raw.trim().slice(0, 500)
      if (!message || mutation.isPending) return

      lastFailed.current = null
      setState((s) => ({
        ...s,
        messages: [...s.messages.filter((m) => m.from !== 'error'), { id: newId(), from: 'user', text: message }].slice(-MAX_MESSAGES),
      }))

      mutation.mutate(
        { message, context: state.context },
        {
          onSuccess: (reply) =>
            setState((s) => ({
              ...s,
              context: reply.context ?? null,
              messages: [...s.messages, { id: newId(), from: 'bot', ...reply }].slice(-MAX_MESSAGES),
            })),
          onError: (error) => {
            lastFailed.current = message
            const text =
              error?.response?.status === 429
                ? 'Bạn gửi hơi nhanh, đợi một chút rồi thử lại nhé.'
                : 'Không gửi được tin nhắn. Kiểm tra kết nối mạng rồi thử lại nhé.'
            setState((s) => ({ ...s, messages: [...s.messages, { id: newId(), from: 'error', text }] }))
          },
        },
      )
    },
    [mutation, state.context],
  )

  /** Gửi lại tin vừa lỗi (bỏ bong bóng tin của khách cũ để không bị lặp). */
  const retry = useCallback(() => {
    const message = lastFailed.current
    if (!message) return
    setState((s) => {
      const messages = s.messages.filter((m) => m.from !== 'error')
      const last = messages.at(-1)
      return { ...s, messages: last?.from === 'user' && last.text === message ? messages.slice(0, -1) : messages }
    })
    send(message)
  }, [send])

  const reset = useCallback(() => {
    lastFailed.current = null
    setState({ owner, messages: [WELCOME], context: null })
  }, [owner])

  return { messages: state.messages, send, retry, reset, pending: mutation.isPending }
}
