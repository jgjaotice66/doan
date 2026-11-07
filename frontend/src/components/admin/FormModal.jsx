import { Form, Modal } from 'antd'

/**
 * Modal chứa antd Form cho thêm/sửa: Enter để lưu, Esc/Huỷ để đóng, đóng là xoá sạch form.
 * onSubmit nhận values đã qua validate phía client.
 *
 *   <FormModal open={open} title="Sửa thương hiệu" form={form} initialValues={...}
 *              onCancel={close} onSubmit={save} loading={save.isPending}>
 *     <Form.Item name="name" label="Tên">…</Form.Item>
 *   </FormModal>
 */
export default function FormModal({ open, title, form, initialValues, onCancel, onSubmit, loading, okText = 'Lưu', children }) {
  return (
    <Modal
      open={open}
      title={title}
      okText={okText}
      cancelText="Huỷ"
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnHidden
      mask={{ closable: !loading }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={onSubmit}
        disabled={loading}
        requiredMark="optional"
        style={{ marginTop: 16 }}
      >
        {children}
        {/* Nút submit ẩn: bấm Enter trong ô nhập là lưu */}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </Form>
    </Modal>
  )
}
