# 46 – Giao diện sáng / tối + nút hotline — task phụ
**Mục tiêu:** Khách đổi được giao diện sáng / tối; có nút gọi hotline nổi ở góc phải dưới.
**Phụ thuộc:** 14 (design system), 42 (Cài đặt cửa hàng)

## Quy tắc đã chốt
- Lựa chọn sáng / tối lưu `localStorage` (`theme`), lần đầu theo hệ điều hành; script nhỏ trong `index.html` gắn theme trước khi trang hiện (không nháy màu). Admin dùng chung lựa chọn.
- Giao diện sáng chỉ định nghĩa lại token màu (`:root[data-theme="light"]`), component không sửa.
- Hotline: admin nhập ở **Cài đặt → Liên hệ** (lưu `settings`, ưu tiên hơn `SHOP_HOTLINE`). Trống thì ẩn nút. Chỉ nhận số 10–11 chữ số bắt đầu bằng 0 hoặc tổng đài 1800 / 1900.
- Số ngày đổi trả = 10 (`RETURN_DAYS`).

## File tạo/sửa
- Backend: `ShopSettings::hotline()/updateHotline()`, `PUT /admin/settings/hotline`, `GET /shop` (`hotline, return_days, shipping_fee`).
- Frontend: `utils/theme.js`, `components/FloatingActions.jsx`, token sáng trong `index.css`, thẻ Liên hệ ở trang Cài đặt.
- Test: `tests/Feature/HotlineTest.php`.

## Tiêu chí hoàn thành
- `php artisan test --compact` đạt; `npm run lint`, `npm run build` đạt.
- Đổi sáng / tối ở cửa hàng → vào admin vẫn giữ; tải lại không nháy. Xoá hotline ở Cài đặt → nút gọi biến mất.
