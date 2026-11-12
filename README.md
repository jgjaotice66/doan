# Toy Store – Website thương mại điện tử bán đồ chơi sưu tầm

Đồ án: cửa hàng trực tuyến bán figure, mô hình Gundam, LEGO, Funko… Khách xem và lọc sản phẩm, đặt hàng (COD hoặc chuyển khoản QR), theo dõi và huỷ đơn, yêu cầu trả hàng. Quản trị viên quản lý sản phẩm, kho, đơn hàng, trả hàng, nội dung và xem thống kê doanh thu.

| Phần | Công nghệ |
|---|---|
| Backend | Laravel 13 (PHP 8.3), REST API `/api/v1`, Sanctum (token), MySQL |
| Frontend | React 19 + Vite, React Router, TanStack Query, Zustand, Tailwind CSS 4 (cửa hàng), Ant Design 6 (trang quản trị) |
| Kiểm thử | PHPUnit (300+ feature test), ESLint |

## Tài liệu

- [Cơ sở dữ liệu (ERD)](docs/erd.md)
- [Use case](docs/use-cases.md)
- [Danh sách API](docs/api.md)
- [Luồng nghiệp vụ và sơ đồ trạng thái](docs/flows.md): đặt hàng, trạng thái đơn / thanh toán / trả hàng, quy ước doanh thu, tồn kho
- [Kết quả kiểm thử toàn luồng](.claude/test-checklist.md)

## 1. Yêu cầu môi trường

| Phần mềm | Phiên bản | Ghi chú |
|---|---|---|
| PHP | 8.3 trở lên | Cần extension `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `gd`, `intl`, `zip` |
| Composer | 2.x | |
| MySQL | 8.x (hoặc MariaDB 10.6+) | Trên Windows có thể dùng WAMP / XAMPP / Laragon |
| Node.js | 20.19+ hoặc 22+ (đã chạy với 24) | Kèm npm |
| Git | | |

### Chỉnh `php.ini` (để upload video minh chứng trả hàng)

Khách được tải tối đa 5 file minh chứng, mỗi video tới 50 MB. Mặc định PHP chỉ nhận 2 MB / file, nên cần mở `php.ini` của bản PHP đang dùng (`php --ini` cho biết đường dẫn), sửa:

```ini
upload_max_filesize = 64M
post_max_size = 300M
```

Nên sao lưu file gốc trước khi sửa (VD `php.ini.bak`). Sửa xong, khởi động lại `php artisan serve`.

## 2. Cài đặt

### Bước 1 – Lấy mã nguồn

```bash
git clone <địa-chỉ-repo> toystore
cd toystore
```

### Bước 2 – Tạo database

Tạo 2 database rỗng: `toystore` để chạy và `toystore_test` để chạy test. Dùng phpMyAdmin hoặc lệnh:

```sql
CREATE DATABASE toystore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE toystore_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Bước 3 – Backend

```bash
cd backend
composer install
cp .env.example .env          # Windows CMD: copy .env.example .env
php artisan key:generate
```

Mở `backend/.env` và sửa thông tin kết nối MySQL nếu khác mặc định (`DB_USERNAME=root`, `DB_PASSWORD=` trống). Sau đó nạp dữ liệu demo:

```bash
php artisan app:reset-demo --force
```

Lệnh này tạo bảng, nạp dữ liệu demo và tạo liên kết `public/storage`. Dữ liệu demo gồm:

- 1 admin và 8 khách;
- 8 danh mục, 10 thương hiệu, 60 sản phẩm;
- 3 banner, 6 bài viết;
- khoảng 80 đơn hàng trải trong 11 tháng, đủ mọi trạng thái, kèm 2 yêu cầu trả hàng, để dashboard có số liệu.

### Bước 4 – Frontend

```bash
cd ../frontend
npm install
cp .env.example .env          # VITE_API_URL=http://localhost:8000/api/v1
```

## 3. Chạy dự án

Mở 2 cửa sổ terminal:

```bash
# Terminal 1 – API tại http://localhost:8000
cd backend
php artisan serve

# Terminal 2 – Giao diện tại http://localhost:5173
cd frontend
npm run dev
```

Truy cập **http://localhost:5173**. Trang quản trị ở **http://localhost:5173/admin**.

### Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị viên | `admin@toystore.test` | `password` |
| Khách hàng (có sẵn đơn, yêu cầu trả hàng) | `khach@toystore.test` | `password` |

