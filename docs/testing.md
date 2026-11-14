# Kiểm thử

## 1. Kết quả tổng hợp

| Hạng mục | Lệnh | Kết quả |
|---|---|---|
| Backend (PHPUnit, feature test) | `cd backend && php artisan test` | ✅ **360 trường hợp, 2054 assertion**, không lỗi |
| Lint frontend | `cd frontend && npm run lint` | ✅ không lỗi |
| Build frontend | `cd frontend && npm run build` | ✅ build thành công |
| Kịch bản trên giao diện (Playwright) | xem mục 3 | ✅ 23/23 bước của luồng chính + các kiểm tra giao diện ở mục 4 |

Test backend chạy trên database riêng `toystore_test` (khai báo trong `backend/phpunit.xml`). Mỗi test được làm sạch database (`RefreshDatabase`) nên không phụ thuộc thứ tự chạy.

## 2. Kiểm thử tự động theo chức năng

Backend được làm theo TDD: viết test trước, chạy thấy đỏ, rồi mới viết code cho xanh. Có 314 hàm test; một số hàm chạy nhiều bộ dữ liệu (data provider) nên ra tổng 360 trường hợp.

| Nhóm chức năng | File test | Số hàm | Nội dung chính |
|---|---|---|---|
| Xác thực, phân quyền | `AuthTest`, `AdminAccessTest`, `ApiBootstrapTest`, `VietnameseMessagesTest` | 23 | Đăng ký (không tự cấp quyền admin) / đăng nhập / đăng xuất / đổi mật khẩu; tài khoản bị khoá bị chặn ngay cả khi còn token; khách gọi `/admin/*` nhận 403; giới hạn 10 lần / phút; thông báo lỗi tiếng Việt |
| Danh mục, sản phẩm, tin tức | `CatalogTest`, `ProductListTest`, `ProductDetailTest`, `PostTest`, `MediaTest` | 40 | Bộ lọc giá / tuổi / danh mục cha – con / thương hiệu, sắp xếp, phân trang; tìm theo nhiều từ; sản phẩm ẩn trả 404; bài viết nháp không lộ |
| Giỏ hàng, yêu thích | `CartTest`, `WishlistTest` | 18 | Không vượt tồn kho; báo dòng đã hết hàng / ngừng bán; mỗi khách chỉ thấy giỏ của mình |
| Đặt hàng, trạng thái đơn | `PlaceOrderTest`, `OrderStatusTest` | 23 | Trừ kho + ghi lịch sử kho; hết hàng thì 422 và không tạo đơn; chụp giá; huỷ thì hoàn kho; chuyển trạng thái sai luồng bị từ chối; không xem được đơn người khác |
| Trả hàng | `ReturnRequestTest`, `Admin/ReturnManageTest` | 23 | Chỉ đơn hoàn thành, trong hạn `RETURN_DAYS`; không trả quá số đã mua; duyệt / từ chối / nhận hàng (nhập lại kho) / hoàn tiền; giới hạn số tiền hoàn |
| Chatbot | `ChatbotTest` | 27 | Hiểu giá ("dưới 800k", "1tr5", "từ 1 đến 2 triệu"…), độ tuổi, danh mục, thương hiệu, câu không dấu; câu nối tiếp "rẻ hơn"; tra đơn chỉ của chính mình; chính sách lấy từ cấu hình; không hiểu thì đưa hotline; giới hạn 20 tin / phút |
| Thông tin shop, hotline | `HotlineTest` | 8 | `/shop` trả hotline, số ngày đổi trả, phí ship; admin lưu / xoá hotline; kiểm tra định dạng số |
| Quản trị: sản phẩm, danh mục, thương hiệu | `Admin/ProductTest`, `Admin/CategoryBrandTest` | 41 | CRUD, tải / sắp xếp / xoá ảnh, xoá mềm; lọc hết hàng / sắp hết và đếm cảnh báo tồn kho; mô tả HTML được lọc (bỏ script, giữ ảnh), chữ thường thành đoạn văn, ảnh bị bỏ khỏi mô tả thì xoá file; không xoá danh mục / thương hiệu còn sản phẩm |
| Quản trị: đơn hàng | `Admin/OrderManageTest` | 20 | Lọc, tìm; xác nhận đã nhận tiền; COD tự đánh dấu đã trả khi hoàn thành; ghi nhận hoàn tiền đơn huỷ |
| Quản trị: kho | `Admin/InventoryTest`, `Admin/LowStockThresholdTest` | 19 | Nhập / điều chỉnh kho; lịch sử biến động; ngưỡng sắp hết theo thứ tự sản phẩm → danh mục → danh mục cha → chung |
| Quản trị: dashboard | `Admin/DashboardTest` | 12 | Doanh thu chỉ tính đơn hoàn thành và đã trả, theo giờ Việt Nam; trừ tiền hoàn vào ngày hoàn; top sản phẩm; tỉ lệ trạng thái |
| Quản trị: nội dung, người dùng, cài đặt | `Admin/BannerTest`, `Admin/PostManageTest`, `Admin/UserManageTest`, `Admin/SettingTest` | 45 | Banner, bài viết (lọc HTML nguy hiểm, ghim tin), khoá / mở khoá tài khoản (không tự khoá mình), tài khoản nhận tiền |
| Dữ liệu demo, mô hình | `DatabaseSeederTest`, `DomainModelsTest`, `ResetDemoCommandTest`, `ExampleTest` | 15 | Dữ liệu demo nhất quán: tồn kho = tổng lịch sử kho, đơn đủ mọi trạng thái để dashboard có số liệu; lệnh `app:reset-demo` từ chối chạy ở production |

