# Cơ sở dữ liệu (ERD)

Sơ đồ lấy từ các migration trong `backend/database/migrations`. Hệ quản trị: MySQL (utf8mb4). Tiền lưu dạng số nguyên VND (`unsigned bigint`), không có số lẻ.

Không vẽ các bảng hạ tầng của Laravel: `password_reset_tokens`, `sessions`, `cache`, `jobs`. Bảng `personal_access_tokens` (token đăng nhập Sanctum) có vẽ.

## Sơ đồ

```mermaid
erDiagram
    users ||--o{ personal_access_tokens : "đăng nhập"
    users ||--o{ cart_items : "giỏ hàng"
    users ||--o{ wishlists : "yêu thích"
    users ||--o{ orders : "đặt"
    users ||--o{ posts : "viết (admin)"
    users ||--o{ return_requests : "gửi"
    users |o--o{ stock_movements : "thực hiện"

    categories |o--o{ categories : "danh mục cha"
    categories ||--o{ products : "chứa"
    brands ||--o{ products : "sản xuất"

    products ||--o{ product_images : "ảnh"
    products ||--o{ cart_items : ""
    products ||--o{ wishlists : ""
    products |o--o{ order_items : "snapshot"
    products ||--o{ stock_movements : "biến động kho"

    orders ||--|{ order_items : "gồm"
    orders |o--o{ stock_movements : "gây ra"
    orders ||--o{ return_requests : "yêu cầu trả"

    return_requests ||--|{ return_request_items : "gồm"
    return_requests ||--|{ return_request_media : "minh chứng"
    order_items ||--o{ return_request_items : "được trả"

    users {
        bigint id PK
        string name
        string email UK
        string password
        string phone "nullable"
        string role "customer | admin"
        boolean is_active "false = bị khoá"
        timestamp created_at
    }
    personal_access_tokens {
        bigint id PK
        string tokenable_type
        bigint tokenable_id
        string token UK "hash SHA-256"
        timestamp last_used_at
    }
    categories {
        bigint id PK
        bigint parent_id FK "nullable"
        string name
        string slug UK
        string image "nullable"
        smallint low_stock_threshold "nullable"
    }
    brands {
        bigint id PK
        string name
        string slug UK
        string logo "nullable"
    }
    products {
        bigint id PK
        bigint category_id FK
        bigint brand_id FK
        string name
        string slug UK
        string sku UK
        text description
        bigint price
        bigint sale_price "nullable, < price"
        int stock
        smallint low_stock_threshold "nullable"
        tinyint min_age "0/3/6/8/14/18"
        boolean is_featured
        string status "active | hidden"
        timestamp deleted_at "xoá mềm"
    }
    product_images {
        bigint id PK
        bigint product_id FK
        string path
        int sort_order
    }
    cart_items {
        bigint id PK
        bigint user_id FK
        bigint product_id FK
        int quantity
    }
    wishlists {
        bigint id PK
        bigint user_id FK
        bigint product_id FK
    }
    orders {
        bigint id PK
        string code UK "mã đơn, nội dung chuyển khoản"
        bigint user_id FK
        string recipient_name
        string phone
        string address
        text note
        bigint subtotal
        bigint shipping_fee
        bigint total
        string payment_method "cod | bank_qr"
        string payment_status "unpaid | paid | refunded"
        string status "pending | confirmed | shipping | completed | cancelled"
        timestamp completed_at "ngày tính doanh thu"
    }
    order_items {
        bigint id PK
        bigint order_id FK
        bigint product_id FK "nullable"
        string product_name "chụp lại lúc đặt"
        bigint price "chụp lại lúc đặt"
        int quantity
    }
    stock_movements {
        bigint id PK
        bigint product_id FK
        int change "+ nhập / - xuất"
        string reason "order | cancel | import | adjust | return"
        bigint order_id FK "nullable"
        bigint user_id FK "nullable"
        string note
        timestamp created_at
    }
    return_requests {
        bigint id PK
        bigint order_id FK
        bigint user_id FK
        string status "pending | approved | received | refunded | rejected"
        string reason "defective | wrong_item | missing_parts | other"
        text description
        string bank_name
        string bank_account
        string account_name
        int refund_amount "nullable"
        text admin_note
        timestamp reviewed_at
        timestamp received_at
        timestamp refunded_at "ngày trừ doanh thu"
    }
    return_request_items {
        bigint id PK
        bigint return_request_id FK
        bigint order_item_id FK
        int quantity
        boolean restock "có nhập lại kho không"
    }
    return_request_media {
        bigint id PK
        bigint return_request_id FK
        string path
        string type "image | video"
    }
    posts {
        bigint id PK
        bigint author_id FK
        string title
        string slug UK
        string thumbnail
        text excerpt
        longtext content "HTML"
        boolean is_published
        boolean is_featured "tin ghim"
        timestamp published_at
    }
    banners {
        bigint id PK
        string title
        string image
        string link "nullable"
        int sort_order
        boolean is_active
    }
    settings {
        string key PK
        text value
    }
```

