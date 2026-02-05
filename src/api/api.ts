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

/** axios 인스턴스 (쿠키 인증 대비: withCredentials) */
export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

/** JS로 읽을 수 있는 쿠키일 때만 사용 가능 */
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

/** 로그인 상태 확인 (refreshToken 쿠키 또는 localStorage user 존재 여부) */
export function isLoggedIn(): boolean {
  return getCookie('refreshToken') !== null || localStorage.getItem('user') !== null
}

/** (옵션) Access Token 가져오기 (HttpOnly면 null 나올 수 있음) */
export function getAccessToken(): string | null {
  return getCookie('accessToken')
}

/** 현재 로그인한 사용자 정보 조회 API */
export async function getCurrentUser() {
  const token = getAccessToken()
  const res = await api.get('/api/v1/accounts/me', {
    headers: { ...withAuth(token || undefined) },
  })
  return res.data
}

/** undefined / null 제거 + querystring 생성 */
export function toQuery(params?: Record<string, unknown>) {
  const sp = new URLSearchParams()
  if (!params) return sp
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    sp.set(key, String(value))
  })
  return sp
}

/** Authorization 헤더 주입 */
function withAuth(token?: string) {
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

// =============================
// Community API
// =============================

export async function getCommunityCategories(): Promise<CommunityCategory[]> {
  const res = await api.get<CommunityCategory[]>('/api/v1/posts/categories')
  return res.data
}

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

export async function createCommunityPost(
  body: CreateCommunityPostBody,
  token?: string
): Promise<CreateCommunityPostResponse> {
  const res = await api.post<CreateCommunityPostResponse>(
    '/api/v1/posts',
    body,
    { headers: { ...withAuth(token) } }
  )
  return res.data
}

export async function getCommunityPostDetail(postId: number) {
  const res = await api.get(`/api/v1/posts/${postId}`)
  return res.data
}

export async function updateCommunityPost(
  postId: number,
  body: CreateCommunityPostBody,
  token?: string
): Promise<void> {
  const res = await api.put(
    `/api/v1/posts/${postId}`,
    body,
    { headers: { ...withAuth(token) } }
  )
  return res.data
}

export async function deleteCommunityPost(postId: number): Promise<void> {
  const token = getAccessToken()
  const res = await api.delete(`/api/v1/posts/${postId}`, {
    headers: { ...withAuth(token || undefined) },
  })
  return res.data
}

export async function getCommunityComments(
  postId: number,
  params?: { page?: number; page_size?: number }
) {
  const q = toQuery(params as Record<string, unknown>)
  const suffix = q.toString() ? `?${q.toString()}` : ''
  const res = await api.get(`/api/v1/posts/${postId}/comments${suffix}`)
  return res.data
}

export async function createCommunityComment(
  postId: number,
  body: CreateCommunityCommentBody
) {
  const token = getAccessToken()
  const res = await api.post(`/api/v1/posts/${postId}/comments`, body, {
    headers: { ...withAuth(token || undefined) },
  })
  return res.data
}

export async function updateCommunityComment(
  postId: number,
  commentId: number,
  body: UpdateCommunityCommentBody
) {
  const token = getAccessToken()
  const res = await api.put(
    `/api/v1/posts/${postId}/comments/${commentId}`,
    body,
    { headers: { ...withAuth(token || undefined) } }
  )
  return res.data
}

export async function deleteCommunityComment(
  postId: number,
  commentId: number
) {
  const token = getAccessToken()
  const res = await api.delete(
    `/api/v1/posts/${postId}/comments/${commentId}`,
    {
      headers: { ...withAuth(token || undefined) },
    }
  )
  return res.data
}

export async function likeCommunityPost(postId: number) {
  const token = getAccessToken()
  const res = await api.post(
    `/api/v1/posts/${postId}/like`,
    {},
    { headers: { ...withAuth(token || undefined) } }
  )
  return res.data
}

export async function unlikeCommunityPost(postId: number) {
  const token = getAccessToken()
  const res = await api.delete(`/api/v1/posts/${postId}/like`, {
    headers: { ...withAuth(token || undefined) },
  })
  return res.data
}

// =============================
// Image Upload API (Presigned URL)
// =============================

export interface PresignedUrlResponse {
  presigned_url: string
  img_url: string
  key: string
}

/**
 * S3 이미지 업로드를 위한 Presigned URL 발급 요청
 * @param fileName - 업로드할 파일명 
 * @returns presigned_url, img_url, key
 */
export async function getPresignedUrl(fileName: string): Promise<PresignedUrlResponse> {
  const token = getAccessToken()
  const res = await api.put<PresignedUrlResponse>(
    '/api/v1/questions/presigned-url',
    { file_name: fileName },
    { headers: { ...withAuth(token || undefined) } }
  )
  return res.data
}

/**
 * Presigned URL을 사용하여 S3에 파일 업로드
 * @param presignedUrl - 백엔드에서 발급받은 Presigned URL
 * @param file - 업로드할 파일
 */
export async function uploadToS3(presignedUrl: string, file: File): Promise<void> {
  await axios.put(presignedUrl, file, {
    headers: {
      'Content-Type': file.type,
    },
  })
}

export const communityApi = {
  getCategories: getCommunityCategories,
  getPosts: getCommunityPosts,
  createPost: createCommunityPost,
  getPostDetail: getCommunityPostDetail,
  updatePost: updateCommunityPost,
  deletePost: deleteCommunityPost,
  getComments: getCommunityComments,
  createComment: createCommunityComment,
  updateComment: updateCommunityComment,
  deleteComment: deleteCommunityComment,
  likePost: likeCommunityPost,
  unlikePost: unlikeCommunityPost,
}
