/**
 * Chỉ chấp nhận đường dẫn nội bộ ("/cart"), chặn "//evil.com" hoặc "https://..." (open redirect).
 */
export function safeRedirect(value, fallback = '/') {
  if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
    return value
  }
  return fallback
}

/**
 * Trang đích sau khi đăng nhập: ưu tiên ?redirect, admin mặc định vào /admin.
 */
export function afterLoginPath(user, redirect) {
  return safeRedirect(redirect, user?.role === 'admin' ? '/admin' : '/')
}
