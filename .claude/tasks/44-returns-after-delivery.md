# 44 – Trả hàng & hoàn tiền sau khi giao — task phụ
**Mục tiêu:** Khách nhận hàng lỗi/sai/thiếu được gửi yêu cầu trả hàng có bằng chứng; admin duyệt, nhận lại hàng (tuỳ chọn nhập lại kho) và ghi nhận đã hoàn tiền.
**Phụ thuộc:** 30, 43, 31 (lý do kho mới)
**Ưu tiên:** cắt đầu tiên nếu trễ tiến độ — luồng mua hàng chính không phụ thuộc task này.

## Quy tắc đã chốt
- Chỉ đơn **Hoàn thành**, trong vòng **10 ngày** kể từ `completed_at` (cấu hình `shop.return_days`, mặc định 10).
- Trả **một phần**: khách chọn món + số lượng (≤ số đã mua − số đã trả ở yêu cầu trước).
- Lý do: `defective` (lỗi/hỏng), `wrong_item` (giao sai), `missing_parts` (thiếu phụ kiện), `other` + mô tả.
- **Bằng chứng bắt buộc 1–5 tệp, ảnh hoặc video**: ảnh jpg/png/webp ≤ 5 MB; video mp4/webm/mov ≤ 50 MB.
- Khách nhập **tài khoản nhận tiền hoàn** (ngân hàng, số TK, chủ TK) — bắt buộc, kể cả đơn COD.
- Mỗi đơn tối đa **1 yêu cầu đang mở** (chưa xong/chưa từ chối).
- Hoàn tiền làm thủ công; số tiền mặc định = Σ(giá snapshot × SL trả), **không gồm phí ship**; admin sửa được nhưng ≤ tổng đơn − số đã hoàn trước đó.
- Không làm: đổi hàng (= trả + đặt đơn mới), hoàn tiền tự động qua cổng thanh toán.

## Luồng trạng thái yêu cầu
```
pending (Chờ duyệt) ──► approved (Đã duyệt – chờ khách gửi hàng) ──► received (Đã nhận hàng) ──► refunded (Đã hoàn tiền)
        └──► rejected (Từ chối – bắt buộc ghi lý do)
```
- `received`: admin chọn **nhập lại kho** hay không cho từng món (hàng hỏng thì không) → nhập lại ghi `stock_movements` với lý do mới `StockReason::Return` ("Trả hàng").

## File tạo/sửa
- Migration: `orders.completed_at` (set trong `OrderService::changeStatus` khi → completed); `return_requests` (order_id, user_id, status, reason, description, bank_name, bank_account, account_name, refund_amount, admin_note, reviewed_at, received_at, refunded_at); `return_request_items` (return_request_id, order_item_id, quantity, restock bool); `return_request_media` (return_request_id, path, type image|video).
- `app/Enums/ReturnStatus.php`, `ReturnReason.php`; `StockReason::Return`; `app/Models/ReturnRequest*.php`; `app/Services/ReturnService.php` (create, approve, reject, receive, refund — mỗi bước khoá dòng + kiểm tra chuyển hợp lệ).
- API khách: `POST orders/{code}/returns` (multipart), `GET orders/{code}` kèm yêu cầu trả hàng.
- API admin: `GET admin/returns` (lọc status, q = mã đơn), `GET admin/returns/{id}`, `PATCH admin/returns/{id}/approve|reject|receive|refund`.
- Test: `tests/Feature/ReturnRequestTest.php`, `tests/Feature/Admin/ReturnManageTest.php`.
- Frontend: form "Yêu cầu trả hàng" (chọn món, lý do, tải ảnh/video có xem trước, TK ngân hàng) trên trang chi tiết đơn; khối trạng thái yêu cầu; admin `ReturnsPage.jsx`, `ReturnDetailPage.jsx` (xem ảnh/phát video, nút theo trạng thái), mục menu "Trả hàng".
- Dashboard (36): doanh thu trừ số đã hoàn.

## Các bước
1. (TDD) Test khách: quá 10 ngày → 422; đơn chưa hoàn thành → 422; SL vượt → 422; thiếu bằng chứng / tệp sai loại / quá dung lượng → 422; đã có yêu cầu mở → 422; đơn người khác → 404.
2. (TDD) Test admin: đi đủ luồng; chuyển sai luồng → 422; từ chối thiếu lý do → 422; `receive` với restock → tồn kho tăng + movement `return`; refund vượt mức → 422; customer → 403.
3. Backend theo danh sách file ở trên; tệp lưu qua `Media` (ảnh/video ở `returns/`), xoá tệp khi tạo yêu cầu thất bại.
4. PHP: tăng `upload_max_filesize = 64M`, `post_max_size = 300M` trong `php.ini` của WAMP để upload video (ghi chú vào báo cáo).
5. Giao diện khách + admin.

## Tiêu chí hoàn thành
- `php artisan test --compact` đạt.
- Demo: đơn hoàn thành → khách gửi yêu cầu kèm 1 ảnh + 1 video → admin duyệt → nhận hàng (nhập lại kho 1 món) → hoàn tiền → khách thấy "Đã hoàn tiền", tồn kho tăng đúng, lịch sử kho có dòng "Trả hàng".
