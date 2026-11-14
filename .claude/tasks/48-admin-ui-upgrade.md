# 48 – Nâng cấp giao diện admin — task phụ
**Mục tiêu:** Trang quản trị cùng thương hiệu với cửa hàng, có chế độ tối, dùng được trên điện thoại.
**Phụ thuộc:** 26, 46

## Đã làm
- Theme Ant Design theo màu thương hiệu (vàng kim / vàng đồng), logo TOYSTORE + nhãn ADMIN, nút đổi sáng / tối trên header.
- Biểu đồ dashboard có bộ màu riêng cho nền tối, đã kiểm tra độ phân biệt (dataviz validator).
- `AdminTable`: điện thoại hiện **dạng thẻ** (`renderCard`), bộ lọc gom vào nút "Bộ lọc" kèm số bộ lọc đang bật, thanh công cụ xếp dọc.
- Trình soạn thảo Quill đổi màu icon theo theme.

## Tiêu chí hoàn thành
- `npm run lint`, `npm run build` đạt; chụp Dashboard, Đơn hàng, Sản phẩm ở sáng / tối và điện thoại.
