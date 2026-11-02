# 26 – Layout admin (Ant Design)
**Mục tiêu:** Khung quản trị dùng chung cho mọi trang admin.
**Phụ thuộc:** 07, 09
**File tạo/sửa:** `src/layouts/AdminLayout.jsx`, `src/pages/admin/*` (placeholder), `src/components/admin/AdminTable.jsx`

## Các bước
1. `ConfigProvider` locale `vi_VN`, chỉ bọc khu `/admin` (không ảnh hưởng Tailwind storefront).
2. Sider menu: Dashboard, Sản phẩm, Danh mục, Thương hiệu, Đơn hàng, Kho, Người dùng, Banner, NEWS; header có tên admin + đăng xuất + link "Xem cửa hàng".
3. `AdminTable` dùng chung: phân trang server-side, ô tìm kiếm, bộ lọc → query params API.
4. Hàm tiện ích hiển thị lỗi 422 lên `Form` antd (`setFields`).

## Tiêu chí hoàn thành
- Đăng nhập admin vào `/admin` thấy layout, menu điều hướng đúng; CSS storefront không bị antd làm lệch.
