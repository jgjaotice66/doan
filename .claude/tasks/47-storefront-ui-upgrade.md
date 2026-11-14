# 47 – Nâng cấp giao diện cửa hàng — task phụ
**Mục tiêu:** Hoàn thiện giao diện storefront bằng skill `ui-ux-pro-max`, giữ hệ màu "Mecha Gold".
**Phụ thuộc:** 38, 46

## Đã làm
- Footer đầy đủ 4 cột (giới thiệu, danh mục, chính sách, hỗ trợ).
- Menu **Danh mục** xổ xuống ở header (di chuột hoặc bấm, Esc để đóng); ngăn kéo điện thoại có danh mục con.
- Thẻ sản phẩm: nổi lên khi di chuột, đổi sang ảnh thứ 2 (`hover_image`); banner có nút "Khám phá ngay".
- Trang chi tiết: khối cam kết của shop, **thanh mua hàng dính đáy** trên điện thoại (nút nổi và toast tự đẩy lên).
- Header khác màu thân trang ở cả 2 chế độ; chế độ sáng dùng nền **đỏ cam `#b93a0e`** (token đổi trong phạm vi `.store-header`; ô tìm kiếm, menu xổ xuống, ngăn kéo dùng `.header-popover` để giữ màu sáng).

## Tiêu chí hoàn thành
- `npm run lint`, `npm run build` đạt; chụp màn hình máy tính / điện thoại, sáng / tối không vỡ bố cục, độ tương phản ≥ 4,5:1 (ghi trong `docs/ui.md`).
