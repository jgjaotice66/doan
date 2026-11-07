import { Wrench } from '@phosphor-icons/react'
import { Card, Result, theme } from 'antd'
import { useLocation } from 'react-router'
import { findAdminMenuItem } from '../../layouts/adminMenu'

/**
 * Trang admin chưa làm: tiêu đề + task sẽ hoàn thiện (lấy từ ADMIN_MENU theo URL).
 */
export default function AdminPlaceholderPage() {
  const item = findAdminMenuItem(useLocation().pathname)
  const { token } = theme.useToken()

  return (
    <Card>
      <Result
        icon={<Wrench aria-hidden size={64} weight="duotone" style={{ color: token.colorTextTertiary }} />}
        title={item?.label}
        subTitle={item?.task ? `Trang đang được xây dựng (task ${item.task}).` : 'Trang đang được xây dựng.'}
      />
    </Card>
  )
}
