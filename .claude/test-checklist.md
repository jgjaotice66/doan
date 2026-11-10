# Kết quả kiểm thử toàn luồng (task 40)

Ngày chạy: 10/11/2026 · Môi trường: `php artisan serve` (:8000) + `npm run dev` (:5173), DB dev sau `php artisan app:reset-demo`.

## 1. Kiểm thử tự động

| Hạng mục | Lệnh | Kết quả |
|---|---|---|
| Backend (PHPUnit) | `php artisan test` | ✅ 302 test, 1864 assertion |
| Lint frontend | `npm run lint` | ✅ không lỗi |
| Build frontend | `npm run build` | ✅ build thành công |

## 2. Kịch bản end-to-end trên giao diện

Chạy bằng trình duyệt tự động (Playwright, Chromium 1280×900): bấm trên giao diện thật như người dùng, đối chiếu tồn kho / doanh thu qua API admin trước và sau mỗi thao tác.

| # | Bước | Kết quả | Ghi chú |
|---|---|---|---|
| 1 | Khách đăng ký tài khoản mới | ✅ | Đăng nhập luôn, header hiện tên |
| 2 | Tìm “Jenga” bằng ô tìm kiếm | ✅ | Chuyển tới `/products?q=Jenga`, có Jenga Classic |
| 3 | Lọc danh mục Board game (từ trang chủ) | ✅ | 7 sản phẩm |
| 4 | Thêm vào yêu thích | ✅ | Có trong trang Yêu thích |
| 5 | Thêm 2 sản phẩm vào giỏ | ✅ | |
| 6 | Checkout chọn chuyển khoản QR | ✅ | Tạo đơn, chuyển tới trang đặt hàng thành công |
| 7 | Ảnh QR đúng số tiền + mã đơn | ✅ | `amount` = tổng đơn (2 × giá + phí ship), `addInfo` = mã đơn |
| 8 | Tồn kho giảm đúng | ✅ | Giảm đúng 2 |
| 9 | Admin bấm “Đã nhận tiền” | ✅ | Đơn → Đã thanh toán |
| 10–12 | Admin: Xác nhận → Bắt đầu giao → Đã giao xong | ✅ | Đơn → Hoàn thành |
| 13 | Dashboard: doanh thu hôm nay tăng | ✅ | Tăng đúng bằng tổng đơn |
| 14 | Khách thấy đơn Hoàn thành / Đã thanh toán | ✅ | |
| 15 | Khách đặt đơn COD | ✅ | Kho giảm 1 |
| 16 | Khách tự huỷ đơn COD | ✅ | Kho hoàn lại đúng số cũ |
| 17 | Admin khoá tài khoản khách | ✅ | |
| 18 | Khách đang đăng nhập bị đăng xuất ở thao tác tiếp theo | ✅ | Chuyển về `/login`, token bị xoá |
| 19 | Tài khoản bị khoá đăng nhập lại | ✅ | Báo “Tài khoản đã bị khoá” |

## 3. Tình huống lỗi

| # | Tình huống | Kết quả | Ghi chú |
|---|---|---|---|
| 20 | Sản phẩm hết hàng đúng lúc khách đang ở trang thanh toán (admin chỉnh kho về 0) | ✅ | Không tạo đơn, báo “Giỏ có sản phẩm không mua được”, có nút về giỏ |
| 21 | Khách truy cập `/admin` | ✅ | Bị chuyển về trang chủ; API admin trả 403 |
| 22 | Khách mở mã đơn của người khác | ✅ | Trang 404; API trả 404 (không lộ nội dung đơn) |
| 23 | Lỗi JavaScript trong suốt các bước của khách | ✅ | Không có |

Luồng trả hàng (gửi yêu cầu → duyệt → nhận hàng → hoàn tiền) được kiểm bằng feature test (`ReturnRequestTest`, `ReturnManageTest`) và có sẵn trong dữ liệu demo (1 yêu cầu đã hoàn tiền, 1 đang chờ duyệt).

## 4. Lỗi phát hiện trong quá trình kiểm thử

| Lỗi | Nguyên nhân | Đã sửa |
|---|---|---|
| Mục “Tin mới” ở trang chủ luôn trống | Trang chủ đọc `data.data` trong khi API đã trả sẵn mảng bài viết | ✅ (task 39) |
| Header điện thoại tràn 2 hàng, ô tìm kiếm bị ép ở 768–1024px | Bố cục header chưa có menu thu gọn | ✅ (task 38) |
| Lỗi 5xx hiện nguyên câu kỹ thuật tiếng Anh cho khách | Hiển thị thẳng `message` của server | ✅ (task 38) |
| Thông báo validation / quá nhiều lần thử bằng tiếng Anh | Thiếu `lang/vi` | ✅ (task 38) |

Lần chạy kịch bản đầu có 3 bước báo lỗi, cả 3 đều do script kiểm thử (tải lại trang trước khi request yêu thích gửi xong; đọc sai cấu trúc JSON dashboard; quên điền địa chỉ nên form chặn trước khi gửi). Đã xác minh ứng dụng chạy đúng ở cả 3 chỗ rồi sửa script; lần chạy lại đạt 23/23.

## 5. Kiểm tra thủ công còn lại

- [ ] Quét mã QR ở trang đặt hàng thành công bằng app ngân hàng: đúng ngân hàng, số tài khoản, chủ tài khoản, số tiền và nội dung = mã đơn.
  *Lưu ý:* phải nhập tài khoản nhận tiền thật ở **Admin → Cài đặt** trước (dữ liệu demo đang để số tài khoản mẫu `0000000000`).
