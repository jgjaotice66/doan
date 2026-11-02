# 08 – Cài đặt nền tảng frontend
**Mục tiêu:** Frontend có đủ thư viện và cấu trúc thư mục.
**Phụ thuộc:** 01
**File tạo/sửa:** `frontend/package.json`, `vite.config.js`, `src/main.jsx`, `src/index.css`, `src/api/client.js`, `src/utils/format.js`, `frontend/.env`

## Các bước
1. Cài: `react-router @tanstack/react-query axios zustand react-hook-form antd @ant-design/plots tailwindcss @tailwindcss/vite`.
2. Tailwind v4 qua plugin Vite; `@import "tailwindcss"` trong `index.css`. Xoá CSS/asset mẫu của Vite.
3. `.env`: `VITE_API_URL=http://localhost:8000/api/v1`.
4. `src/api/client.js`: axios instance, interceptor gắn `Authorization: Bearer <token>`; gặp 401 → xoá token + chuyển `/login`.
5. Tạo thư mục `api/ features/ pages/store/ pages/admin/ components/ layouts/ stores/ utils/`; `utils/format.js` có `formatVND()`.
6. `QueryClientProvider` + `RouterProvider` trong `main.jsx`.

## Tiêu chí hoàn thành
- `npm run dev` mở trang không lỗi console; `npm run lint` và `npm run build` pass.
