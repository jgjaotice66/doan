# Thiết kế giao diện

Website có hai giao diện dùng chung một ứng dụng React:

- **Cửa hàng (storefront):** tự thiết kế bằng Tailwind CSS 4 theo hệ thống thiết kế riêng tên "Mecha Gold".
- **Trang quản trị `/admin`:** dùng Ant Design 6, chỉnh theme để cùng màu thương hiệu với cửa hàng.

Cả hai có chế độ **sáng / tối**, dùng chung một lựa chọn: đổi ở cửa hàng thì vào admin cũng giữ nguyên.

## 1. Hệ thống thiết kế "Mecha Gold" (cửa hàng)

Ý tưởng: đồ chơi sưu tầm (Gundam, figure, mô hình) mang cảm giác cơ khí, cao cấp. Nền xám than như phòng trưng bày, nhấn vàng ánh kim như lớp mạ của mô hình, thêm xanh điện cho đường link và thông tin phụ.

### Màu (token)

Mọi màu khai báo một lần trong `frontend/src/index.css` dưới dạng token (`--color-*`). Bảng màu mặc định của Tailwind bị tắt (`--color-*: initial`), nên component **chỉ** dùng được token, không thể ghi cứng mã màu. Đổi theme chỉ cần định nghĩa lại token.

| Token | Tối | Sáng | Dùng cho |
|---|---|---|---|
| `bg` | `#0e0f12` | `#f5f4ef` | Nền trang |
| `surface` / `raised` | `#1a1c22` / `#23262e` | `#ffffff` / `#efede6` | Thẻ, khung, ô nổi |
| `header` | `#1a1c22` | `#b93a0e` (đỏ cam) | Thanh điều hướng trên cùng |
| `fg` / `muted` / `subtle` | `#f3f4f6` / `#9ca3af` / `#7c8492` | `#17181c` / `#4d5461` / `#5f6673` | Chữ chính / phụ / mờ |
| `primary` | `#f5b83d` (vàng kim) | `#9a5b00` (vàng đồng) | Nút chính, giá khuyến mãi, mục đang chọn |
| `accent` | `#4f8cff` | `#2459d6` | Link, nút mở chatbot |
| `success` / `warning` / `danger` | xanh lá / cam / đỏ | bản đậm hơn | Trạng thái (luôn đi kèm chữ, không chỉ dựa vào màu) |

- **Header ở chế độ sáng** dùng nền đỏ cam để tách hẳn khỏi thân trang màu kem. Token chỉ được đổi trong phạm vi header: chữ trắng, nhấn vàng nhạt.
  - Ô tìm kiếm, menu Danh mục xổ xuống và ngăn kéo menu trên điện thoại (class `header-popover`) lấy lại token sáng gốc để dễ đọc.
- **Chế độ sáng không chỉ đảo màu.** Vàng `#f5b83d` trên nền trắng chỉ đạt 1,8:1 nên được đổi sang vàng đồng `#9a5b00`, chữ trên nút đổi sang trắng.

### Độ tương phản (WCAG 2.1 mức AA)

Đã tính cho từng cặp màu. Ngưỡng: chữ thường ≥ 4,5:1, thành phần giao diện (viền ô nhập) ≥ 3:1.

| Cặp màu | Tối | Sáng |
|---|---|---|
| Chữ chính / nền | 17,4 | 16,1 |
| Chữ phụ / thẻ | 6,7 | 7,6 |
| Chữ trên nút chính | 10,6 | 5,4 |
| Link (accent) / thẻ | 5,3 | 6,0 |
| Viền ô nhập / nền | 3,8 | 3,1 |
| Header sáng: chữ trắng / chữ phụ / mục đang chọn | — | 5,7 / 4,7 / 4,6 |

### Chữ, bo góc, chuyển động

- **Font:** *Be Vietnam Pro* cho nội dung (thiết kế cho tiếng Việt, dấu không bị lệch); *Chakra Petch* cho tiêu đề và logo (dáng góc cạnh, hợp chủ đề robot / mô hình). Tải từ Google Fonts với `display=swap` và bộ ký tự tiếng Việt.
- **Giá và số liệu** dùng chữ số đều độ rộng (`tabular-nums`) để cột giá không nhảy.
- **Bo góc:** thẻ `0.875rem`, nút và ô nhập `0.625rem`. **Bóng "glow"** viền vàng mờ cho thành phần nổi.
- **Chuyển động** ngắn (150–300 ms), chỉ dùng `transform` / `opacity`. Mọi hiệu ứng tắt khi người dùng bật "giảm chuyển động" của hệ điều hành (`prefers-reduced-motion`); slider banner cũng ngừng tự chạy.
- **Icon:** một bộ duy nhất là Phosphor Icons (SVG), không dùng emoji làm icon.

## 2. Bố cục và trải nghiệm cửa hàng

