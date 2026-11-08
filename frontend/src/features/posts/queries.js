import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { postsApi } from '../../api/posts'

/** Trùng tiền tố với POST_RELATED_KEYS bên admin → admin lưu/xoá/ghim bài thì storefront tải lại. */
export const postKeys = {
  list: (params) => ['posts', params],
  highlights: ['posts', 'highlights'],
  detail: (slug) => ['post', slug],
}

export const usePosts = (params, { enabled = true } = {}) =>
  useQuery({
    queryKey: postKeys.list(params),
    queryFn: () => postsApi.list(params),
    placeholderData: keepPreviousData,
    enabled,
  })

export const usePostHighlights = () => useQuery({ queryKey: postKeys.highlights, queryFn: postsApi.highlights })

/** 404 (slug sai / bài chưa đăng) là kết quả chắc chắn → không thử lại. */
export const usePost = (slug) =>
  useQuery({
    queryKey: postKeys.detail(slug),
    queryFn: () => postsApi.get(slug),
    enabled: Boolean(slug),
    retry: (count, error) => error?.response?.status !== 404 && count < 1,
  })
