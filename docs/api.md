# Danh sách API

- **Gốc:** `http://localhost:8000/api/v1`. Mọi request và response dùng JSON, trừ các API tải file dùng `multipart/form-data`.
- **Xác thực:** Laravel Sanctum (personal access token). Đăng nhập hoặc đăng ký trả về `token`; các request sau gửi header `Authorization: Bearer <token>`.
- **Quyền:**
  - **Công khai:** không cần token.
  - **Khách:** cần token của tài khoản đang hoạt động (middleware `auth:sanctum` + `EnsureActiveUser`).
  - **Admin:** thêm điều kiện `role = admin` (`EnsureAdmin`).
- **Giới hạn tần suất:** đăng nhập, đăng ký, đặt hàng, gửi yêu cầu trả hàng: tối đa 10 lần / phút.

Danh sách sinh từ `php artisan route:list --path=api --except-vendor` (81 route, không tính 2 route `ping` kiểm tra kết nối).

## Mã lỗi thống nhất

| Mã | Khi nào | Nội dung |
|---|---|---|
| 401 | Thiếu / sai token. Khi admin khoá tài khoản, mọi token của tài khoản đó bị thu hồi nên request tiếp theo nhận 401. | `{ message }`. Frontend xoá token và chuyển về trang đăng nhập. |
| 403 | Khách gọi API admin; đăng nhập bằng tài khoản bị khoá | `{ message }` |
| 404 | Không tìm thấy, hoặc khách mở đơn của người khác | `{ message }` (không lộ thông tin đơn) |
| 422 | Sai dữ liệu hoặc vi phạm nghiệp vụ (hết hàng, chuyển trạng thái sai…) | `{ message, errors: { field: [..] } }`, thông báo tiếng Việt |
| 429 | Vượt giới hạn tần suất | `{ message: "Bạn thao tác quá nhanh…" }` |

Danh sách có phân trang trả về `{ data: [...], meta: { current_page, last_page, per_page, total }, links }`.

## 1. Xác thực và tài khoản

| Method | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| POST | `/auth/register` | Công khai | Đăng ký (`name, email, phone?, password, password_confirmation`), trả `{ user, token }` |
| POST | `/auth/login` | Công khai | Đăng nhập (`email, password`), trả `{ user, token }`; sai mật khẩu → 422, tài khoản bị khoá → 403 |
| POST | `/auth/logout` | Khách | Xoá token hiện tại |
| GET | `/me` | Khách | Thông tin tài khoản đang đăng nhập |
| PUT | `/me` | Khách | Sửa `name, phone` |
| PUT | `/me/password` | Khách | Đổi mật khẩu (`current_password, password, password_confirmation`) |

## 2. Danh mục, sản phẩm, nội dung (công khai)

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/categories` | Cây danh mục: danh mục gốc kèm `children`, có số sản phẩm đang bán |
| GET | `/brands` | Danh sách thương hiệu |
| GET | `/products` | Danh sách sản phẩm đang bán, phân trang; mỗi thẻ có `thumbnail` và `hover_image` (ảnh thứ 2, hiện khi di chuột). Tham số: `q` (tên / SKU), `category` (slug, gồm danh mục con), `brand[]` (slug), `min_age`, `price_min`, `price_max`, `featured`, `sort` = `newest` \| `price_asc` \| `price_desc` \| `best_selling`, `page`, `per_page` |
| GET | `/products/{slug}` | Chi tiết sản phẩm: ảnh, danh mục, thương hiệu, tồn kho, sản phẩm liên quan |
| GET | `/banners` | Banner đang bật, theo thứ tự |
| GET | `/posts` | Bài viết đã xuất bản, phân trang |
| GET | `/posts/highlights` | Bài nổi bật (bài ghim, không có thì bài mới nhất) và các bài mới tiếp theo |
| GET | `/posts/{slug}` | Chi tiết bài viết |
| GET | `/banks` | Danh sách ngân hàng `{ code, name }` (ô chọn ngân hàng) |
| GET | `/shop` | Thông tin cửa hàng `{ hotline, return_days, shipping_fee }`: số cho nút gọi nổi (`null` = ẩn nút), số ngày được đổi trả (`RETURN_DAYS`), phí ship (`SHIPPING_FEE`) — dùng cho footer và khối cam kết ở trang sản phẩm |

## 3. Giỏ hàng và yêu thích

| Method | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/cart` | Khách | Các dòng giỏ, tạm tính, phí ship, cờ dòng nào không mua được |
| POST | `/cart` | Khách | Thêm (`product_id, quantity`); đã có thì cộng dồn, không vượt tồn kho |
| PATCH | `/cart/{id}` | Khách | Đổi số lượng |
| DELETE | `/cart/{id}` | Khách | Xoá dòng |
| GET | `/wishlist` | Khách | Danh sách yêu thích |
| POST | `/wishlist` | Khách | Thêm (`product_id`) |
| DELETE | `/wishlist/{productId}` | Khách | Bỏ yêu thích |

