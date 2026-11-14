# Spec: Web TMĐT bán đồ chơi sưu tầm (Đồ án)

> Đây là **bản thiết kế ban đầu** (giữ nguyên để đối chiếu). Những gì đã đổi hoặc bổ sung khi làm nằm ở mục cuối **Cập nhật sau khi triển khai**. Tài liệu chính thức cho báo cáo: thư mục `docs/`.

## Context
Đồ án môn học/tốt nghiệp, 1 người làm trong 4–6 tuần. Đã có sẵn 2 thư mục vừa khởi tạo:
- `backend/` — Laravel 13 (PHP 8.3), skeleton mặc định, đang dùng SQLite, chỉ có migration users/cache/jobs.
- `frontend/` — React 19 + Vite 8 (JavaScript), chưa có router/state/UI lib.

Mục tiêu: một cửa hàng đồ chơi **sưu tầm** (figure, mô hình, Gundam, LEGO…) có đủ chức năng để demo và bảo vệ trước hội đồng. Toàn bộ code tự viết, dễ giải thích.

**Quyết định đã chốt với người dùng:** MySQL · 2 vai trò Khách/Admin · bắt buộc đăng nhập khi mua · thanh toán COD + QR chuyển khoản · giao diện tối, cá tính kiểu đồ chơi sưu tầm · Laravel làm REST API, React làm cả storefront và admin (admin dùng Ant Design).

**Giả định (chưa xác nhận rõ):** UI tiếng Việt, tiền VND · QR = ảnh VietQR kèm mã đơn, admin xác nhận đã nhận tiền thủ công · phí ship cố định (cấu hình trong .env) · ảnh lưu `storage/app/public` · chỉ chạy demo local, không deploy.

## Kiến trúc
```
React SPA (Vite :5173)  ──axios + Bearer token──►  Laravel API (:8000) /api/v1  ──► MySQL
  ├─ Storefront (Tailwind, tự thiết kế)                ├─ Sanctum (API token)
  └─ /admin (Ant Design)                               └─ storage/public (ảnh)
```
- **Auth:** Laravel Sanctum dạng personal access token (frontend khác origin nên token đơn giản hơn cookie SPA). Token lưu localStorage, gắn bằng axios interceptor; gặp 401 thì đăng xuất.
- **Phân quyền:** cột `users.role` (`customer|admin`) + middleware `admin` cho nhóm route `/api/v1/admin/*`. Tài khoản bị khoá (`is_active=false`) không đăng nhập được.
- **Backend:** Controller mỏng + FormRequest (validate) + API Resource (định dạng JSON) + Service cho nghiệp vụ đặt hàng/kho (`OrderService`, `StockService`). CORS cho `http://localhost:5173`.
- **Frontend libs:** `react-router` v7, `@tanstack/react-query` (gọi API/cache), `axios`, `zustand` (auth + số lượng giỏ), `tailwindcss` v4, `antd` v5 + `@ant-design/plots` (biểu đồ dashboard), `react-hook-form` (form storefront).

## Cơ sở dữ liệu (MySQL)
| Bảng | Cột chính |
|---|---|
| users | name, email, password, phone, role, is_active |
| categories | name, slug, parent_id (nullable), image |
| brands | name, slug, logo |
| products | category_id, brand_id, name, slug, sku, description, price, sale_price?, stock, min_age (0/3/6/8/14/18), is_featured, status (active/hidden), soft deletes |
| product_images | product_id, path, sort_order |
| cart_items | user_id, product_id, quantity (unique user+product) |
| wishlists | user_id, product_id (unique) |
| orders | code, user_id, recipient_name, phone, address, note, subtotal, shipping_fee, total, payment_method (cod/bank_qr), payment_status (unpaid/paid), status (pending/confirmed/shipping/completed/cancelled) |
| order_items | order_id, product_id, product_name (snapshot), price (snapshot), quantity |
| stock_movements | product_id, change (+/-), reason (order/cancel/import/adjust), order_id?, user_id, note |
| posts (NEWS) | author_id, title, slug, thumbnail, excerpt, content (HTML), is_published, published_at |
| banners | title, image, link, sort_order, is_active |

## Luồng nghiệp vụ quan trọng
- **Đặt hàng** (`OrderService::place`): trong `DB::transaction`, `lockForUpdate` các sản phẩm trong giỏ → kiểm tra tồn kho & trạng thái → tạo order + order_items (lưu snapshot giá/tên) → trừ `stock` + ghi `stock_movements(reason=order)` → xoá giỏ. Hết hàng → 422 kèm danh sách sản phẩm lỗi.
- **Trạng thái đơn:** pending → confirmed → shipping → completed; huỷ được khi pending (khách) hoặc pending/confirmed (admin). Huỷ thì hoàn kho (`reason=cancel`). Chuyển trạng thái không hợp lệ → 422.
- **QR chuyển khoản:** trang đặt hàng thành công/chi tiết đơn hiển thị ảnh `https://img.vietqr.io/image/{BANK}-{ACCOUNT}-compact2.png?amount={total}&addInfo={order.code}` (BANK/ACCOUNT/ACCOUNT_NAME cấu hình trong `.env`). Admin bấm “Đã nhận tiền” → `payment_status=paid`. COD tự chuyển paid khi đơn completed.
- **Kho:** admin nhập/điều chỉnh tồn → ghi stock_movements; danh sách sắp hết hàng = `stock <= LOW_STOCK_THRESHOLD` (mặc định 5).

