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

type Comment = {
  id: number
  content: string
  author: {
    id: number
    nickname: string
    profile_img_url: string | null
  }
  created_at: string
  updated_at: string
  is_author?: boolean
}

/**
 * 요청 헤더에서 Authorization 토큰 확인
 */
function isAuthenticated(request: Request): boolean {
  const authHeader = request.headers.get('Authorization')
  return authHeader?.startsWith('Bearer ') ?? false
}

/**
 * 인메모리 댓글 저장소 (postId별로 관리)
 */
const commentsStore: Record<number, Comment[]> = {
  1: [], // 빈 배열로 시작 (0개)
}

/**
 * 게시글별 좋아요 개수
 */
const likesStore: Record<number, number> = {
  1: 0, // 좋아요 0개로 시작
}

/**
 * 게시글별 조회수
 */
const viewCountStore: Record<number, number> = {
  1: 0, // 조회수 0으로 시작
}

// 댓글 ID 카운터
let nextCommentId = 1

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
   * 커뮤니티 게시글 상세
   * GET /api/v1/posts/{postId}
   * - 로그인 불필요
   * - 조회수는 증가시키지 않음 (목록에서 클릭할 때만 증가)
   */
  http.get(
    'https://api.ozcodingschool.site/api/v1/posts/:postId',
    ({ params, request }) => {
      const { postId } = params
      const authenticated = isAuthenticated(request)
      const pid = Number(postId)

      // 동적으로 계산
      const commentCount = commentsStore[pid]?.length || 0
      const likeCount = likesStore[pid] || 0
      const viewCount = viewCountStore[pid] || 0

      return HttpResponse.json({
        id: pid,
        title: '커뮤니티 게시글 제목입니다',
        content: '이것은 커뮤니티 게시글 상세 내용입니다.\n줄바꿈도 포함됩니다.',
        category: {
          id: 1,
          name: '자유게시판',
        },
        author: {
          id: 1,
          nickname: '프론트엔드유저',
          profile_img_url: null,
        },
        like_count: likeCount,        // 0부터 시작
        comment_count: commentCount,  // 0부터 시작
        view_count: viewCount,        // 0부터 시작
        created_at: '2024-01-10T12:00:00Z',
        updated_at: '2024-01-10T12:00:00Z',
        is_liked: authenticated ? false : undefined,
        is_author: authenticated ? false : undefined,
      })
    }
  ),

  /**
   * 커뮤니티 댓글 목록
   * GET /api/v1/posts/{postId}/comments
   * - 로그인 불필요
   */
  http.get(
    'https://api.ozcodingschool.site/api/v1/posts/:postId/comments',
    ({ request, params }) => {
      const { postId } = params
      const authenticated = isAuthenticated(request)
      const pid = Number(postId)

      // postId에 해당하는 댓글 가져오기
      const postComments = commentsStore[pid] || []

      // 로그인 상태에 따라 is_author 추가
      const results = postComments.map((comment) => ({
        ...comment,
        is_author: authenticated ? false : undefined,
      }))

      console.log(`📝 댓글 조회: postId=${pid}, 총 ${results.length}개`)

      return HttpResponse.json({
        count: results.length,
        next: null,
        previous: null,
        results,
      })
    }
  ),

  /**
   * 커뮤니티 게시글 삭제
   * DELETE /api/v1/posts/{postId}
   * - 로그인 필요
   */
  http.delete(
    'https://api.ozcodingschool.site/api/v1/posts/:postId',
    ({ request }) => {
      if (!isAuthenticated(request)) {
        return HttpResponse.json(
          { error_detail: '자격 인증 데이터가 제공되지 않았습니다.' },
          { status: 401 }
        )
      }

      return HttpResponse.json({
        detail: '게시글이 삭제되었습니다.',
      })
    }
  ),

  /**
   * 커뮤니티 댓글 작성
   * POST /api/v1/posts/{postId}/comments
   * - 로그인 필요
   */
  http.post(
    'https://api.ozcodingschool.site/api/v1/posts/:postId/comments',
    async ({ request, params }) => {
      if (!isAuthenticated(request)) {
        return HttpResponse.json(
          { error_detail: '자격 인증 데이터가 제공되지 않았습니다.' },
          { status: 401 }
        )
      }

      const { postId } = params
      const pid = Number(postId)
      const body = (await request.json()) as { content: string }

      // 새 댓글 생성
      const newComment: Comment = {
        id: nextCommentId++,
        content: body.content,
        author: {
          id: 100,
          nickname: '로그인유저',
          profile_img_url: null,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // postId에 해당하는 댓글 배열이 없으면 생성
      if (!commentsStore[pid]) {
        commentsStore[pid] = []
      }

      // 댓글 추가
      commentsStore[pid].push(newComment)

      console.log(`✅ 댓글 등록 성공! postId: ${pid}, 총 댓글: ${commentsStore[pid].length}개`)

      return HttpResponse.json(
        { detail: '댓글이 등록되었습니다.' },
        { status: 201 }
      )
    }
  ),

  /**
   * 커뮤니티 댓글 수정
   * PUT /api/v1/posts/{postId}/comments/{commentId}
   * - 로그인 필요
   */
  http.put(
    'https://api.ozcodingschool.site/api/v1/posts/:postId/comments/:commentId',
    ({ request, params }) => {
      if (!isAuthenticated(request)) {
        return HttpResponse.json(
          { error_detail: '자격 인증 데이터가 제공되지 않았습니다.' },
          { status: 401 }
        )
      }

      const { commentId } = params

      return HttpResponse.json({
        id: Number(commentId),
        content: '수정된 댓글 내용',
        updated_at: new Date().toISOString(),
      })
    }
  ),

  /**
   * 커뮤니티 댓글 삭제
   * DELETE /api/v1/posts/{postId}/comments/{commentId}
   * - 로그인 필요
   */
  http.delete(
    'https://api.ozcodingschool.site/api/v1/posts/:postId/comments/:commentId',
    ({ request }) => {
      if (!isAuthenticated(request)) {
        return HttpResponse.json(
          { error_detail: '자격 인증 데이터가 제공되지 않았습니다.' },
          { status: 401 }
        )
      }

      return HttpResponse.json({
        detail: '댓글이 삭제되었습니다.',
      })
    }
  ),

  /**
   * 커뮤니티 게시글 좋아요
   * POST /api/v1/posts/{postId}/like
   * - 로그인 필요
   */
  http.post(
    'https://api.ozcodingschool.site/api/v1/posts/:postId/like',
    ({ request, params }) => {
      if (!isAuthenticated(request)) {
        return HttpResponse.json(
          { error_detail: '자격 인증 데이터가 제공되지 않았습니다.' },
          { status: 401 }
        )
      }

      const { postId } = params
      const pid = Number(postId)

      // 좋아요 증가
      if (!likesStore[pid]) {
        likesStore[pid] = 0
      }
      likesStore[pid]++

      console.log(`👍 좋아요 추가! postId: ${pid}, 총 좋아요: ${likesStore[pid]}개`)

      return HttpResponse.json(
        { detail: '좋아요가 등록되었습니다.' },
        { status: 201 }
      )
    }
  ),

  /**
   * 커뮤니티 게시글 좋아요 취소
   * DELETE /api/v1/posts/{postId}/like
   * - 로그인 필요
   */
  http.delete(
    'https://api.ozcodingschool.site/api/v1/posts/:postId/like',
    ({ request, params }) => {
      if (!isAuthenticated(request)) {
        return HttpResponse.json(
          { error_detail: '자격 인증 데이터가 제공되지 않았습니다.' },
          { status: 401 }
        )
      }

      const { postId } = params
      const pid = Number(postId)

      // 좋아요 감소
      if (likesStore[pid] && likesStore[pid] > 0) {
        likesStore[pid]--
      }

      console.log(`👎 좋아요 취소! postId: ${pid}, 총 좋아요: ${likesStore[pid]}개`)

      return HttpResponse.json({
        detail: '좋아요가 취소되었습니다.',
      })
    }
  ),
]