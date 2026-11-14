import { Funnel } from '@phosphor-icons/react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, Empty, Flex, Grid, Input, Pagination, Select, Spin, Table } from 'antd'
import { Fragment, useState } from 'react'
import { getErrorMessage } from '../../api/client'
import { useTableParams } from '../../features/admin/useTableParams'

const PAGE_SIZES = [10, 20, 50]

/** Bộ lọc đang bật? Bộ lọc tự dựng khai báo isActive(params); còn lại xem params[name]. */
const isFilterActive = (filter, params) =>
  filter.isActive ? filter.isActive(params) : params[filter.name] != null && params[filter.name] !== ''

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
 *     banner={(meta) => <Alert … />}           // tuỳ chọn: thông báo đầu bảng, đọc từ meta của API
 *   />
 *
 * fetchFn nhận { page, per_page?, q?, ...filters } — đúng tên query param của API.
 *
 * Điện thoại (< md): truyền renderCard(record) thì danh sách hiện dạng thẻ (bảng nhiều cột phải cuộn ngang,
 * khó đọc); bộ lọc gom vào nút "Bộ lọc" kèm số bộ lọc đang bật.
 */
export default function AdminTable({
  queryKey,
  fetchFn,
  columns,
  rowKey = 'id',
  searchPlaceholder,
  filters = [],
  toolbar,
  renderCard,
  banner,
  ...tableProps
}) {
  const { params, setParams } = useTableParams()
  const screens = Grid.useBreakpoint()
  const isMobile = screens.md === false
  const [filtersOpen, setFiltersOpen] = useState(false)
  const activeFilterCount = filters.filter((filter) => isFilterActive(filter, params)).length

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
  const showFilters = !isMobile || filtersOpen
  const filterControls = filters.map((filter) =>
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
        style={{ width: isMobile ? '100%' : (filter.width ?? 180) }}
      />
    ),
  )

  const pagination = meta && {
    current: meta.current_page,
    pageSize: meta.per_page,
    total: meta.total,
    showSizeChanger: true,
    pageSizeOptions: PAGE_SIZES,
    showTotal: (total, [from, to]) => `${from}–${to} / ${total} mục`,
  }

  return (
    <Card styles={{ body: { padding: 0 } }}>
      {banner && meta && banner(meta)}
      {hasToolbar && (
        // Điện thoại: xếp dọc — hàng tìm kiếm + nút Bộ lọc, rồi bộ lọc (nếu mở), rồi nút hành động (toolbar).
        <Flex wrap gap={12} justify="space-between" vertical={isMobile} style={{ padding: isMobile ? 12 : 16 }}>
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
                style={isMobile ? { flex: 1, minWidth: 0 } : { width: 300, maxWidth: '100%' }}
              />
            )}
            {isMobile && filters.length > 0 && (
              <Badge count={activeFilterCount} size="small">
                <Button
                  icon={<Funnel aria-hidden size={18} />}
                  onClick={() => setFiltersOpen((open) => !open)}
                  aria-expanded={filtersOpen}
                  aria-label={activeFilterCount ? `Bộ lọc (${activeFilterCount} đang bật)` : 'Bộ lọc'}
                />
              </Badge>
            )}
            {showFilters && (isMobile ? <Flex vertical gap={8} style={{ width: '100%' }}>{filterControls}</Flex> : filterControls)}
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

      {isMobile && renderCard ? (
        <Spin spinning={isPending || isFetching}>
          <Flex vertical gap={12} style={{ padding: '0 12px 12px' }}>
            {(data?.data ?? []).map((record) => (
              <Fragment key={record[rowKey]}>{renderCard(record)}</Fragment>
            ))}
            {!isPending && data?.data?.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có dữ liệu" />}
            {pagination && (
              <Pagination
                {...pagination}
                simple
                showSizeChanger={false}
                onChange={(page) => setParams({ page })}
                style={{ alignSelf: 'center', marginTop: 4 }}
              />
            )}
          </Flex>
        </Spin>
      ) : (
        <Table
          rowKey={rowKey}
          columns={columns}
          dataSource={data?.data ?? []}
          loading={isPending || isFetching}
          onChange={onTableChange}
          scroll={{ x: 'max-content' }}
          pagination={pagination}
          {...tableProps}
        />
      )}
    </Card>
  )
}