## API (prefix `/api/v1`)
- Public: `POST auth/register|login`, `GET categories`, `GET brands`, `GET products` (lọc `q, category, brand, min_age, price_min, price_max, sort, page`), `GET products/{slug}`, `GET banners`, `GET posts`, `GET posts/{slug}`
- Đăng nhập: `POST auth/logout`, `GET|PUT me`, `PUT me/password`, `GET|POST|PATCH|DELETE cart[/{id}]`, `GET|POST|DELETE wishlist[/{productId}]`, `GET|POST orders`, `GET orders/{code}`, `POST orders/{code}/cancel`
- Admin: CRUD `products` (+ upload/xoá/sắp xếp ảnh), `categories`, `brands`, `posts`, `banners`; `GET orders`, `PATCH orders/{id}/status`, `PATCH orders/{id}/payment`; `GET users`, `PATCH users/{id}/toggle-active`; `GET inventory`, `POST inventory/{product}/adjust`, `GET inventory/movements`; `GET dashboard/summary|revenue?range=30d|12m|top-products|order-status`

## Trang frontend
- **Storefront:** Trang chủ (banner slider, nổi bật, hàng mới, tin mới) · Danh sách sản phẩm (bộ lọc danh mục/thương hiệu/độ tuổi/giá, sắp xếp, phân trang, đồng bộ lên URL) · Chi tiết sản phẩm (gallery, thêm giỏ, yêu thích) · Giỏ hàng · Checkout (thông tin nhận hàng + chọn COD/QR) · Đặt hàng thành công (hiện QR nếu chọn chuyển khoản) · Đơn của tôi + chi tiết (huỷ khi pending) · Yêu thích · Hồ sơ/đổi mật khẩu · Đăng nhập/Đăng ký · NEWS danh sách/chi tiết.
- **Admin (`/admin`, layout Ant Design, route guard role=admin):** Dashboard · Sản phẩm · Danh mục · Thương hiệu · Đơn hàng · Kho · Người dùng · Banner · NEWS.
- Cấu trúc: `src/api/` (axios client + hàm theo module), `src/features/<module>/` (hooks react-query), `src/pages/store|admin/`, `src/components/`, `src/layouts/`, `src/stores/`.
- **Giao diện storefront:** tối màu, nhấn neon/ánh kim, typography đậm. Đầu tuần 2 dùng skill `ui-ux-pro-max` để chốt bảng màu + font pairing, `ui-styling` cho component Tailwind; admin dùng theme Ant Design mặc định.

## Lộ trình 6 tuần (MVP chạy được hết tuần 4; tuần 5 có thể cắt nếu trễ)
1. **Tuần 1 – Nền tảng:** `git init` ở `D:\doan`; chuyển `.env` sang MySQL; cài Laravel Boost (theo `backend/CLAUDE.md`), Sanctum (`php artisan install:api`); migration toàn bộ bảng + model/quan hệ + factory/seeder dữ liệu demo (~60 sản phẩm, 8 danh mục, 10 thương hiệu, 1 admin); auth API + test. Frontend: cài libs, Tailwind, router, axios client, layout store/admin, trang đăng nhập/đăng ký.
2. **Tuần 2 – Catalog:** API sản phẩm/danh mục/thương hiệu/banner + bộ lọc; trang chủ, danh sách, chi tiết sản phẩm; chốt design system storefront.
3. **Tuần 3 – Mua hàng:** giỏ, yêu thích, `OrderService` (transaction + kho), checkout COD/QR, đơn của tôi, huỷ đơn. Feature test cho đặt hàng/hết hàng/huỷ hoàn kho.
4. **Tuần 4 – Admin lõi:** CRUD sản phẩm (upload nhiều ảnh), danh mục, thương hiệu; quản lý đơn (đổi trạng thái, xác nhận thanh toán).
5. **Tuần 5 – Admin mở rộng:** kho + lịch sử biến động, người dùng (khoá/mở), banner, NEWS (admin + storefront), dashboard thống kê.
6. **Tuần 6 – Hoàn thiện:** responsive, trạng thái loading/lỗi/rỗng, dữ liệu demo đẹp, kiểm thử toàn luồng, tài liệu cho báo cáo (ERD, use case, danh sách API).

## Xử lý lỗi
- API trả JSON thống nhất: 422 `{message, errors}` (validation/nghiệp vụ), 401, 403, 404.
- Frontend: interceptor xử lý 401; toast lỗi chung; form hiện lỗi theo field từ `errors`.

