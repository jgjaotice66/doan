# 40 – Kiểm thử toàn luồng
**Mục tiêu:** Đảm bảo luồng demo chạy trơn tru.
**Phụ thuộc:** 38, 39
**File tạo/sửa:** `.claude/test-checklist.md` (ghi kết quả)

## Các bước
1. `php artisan test` toàn bộ pass; `npm run lint` + `npm run build` pass.
2. Kịch bản thủ công: đăng ký → tìm/lọc → yêu thích → thêm giỏ → checkout QR (quét QR thử) → admin xác nhận thanh toán, chuyển trạng thái đến completed → kiểm tra kho giảm, dashboard tăng → khách đặt đơn COD rồi huỷ → kho hoàn lại → admin khoá khách → khách bị đăng xuất.
3. Thử lỗi: hết hàng khi checkout, truy cập `/admin` bằng tài khoản khách, mã đơn của người khác.
4. Ghi lỗi tìm được và sửa (dùng skill `superpowers:systematic-debugging`).

## Tiêu chí hoàn thành
- Mọi bước trong checklist đánh dấu đạt.
