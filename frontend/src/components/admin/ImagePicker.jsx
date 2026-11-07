import { ImageSquare, Trash, UploadSimple } from '@phosphor-icons/react'
import { App, Button, Flex, Image, theme, Upload } from 'antd'
import { useState } from 'react'
import { checkImageFile, IMAGE_ACCEPT, IMAGE_MAX_MB, readAsDataUrl } from '../../features/admin/imageRules'

const ACCEPT = IMAGE_ACCEPT

/**
 * Chọn 1 ảnh cho antd Form (dùng trong <Form.Item name="image">).
 * value: File (ảnh mới chọn) · string (URL ảnh hiện có) · null (không có / đã gỡ).
 * Kiểm tra định dạng + dung lượng ngay ở trình duyệt; server vẫn kiểm tra lại.
 *
 * Tuỳ chọn: width/height (khung xem trước, mặc định vuông = size) · maxMb · removable (ẩn "Gỡ ảnh" khi ảnh bắt buộc).
 */
export default function ImagePicker({ value, onChange, size = 96, width = size, height = size, maxMb = IMAGE_MAX_MB, removable = true, id }) {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const { url: preview, read } = usePreview(value)

  const beforeUpload = (file) => {
    const problem = checkImageFile(file, maxMb)
    if (problem) message.error(problem)
    else {
      read(file)
      onChange?.(file)
    }
    return Upload.LIST_IGNORE // không tự upload: file được gửi cùng form khi bấm Lưu
  }

  return (
    <Flex align="center" gap={16}>
      <div
        style={{
          width,
          height,
          borderRadius: token.borderRadius,
          border: `1px dashed ${token.colorBorder}`,
          background: token.colorFillQuaternary,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {preview ? (
          <Image src={preview} alt="Ảnh xem trước" width={width} height={height} style={{ objectFit: 'cover' }} />
        ) : (
          <ImageSquare aria-hidden size={32} color={token.colorTextQuaternary} />
        )}
      </div>
      <Flex vertical gap={8} align="flex-start">
        <Upload accept={ACCEPT.join(',')} showUploadList={false} beforeUpload={beforeUpload}>
          <Button id={id} icon={<UploadSimple aria-hidden size={16} />}>
            {preview ? 'Đổi ảnh' : 'Chọn ảnh'}
          </Button>
        </Upload>
        {preview && removable && (
          <Button type="text" danger size="small" icon={<Trash aria-hidden size={14} />} onClick={() => onChange?.(null)}>
            Gỡ ảnh
          </Button>
        )}
        <span style={{ color: token.colorTextDescription, fontSize: token.fontSizeSM }}>jpg, png, webp · tối đa {maxMb}MB</span>
      </Flex>
    </Flex>
  )
}

/**
 * Ảnh xem trước: string (URL ảnh cũ) dùng luôn; File mới chọn thì đọc thành data URL
 * ngay lúc chọn (trong event handler, không cần effect / thu hồi object URL).
 */
function usePreview(value) {
  const [local, setLocal] = useState(null) // { file, url }

  const read = (file) => readAsDataUrl(file).then((url) => setLocal({ file, url }))

  const url = value instanceof File ? (local?.file === value ? local.url : null) : typeof value === 'string' ? value : null

  return { url, read }
}
