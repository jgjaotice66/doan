import { Button, Result } from 'antd'
import { useNavigate } from 'react-router'

export default function AdminNotFoundPage() {
  const navigate = useNavigate()

  return (
    <Result
      status="404"
      title="Không tìm thấy trang"
      subTitle="Đường dẫn này không có trong khu quản trị."
      extra={
        <Button type="primary" onClick={() => navigate('/admin')}>
          Về Dashboard
        </Button>
      }
    />
  )
}