## 3. Kịch bản end-to-end trên giao diện

Chạy bằng trình duyệt tự động Playwright (Chromium 1280×900): bấm trên giao diện thật như người dùng, đối chiếu tồn kho và doanh thu qua API admin trước và sau mỗi thao tác. Dữ liệu: database dev sau `php artisan app:reset-demo`.

| # | Bước | Kết quả | Ghi chú |
|---|---|---|---|
| 1 | Khách đăng ký tài khoản mới | ✅ | Đăng nhập luôn, header hiện tên |
| 2 | Tìm "Jenga" bằng ô tìm kiếm | ✅ | Chuyển tới `/products?q=Jenga`, có Jenga Classic |
| 3 | Lọc danh mục Board game (từ trang chủ) | ✅ | 7 sản phẩm |
| 4 | Thêm vào yêu thích | ✅ | Có trong trang Yêu thích |
| 5 | Thêm 2 sản phẩm vào giỏ | ✅ | |
| 6 | Thanh toán, chọn chuyển khoản QR | ✅ | Tạo đơn, chuyển tới trang đặt hàng thành công |
| 7 | Ảnh QR đúng số tiền + mã đơn | ✅ | `amount` = tổng đơn (2 × giá + phí ship), `addInfo` = mã đơn |
| 8 | Tồn kho giảm đúng | ✅ | Giảm đúng 2 |
| 9 | Admin bấm "Đã nhận tiền" | ✅ | Đơn → Đã thanh toán |
| 10–12 | Admin: Xác nhận → Bắt đầu giao → Đã giao xong | ✅ | Đơn → Hoàn thành |
| 13 | Dashboard: doanh thu hôm nay tăng | ✅ | Tăng đúng bằng tổng đơn |
| 14 | Khách thấy đơn Hoàn thành / Đã thanh toán | ✅ | |
| 15 | Khách đặt đơn COD | ✅ | Kho giảm 1 |
| 16 | Khách tự huỷ đơn COD | ✅ | Kho hoàn lại đúng số cũ |
| 17 | Admin khoá tài khoản khách | ✅ | |
| 18 | Khách đang đăng nhập bị đăng xuất ở thao tác tiếp theo | ✅ | Chuyển về `/login`, token bị xoá |
| 19 | Tài khoản bị khoá đăng nhập lại | ✅ | Báo "Tài khoản đã bị khoá" |

### Tình huống lỗi

| # | Tình huống | Kết quả | Ghi chú |
|---|---|---|---|
| 20 | Sản phẩm hết hàng đúng lúc khách đang ở trang thanh toán (admin chỉnh kho về 0) | ✅ | Không tạo đơn, báo "Giỏ có sản phẩm không mua được", có nút về giỏ |
| 21 | Khách truy cập `/admin` | ✅ | Bị chuyển về trang chủ; API admin trả 403 |
| 22 | Khách mở mã đơn của người khác | ✅ | Trang 404; API trả 404 (không lộ nội dung đơn) |
| 23 | Lỗi JavaScript trong suốt các bước của khách | ✅ | Không có |

Luồng trả hàng (gửi yêu cầu → duyệt → nhận hàng → hoàn tiền) được kiểm bằng feature test (`ReturnRequestTest`, `ReturnManageTest`) và có sẵn trong dữ liệu demo (1 yêu cầu đã hoàn tiền, 1 đang chờ duyệt).

## 4. Kiểm tra giao diện các tính năng bổ sung

Chụp màn hình bằng Playwright ở máy tính (1366 px) và điện thoại (390 px), cả chế độ sáng và tối.

