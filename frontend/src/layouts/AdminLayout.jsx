import { CaretDown, List, SignOut, Storefront, UserCircle } from '@phosphor-icons/react'
import { App, Button, ConfigProvider, Drawer, Dropdown, Grid, Layout, Menu, Space, theme, Typography } from 'antd'
import viVN from 'antd/locale/vi_VN'
import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { useLogout } from '../features/auth/useLogout'
import { useAuthStore } from '../stores/authStore'
import { ADMIN_MENU, findAdminMenuItem } from './adminMenu'

const SIDER_WIDTH = 232
const SIDER_DARK_BG = '#001529'

/** Theme antd mặc định (nền sáng) + font giống storefront để hai khu nhìn cùng một sản phẩm. */
const ADMIN_THEME = {
  token: {
    fontFamily: '"Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif',
    borderRadius: 8,
  },
}

const menuItems = ADMIN_MENU.map(({ path, label, icon: Icon }) => ({
  key: path,
  icon: <Icon aria-hidden size={18} />,
  label: <Link to={path}>{label}</Link>,
}))

function Brand({ collapsed }) {
  return (
    <Link
      to="/admin"
      className="flex h-16 items-center gap-2 whitespace-nowrap px-6 font-display text-lg font-bold text-primary"
    >
      {collapsed ? 'TS' : 'Toy Store Admin'}
    </Link>
  )
}

function SideMenu({ selectedKey, onNavigate }) {
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
          // Cùng màu nền với Layout.Sider tối mặc định của antd.
          styles={{ body: { padding: 0, background: SIDER_DARK_BG } }}
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
  return (
    <ConfigProvider locale={viVN} theme={ADMIN_THEME}>
      <App className="admin-root">
        <AdminShell />
      </App>
    </ConfigProvider>
  )
}
