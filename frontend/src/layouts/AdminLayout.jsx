import { CaretDown, List, Moon, SignOut, Storefront, Sun, UserCircle } from '@phosphor-icons/react'
import { App, Badge, Button, ConfigProvider, Drawer, Dropdown, Flex, Grid, Layout, Menu, Space, theme, Tooltip, Typography } from 'antd'
import viVN from 'antd/locale/vi_VN'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { useDashboardSummary } from '../features/admin/dashboard'
import { useLogout } from '../features/auth/useLogout'
import { useAuthStore } from '../stores/authStore'
import { useTheme } from '../utils/theme'
import { ADMIN_MENU, findAdminMenuItem } from './adminMenu'

// Lịch (DatePicker) hiện tên tháng/thứ tiếng Việt, tuần bắt đầu từ thứ Hai.
dayjs.locale('vi')

const SIDER_WIDTH = 232
/** Sidebar luôn màu than (cả 2 chế độ), mục đang chọn nhấn vàng — cùng nhận diện "Mecha Gold" với cửa hàng. */
const SIDER_BG = '#1a1c22'
const GOLD = '#f5b83d'

/**
 * Theme antd theo nhận diện cửa hàng. Màu chính:
 *  - sáng: vàng đồng #9a5b00 (chữ trắng trên nút đạt 5.4:1; vàng tươi chỉ 1.8:1 trên nền trắng)
 *  - tối: vàng #f5b83d, chữ nút màu than (10.6:1)
 * Nền tối lấy đúng tông than của storefront.
 */
function adminTheme(mode) {
  const dark = mode === 'dark'
  return {
    algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      fontFamily: '"Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif',
      borderRadius: 8,
      colorPrimary: dark ? GOLD : '#9a5b00',
      colorLink: dark ? GOLD : '#9a5b00',
      colorInfo: dark ? '#7aa7ff' : '#2459d6',
      ...(dark && { colorBgLayout: '#0e0f12', colorBgContainer: '#1a1c22', colorBgElevated: '#23262e' }),
    },
    components: {
      // Chữ trên nút chính: trắng ở chế độ sáng, màu than trên nền vàng ở chế độ tối.
      Button: dark ? { primaryColor: '#14110a' } : {},
      Layout: { siderBg: SIDER_BG, headerBg: dark ? '#1a1c22' : '#ffffff' },
      Menu: {
        darkItemBg: SIDER_BG,
        darkSubMenuItemBg: SIDER_BG,
        darkItemColor: '#9ca3af',
        darkItemHoverColor: '#f3f4f6',
        darkItemSelectedBg: 'rgba(245, 184, 61, 0.16)',
        darkItemSelectedColor: GOLD,
      },
    },
  }
}

/** Nhãn menu + số việc cần xử lý (đơn chờ xác nhận, trả hàng chờ duyệt, hàng cần nhập); 0 thì không hiện. */
function MenuLabel({ path, label, count, hint = 'đang chờ', color }) {
  return (
    <Link to={path} aria-label={count ? `${label} (${count} ${hint})` : undefined}>
      <Flex justify="space-between" align="center" gap={8}>
        <span>{label}</span>
        {count > 0 && <Badge count={count} size="small" overflowCount={99} color={color} title={`${count} ${hint}`} />}
      </Flex>
    </Link>
  )
}

/** Logo giống storefront (TOY vàng + STORE trắng) + nhãn ADMIN; sidebar luôn tối nên dùng màu cố định. */
function Brand({ collapsed }) {
  return (
    <Link
      to="/admin"
      aria-label="Toy Store Admin – về Dashboard"
      className="flex h-16 items-center gap-2 whitespace-nowrap px-6 font-display text-xl font-bold tracking-wide"
      style={{ color: GOLD }}
    >
      {collapsed ? (
        'TS'
      ) : (
        <>
          <span>
            TOY<span style={{ color: '#f3f4f6' }}>STORE</span>
          </span>
          <span
            className="rounded px-1.5 py-0.5 font-sans text-[10px] font-bold tracking-widest"
            style={{ background: 'rgba(245, 184, 61, 0.16)', color: GOLD }}
          >
            ADMIN
          </span>
        </>
      )}
    </Link>
  )
}

/** Nút sáng / tối — dùng chung lựa chọn với cửa hàng (utils/theme.js). */
function ThemeToggle() {
  const [mode, toggle] = useTheme()
  const label = mode === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'
  return (
    <Tooltip title={label}>
      <Button
        type="text"
        aria-label={label}
        onClick={toggle}
        icon={mode === 'dark' ? <Sun aria-hidden size={20} /> : <Moon aria-hidden size={20} />}
      />
    </Tooltip>
  )
}

