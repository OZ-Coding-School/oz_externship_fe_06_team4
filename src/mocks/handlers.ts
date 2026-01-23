import { http, HttpResponse } from 'msw'

type LoginRequestBody = {
  email: string
  password: string
}

type User = {
  id: number
  name: string
  email: string
}

type CommunityCategory = {
  id: number
  name: string
}

type CommunityAuthor = {
  id: number
  nickname: string
  profile_img_url: string | null
}

type CommunityPostListItem = {
  id: number
  title: string
  content_preview: string
  author: CommunityAuthor
  created_at: string
  updated_at: string
  category_id: number
  thumbnail_img_url: string | null
  like_count: number
  comment_count: number
  view_count: number
}

type CommunityPostDetail = {
  id: number
  title: string
  content: string
  category: CommunityCategory
  author: CommunityAuthor
  like_count: number
  comment_count: number
  view_count: number
  created_at: string
  updated_at: string
  is_liked?: boolean
  is_author?: boolean
}

type Comment = {
  id: number
  content: string
  author: CommunityAuthor
  created_at: string
  updated_at: string
  is_author?: boolean
}

/**
 * Authorization 토큰 유무만 체크 (지금 단계에선 “로그인 되어있다/아니다”만 필요)
 */
function isAuthenticated(request: Request): boolean {
  const authHeader = request.headers.get('Authorization')
  return authHeader?.startsWith('Bearer ') ?? false
}

/** =========================
 * In-memory Stores
 * ========================= */

const CATEGORIES: CommunityCategory[] = [
  { id: 1, name: '전체' },
  { id: 2, name: '공지사항' },
  { id: 3, name: '자유게시판' },
  { id: 4, name: '일상 공유' },
  { id: 5, name: '개발 지식 공유' },
  { id: 6, name: '취업 정보 공유' },
  { id: 7, name: '프로젝트 구인' },
]

const nowISO = () => new Date().toISOString()

const postsStore: CommunityPostListItem[] = [
  {
    id: 1,
    title: '데이터 분석 프로젝트 구합니다!',
    content_preview:
      '저는 완전 기초인데 혹시 같이 프로젝트 만드실분 계신가요?!',
    author: { id: 1, nickname: '조조아', profile_img_url: null },
    created_at: nowISO(),
    updated_at: nowISO(),
    category_id: 6,
    thumbnail_img_url: null,
    like_count: 156,
    comment_count: 6,
    view_count: 60,
  },
  {
    id: 2,
    title: '러닝 메이트 함께해요.',
    content_preview:
      'https://www.codeit.kr/costudy/join/684e26b7... 같이 하실래요~',
    author: { id: 2, nickname: '김철수', profile_img_url: null },
    created_at: nowISO(),
    updated_at: nowISO(),
    category_id: 4,
    thumbnail_img_url:
      'https://images.unsplash.com/photo-1520975958225-7b7b3d0b8d1a?auto=format&fit=crop&w=400&q=60',
    like_count: 82,
    comment_count: 2,
    view_count: 40,
  },
  {
    id: 3,
    title: '포트폴리오 피드백 받을 곳 추천',
    content_preview:
      '현직자 피드백 받을 수 있는 커뮤니티나 서비스 추천해줄 수 있나요?',
    author: { id: 3, nickname: '밍고', profile_img_url: null },
    created_at: nowISO(),
    updated_at: nowISO(),
    category_id: 5,
    thumbnail_img_url: null,
    like_count: 34,
    comment_count: 12,
    view_count: 110,
  },
]

/** postId별 댓글 저장 */
const commentsStore: Record<number, Comment[]> = {
  1: [],
  2: [],
  3: [],
}

/** postId별 좋아요 */
const likesStore: Record<number, number> = {
  1: postsStore.find((p) => p.id === 1)?.like_count ?? 0,
  2: postsStore.find((p) => p.id === 2)?.like_count ?? 0,
  3: postsStore.find((p) => p.id === 3)?.like_count ?? 0,
}

/** postId별 조회수 */
const viewCountStore: Record<number, number> = {
  1: postsStore.find((p) => p.id === 1)?.view_count ?? 0,
  2: postsStore.find((p) => p.id === 2)?.view_count ?? 0,
  3: postsStore.find((p) => p.id === 3)?.view_count ?? 0,
}

let nextCommentId = 1

/** =========================
 * Helpers
 * ========================= */

function getCategoryById(categoryId: number): CommunityCategory {
  return (
    CATEGORIES.find((c) => c.id === categoryId) ?? {
      id: categoryId,
      name: '카테고리',
    }
  )
}

