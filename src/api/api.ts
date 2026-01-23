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

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

/** axios 인스턴스 */
export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 쿠키에서 특정 키의 값을 가져오는 함수
 */
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null
  }
  return null
}

/**
 * 로그인 상태 확인 (refreshToken 쿠키 존재 여부)
 */
export function isLoggedIn(): boolean {
  return getCookie('refreshToken') !== null
}

/**
 * Access Token 가져오기 (로그인되어 있을 때만)
 */
export function getAccessToken(): string | null {
  return getCookie('accessToken')
}

/**
 * undefined / null 제거 + querystring 생성
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
 */
function withAuth(token?: string) {
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

// =============================
// Community API
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

/**
 * 4) 커뮤니티 게시글 상세 조회
 * GET /api/v1/posts/{postId}
 * - 로그인 불필요
 */
export async function getCommunityPostDetail(postId: number) {
  const res = await api.get(`/posts/${postId}`)
  return res.data
}

/**
 * 5) 커뮤니티 게시글 삭제
 * DELETE /api/v1/posts/{postId}
 * - 로그인 필요
 */
export async function deleteCommunityPost(postId: number) {
  const token = getAccessToken()
  const res = await api.delete(`/posts/${postId}`, {
    headers: {
      ...withAuth(token || undefined),
    },
  })
  return res.data
}

/**
 * 6) 커뮤니티 댓글 목록 조회
 * GET /api/v1/posts/{postId}/comments
 * - 로그인 불필요
 */
export async function getCommunityComments(
  postId: number,
  params?: { page?: number; page_size?: number }
) {
  const q = toQuery(params as Record<string, unknown>)
  const suffix = q.toString() ? `?${q.toString()}` : ''

  const res = await api.get(`/posts/${postId}/comments${suffix}`)
  return res.data
}

/**
 * 7) 커뮤니티 댓글 작성
 * POST /api/v1/posts/{postId}/comments
 * - 로그인 필요
 */
export async function createCommunityComment(
  postId: number,
  body: CreateCommunityCommentBody
) {
  const token = getAccessToken()
  const res = await api.post(`/posts/${postId}/comments`, body, {
    headers: {
      ...withAuth(token || undefined),
    },
  })
  return res.data
}

/**
 * 8) 커뮤니티 댓글 수정
 * PUT /api/v1/posts/{postId}/comments/{commentId}
 * - 로그인 필요
 */
export async function updateCommunityComment(
  postId: number,
  commentId: number,
  body: UpdateCommunityCommentBody
) {
  const token = getAccessToken()
  const res = await api.put(
    `/posts/${postId}/comments/${commentId}`,
    body,
    {
      headers: {
        ...withAuth(token || undefined),
      },
    }
  )
  return res.data
}

/**
 * 9) 커뮤니티 댓글 삭제
 * DELETE /api/v1/posts/{postId}/comments/{commentId}
 * - 로그인 필요
 */
export async function deleteCommunityComment(postId: number, commentId: number) {
  const token = getAccessToken()
  const res = await api.delete(`/posts/${postId}/comments/${commentId}`, {
    headers: {
      ...withAuth(token || undefined),
    },
  })
  return res.data
}

/**
 * 10) 커뮤니티 게시글 좋아요
 * POST /api/v1/posts/{postId}/like
 * - 로그인 필요
 */
export async function likeCommunityPost(postId: number) {
  const token = getAccessToken()
  const res = await api.post(
    `/posts/${postId}/like`,
    {},
    {
      headers: {
        ...withAuth(token || undefined),
      },
    }
  )
  return res.data
}

/**
 * 11) 커뮤니티 게시글 좋아요 취소
 * DELETE /api/v1/posts/{postId}/like
 * - 로그인 필요
 */
export async function unlikeCommunityPost(postId: number) {
  const token = getAccessToken()
  const res = await api.delete(`/posts/${postId}/like`, {
    headers: {
      ...withAuth(token || undefined),
    },
  })
  return res.data
}

export const communityApi = {
  getCategories: getCommunityCategories,
  getPosts: getCommunityPosts,
  createPost: createCommunityPost,
  getPostDetail: getCommunityPostDetail,
  deletePost: deleteCommunityPost,
  getComments: getCommunityComments,
  createComment: createCommunityComment,
  updateComment: updateCommunityComment,
  deleteComment: deleteCommunityComment,
  likePost: likeCommunityPost,
  unlikePost: unlikeCommunityPost,
}