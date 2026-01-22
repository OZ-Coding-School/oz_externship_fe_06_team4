// src/api/api.ts
import axios from 'axios'
import type {
  CommunityCategory,
  CommunityPostListItem,
  CreateCommunityPostBody,
  CreateCommunityPostResponse,
  GetCommunityPostsParams,
  PaginatedResponse,
  CreateCommunityCommentBody,
  UpdateCommunityCommentBody,
} from '../types'

/**
 * - VITE_API_BASE_URL=https://api.ozcoding.site
 *
 * 없다면 ""로 두고, MSW/상대경로로도 동작 가능하게 구성
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

/** axios 인스턴스 */
export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * undefined / null 제거 + querystring 생성
 * - GetCommunityPostsParams 같은 "선택적 필드" 객체를 안전하게 처리
 */
export function toQuery(params?: Record<string, unknown>) {
  const sp = new URLSearchParams()

  if (!params) return sp

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    sp.set(key, String(value))
  })

  return sp
}

/**
 * Authorization 헤더 주입 헬퍼
 * - 아직 로그인 연결 전이면 token 없이 호출하면 됨
 */
function withAuth(token?: string) {
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

// =============================
// Community API (명세서 기준)
// =============================

/**
 * 1) 커뮤니티 게시글 카테고리 목록 조회
 * GET /api/v1/posts/categories
 */
export async function getCommunityCategories(): Promise<CommunityCategory[]> {
  const res = await api.get<CommunityCategory[]>('/api/v1/posts/categories')
  return res.data
}

/**
 * 2) 커뮤니티 게시글 목록 조회
 * GET /api/v1/posts
 * Query:
 * - page, page_size, search, search_filter, category_id, sort
 */
export async function getCommunityPosts(
  params?: GetCommunityPostsParams
): Promise<PaginatedResponse<CommunityPostListItem>> {
  const q = toQuery(params as unknown as Record<string, unknown>)
  const suffix = q.toString() ? `?${q.toString()}` : ''
  const res = await api.get<PaginatedResponse<CommunityPostListItem>>(
    `/api/v1/posts${suffix}`
  )
  return res.data
}

/**
 * 3) 커뮤니티 게시글 작성
 * POST /api/v1/posts
 * Header:
 * - Authorization: Bearer token_value (필요)
 * Body:
 * - title, content, category_id
 */
export async function createCommunityPost(
  body: CreateCommunityPostBody,
  token?: string
): Promise<CreateCommunityPostResponse> {
  const res = await api.post<CreateCommunityPostResponse>(
    '/api/v1/posts',
    body,
    {
      headers: {
        ...withAuth(token),
      },
    }
  )
  return res.data
}

export const communityApi = {
  getCategories: getCommunityCategories,
  getPosts: getCommunityPosts,
  createPost: createCommunityPost,
}

// ---------------------------------- 김재윤 파트 ---------------------------------- //


/**
 * 4) 커뮤니티 게시글 상세 조회
 * GET /api/v1/posts/{postId}
 */
export async function getCommunityPostDetail(postId: number) {
  const res = await api.get(`/api/v1/posts/${postId}`)
  return res.data
}


/**
 * 5) 커뮤니티 게시글 삭제
 * DELETE /api/v1/posts/{postId}
 */
export async function deleteCommunityPost(
  postId: number,
  token?: string
) {
  const res = await api.delete(`/api/v1/posts/${postId}`, {
    headers: {
      ...withAuth(token),
    },
  })
  return res.data
}

/**
 * 6) 커뮤니티 댓글 목록 조회
 * GET /api/v1/posts/{postId}/comments
 */
export async function getCommunityComments(
  postId: number,
  params?: { page?: number; page_size?: number }
) {
  const q = toQuery(params as unknown as Record<string, unknown>)
  const suffix = q.toString() ? `?${q.toString()}` : ''

  const res = await api.get(
    `/api/v1/posts/${postId}/comments${suffix}`
  )
  return res.data
}


/**
 * 7) 커뮤니티 댓글 작성
 * POST /api/v1/posts/{postId}/comments
 */
export async function createCommunityComment(
  postId: number,
  body: CreateCommunityCommentBody,
  token?: string
) {
  const res = await api.post(
    `/api/v1/posts/${postId}/comments`,
    body,
    {
      headers: {
        ...withAuth(token),
      },
    }
  )
  return res.data
}

/**
 * 8) 커뮤니티 댓글 수정
 * PUT /api/v1/comments/{commentId}
 */
export async function updateCommunityComment(
  commentId: number,
  body: UpdateCommunityCommentBody,
  token?: string
) {
  const res = await api.put(
    `/api/v1/comments/${commentId}`,
    body,
    {
      headers: {
        ...withAuth(token),
      },
    }
  )
  return res.data
}

/**
 * 9) 커뮤니티 댓글 삭제
 * DELETE /api/v1/comments/{commentId}
 */
export async function deleteCommunityComment(
  commentId: number,
  token?: string
) {
  const res = await api.delete(
    `/api/v1/comments/${commentId}`,
    {
      headers: {
        ...withAuth(token),
      },
    }
  )
  return res.data
}
