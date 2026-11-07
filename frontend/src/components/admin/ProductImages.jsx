import { ArrowDown, ArrowUp, ImageSquare, Plus, Trash } from '@phosphor-icons/react'
import { App, Button, Flex, Image, Popconfirm, Spin, Tag, theme, Tooltip, Typography, Upload } from 'antd'
import { getErrorMessage } from '../../api/client'
import { checkImageFile, IMAGE_ACCEPT, IMAGE_MAX_MB, MAX_PRODUCT_IMAGES, readAsDataUrl } from '../../features/admin/imageRules'
import { useProductImageMutations } from '../../features/admin/products'

const TILE = 128

/** Đổi chỗ phần tử i với i+dir (dir = -1 lên, +1 xuống). */
const move = (list, index, dir) => {
  const next = [...list]
  ;[next[index], next[index + dir]] = [next[index + dir], next[index]]
  return next
}

/**
 * Lưới ảnh: ảnh đầu = ảnh đại diện; nút ↑ ↓ để sắp thứ tự (dùng được bằng bàn phím, không cần kéo thả).
 * items: [{ key, url }]
 */
function ImageGrid({ items, onMove, onRemove, removeConfirm, disabled, footer }) {
  const { token } = theme.useToken()

  return (
    <Flex wrap gap={12}>
      {items.map((item, index) => (
        <div
          key={item.key}
          style={{
            width: TILE,
            border: `1px solid ${index === 0 ? token.colorPrimary : token.colorBorderSecondary}`,
            borderRadius: token.borderRadiusLG,
            overflow: 'hidden',
            background: token.colorBgContainer,
          }}
        >
          <div style={{ position: 'relative', height: TILE, background: token.colorFillQuaternary }}>
            {item.url ? (
              <Image src={item.url} alt={`Ảnh ${index + 1}`} width={TILE} height={TILE} style={{ objectFit: 'cover' }} />
            ) : (
              <Flex align="center" justify="center" style={{ height: '100%' }}>
                <Spin size="small" />
              </Flex>
            )}
            {index === 0 && (
              <Tag color="gold" style={{ position: 'absolute', top: 6, left: 6, margin: 0 }}>
                Ảnh đại diện
              </Tag>
            )}
          </div>
          <Flex justify="space-between" align="center" style={{ padding: 4 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12, paddingInline: 4 }}>
              #{index + 1}
            </Typography.Text>
            <Flex>
              <Tooltip title="Lên trước">
                <Button
                  type="text"
                  size="small"
                  icon={<ArrowUp size={14} />}
                  aria-label={`Đưa ảnh ${index + 1} lên trước`}
                  disabled={disabled || index === 0}
                  onClick={() => onMove(index, -1)}
                />
              </Tooltip>
              <Tooltip title="Xuống sau">
                <Button
                  type="text"
                  size="small"
                  icon={<ArrowDown size={14} />}
                  aria-label={`Đưa ảnh ${index + 1} xuống sau`}
                  disabled={disabled || index === items.length - 1}
                  onClick={() => onMove(index, 1)}
                />
              </Tooltip>
              {removeConfirm ? (
                <Popconfirm
                  title="Xoá ảnh này?"
                  description="Ảnh bị xoá khỏi máy chủ, không thể hoàn tác."
                  okText="Xoá"
                  cancelText="Huỷ"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onRemove(index)}
                  disabled={disabled}
                >
                  <Button type="text" size="small" danger icon={<Trash size={14} />} aria-label={`Xoá ảnh ${index + 1}`} disabled={disabled} />
                </Popconfirm>
              ) : (
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<Trash size={14} />}
                  aria-label={`Bỏ ảnh ${index + 1}`}
                  disabled={disabled}
                  onClick={() => onRemove(index)}
                />
              )}
            </Flex>
          </Flex>
        </div>
      ))}
      {footer}
    </Flex>
  )
}

/**
 * Ô "Thêm ảnh": chọn nhiều file 1 lần, lọc file sai định dạng/quá nặng, không vượt quá số chỗ còn lại.
 */