`posts`, `banners`, `settings` không có khoá ngoại tới bảng khác ngoài `posts.author_id → users`.

Chatbot không có bảng riêng: bot đọc dữ liệu có sẵn (sản phẩm, đơn hàng, cài đặt), còn lịch sử trò chuyện chỉ nằm ở trình duyệt (`sessionStorage`).

## Mô tả các bảng

| Bảng | Vai trò |
|---|---|
| `users` | Tài khoản khách và admin. `role` phân quyền, `is_active = false` thì không đăng nhập và không gọi API được. |
| `personal_access_tokens` | Token Sanctum. Mỗi lần đăng nhập tạo một token, đăng xuất thì xoá. |
| `categories` | Danh mục 2 cấp (`parent_id`). Có thể đặt ngưỡng sắp hết hàng riêng cho cả danh mục. |
| `brands` | Thương hiệu (Bandai, LEGO, Good Smile…). |
| `products` | Sản phẩm. `sale_price` là giá khuyến mãi; giá bán thực tế = `sale_price` nếu có, không thì `price`. `description` là HTML đã lọc (có thể chứa ảnh nằm ở `storage/app/public/products/content`). Xoá mềm để đơn cũ vẫn tra được. |
| `product_images` | Nhiều ảnh mỗi sản phẩm, sắp xếp bằng `sort_order` (ảnh đầu là ảnh đại diện). |
| `cart_items` | Giỏ hàng lưu trên server theo tài khoản, mỗi sản phẩm một dòng. |
| `wishlists` | Danh sách yêu thích. |
| `orders` | Đơn hàng: thông tin nhận hàng, tiền, phương thức và trạng thái thanh toán, trạng thái đơn. |
| `order_items` | Dòng hàng. Lưu lại tên và giá lúc đặt, nên sửa hoặc xoá sản phẩm sau này không làm đổi đơn cũ. |
| `stock_movements` | Nhật ký mọi lần tồn kho thay đổi. Tồn kho hiện tại của một sản phẩm luôn bằng tổng `change` của nó. |
| `return_requests` | Yêu cầu trả hàng của khách cho một đơn đã hoàn thành, kèm tài khoản nhận tiền hoàn. |
| `return_request_items` | Sản phẩm và số lượng khách trả. Khi nhận hàng, admin chọn có nhập lại kho hay không (`restock`). |
| `return_request_media` | Ảnh và video minh chứng (tối đa 5 file; ảnh ≤ 5 MB, video ≤ 50 MB). |
| `posts` | Bài viết NEWS, nội dung HTML soạn bằng trình soạn thảo. Một bài được ghim làm tin nổi bật. |
| `banners` | Ảnh slider ở trang chủ. |
| `settings` | Cài đặt admin sửa được (tài khoản nhận tiền VietQR, số hotline, ngưỡng sắp hết hàng chung). Giá trị trong bảng ưu tiên hơn `.env`. |

## Ràng buộc đáng chú ý

- **Duy nhất:** `users.email`, `products.slug` và `products.sku`, `orders.code`, cặp (`user_id`, `product_id`) ở `cart_items` và `wishlists`, cặp (`return_request_id`, `order_item_id`).
- **Không cho xoá khi còn dữ liệu phụ thuộc (restrict):**
  - danh mục hoặc thương hiệu đang có sản phẩm;
  - người dùng đã có đơn;
  - sản phẩm đã có lịch sử kho;
  - đơn đã có yêu cầu trả hàng.

  Admin muốn ẩn sản phẩm thì dùng `status = hidden` hoặc xoá mềm.
- **Xoá theo (cascade):** xoá sản phẩm thì xoá ảnh, dòng giỏ, dòng yêu thích; xoá đơn thì xoá dòng hàng.
- **Đặt null:** `order_items.product_id` và `stock_movements.order_id`, `user_id`, để giữ lịch sử khi bản ghi gốc mất.
- **Chỉ mục:** `products.price`, `min_age`, `status` (bộ lọc); `orders.status` và (`status`, `completed_at`) (dashboard); `return_requests.refunded_at`; `posts` (`is_published`, `published_at`).
