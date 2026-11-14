# 49 – Chatbot hỗ trợ khách (theo kịch bản, không dùng AI) — task phụ
**Mục tiêu:** Khách hỏi bằng câu tự do: tìm sản phẩm, tra đơn, hỏi đổi trả / ship / thanh toán / hotline. Không tốn phí, không cần mạng ngoài.
**Phụ thuộc:** 12 (bộ lọc sản phẩm), 24 (đơn của tôi), 46 (thông tin shop)

## Quy tắc đã chốt
- Chuẩn hoá câu (bỏ dấu, chữ thường) → dò ý định theo thứ tự: đơn hàng → đổi trả → thanh toán → ship → hotline → tìm sản phẩm → chào / cảm ơn → không hiểu.
- Tách giá ("dưới 800k", "1tr5", "từ 1 đến 2 triệu", "tầm 1 triệu"), độ tuổi, danh mục, thương hiệu, cách sắp xếp; phần chữ còn lại tìm theo tên (đủ các từ, không cần liền nhau).
- Tối đa 4 sản phẩm + link trang danh sách đã lọc; từ khoá không khớp thì nới dần và nói rõ.
- Câu nối tiếp "rẻ hơn / xịn hơn" dùng `context` của lần trước. Tra đơn chỉ đơn của chính khách. Không hiểu → đưa hotline, không bịa.
- 20 tin / phút; lịch sử chỉ trong `sessionStorage`, xoá khi đổi tài khoản.

## File tạo/sửa
- Backend: `ChatController`, `ChatRequest`, `Services/ChatbotService.php`, `Support/ChatMessage.php`, route `POST /chat`; `ProductFilter` tìm theo từng từ.
- Frontend: `api/chat.js`, `features/chat/useChat.js`, `components/chat/ChatPanel.jsx`, nút chat trong `FloatingActions`.
- Test: `tests/Feature/ChatbotTest.php`, thêm 1 test tìm nhiều từ ở `ProductListTest`.

## Tiêu chí hoàn thành
- `php artisan test --compact` đạt; lint / build đạt.
- Demo: "có con gundam nào dưới 1 triệu không" → Gundam ≤ 1.000.000; "quà cho bé 6 tuổi" rồi "còn cái nào rẻ hơn không"; "đơn hàng của tôi" trước / sau đăng nhập.
