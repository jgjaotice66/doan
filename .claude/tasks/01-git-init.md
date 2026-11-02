# 01 – Khởi tạo Git
**Mục tiêu:** Quản lý toàn bộ dự án (backend + frontend + .claude) trong một repo.
**Phụ thuộc:** —
**File tạo/sửa:** `D:\doan\.gitignore`

## Các bước
1. `git init` tại `D:\doan`.
2. Tạo `.gitignore` gốc: `backend/vendor/`, `backend/.env`, `frontend/node_modules/`, `frontend/dist/`, `frontend/.env`, `*.log`.
3. Kiểm tra `backend/.gitignore`, `frontend/.gitignore` đã có sẵn.
4. Commit đầu tiên: `chore: initial skeleton`.

## Tiêu chí hoàn thành
- `git status` sạch; `git log` có 1 commit; `vendor/`, `node_modules/`, `.env` không bị track.