| Khu vực | Điểm chính |
|---|---|
| Header | Dính trên cùng khi cuộn. Logo, menu **Danh mục** xổ xuống (di chuột hoặc bấm; Esc để đóng), ô tìm kiếm, yêu thích, giỏ hàng có số lượng. Điện thoại: nút menu mở ngăn kéo bên trái. |
| Trang chủ | Slider banner (có nút dừng), cam kết của shop (đổi trả 10 ngày, giao toàn quốc…), danh mục có icon, sản phẩm nổi bật, hàng mới, tin mới. |
| Thẻ sản phẩm | Ảnh vuông. Di chuột thì nổi lên và đổi sang ảnh thứ 2. Có nhãn giảm giá, "Hết hàng", nút yêu thích và thêm vào giỏ. |
| Danh sách sản phẩm | Bộ lọc nằm trên URL (chia sẻ link được, nút Back quay lại bộ lọc trước); điện thoại có ngăn bộ lọc riêng. |
| Chi tiết sản phẩm | Thư viện ảnh, giá, tồn kho, cam kết của shop. Bên dưới là **mô tả** rộng hết khung (chữ + ảnh, cùng kiểu chữ với bài viết). Mô tả cao quá ~32rem thì thu gọn, mờ dần ở cuối, có nút "Xem thêm" / "Thu gọn" (bấm Thu gọn thì cuộn về đầu phần mô tả). Trên điện thoại, cuộn qua nút "Thêm vào giỏ" thì hiện **thanh mua hàng dính đáy**. |
| Footer | 4 cột: giới thiệu shop, danh mục, chính sách, hỗ trợ. |
| Nút nổi góc phải dưới | Đổi sáng / tối, gọi hotline (di chuột hiện số), mở **chatbot**. Tự đẩy lên khi thanh mua hàng dính đáy đang hiện, để không che nhau. |
| Chatbot | Máy tính: khung nổi 24rem; điện thoại: phủ kín màn hình. Tin của khách màu vàng bên phải, của bot màu xám bên trái kèm avatar robot. Có thẻ sản phẩm / đơn hàng bấm được, câu gợi ý nhanh, hiệu ứng "đang trả lời…", nút "Thử lại" khi lỗi mạng. |

Trạng thái chờ và lỗi có ở mọi trang: khung xương (skeleton) khi đang tải, thông báo khi danh sách trống, khối lỗi có nút "Thử lại", trang 404 riêng.

## 3. Trang quản trị

- **Cùng thương hiệu với cửa hàng:** logo TOY**STORE** kèm nhãn ADMIN; màu chính vàng kim (tối) / vàng đồng (sáng); font Be Vietnam Pro.
- **Chế độ tối** dùng thuật toán tối của Ant Design với đúng mã nền của cửa hàng (`#0e0f12`, `#1a1c22`, `#23262e`). Menu bên trái tô vàng mục đang chọn. Nút đổi sáng / tối nằm trên thanh tiêu đề.
- **Dashboard:** biểu đồ doanh thu và tỉ lệ trạng thái đơn.
  - Mỗi chế độ sáng / tối có bộ màu riêng, đã kiểm tra bằng công cụ đo độ phân biệt cho người mù màu.
  - Trạng thái "Đang giao" dùng màu cam để không lẫn với "Chờ xác nhận".
- **Cảnh báo tồn kho:** trang Sản phẩm có thông báo "Cần nhập hàng" (đỏ khi có hàng hết, cam khi chỉ sắp hết) với nút lọc nhanh và nút sang trang Kho. Trong bảng, hàng hết có nhãn đỏ "Hết hàng", hàng sắp hết có số tồn kèm nhãn cam "Sắp hết" (có icon, không chỉ dựa vào màu); trang Kho dùng cùng nhãn. Menu "Sản phẩm" có badge cam đếm số sản phẩm cần nhập, cạnh badge đỏ của đơn và trả hàng đang chờ.
- **Điện thoại:** bảng nhiều cột (sản phẩm, đơn hàng) chuyển thành **dạng thẻ**, bấm cả thẻ để mở. Bộ lọc gom vào nút "Bộ lọc" kèm số bộ lọc đang bật.
- **Trình soạn thảo** (Quill) dùng chung cho bài viết và mô tả sản phẩm; đổi màu icon theo theme, để không bị chìm ở chế độ tối.

## 4. Khả năng truy cập (accessibility)

| Yêu cầu | Cách làm |
|---|---|
| Dùng được bằng bàn phím | Link "Bỏ qua tới nội dung chính"; viền focus rõ ở mọi nút; menu, ngăn kéo, khung chat đóng bằng Esc và trả focus về nút đã mở. |
| Trình đọc màn hình | Nút chỉ có icon đều có `aria-label`; icon trang trí có `aria-hidden`. Tin nhắn chatbot nằm trong vùng `role="log"` (tự đọc tin mới). Lỗi dùng `role="alert"`. |
| Vùng chạm | Nút và ô nhập cao tối thiểu 44 px; khoảng cách giữa các nút ≥ 8 px. |
| Màu không là tín hiệu duy nhất | Trạng thái đơn, hết hàng, giảm giá luôn có chữ đi kèm. |
| Điện thoại | Không cuộn ngang; ô nhập cỡ chữ 16 px (iOS không tự phóng to); chừa vùng an toàn của tai thỏ / thanh vuốt (`safe-area-inset`). |

## 5. Hiệu năng giao diện

- **Tách code theo trang:** mỗi trang (và khung chatbot) chỉ tải khi mở lần đầu.
- **Ảnh** khai báo sẵn kích thước (không giật bố cục), ảnh dưới màn hình tải chậm (`loading="lazy"`).
- **Dữ liệu API** được cache bằng TanStack Query. Khi đổi trang, danh sách cũ vẫn hiện tới khi có dữ liệu mới, không bị nháy trắng.
- **Theme được chọn trước khi trang hiện** (script nhỏ trong `index.html`), nên không bị nháy từ tối sang sáng khi tải lại.
