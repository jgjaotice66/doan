# 14 – Design system storefront
**Mục tiêu:** Chốt bảng màu, font, component cơ bản phong cách đồ chơi sưu tầm (tối, cá tính).
**Phụ thuộc:** 08
**File tạo/sửa:** `src/index.css` (`@theme` tokens), `src/components/ui/*` (Button, Input, Badge, Card, Skeleton, Pagination, Modal, Toast)

## Các bước
1. Dùng skill `ui-ux-pro-max` tìm style/palette/font pairing cho "collectible toy store, dark".
2. Định nghĩa token Tailwind v4 trong `@theme`: màu nền, bề mặt, nhấn (neon/ánh kim), chữ, viền, radius, font (hỗ trợ tiếng Việt).
3. Dùng skill `ui-styling` dựng các component UI dùng chung.
4. Component `ProductCard` (ảnh, thương hiệu, tên, giá gốc gạch ngang + giá sale, badge "Sắp hết"/"Hết hàng", nút yêu thích).
5. Trang `/dev/ui` (chỉ ở môi trường dev) hiển thị toàn bộ component để kiểm tra.

## Tiêu chí hoàn thành
- Mọi component hiển thị đúng trên `/dev/ui`, độ tương phản chữ đạt WCAG AA, không có màu hard-code ngoài token.
