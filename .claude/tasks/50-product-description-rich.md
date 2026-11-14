# 50 – Mô tả sản phẩm có ảnh, thu gọn "Xem thêm" — task phụ
**Mục tiêu:** Admin soạn mô tả bằng trình soạn thảo (chèn ảnh); trang sản phẩm hiện mô tả bên dưới, dài thì thu gọn.
**Phụ thuộc:** 28, 29, 34 (trình soạn thảo + bộ lọc HTML của NEWS)

## Quy tắc đã chốt
- Mô tả lưu HTML, lọc bằng cùng danh sách trắng với bài viết (`ProductContent extends PostContent`, ảnh ở `products/content`). Chữ thường → đoạn `<p>`; nội dung rỗng → `null`. Ảnh bị bỏ khỏi mô tả khi lưu thì xoá file.
- Quill 2 ghi dấu cách thành `&nbsp;` → `PostContent::clean` đổi về dấu cách thường (sửa cho cả bài viết).
- Migration đổi mô tả cũ (chữ thường) sang HTML; seeder tạo mô tả mẫu có ảnh giữ chỗ và danh sách.
- Cửa hàng: mô tả rộng hết khung dưới ảnh + khối mua; cao hơn ~32rem thì thu gọn, mờ dần, nút "Xem thêm / Thu gọn" (`aria-expanded`).

## File tạo/sửa
- Backend: `Support/ProductContent.php`, `Requests/Admin/ContentImageRequest.php` (dùng chung với bài viết), `POST /admin/products/content-images`, migration `convert_product_descriptions_to_html`, `CatalogSeeder`, `ProductFactory`.
- Frontend: `RichTextEditor` nhận `uploadImage`, `minHeight`; `ProductFormPage`; `components/ProductDescription.jsx`.
- Test: thêm vào `Admin/ProductTest.php`, `Admin/PostManageTest.php`.

## Tiêu chí hoàn thành
- `php artisan test --compact` đạt; lint / build đạt; `php artisan migrate` đổi xong mô tả cũ.
- Demo: admin chèn ảnh vào mô tả, lưu → trang sản phẩm hiện ảnh, nút "Xem thêm" hoạt động trên máy tính và điện thoại.
