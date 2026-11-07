import { api } from '../client'

const unwrap = (res) => res.data.data

/**
 * Cài đặt cửa hàng → { bank, account, account_name, banks: [{ code, name }] }
 */
export const adminSettingsApi = {
  get: () => api.get('/admin/settings').then(unwrap),
  /** payload: { bank, account, account_name } */
  update: (payload) => api.put('/admin/settings', payload).then(unwrap),
}
