# 38 – Hoàn thiện UX & responsive
**Mục tiêu:** Giao diện mượt trên mọi kích thước, đủ trạng thái.
**Phụ thuộc:** 25, 35
**File tạo/sửa:** các trang storefront, `src/components/ui/*`

## Các bước
1. Rà từng trang: loading (skeleton), lỗi (có nút thử lại), rỗng (có lời dẫn).
2. Responsive 375px / 768px / 1280px: header thu gọn menu, filter dạng drawer, bảng giỏ thành thẻ.
3. Tiêu đề tab (`document.title`) theo trang; ảnh `loading="lazy"`.
4. Dùng skill `ui-ux-pro-max` review lại các trang chính.
5. (Tuỳ chọn) Thông báo lỗi validation tiếng Việt: thêm `backend/lang/vi/validation.php` (APP_LOCALE=vi đã bật, hiện đang rơi về tiếng Anh).

## Tiêu chí hoàn thành
- Không có thanh cuộn ngang ở 375px; mọi trang có đủ 3 trạng thái loading/lỗi/rỗng.
