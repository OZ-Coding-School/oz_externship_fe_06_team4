// api 참고 완료~
export type SortOption =
  | 'latest'
  | 'oldest'
  | 'most_views'
  | 'most_likes'
  | 'most_comments'

export type SearchFilterOption =
  | 'author'
  | 'title'
  | 'content'
  | 'title_or_content'

export interface CommunityCategory {
  id: number
  name: string
}

export interface CommunityAuthor {
  id: number
  nickname: string
  profile_img_url: string | null
}

export interface CommunityPostListItem {
  id: number
  author: CommunityAuthor
  title: string
  thumbnail_img_url: string | null
  content_preview: string
  comment_count: number
  view_count: number
  like_count: number
  created_at: string // ISO string
  updated_at: string // ISO string
  category_id: number
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface GetCommunityPostsParams {
  page?: number
  page_size?: number
  search?: string
  search_filter?: SearchFilterOption
  category_id?: number
  sort?: SortOption
}

export interface CreateCommunityPostBody {
  title: string
  content: string
  category_id: number
}

export interface CreateCommunityPostResponse {
  detail: string
  pk: number
}