function AddImagesTile({ remaining, onFiles, loading }) {
  const { message } = App.useApp()
  const { token } = theme.useToken()

  // antd gọi beforeUpload cho từng file; đợi tới file cuối của lần chọn rồi xử lý cả lô.
  const beforeUpload = (file, fileList) => {
    if (file === fileList[fileList.length - 1]) {
      const problems = fileList.map(checkImageFile).filter(Boolean)
      problems.forEach((problem) => message.error(problem))
      let valid = fileList.filter((f) => !checkImageFile(f))
      if (valid.length > remaining) {
        message.warning(`Mỗi sản phẩm tối đa ${MAX_PRODUCT_IMAGES} ảnh — chỉ thêm ${remaining} ảnh đầu.`)
        valid = valid.slice(0, remaining)
      }
      if (valid.length) onFiles(valid)
    }
    return Upload.LIST_IGNORE
  }

  if (remaining <= 0) return null

  return (
    <Upload accept={IMAGE_ACCEPT.join(',')} multiple showUploadList={false} beforeUpload={beforeUpload} disabled={loading}>
      <button
        type="button"
        disabled={loading}
        style={{
          width: TILE,
          height: TILE + 33,
          border: `1px dashed ${token.colorBorder}`,
          borderRadius: token.borderRadiusLG,
          background: token.colorFillQuaternary,
          cursor: loading ? 'wait' : 'pointer',
          color: token.colorTextSecondary,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        {loading ? <Spin /> : <Plus size={22} aria-hidden />}
        <span>{loading ? 'Đang tải lên…' : 'Thêm ảnh'}</span>
        <span style={{ fontSize: 12, color: token.colorTextTertiary }}>còn {remaining} chỗ</span>
      </button>
    </Upload>
  )
}

function Hint() {
  return (
    <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 13 }}>
      jpg, png, webp · tối đa {IMAGE_MAX_MB}MB/ảnh · {MAX_PRODUCT_IMAGES} ảnh. Ảnh đầu tiên là ảnh đại diện trên cửa hàng — dùng ↑ ↓ để đổi thứ tự.
    </Typography.Paragraph>
  )
}

function EmptyNote() {
  const { token } = theme.useToken()
  return (
    <Flex align="center" gap={8} style={{ color: token.colorTextTertiary, marginBottom: 12 }}>
      <ImageSquare size={18} aria-hidden /> Chưa có ảnh — sản phẩm sẽ hiện ảnh trống trên cửa hàng.
    </Flex>
  )
}

/**
 * Khi TẠO sản phẩm: ảnh giữ tạm ở trình duyệt, gửi cùng form khi bấm Lưu.
 * Dùng trong <Form.Item name="images">; value = [{ uid, file, url }].
 */
export function PendingImagesField({ value = [], onChange }) {
  const addFiles = async (files) => {
    const items = await Promise.all(
      files.map(async (file) => ({ uid: `${file.name}-${file.lastModified}-${Math.random()}`, file, url: await readAsDataUrl(file) })),
    )
    onChange?.([...value, ...items])
  }

  return (
    <>
      {value.length === 0 && <EmptyNote />}
      <ImageGrid
        items={value.map((item) => ({ key: item.uid, url: item.url }))}
        onMove={(index, dir) => onChange?.(move(value, index, dir))}
        onRemove={(index) => onChange?.(value.filter((_, i) => i !== index))}
        footer={<AddImagesTile remaining={MAX_PRODUCT_IMAGES - value.length} onFiles={addFiles} />}
      />
      <Hint />
    </>
  )
}

/**
 * Khi SỬA sản phẩm: mỗi thao tác gọi API ngay (thêm / xoá / đổi thứ tự).
 */
export function ProductImagesManager({ productId, images = [] }) {
  const { message } = App.useApp()
  const { upload, reorder, remove } = useProductImageMutations(productId)
  const busy = upload.isPending || reorder.isPending || remove.isPending

  const onError = (fallback) => (error) => message.error(getErrorMessage(error, fallback))

  const onFiles = (files) =>
    upload.mutate(files, {
      onSuccess: () => message.success(`Đã thêm ${files.length} ảnh`),
      onError: onError('Không tải ảnh lên được'),
    })

  const onMove = (index, dir) =>
    reorder.mutate(
      move(images, index, dir).map((image) => image.id),
      { onError: onError('Không đổi được thứ tự ảnh') },
    )

  const onRemove = (index) =>
    remove.mutate(images[index].id, {
      onSuccess: () => message.success('Đã xoá ảnh'),
      onError: onError('Không xoá được ảnh'),
    })

  return (
    <Spin spinning={reorder.isPending || remove.isPending} delay={200}>
      {images.length === 0 && <EmptyNote />}
      <ImageGrid
        items={images.map((image) => ({ key: image.id, url: image.url }))}
        onMove={onMove}
        onRemove={onRemove}
        removeConfirm
        disabled={busy}
        footer={<AddImagesTile remaining={MAX_PRODUCT_IMAGES - images.length} onFiles={onFiles} loading={upload.isPending} />}
      />
      <Hint />
    </Spin>
  )
}
