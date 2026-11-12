import { App, theme } from 'antd'
import { useMemo } from 'react'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import './RichTextEditor.css'
import { getErrorMessage } from '../../api/client'
import { adminPostsApi } from '../../api/admin/posts'
import { CONTENT_IMAGE_TYPES, POST_IMAGE_MAX_MB } from '../../features/admin/posts'

const TOOLBAR = [
  [{ header: [2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }, 'blockquote'],
  [{ align: [] }],
  ['link', 'image'],
  ['clean'],
]

/** Chỉ những định dạng server giữ lại (xem PostContent::ALLOWED) — dán từ Word/web cũng bị lọc về đúng bộ này. */
const FORMATS = ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'blockquote', 'align', 'link', 'image']

/**
 * Trình soạn thảo bài viết (Quill) cho antd Form: <Form.Item name="content"><RichTextEditor /></Form.Item>.
 * value/onChange = chuỗi HTML. Ảnh (nút ảnh, kéo-thả, dán) được tải lên server rồi chèn bằng URL,
 * không nhét base64 vào nội dung.
 */
export default function RichTextEditor({ value, onChange, id, placeholder, status }) {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  // modules phải giữ nguyên giữa các lần render, nếu không Quill bị dựng lại và mất con trỏ
  // (message của App.useApp ổn định nên không làm modules đổi).
  const modules = useMemo(
    () => ({
      toolbar: TOOLBAR,
      clipboard: { matchVisual: false },
      uploader: {
        mimetypes: CONTENT_IMAGE_TYPES,
        // this = module uploader của Quill. Tải từng ảnh lên, chèn theo đúng thứ tự tại vị trí con trỏ.
        async handler(range, files) {
          const quill = this.quill
          const notify = message
          let index = range.index
          for (const file of files) {
            if (file.size > POST_IMAGE_MAX_MB * 1024 * 1024) {
              notify.error(`"${file.name}": ảnh tối đa ${POST_IMAGE_MAX_MB}MB.`)
              continue
            }
            const hide = notify.loading(`Đang tải "${file.name}"…`, 0)
            try {
              const url = await adminPostsApi.uploadImage(file)
              quill.insertEmbed(index, 'image', url, 'user')
              index += 1
              quill.setSelection(index, 0, 'silent')
            } catch (error) {
              notify.error(getErrorMessage(error, `Không tải được "${file.name}"`))
            } finally {
              hide()
            }
          }
        },
      },
    }),
    [message],
  )

  return (
    <div
      className="admin-rich-text"
      style={{
        '--rte-border': status === 'error' ? token.colorError : token.colorBorder,
        '--rte-radius': `${token.borderRadius}px`,
        '--rte-bg': token.colorBgContainer,
        '--rte-toolbar-bg': token.colorFillQuaternary,
        '--rte-text': token.colorText,
        '--rte-placeholder': token.colorTextPlaceholder,
        // Icon thanh công cụ / menu chọn kiểu chữ (Quill ghi cứng #444, #06c, nền trắng → chìm ở chế độ tối).
        '--rte-icon': token.colorTextSecondary,
        '--rte-active': token.colorPrimary,
        '--rte-popup-bg': token.colorBgElevated,
      }}
    >
      <ReactQuill
        id={id}
        theme="snow"
        value={value ?? ''}
        // Chỉ thay đổi do người gõ mới tính: Quill chuẩn hoá HTML lúc nạp không làm form "đã sửa".
        onChange={(html, _delta, source) => source === 'user' && onChange?.(html)}
        modules={modules}
        formats={FORMATS}
        placeholder={placeholder}
      />
    </div>
  )
}