### Trước khi demo

- **Tài khoản nhận chuyển khoản:** dữ liệu demo dùng số tài khoản mẫu `0000000000`. Muốn quét mã QR bằng app ngân hàng thật, vào **Admin → Cài đặt**, chọn ngân hàng, nhập số tài khoản và tên chủ tài khoản (in hoa, không dấu). Mã QR của các đơn chưa thanh toán đổi theo ngay.
- **Làm mới dữ liệu:** chạy `php artisan app:reset-demo`. Lệnh xoá **toàn bộ** dữ liệu và ảnh đã tải lên rồi nạp lại dữ liệu demo, nên phải gõ `yes` xác nhận; thêm `--force` để bỏ qua bước hỏi. Lệnh từ chối chạy khi `APP_ENV=production`.

## 4. Cấu hình riêng của dự án (`backend/.env`)

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `FRONTEND_URL` | `http://localhost:5173` | Địa chỉ frontend, dùng cho CORS |
| `SHIPPING_FEE` | `30000` | Phí vận chuyển cố định mỗi đơn (VND) |
| `LOW_STOCK_THRESHOLD` | `5` | Ngưỡng sắp hết hàng chung. Ngưỡng lưu ở Admin → Cài đặt được ưu tiên hơn; sản phẩm và danh mục có thể đặt ngưỡng riêng (ưu tiên: sản phẩm → danh mục → danh mục cha → chung) |
| `SHOP_TIMEZONE` | `Asia/Ho_Chi_Minh` | Múi giờ tính "hôm nay", "tháng này" trên dashboard |
| `RETURN_DAYS` | `10` | Số ngày sau khi đơn hoàn thành mà khách còn được yêu cầu trả hàng |
| `VIETQR_BANK`, `VIETQR_ACCOUNT`, `VIETQR_ACCOUNT_NAME` | `MB`, `0000000000`, … | Tài khoản nhận tiền mặc định. Giá trị lưu ở Admin → Cài đặt được ưu tiên hơn |

**Quy ước doanh thu:** chỉ tính đơn *Hoàn thành* và *Đã thanh toán*, vào ngày hoàn thành, theo giờ cửa hàng. Tiền hoàn của yêu cầu trả hàng được trừ vào ngày hoàn tiền. Chi tiết xem [docs/flows.md](docs/flows.md#6-quy-ước-tính-doanh-thu).

## 5. Kiểm thử

```bash
# Backend: dùng database toystore_test (cấu hình trong backend/phpunit.xml)
cd backend
php artisan test

# Frontend
cd frontend
npm run lint
npm run build
```

## 6. Cấu trúc thư mục

```
backend/
  app/Enums/             Trạng thái đơn, thanh toán, trả hàng, lý do kho… (kèm luồng chuyển hợp lệ)
  app/Http/Controllers/  Api/ (cửa hàng) và Api/Admin/ (quản trị)
  app/Http/Requests/     Kiểm tra dữ liệu đầu vào (thông báo tiếng Việt)
  app/Services/          Nghiệp vụ: đặt hàng, kho, trả hàng, giỏ, thống kê
  database/seeders/      Dữ liệu demo
  routes/api.php         Toàn bộ API /api/v1
  tests/Feature/         Feature test
frontend/src/
  api/                   Hàm gọi API (axios)
  features/              Hook TanStack Query theo module
  pages/store, pages/admin
  components/, layouts/, stores/ (Zustand)
docs/                    Tài liệu báo cáo
```

## 7. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| `SQLSTATE[HY000] [1049] Unknown database` | Chưa tạo database `toystore` (bước 2) hoặc sai tên trong `.env` |
| Ảnh sản phẩm tải lên không hiện | Chạy `php artisan storage:link` |
| Gửi yêu cầu trả hàng có video báo lỗi / mất dữ liệu form | Chưa tăng `upload_max_filesize`, `post_max_size` trong `php.ini` |
| Frontend báo "Không kết nối được máy chủ" | Backend chưa chạy, hoặc `VITE_API_URL` trong `frontend/.env` sai cổng |
| Lỗi CORS | `FRONTEND_URL` trong `backend/.env` phải đúng địa chỉ đang mở frontend |
| Test lỗi kết nối DB | Chưa tạo database `toystore_test` |
