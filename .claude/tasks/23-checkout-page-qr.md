# 23 – Checkout & hiển thị QR
**Mục tiêu:** Khách đặt hàng với COD hoặc chuyển khoản QR.
**Phụ thuộc:** 20, 22
**File tạo/sửa:** `src/api/orders.js`, `src/pages/store/CheckoutPage.jsx`, `src/pages/store/OrderSuccessPage.jsx`, `src/components/BankQrBox.jsx`

## Các bước
1. Form thông tin nhận hàng (điền sẵn tên/sđt từ hồ sơ), ghi chú, chọn phương thức thanh toán.
2. Tóm tắt đơn bên phải; nút "Đặt hàng" có trạng thái loading, chống bấm 2 lần.
3. Lỗi 422 hết hàng → hiện danh sách sản phẩm lỗi, link quay về giỏ.
4. Trang thành công `/orders/{code}/success`: mã đơn; nếu `bank_qr` hiện `BankQrBox` (ảnh QR, ngân hàng, số TK, chủ TK, số tiền, nội dung chuyển khoản = mã đơn, nút copy).

## Tiêu chí hoàn thành
- Đặt COD và QR đều thành công; ảnh QR quét bằng app ngân hàng ra đúng số tiền và nội dung.