function parseNumber(v: string | null, fallback: number) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** =========================
 * Handlers
 * ========================= */
export const handlers = [
  /* =========================
   * Auth / Test
   * ========================= */
  http.get('/api/users', () => {
    const users: User[] = [
      { id: 1, name: '김철수', email: 'kim@example.com' },
      { id: 2, name: '이영희', email: 'lee@example.com' },
    ]
    return HttpResponse.json(users)
  }),

  http.post('/api/login', async ({ request }) => {
    const body = (await request.json()) as Partial<LoginRequestBody>
    const email = body.email ?? ''
    const password = body.password ?? ''

    if (email === 'test@example.com' && password === 'password') {
      return HttpResponse.json({
        success: true,
        token: 'mock-jwt-token',
        user: { id: 1, name: '테스트 유저' },
      })
    }

    return HttpResponse.json(
      { success: false, message: '로그인 실패' },
      { status: 401 }
    )
  }),

  http.get('/api/error', () => {
    return HttpResponse.json(
      { message: '서버 에러가 발생했습니다' },
      { status: 500 }
    )
  }),

  /* =========================
   * Community
   * ========================= */

  /**
   * 1) 카테고리 목록
   * GET /api/v1/posts/categories
   */
  http.get('*/api/v1/posts/categories', () => {
    // "전체"를 서버가 줄 수도/안 줄 수도 있는데, 피그마엔 "전체"가 있으니 포함
    // 필요하면 여기서 "전체" 빼도 됨.
    return HttpResponse.json(
      CATEGORIES.filter((c) => c.id !== 1).map((c) => ({
        id: c.id,
        name: c.name,
      }))
    )
  }),

  /**
   * 2) 게시글 목록
   * GET /api/v1/posts?page=&page_size=&search=&search_filter=&category_id=&sort=
   */
  http.get('*/api/v1/posts', ({ request }) => {
    const url = new URL(request.url)
    const page = parseNumber(url.searchParams.get('page'), 1)
    const pageSize = parseNumber(url.searchParams.get('page_size'), 10)
    const search = (url.searchParams.get('search') ?? '').trim()
    const categoryId = Number(url.searchParams.get('category_id') ?? 0)

    let filtered = [...postsStore]

    if (categoryId)
      filtered = filtered.filter((p) => p.category_id === categoryId)
    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.content_preview.toLowerCase().includes(search.toLowerCase())
      )
    }

    const count = filtered.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const results = filtered.slice(start, end)

    return HttpResponse.json({
      count,
      next: end < count ? `?page=${page + 1}&page_size=${pageSize}` : null,
      previous: page > 1 ? `?page=${page - 1}&page_size=${pageSize}` : null,
      results,
    })
  }),

  /**
   * 3) 게시글 상세
   * GET /api/v1/posts/{postId}
   * - 로그인 불필요
   */
  http.get('*/api/v1/posts/:postId', ({ params, request }) => {
    const authenticated = isAuthenticated(request)
    const pid = Number(params.postId)
    const post = postsStore.find((p) => p.id === pid)

    if (!post) {
      return HttpResponse.json(
        { detail: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const commentCount = commentsStore[pid]?.length ?? 0
    const likeCount = likesStore[pid] ?? post.like_count
    const viewCount = viewCountStore[pid] ?? post.view_count

    const detail: CommunityPostDetail = {
      id: post.id,
      title: post.title,
      content: `${post.content_preview}\n\n(상세 본문은 임시입니다.)`,
      category: getCategoryById(post.category_id),
      author: post.author,
      like_count: likeCount,
      comment_count: commentCount,
      view_count: viewCount,
      created_at: post.created_at,
      updated_at: post.updated_at,
      is_liked: authenticated ? false : undefined,
      is_author: authenticated ? false : undefined,
    }

    return HttpResponse.json(detail)
  }),

  /**
   * 4) 게시글 삭제
   * DELETE /api/v1/posts/{postId}
   * - 로그인 필요
   */
  http.delete('*/api/v1/posts/:postId', ({ request, params }) => {
    if (!isAuthenticated(request)) {
      return HttpResponse.json(
        { error_detail: '자격 인증 데이터가 제공되지 않았습니다.' },
        { status: 401 }
      )
    }

    const pid = Number(params.postId)
    const idx = postsStore.findIndex((p) => p.id === pid)
    if (idx === -1) {
      return HttpResponse.json(
        { detail: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    postsStore.splice(idx, 1)
    delete commentsStore[pid]
    delete likesStore[pid]
    delete viewCountStore[pid]

    return HttpResponse.json({ detail: '게시글이 삭제되었습니다.' })
  }),

  /**
   * 5) 댓글 목록
   * GET /api/v1/posts/{postId}/comments
   * - 로그인 불필요
   */
  http.get('*/api/v1/posts/:postId/comments', ({ request, params }) => {
    const authenticated = isAuthenticated(request)
    const pid = Number(params.postId)

    const list = commentsStore[pid] ?? []
    const results = list.map((c) => ({
      ...c,
      is_author: authenticated ? false : undefined,
    }))

    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    })
  }),

  /**
   * 6) 댓글 작성
   * POST /api/v1/posts/{postId}/comments
   * - 로그인 필요
   */
  http.post('*/api/v1/posts/:postId/comments', async ({ request, params }) => {
    if (!isAuthenticated(request)) {
      return HttpResponse.json(
        { error_detail: '자격 인증 데이터가 제공되지 않았습니다.' },
        { status: 401 }
      )
    }

    const pid = Number(params.postId)
    const body = (await request.json()) as { content?: string }
    const content = (body.content ?? '').trim()

    if (!content) {
      return HttpResponse.json(
        { detail: 'content는 필수입니다.' },
        { status: 400 }
      )
    }

    const newComment: Comment = {
      id: nextCommentId++,
      content,
      author: { id: 100, nickname: '로그인유저', profile_img_url: null },
      created_at: nowISO(),
      updated_at: nowISO(),
    }

    commentsStore[pid] = commentsStore[pid] ?? []
    commentsStore[pid].push(newComment)

    return HttpResponse.json(
      { detail: '댓글이 등록되었습니다.' },
      { status: 201 }
    )
  }),

  /**
   * 7) 댓글 수정
   * PUT /api/v1/posts/{postId}/comments/{commentId}
   * - 로그인 필요
   */
  http.put(
    '*/api/v1/posts/:postId/comments/:commentId',
    async ({ request, params }) => {
      if (!isAuthenticated(request)) {
        return HttpResponse.json(
          { error_detail: '자격 인증 데이터가 제공되지 않았습니다.' },
          { status: 401 }
        )
      }

      const pid = Number(params.postId)
      const cid = Number(params.commentId)
      const body = (await request.json()) as { content?: string }
      const content = (body.content ?? '').trim()

      const list = commentsStore[pid] ?? []
      const target = list.find((c) => c.id === cid)
      if (!target) {
        return HttpResponse.json(
          { detail: '댓글을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      target.content = content || target.content
      target.updated_at = nowISO()

      return HttpResponse.json({ detail: '댓글이 수정되었습니다.' })
    }
  ),

  /**
   * 8) 댓글 삭제
   * DELETE /api/v1/posts/{postId}/comments/{commentId}
   * - 로그인 필요
   */
  http.delete(
    '*/api/v1/posts/:postId/comments/:commentId',
    ({ request, params }) => {
      if (!isAuthenticated(request)) {
        return HttpResponse.json(
          { error_detail: '자격 인증 데이터가 제공되지 않았습니다.' },
          { status: 401 }
        )
      }

      const pid = Number(params.postId)
      const cid = Number(params.commentId)

      const list = commentsStore[pid] ?? []
      const next = list.filter((c) => c.id !== cid)
      commentsStore[pid] = next

      return HttpResponse.json({ detail: '댓글이 삭제되었습니다.' })
    }
  ),

  /**
   * 9) 좋아요
   * POST /api/v1/posts/{postId}/like
   * - 로그인 필요
   */
  http.post('*/api/v1/posts/:postId/like', ({ request, params }) => {
    if (!isAuthenticated(request)) {
      return HttpResponse.json(
        { error_detail: '자격 인증 데이터가 제공되지 않았습니다.' },
        { status: 401 }
      )
    }

    const pid = Number(params.postId)
    likesStore[pid] = (likesStore[pid] ?? 0) + 1
    return HttpResponse.json(
      { detail: '좋아요가 등록되었습니다.' },
      { status: 201 }
    )
  }),

  /**
   * 10) 좋아요 취소
   * DELETE /api/v1/posts/{postId}/like
   * - 로그인 필요
   */
  http.delete('*/api/v1/posts/:postId/like', ({ request, params }) => {
    if (!isAuthenticated(request)) {
      return HttpResponse.json(
        { error_detail: '자격 인증 데이터가 제공되지 않았습니다.' },
        { status: 401 }
      )
    }

    const pid = Number(params.postId)
    const current = likesStore[pid] ?? 0
    likesStore[pid] = Math.max(0, current - 1)
    return HttpResponse.json({ detail: '좋아요가 취소되었습니다.' })
  }),
]
