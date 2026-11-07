import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Alert, Button, Card, Flex, Input, Select, Table } from 'antd'
import { Fragment } from 'react'
import { getErrorMessage } from '../../api/client'
import { useTableParams } from '../../features/admin/useTableParams'

const PAGE_SIZES = [10, 20, 50]

/**
 * Bảng admin dùng chung: phân trang/tìm kiếm/lọc phía server, tham số nằm trên URL.
 *
 *   <AdminTable
 *     queryKey={['admin', 'orders']}
 *     fetchFn={adminOrdersApi.list}            // (params) => Promise<{ data, meta }> (Laravel paginate)
 *     columns={columns}
 *     searchPlaceholder="Mã đơn, tên, SĐT…"
 *     filters={[{ name: 'status', placeholder: 'Trạng thái', options: [{ value: 'pending', label: 'Chờ xác nhận' }] }]}
 *     toolbar={<Button type="primary">Thêm</Button>}
 *   />
 *
 * fetchFn nhận { page, per_page?, q?, ...filters } — đúng tên query param của API.
 */
export default function AdminTable({
  queryKey,
  fetchFn,
  columns,
  rowKey = 'id',
  searchPlaceholder,
  filters = [],
  toolbar,
  ...tableProps
}) {
  const { params, setParams } = useTableParams()

  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: [...queryKey, params],
    queryFn: () => fetchFn(params),
    placeholderData: keepPreviousData,
  })

  const meta = data?.meta

  const onTableChange = (pagination) => {
    const sizeChanged = pagination.pageSize !== (meta?.per_page ?? PAGE_SIZES[0])
    setParams({ page: sizeChanged ? 1 : pagination.current, per_page: pagination.pageSize })
  }

  const hasToolbar = searchPlaceholder || filters.length > 0 || toolbar

  return (
    <Card styles={{ body: { padding: 0 } }}>
      {hasToolbar && (
        <Flex wrap gap={12} justify="space-between" style={{ padding: 16 }}>
          <Flex wrap gap={12} style={{ flex: 1 }}>
            {searchPlaceholder && (
              <Input.Search
                // key: URL đổi từ ngoài (Back/Forward) thì ô tìm kiếm hiện đúng giá trị mới
                key={params.q ?? ''}
                defaultValue={params.q}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                allowClear
                enterButton
                onSearch={(value) => setParams({ q: value.trim() })}
                style={{ width: 300, maxWidth: '100%' }}
              />
            )}
            {filters.map((filter) =>
              // Bộ lọc tự dựng (VD: chọn khoảng ngày) — tự đọc/ghi URL bằng useTableParams.
              filter.render ? (
                <Fragment key={filter.name}>{filter.render()}</Fragment>
              ) : (
                <Select
                  key={filter.name}
                  value={params[filter.name] ?? null}
                  placeholder={filter.placeholder}
                  aria-label={filter.placeholder}
                  options={filter.options}
                  allowClear
                  onChange={(value) => setParams({ [filter.name]: value })}
                  style={{ width: filter.width ?? 180 }}
                />
              ),
            )}
          </Flex>
          {toolbar}
        </Flex>
      )}

      {error && (
        <Alert
          type="error"
          showIcon
          title="Không tải được dữ liệu"
          description={getErrorMessage(error)}
          action={<Button onClick={() => refetch()}>Thử lại</Button>}
          style={{ margin: 16 }}
        />
      )}

      <Table
        rowKey={rowKey}
        columns={columns}
        dataSource={data?.data ?? []}
        loading={isPending || isFetching}
        onChange={onTableChange}
        scroll={{ x: 'max-content' }}
        pagination={
          meta && {
            current: meta.current_page,
            pageSize: meta.per_page,
            total: meta.total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZES,
            showTotal: (total, [from, to]) => `${from}–${to} / ${total} mục`,
          }
        }
        {...tableProps}
      />
    </Card>
  )
}