## Kiểm thử & xác minh
- **Backend:** PHPUnit feature test với DB test riêng (`RefreshDatabase`): auth (đăng ký/đăng nhập/khoá tài khoản), phân quyền admin (customer gọi `/admin/*` → 403), bộ lọc sản phẩm, giỏ hàng, đặt hàng (trừ kho, hết hàng 422, huỷ hoàn kho), chuyển trạng thái đơn. Chạy `php artisan test`.
- **Frontend:** `npm run lint` + `npm run build` không lỗi.
- **End-to-end thủ công** (`php artisan serve` + `npm run dev`): đăng ký → lọc sản phẩm → thêm giỏ/yêu thích → checkout QR (thấy mã QR đúng số tiền + mã đơn) → admin xác nhận thanh toán, chuyển trạng thái → tồn kho giảm đúng, dashboard cập nhật → khách huỷ đơn pending → kho hoàn lại.

## Bước đầu tiên sau khi duyệt: tạo file task trong `D:\doan\.claude\`
Chưa viết code. Chỉ tạo tài liệu:
- `.claude/spec.md` — bản thiết kế này (kiến trúc, DB, API, luồng nghiệp vụ).
- `.claude/tasks/README.md` — mục lục + checklist tiến độ `- [ ]` theo tuần, ghi rõ task nào phụ thuộc task nào.
- `.claude/tasks/NN-ten-task.md` — mỗi task 1 file (làm xong trong ~0.5–1 ngày), gồm: **Mục tiêu · Phụ thuộc · File tạo/sửa · Các bước · Tiêu chí hoàn thành (lệnh kiểm tra cụ thể)**.

Danh sách task dự kiến:
| Tuần | Task |
|---|---|
| 1 | 01-git-init · 02-backend-mysql-config · 03-laravel-boost-sanctum-cors · 04-migrations-models · 05-factories-seeders · 06-auth-api (+test) · 07-admin-middleware (+test) · 08-frontend-setup (libs, Tailwind, router, axios) · 09-layouts-route-guard · 10-login-register-pages |
| 2 | 11-catalog-api (categories/brands/banners) · 12-product-list-api-filter (+test) · 13-product-detail-api · 14-design-system-storefront (ui-ux-pro-max) · 15-home-page · 16-product-list-page · 17-product-detail-page |
| 3 | 18-cart-api (+test) · 19-wishlist-api · 20-order-service-place (+test kho) · 21-order-cancel-status (+test) · 22-cart-page · 23-checkout-page-qr · 24-my-orders-pages · 25-wishlist-profile-pages |
| 4 | 26-admin-layout-antd · 27-admin-categories-brands · 28-admin-products-api-images · 29-admin-products-pages · 30-admin-orders |
| 5 | 31-inventory-api-page · 32-admin-users · 33-admin-banners · 34-news-api-admin · 35-news-storefront · 36-dashboard-api · 37-dashboard-page |
| 6 | 38-ux-states-responsive · 39-demo-data · 40-e2e-manual-test · 41-report-docs (ERD, use case, API) |

Sau đó làm lần lượt từng task theo README (TDD cho backend), đánh dấu checklist khi xong.

## Cập nhật sau khi triển khai
Khác so với kế hoạch ban đầu:
- **Thư viện:** Ant Design **6** (không phải v5). Admin **không** dùng theme mặc định: chỉnh theo màu thương hiệu, có chế độ tối.
- **Bảng thêm:** `settings` (tài khoản nhận tiền, hotline, ngưỡng sắp hết chung), `return_requests` / `return_request_items` / `return_request_media` (trả hàng & hoàn tiền); cột `orders.completed_at`, `posts.is_featured`, `low_stock_threshold` ở `categories` / `products`. `payment_status` có thêm `refunded`.
- **Ngưỡng sắp hết hàng:** không còn cố định `LOW_STOCK_THRESHOLD`; ưu tiên sản phẩm → danh mục → danh mục cha → ngưỡng chung (task 45).
- **Doanh thu:** chỉ tính đơn hoàn thành **và** đã thanh toán, theo `completed_at`; trừ tiền hoàn trả hàng vào ngày hoàn (xem `docs/flows.md`).
- **Mô tả sản phẩm:** HTML từ trình soạn thảo (có ảnh), không còn là chữ thường (task 50).

Tính năng bổ sung (task 42–52, xem `tasks/README.md`): cài đặt cửa hàng, hoàn tiền đơn huỷ, trả hàng sau khi giao, ngưỡng sắp hết theo cấp, giao diện sáng / tối + hotline, nâng cấp giao diện cửa hàng và admin, **chatbot theo kịch bản** (không dùng AI, `POST /chat`), mô tả sản phẩm có ảnh + "Xem thêm", cảnh báo tồn kho ở trang Sản phẩm admin.

Kết quả kiểm thử hiện tại: 360 trường hợp PHPUnit đạt, lint / build đạt (chi tiết `docs/testing.md`).
