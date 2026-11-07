/**
 * Cây danh mục → lựa chọn phẳng cho antd Select, danh mục con thụt vào dưới cha.
 * `search` = tên thuần để lọc khi gõ (dùng với showSearch={{ optionFilterProp: 'search' }}).
 * toValue: bảng lọc trên URL cần chuỗi (String), form cần số (mặc định).
 */
export function categoryOptions(tree = [], toValue = (id) => id) {
  return tree.flatMap((root) => [
    { value: toValue(root.id), label: root.name, search: root.name },
    ...(root.children ?? []).map((child) => ({
      value: toValue(child.id),
      label: <span style={{ paddingLeft: 16 }}>└ {child.name}</span>,
      search: child.name,
    })),
  ])
}
