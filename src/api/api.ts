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
  CommunityComment,
  UpdateCommunityCommentResponse,
  DeleteCommunityCommentResponse,
  CreateCommunityCommentResponse,
  CommunityPostDetail,
  DeleteCommunityPostResponse,
} from '../types'
import { useAuthStore } from '../store/index'

export const EXTERNAL_MAIN_URL = 'https://my.ozcodingschool.site/'
export const EXTERNAL_LOGIN_URL = 'https://my.ozcodingschool.site/login'
export const EXTERNAL_SIGNUP_URL = 'https://my.ozcodingschool.site/signup'
export const EXTERNAL_QNA_URL = 'https://qna.ozcodingschool.site/'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

/** axios 인스턴스 (쿠키 인증 대비: withCredentials) */
export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// =============================
// Request 인터셉터
// =============================
api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState()
    
    // 액세스 토큰이 있으면 자동으로 헤더에 추가
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// =============================
// Response 인터셉터
// =============================
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // 401 Unauthorized 에러 처리
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // 리프레시 토큰으로 새로운 액세스 토큰 요청
        const refreshResponse = await axios.post(
          `${BASE_URL}/api/v1/accounts/token/refresh`,
          {},
          { withCredentials: true }
        )

        const newAccessToken = refreshResponse.data.access_token
        
        // 새 토큰 저장
        useAuthStore.getState().setAccessToken(newAccessToken)

        // 원래 요청 재시도
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        }
        
        return api(originalRequest)
      } catch (refreshError) {
        // 리프레시 토큰도 만료된 경우 로그아웃
        useAuthStore.getState().logout()
        
        // 401 에러 시 리다이렉트를 건너뛰어야 하는지 확인 (초기 로드 시 등)
        const skipRedirect = (originalRequest as any)._skipRedirect
        
        // 로그인 페이지로 리다이렉트 (skipRedirect가 아닐 때만)
        if (!skipRedirect && typeof window !== 'undefined') {
          window.location.href = EXTERNAL_LOGIN_URL
        }
        
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

/** JS로 읽을 수 있는 쿠키일 때만 사용 가능 */
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

/** 로그인 상태 확인 */
export function isLoggedIn(): boolean {
  const { isLoggedIn, isInitializing } = useAuthStore.getState()
  
  // 초기화 중일 때는 일단 버튼 등을 보여주기 위해 true 반환
  if (isInitializing) return true
  
  // 쿠키에 refreshToken이 있거나 Zustand에 로그인 정보가 있으면 true
  return isLoggedIn || getCookie('refreshToken') !== null
}

/** Access Token 가져오기 (하위 호환성을 위해 유지) */
export function getAccessToken(): string | null {
  const { accessToken } = useAuthStore.getState()
  return accessToken || getCookie('accessToken')
}

/** 현재 로그인한 사용자 정보 조회 API */
export async function getCurrentUser() {
  const { finishInitializing, setUser } = useAuthStore.getState()
  
  try {
    const res = await api.get('/api/v1/accounts/me/', {
      _skipRedirect: true,
    } as any)
    setUser(res.data)
    return res.data
  } catch (error) {
    // 초기 로딩 시 실패하더라도 로그아웃 처리는 하지 않음 (비로그인 사용자일 수 있음)
    console.warn('Initial user fetch failed (expected for non-logged users)')
    setUser(null)
    throw error
  } finally {
    finishInitializing()
  }
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
  const res = await api.get<PaginatedResponse<any>>(
    `/api/v1/posts/${suffix}`
  )
  
  // 서버 응답(like_count)을 프론트엔드 형식(likes_count)으로 변환
  const transformedResults = (res.data.results || []).map((item: any) => ({
    ...item,
    likes_count: item.likes_count ?? item.like_count ?? 0,
    comments_count: item.comments_count ?? item.comment_count ?? 0,
  }))

  return {
    ...res.data,
    results: transformedResults,
  }
}

export async function createCommunityPost(
  body: CreateCommunityPostBody
): Promise<CreateCommunityPostResponse> {
  const res = await api.post<CreateCommunityPostResponse>(
    '/api/v1/posts/',
    body
  )
  return res.data
}

export async function getCommunityPostDetail(
  postId: number
): Promise<CommunityPostDetail> {
  const res = await api.get<any>(`/api/v1/posts/${postId}`)
  
  const data = res.data
  // 서버 응답 필드 맵핑 (like_count -> likes_count, is_liked -> is_like 등)
  return {
    ...data,
    likes_count: data.likes_count ?? data.like_count ?? 0,
    comments_count: data.comments_count ?? data.comment_count ?? 0,
    is_like: data.is_like ?? data.is_liked ?? false,
  }
}

export async function updateCommunityPost(
  postId: number,
  body: CreateCommunityPostBody
): Promise<void> {
  const res = await api.patch<void>(`/api/v1/posts/${postId}`, body)
  return res.data
}

export async function deleteCommunityPost(
  postId: number
): Promise<DeleteCommunityPostResponse> {
  const res = await api.delete<DeleteCommunityPostResponse>(
    `/api/v1/posts/${postId}`
  )
  return res.data
}

export async function getCommunityComments(
  postId: number,
  params?: { page?: number; page_size?: number }
): Promise<PaginatedResponse<CommunityComment>> {
  const q = toQuery(params as Record<string, unknown>)
  const suffix = q.toString() ? `?${q.toString()}` : ''
  const res = await api.get<PaginatedResponse<CommunityComment>>(
    `/api/v1/posts/${postId}/comments/${suffix}`
  )
  return res.data
}

export async function createCommunityComment(
  postId: number,
  body: CreateCommunityCommentBody
): Promise<CreateCommunityCommentResponse> {
  const res = await api.post<CreateCommunityCommentResponse>(
    `/api/v1/posts/${postId}/comments/create/`,
    body
  )
  return res.data
}

export async function updateCommunityComment(
  postId: number,
  commentId: number,
  body: UpdateCommunityCommentBody
): Promise<UpdateCommunityCommentResponse> {
  const res = await api.put<UpdateCommunityCommentResponse>(
    `/api/v1/posts/${postId}/comments/${commentId}/update/`,
    body
  )
  return res.data
}

export async function deleteCommunityComment(
  postId: number,
  commentId: number
): Promise<DeleteCommunityCommentResponse> {
  const res = await api.delete<DeleteCommunityCommentResponse>(
    `/api/v1/posts/${postId}/comments/${commentId}/delete/`
  )
  return res.data
}

export async function likeCommunityPost(postId: number) {
  const res = await api.post(
    `/api/v1/posts/${postId}/like/`,
    {}
  )
  return res.data
}

export async function unlikeCommunityPost(postId: number) {
  const res = await api.delete(`/api/v1/posts/${postId}/like/`)
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
  const res = await api.put<PresignedUrlResponse>(
    '/api/v1/posts/presigned-url/',
    { file_name: fileName }
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