## 4. Đơn hàng và trả hàng (khách)

| Method | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/orders` | Khách | Đơn của tôi, phân trang, lọc `status` |
| POST | `/orders` | Khách | Đặt hàng từ giỏ (`recipient_name, phone, address, note?, payment_method` = `cod` \| `bank_qr`). Hết hàng → 422 kèm danh sách sản phẩm lỗi |
| GET | `/orders/{code}` | Khách (chủ đơn) | Chi tiết đơn; đơn chuyển khoản chưa trả kèm `qr_url` (VietQR) và thông tin tài khoản nhận |
| POST | `/orders/{code}/cancel` | Khách (chủ đơn) | Huỷ đơn đang chờ xác nhận và chưa thanh toán; hoàn kho |
| POST | `/orders/{code}/returns` | Khách (chủ đơn) | Gửi yêu cầu trả hàng (multipart): `reason, description?, items[][order_item_id, quantity], media[]` (1–5 file), `bank_name, bank_account, account_name` |

## 5. Quản trị (`/admin/...`, quyền Admin)

### Dashboard

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/admin/dashboard/summary` | Doanh thu hôm nay, tháng này (kèm % so với cùng kỳ tháng trước); số đơn hôm nay, chờ xác nhận, chờ xác nhận tiền, cần hoàn tiền; yêu cầu trả hàng chờ duyệt; khách mới tháng này; số sản phẩm sắp hết / hết hàng |
| GET | `/admin/dashboard/revenue?range=30d\|12m` | Doanh thu theo ngày (30 ngày) hoặc theo tháng (12 tháng) |
| GET | `/admin/dashboard/top-products` | Sản phẩm bán chạy |
| GET | `/admin/dashboard/order-status` | Số đơn theo từng trạng thái |

### Sản phẩm, danh mục, thương hiệu

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/admin/products` | Danh sách (cả sản phẩm ẩn), lọc `q, category, brand` (id), `status, low_stock`, phân trang |
| POST | `/admin/products` | Tạo sản phẩm |
| GET | `/admin/products/{product}` | Chi tiết để sửa |
| PUT/PATCH | `/admin/products/{product}` | Cập nhật |
| DELETE | `/admin/products/{product}` | Xoá mềm |
| POST | `/admin/products/{product}/images` | Tải ảnh (multipart `images[]`, jpg / png / webp ≤ 2 MB) |
| PUT | `/admin/products/{product}/images/order` | Sắp xếp lại ảnh (`ids[]`, đủ tất cả ảnh của sản phẩm) |
| DELETE | `/admin/product-images/{productImage}` | Xoá một ảnh |
| GET / POST | `/admin/categories` | Danh sách / tạo danh mục |
| PUT/PATCH / DELETE | `/admin/categories/{category}` | Sửa / xoá (từ chối nếu còn sản phẩm hoặc danh mục con) |
| GET / POST | `/admin/brands` | Danh sách / tạo thương hiệu |
| PUT/PATCH / DELETE | `/admin/brands/{brand}` | Sửa / xoá (từ chối nếu còn sản phẩm) |

### Đơn hàng và trả hàng

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/admin/orders` | Danh sách, lọc `q` (mã / tên / SĐT), `status, payment_method, payment_status, awaiting_payment` |
| GET | `/admin/orders/{order}` | Chi tiết đơn, các trạng thái được chuyển tiếp |
| PATCH | `/admin/orders/{order}/status` | Chuyển trạng thái (`status`); huỷ thì hoàn kho, hoàn thành thì ghi `completed_at` |
| PATCH | `/admin/orders/{order}/payment` | Xác nhận đã nhận tiền chuyển khoản |
| PATCH | `/admin/orders/{order}/refund` | Ghi nhận đã hoàn tiền cho đơn huỷ sau khi khách đã trả |
| GET | `/admin/returns` | Danh sách yêu cầu trả hàng, lọc `status, q` |
| GET | `/admin/returns/{returnRequest}` | Chi tiết: sản phẩm trả, ảnh / video, tài khoản nhận tiền, số tiền gợi ý và tối đa |
| PATCH | `/admin/returns/{returnRequest}/approve` | Duyệt (`admin_note?`) |
| PATCH | `/admin/returns/{returnRequest}/reject` | Từ chối (`admin_note` bắt buộc) |
| PATCH | `/admin/returns/{returnRequest}/receive` | Đã nhận hàng (`items[][id, restock]`); món `restock = true` được nhập lại kho |
| PATCH | `/admin/returns/{returnRequest}/refund` | Đã hoàn tiền (`refund_amount?`, mặc định = số gợi ý) |