| Tính năng | Đã kiểm tra | Kết quả |
|---|---|---|
| Đổi sáng / tối | Đổi ở cửa hàng thì admin giữ nguyên; tải lại trang không bị nháy màu; header sáng màu đỏ cam, ô tìm kiếm và menu xổ xuống vẫn sáng, dễ đọc | ✅ |
| Nút hotline | Ẩn khi chưa nhập số; di chuột hiện số; trên trang sản phẩm ở điện thoại tự đẩy lên trên thanh mua hàng | ✅ |
| Chatbot | "có con gundam nào dưới 1 triệu không" ra 4 sản phẩm Gundam đúng khoảng giá; "quà cho bé 6 tuổi" rồi "còn cái nào rẻ hơn không" giữ điều kiện tuổi và hạ giá; "đơn hàng của tôi" khi chưa đăng nhập thì mời đăng nhập, sau khi đăng nhập hiện 3 đơn gần nhất; Esc đóng khung và trả focus về nút chat | ✅ |
| Admin trên điện thoại | Danh sách đơn hàng / sản phẩm hiện dạng thẻ; nút "Bộ lọc" có số bộ lọc đang bật; ô tìm kiếm không bị bóp hẹp | ✅ |
| Mô tả sản phẩm có ảnh | Admin gõ mô tả dài và chèn ảnh bằng nút ảnh của trình soạn thảo, lưu; trang sản phẩm hiện mô tả bên dưới, thu gọn có lớp mờ, bấm “Xem thêm” mở hết (`aria-expanded` đúng), “Thu gọn” cuộn về đầu phần mô tả; máy tính và điện thoại, sáng và tối | ✅ |
| Cảnh báo tồn kho (admin) | Trang Sản phẩm hiện "Cần nhập hàng: 2 sản phẩm đã hết hàng, 5 sản phẩm sắp hết"; nút "Xem hết hàng" lọc đúng 2 sản phẩm; badge menu = 7; điện thoại: cụm nút xuống dưới, không bóp tiêu đề | ✅ |
| Admin chế độ tối | Biểu đồ dashboard dùng bộ màu riêng cho nền tối; icon trình soạn bài viết rõ trên nền tối | ✅ |

## 5. Lỗi phát hiện trong quá trình kiểm thử

| Lỗi | Nguyên nhân | Đã sửa |
|---|---|---|
| Mục "Tin mới" ở trang chủ luôn trống | Trang chủ đọc `data.data` trong khi API đã trả sẵn mảng bài viết | ✅ |
| Header điện thoại tràn 2 hàng, ô tìm kiếm bị ép ở 768–1024 px | Bố cục header chưa có menu thu gọn | ✅ |
| Lỗi 5xx hiện nguyên câu kỹ thuật tiếng Anh cho khách | Hiển thị thẳng `message` của server | ✅ |
| Thông báo validation / quá nhiều lần thử bằng tiếng Anh | Thiếu bản dịch `lang/vi` | ✅ |
| Thanh mua hàng dính đáy không hiện khi cuộn nhanh | `IntersectionObserver` bỏ sót khi trang nhảy qua phần tử → đổi sang theo dõi sự kiện cuộn | ✅ |
| Menu Danh mục vừa mở bằng di chuột thì bấm lại bị đóng | Cú bấm đảo trạng thái đã mở → ghi nhớ menu được mở bằng di chuột | ✅ |
| Icon trong bảng admin rớt dòng | CSS nền của Tailwind đặt `svg { display: block }` → sửa riêng cho vùng admin | ✅ |
| Ô tìm kiếm admin trên điện thoại chỉ còn 1 ký tự | Thanh công cụ xếp ngang → xếp dọc trên điện thoại | ✅ |
| Icon trình soạn bài viết bị chìm ở chế độ tối | Quill ghi cứng màu `#444` → đổi theo token của theme | ✅ |
| Chữ trong bài viết / mô tả sửa qua trình soạn thảo bị ngắt giữa từ | Quill 2 ghi mọi dấu cách thành `&nbsp;` → server đổi về dấu cách thường khi lọc HTML | ✅ (có test) |
| Chatbot hiểu "hot wheels" thành "bán chạy" | Từ "hot" bị coi là từ sắp xếp → chỉ nhận "đang hot", "hot nhất" | ✅ (có test) |

## 6. Kiểm tra thủ công còn lại

- [ ] Quét mã QR ở trang đặt hàng thành công bằng app ngân hàng: đúng ngân hàng, số tài khoản, chủ tài khoản, số tiền và nội dung = mã đơn.
  *Lưu ý:* phải nhập tài khoản nhận tiền thật ở **Admin → Cài đặt** trước (dữ liệu demo đang để số tài khoản mẫu `0000000000`).