function SideMenu({ selectedKey, onNavigate }) {
  // Dùng chung cache với trang Dashboard; tự hỏi lại mỗi phút để số trên menu không cũ.
  const { data: summary } = useDashboardSummary({ refetchInterval: 60_000 })
  const menuItems = ADMIN_MENU.map(({ path, label, icon: Icon, badge, badgeHint, badgeColor }) => ({
    key: path,
    icon: <Icon aria-hidden size={18} />,
    label: <MenuLabel path={path} label={label} count={badge ? summary?.[badge] : 0} hint={badgeHint} color={badgeColor} />,
  }))

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={selectedKey ? [selectedKey] : []}
      items={menuItems}
      onClick={onNavigate}
      style={{ borderInlineEnd: 0 }}
    />
  )
}

function UserMenu() {
  const user = useAuthStore((s) => s.user)
  const logout = useLogout()

  const items = [
    { key: 'store', icon: <Storefront aria-hidden size={16} />, label: <Link to="/">Xem cửa hàng</Link> },
    { type: 'divider' },
    { key: 'logout', icon: <SignOut aria-hidden size={16} />, label: 'Đăng xuất', danger: true },
  ]

  return (
    <Dropdown menu={{ items, onClick: ({ key }) => key === 'logout' && logout() }} trigger={['click']} placement="bottomRight">
      <Button type="text" aria-label={`Tài khoản ${user?.name ?? ''}`}>
        <Space size={6}>
          <UserCircle aria-hidden size={22} />
          <span className="hidden sm:inline">{user?.name}</span>
          <CaretDown aria-hidden size={12} />
        </Space>
      </Button>
    </Dropdown>
  )
}

/**
 * Khung admin: máy tính = sider thu gọn được; điện thoại (< lg) = menu trong Drawer.
 */
function AdminShell() {
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()
  const isMobile = screens.lg === false
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const current = findAdminMenuItem(location.pathname)
  const toggleMenu = () => (isMobile ? setDrawerOpen(true) : setCollapsed((c) => !c))

  return (
    <Layout style={{ minHeight: '100dvh' }}>
      <title>{`${current?.label ?? 'Quản trị'} – Toy Store Admin`}</title>

      {isMobile ? (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          size={SIDER_WIDTH + 24}
          closable={false}
          // Cùng màu nền với Layout.Sider (màu than).
          styles={{ body: { padding: 0, background: SIDER_BG } }}
        >
          <Brand />
          <SideMenu selectedKey={current?.path} onNavigate={() => setDrawerOpen(false)} />
        </Drawer>
      ) : (
        <Layout.Sider
          width={SIDER_WIDTH}
          collapsed={collapsed}
          trigger={null}
          collapsible
          style={{ position: 'sticky', top: 0, height: '100dvh', overflow: 'auto' }}
        >
          <Brand collapsed={collapsed} />
          <SideMenu selectedKey={current?.path} />
        </Layout.Sider>
      )}

      <Layout>
        <Layout.Header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            paddingInline: 16,
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Button
            type="text"
            icon={<List aria-hidden size={20} />}
            onClick={toggleMenu}
            aria-label={isMobile ? 'Mở menu' : collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            aria-expanded={isMobile ? drawerOpen : !collapsed}
          />
          <Typography.Text strong style={{ fontSize: 16 }} ellipsis>
            {current?.label}
          </Typography.Text>
          <div style={{ flex: 1 }} />
          {!isMobile && (
            <Button icon={<Storefront aria-hidden size={16} />} onClick={() => navigate('/')}>
              Xem cửa hàng
            </Button>
          )}
          <ThemeToggle />
          <UserMenu />
        </Layout.Header>

        <Layout.Content style={{ padding: isMobile ? 16 : 24 }}>
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  )
}

/**
 * ConfigProvider + App chỉ bọc khu /admin: antd (tiếng Việt, message/modal qua App.useApp())
 * không đụng tới storefront, và chỉ được tải khi admin mở /admin.
 */
export default function AdminLayout() {
  const [mode] = useTheme()

  return (
    <ConfigProvider locale={viVN} theme={adminTheme(mode)}>
      <App className="admin-root">
        <AdminShell />
      </App>
    </ConfigProvider>
  )
}
