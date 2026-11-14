# 52 – Bổ sung tài liệu báo cáo — task phụ
**Mục tiêu:** Tài liệu trong `docs/` khớp với toàn bộ tính năng đã làm, dùng được để viết báo cáo.
**Phụ thuộc:** 41, 46–51

## Đã làm
- `docs/ui.md` (mới): hệ thống thiết kế, sáng / tối, độ tương phản, bố cục, admin, khả năng truy cập, hiệu năng.
- `docs/testing.md` (mới): test tự động theo chức năng, kịch bản Playwright, kiểm tra giao diện, lỗi đã phát hiện; thay cho `.claude/test-checklist.md`.
- `docs/flows.md`: mục chatbot (sequence, flowchart, bảng hiểu câu). `docs/use-cases.md`: UC13, UC14, AD2, AD10. `docs/api.md`: route mới, tổng 83 route. `docs/erd.md`, `README.md`.

## Tiêu chí hoàn thành
- Số route trong `docs/api.md` khớp `php artisan route:list --path=api --except-vendor` (trừ 2 route ping); số test trong `docs/testing.md` khớp `php artisan test`.