### Kho

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/admin/inventory` | Tồn kho từng sản phẩm, ngưỡng áp dụng và nguồn của ngưỡng, kèm `summary` (số sắp hết / hết hàng); lọc `q, low_stock`, sắp xếp `sort` |
| POST | `/admin/inventory/{product}/adjust` | Nhập kho hoặc điều chỉnh: `type` = `import` (số dương) \| `adjust` (âm hoặc dương), `quantity`, `note`; không cho kho âm |
| PATCH | `/admin/inventory/{product}/threshold` | Đặt ngưỡng sắp hết hàng riêng (`low_stock_threshold`, `null` = dùng ngưỡng danh mục / chung) |
| GET | `/admin/inventory/movements` | Lịch sử biến động kho, lọc `product, reason, from, to` (Y-m-d) |

### Người dùng, nội dung, cài đặt

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/admin/users` | Danh sách người dùng: `q, role, is_active`, `sort` = `newest` \| `top_spent` \| `most_orders` |
| PATCH | `/admin/users/{user}/toggle-active` | Khoá / mở khoá (không tự khoá mình); khoá thì thu hồi mọi token |
| GET / POST | `/admin/banners` | Danh sách / tạo banner (multipart ảnh) |
| PUT/PATCH / DELETE | `/admin/banners/{banner}` | Sửa / xoá |
| PATCH | `/admin/banners/{banner}/toggle-active` | Bật / tắt |
| PUT | `/admin/banners/order` | Sắp xếp lại (`ids[]`) |
| GET / POST | `/admin/posts` | Danh sách (lọc `q`, `status` = `draft` \| `scheduled` \| `published`, `featured`) / tạo bài viết |
| GET / PUT/PATCH / DELETE | `/admin/posts/{post}` | Xem / sửa / xoá bài |
| POST | `/admin/posts/images` | Tải ảnh chèn vào nội dung bài (`image` ≤ 5 MB), trả `{ url }` |
| GET | `/admin/settings` | Cài đặt hiện tại: tài khoản nhận tiền, ngưỡng sắp hết hàng chung, danh sách ngân hàng |
| PUT | `/admin/settings` | Lưu tài khoản nhận tiền (`bank` theo mã VietQR, `account` 6–20 chữ số, `account_name` in hoa không dấu) |
| PUT | `/admin/settings/low-stock` | Lưu ngưỡng sắp hết hàng chung |
| PUT | `/admin/settings/hotline` | Lưu số hotline (`hotline`: số bắt đầu bằng 0, 10–11 số, hoặc tổng đài 1800/1900; bỏ qua khoảng trắng, dấu chấm, gạch ngang; `null` = ẩn nút gọi) |
