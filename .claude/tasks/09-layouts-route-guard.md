# 09 – Layout & bảo vệ route
**Mục tiêu:** Khung trang storefront/admin và chặn route theo đăng nhập/vai trò.
**Phụ thuộc:** 08
**File tạo/sửa:** `src/router.jsx`, `src/stores/authStore.js`, `src/layouts/StoreLayout.jsx`, `src/layouts/AdminLayout.jsx`, `src/components/RequireAuth.jsx`, `src/components/RequireAdmin.jsx`

## Các bước
1. `authStore` (zustand + persist): `user, token, setAuth(), logout()`; khi mở app gọi `GET me` để xác thực token.
2. `StoreLayout`: header (logo, ô tìm kiếm, giỏ, yêu thích, tài khoản), footer, `<Outlet/>`.
3. `AdminLayout`: khung tạm (hoàn thiện ở task 26).
4. `RequireAuth` → chưa đăng nhập chuyển `/login?redirect=...`; `RequireAdmin` → không phải admin chuyển `/`.
5. Khai báo đủ route theo spec (trang chưa làm hiển thị placeholder) + trang 404.

## Tiêu chí hoàn thành
- Vào `/cart` khi chưa đăng nhập bị chuyển `/login`; tài khoản khách vào `/admin` bị chuyển về `/`.
