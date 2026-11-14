import { api } from './client'

export const chatApi = {
  /**
   * Gửi 1 tin nhắn cho chatbot. context = bộ lọc bot trả về lần trước (để hiểu "còn cái rẻ hơn không?").
   * Trả { intent, text, products, orders, link, context, suggestions }.
   */
  send: ({ message, context }) => api.post('/chat', { message, context: context ?? undefined }).then((res) => res.data.data),
}
