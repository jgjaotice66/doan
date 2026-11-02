# 34 – NEWS: API + quản trị
**Mục tiêu:** Admin viết và xuất bản bài tin tức.
**Phụ thuộc:** 26
**File tạo/sửa:** `app/Http/Controllers/Api/PostController.php`, `app/Http/Controllers/Api/Admin/PostController.php`, `tests/Feature/PostTest.php`, `src/pages/admin/PostsPage.jsx`, `src/pages/admin/PostFormPage.jsx`

## Các bước
1. Public: `GET posts` (chỉ đã xuất bản, `published_at <= now`, phân trang), `GET posts/{slug}`.
2. Admin CRUD: title, slug tự sinh, thumbnail, excerpt, content HTML, is_published, published_at.
3. Lọc HTML trước khi lưu để chống XSS (`mews/purifier` hoặc whitelist thẻ đơn giản).
4. Editor: `react-quill-new` (hoặc textarea + preview nếu thiếu thời gian).

## Tiêu chí hoàn thành
- Test pass: bài nháp không xuất hiện ở API public; nội dung chứa `<script>` bị loại bỏ.
