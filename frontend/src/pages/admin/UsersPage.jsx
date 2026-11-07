import { Receipt } from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { App, Button, Flex, Switch, Tag, Tooltip, Typography } from 'antd'
import { useNavigate } from 'react-router'
import { getErrorMessage } from '../../api/client'
import { adminUsersApi } from '../../api/admin/users'
import AdminTable from '../../components/admin/AdminTable'
import { formatDateTime, formatVND } from '../../utils/format'

const usersKey = ['admin', 'users']

const ROLE_OPTIONS = [
  { value: 'customer', label: 'Khách hàng' },
  { value: 'admin', label: 'Quản trị viên' },
]

const ACTIVE_OPTIONS = [
  { value: '1', label: 'Đang hoạt động' },
  { value: '0', label: 'Đã khoá' },
]

/** Bỏ trống = mới đăng ký trước (mặc định của API). */
const SORT_OPTIONS = [
  { value: 'top_spent', label: 'Chi tiêu nhiều nhất' },
  { value: 'most_orders', label: 'Nhiều đơn nhất' },
]

/** Công tắc Hoạt động / Khoá. Khoá có hỏi lại vì người đó bị đăng xuất ngay. */
function ActiveSwitch({ user }) {
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()

  const toggle = useMutation({
    mutationFn: () => adminUsersApi.toggleActive(user.id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: usersKey })
      message.success(updated.is_active ? `Đã mở khoá ${updated.name}` : `Đã khoá ${updated.name}`)
    },
    onError: (error) => message.error(getErrorMessage(error, 'Không đổi được trạng thái tài khoản')),
  })

  const onChange = () =>
    user.is_active
      ? modal.confirm({
          title: `Khoá tài khoản ${user.name}?`,
          content: 'Người này bị đăng xuất ngay trên mọi thiết bị và không đăng nhập lại được cho tới khi bạn mở khoá. Đơn hàng cũ vẫn giữ nguyên.',
          okText: 'Khoá',
          okButtonProps: { danger: true },
          cancelText: 'Không',
          onOk: () => toggle.mutateAsync().catch(() => {}),
        })
      : toggle.mutate()

  const control = (
    <Switch
      checked={user.is_active}
      loading={toggle.isPending}
      disabled={user.is_self}
      onChange={onChange}
      checkedChildren="Hoạt động"
      unCheckedChildren="Đã khoá"
      aria-label={user.is_active ? `Khoá tài khoản ${user.name}` : `Mở khoá tài khoản ${user.name}`}
    />
  )

  return user.is_self ? <Tooltip title="Bạn không thể tự khoá tài khoản của chính mình">{control}</Tooltip> : control
}

export default function UsersPage() {
  const navigate = useNavigate()

  const columns = [
    {
      title: 'Người dùng',
      dataIndex: 'name',
      render: (name, user) => (
        <Flex vertical gap={0} style={{ maxWidth: 280 }}>
          <Typography.Text strong ellipsis={{ tooltip: name }}>
            {name}
            {user.is_self && <Typography.Text type="secondary"> (bạn)</Typography.Text>}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }} ellipsis={{ tooltip: user.email }}>
            {user.email}
          </Typography.Text>
        </Flex>
      ),
    },
    { title: 'Điện thoại', dataIndex: 'phone', render: (phone) => phone || '—' },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      render: (role) => <Tag color={role.value === 'admin' ? 'magenta' : 'default'}>{role.label}</Tag>,
    },
    { title: 'Đăng ký', dataIndex: 'created_at', render: formatDateTime },
    { title: 'Số đơn', dataIndex: 'orders_count', align: 'right' },
    {
      title: 'Chi tiêu',
      dataIndex: 'total_spent',
      align: 'right',
      render: (value) => <Typography.Text strong={value > 0}>{formatVND(value)}</Typography.Text>,
    },
    { title: 'Trạng thái', dataIndex: 'is_active', render: (_, user) => <ActiveSwitch user={user} /> },
    {
      title: '',
      key: 'actions',
      align: 'right',
      fixed: 'right',
      render: (_, user) => (
        <Button
          size="small"
          icon={<Receipt size={16} />}
          disabled={user.orders_count === 0}
          onClick={() => navigate(`/admin/orders?${new URLSearchParams({ user: user.id, user_name: user.name })}`)}
        >
          Xem đơn
        </Button>
      ),
    },
  ]

  return (
    <>
      <title>Người dùng – Toy Store Admin</title>
      <AdminTable
        queryKey={usersKey}
        fetchFn={adminUsersApi.list}
        columns={columns}
        searchPlaceholder="Tên, email hoặc số điện thoại…"
        filters={[
          { name: 'role', placeholder: 'Vai trò', options: ROLE_OPTIONS, width: 160 },
          { name: 'is_active', placeholder: 'Trạng thái', options: ACTIVE_OPTIONS, width: 170 },
          { name: 'sort', placeholder: 'Sắp xếp: Mới đăng ký', options: SORT_OPTIONS, width: 210 },
        ]}
      />
    </>
  )
}
