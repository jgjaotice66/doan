# Danh sách task – Web bán đồ chơi sưu tầm

Thiết kế tổng thể: [../spec.md](../spec.md)

**Cách dùng:** làm theo thứ tự số (hoặc bất kỳ task nào đã xong hết phần *Phụ thuộc*). Mỗi file có Mục tiêu · Phụ thuộc · File tạo/sửa · Các bước · Tiêu chí hoàn thành. Chỉ đánh dấu `[x]` khi các lệnh kiểm tra trong *Tiêu chí hoàn thành* đã chạy đạt. Backend làm theo TDD (viết test trước).

**Mốc an toàn:** hết tuần 4 phải có MVP chạy được (mua hàng + admin lõi). Nếu trễ, cắt bớt tuần 5 theo thứ tự (cắt cái đầu tiên trước): 32 Người dùng → 33 Banner → 34/35 NEWS → 31 Kho → 36/37 Dashboard (giữ lâu nhất vì demo ấn tượng nhất).

## Tuần 1 – Nền tảng
- [x] [01](01-git-init.md) Khởi tạo Git — phụ thuộc: —
- [x] [02](02-backend-mysql-config.md) Chuyển backend sang MySQL — 01
- [x] [03](03-laravel-boost-sanctum-cors.md) Laravel Boost, Sanctum, CORS — 02
- [ ] [04](04-migrations-models.md) Migration & Model — 03
- [ ] [05](05-factories-seeders.md) Factory & Seeder — 04
- [ ] [06](06-auth-api.md) API xác thực (+test) — 04
- [ ] [07](07-admin-middleware.md) Middleware admin (+test) — 06
- [ ] [08](08-frontend-setup.md) Cài đặt frontend — 01
- [ ] [09](09-layouts-route-guard.md) Layout & bảo vệ route — 08
- [ ] [10](10-login-register-pages.md) Trang đăng nhập/đăng ký — 06, 09

## Tuần 2 – Catalog
- [ ] [11](11-catalog-api.md) API danh mục/thương hiệu/banner — 05
- [ ] [12](12-product-list-api-filter.md) API danh sách sản phẩm + lọc (+test) — 05
- [ ] [13](13-product-detail-api.md) API chi tiết sản phẩm — 12
- [ ] [14](14-design-system-storefront.md) Design system storefront — 08
- [ ] [15](15-home-page.md) Trang chủ — 11, 12, 14
- [ ] [16](16-product-list-page.md) Trang danh sách sản phẩm — 12, 14
- [ ] [17](17-product-detail-page.md) Trang chi tiết sản phẩm — 13, 14

## Tuần 3 – Mua hàng
- [ ] [18](18-cart-api.md) API giỏ hàng (+test) — 06, 12
- [ ] [19](19-wishlist-api.md) API yêu thích — 06, 12
- [ ] [20](20-order-service-place.md) Đặt hàng + trừ kho (+test) — 18
- [ ] [21](21-order-cancel-status.md) Huỷ đơn & trạng thái (+test) — 20
- [ ] [22](22-cart-page.md) Trang giỏ hàng — 17, 18
- [ ] [23](23-checkout-page-qr.md) Checkout & QR — 20, 22
- [ ] [24](24-my-orders-pages.md) Đơn hàng của tôi — 21, 23
- [ ] [25](25-wishlist-profile-pages.md) Yêu thích & hồ sơ — 19, 10

## Tuần 4 – Admin lõi (hết tuần này = MVP)
- [ ] [26](26-admin-layout-antd.md) Layout admin Ant Design — 07, 09
- [ ] [27](27-admin-categories-brands.md) Danh mục & thương hiệu — 26
- [ ] [28](28-admin-products-api-images.md) API sản phẩm + ảnh (+test) — 27
- [ ] [29](29-admin-products-pages.md) Giao diện sản phẩm — 28
- [ ] [30](30-admin-orders.md) Quản lý đơn hàng — 21, 26

## Tuần 5 – Admin mở rộng
- [ ] [31](31-inventory-api-page.md) Kho / tồn kho — 28
- [ ] [32](32-admin-users.md) Người dùng — 26
- [ ] [33](33-admin-banners.md) Banner — 26, 11
- [ ] [34](34-news-api-admin.md) NEWS API + quản trị — 26
- [ ] [35](35-news-storefront.md) NEWS storefront — 34, 14
- [ ] [36](36-dashboard-api.md) Dashboard API (+test) — 21
- [ ] [37](37-dashboard-page.md) Dashboard giao diện — 36, 26

## Tuần 6 – Hoàn thiện
- [ ] [38](38-ux-states-responsive.md) UX & responsive — 25, 35
- [ ] [39](39-demo-data.md) Dữ liệu demo đẹp — 05, 36
- [ ] [40](40-e2e-manual-test.md) Kiểm thử toàn luồng — 38, 39
- [ ] [41](41-report-docs.md) Tài liệu báo cáo — 40
