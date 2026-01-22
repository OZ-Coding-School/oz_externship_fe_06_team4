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

export const handlers = [
  /* =========================
   * Auth / Test
   * ========================= */

  // GET 요청 모킹
  http.get('/api/users', () => {
    const users: User[] = [
      { id: 1, name: '김철수', email: 'kim@example.com' },
      { id: 2, name: '이영희', email: 'lee@example.com' },
    ]
    return HttpResponse.json(users)
  }),

  // POST 로그인
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

  // 에러 테스트
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
   */
  http.get(
    'https://api.ozcodingschool.site/api/v1/posts/:postId',
    ({ params }) => {
      const { postId } = params

      return HttpResponse.json({
        id: Number(postId),
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
        like_count: 12,
        comment_count: 2,
        view_count: 123,
        created_at: '2024-01-10T12:00:00Z',
        updated_at: '2024-01-10T12:00:00Z',
        is_liked: false,
        is_author: false,
      })
    }
  ),

  /**
   * 커뮤니티 댓글 목록
   * GET /api/v1/posts/{postId}/comments
   */
  http.get(
    'https://api.ozcodingschool.site/api/v1/posts/:postId/comments',
    () => {
      return HttpResponse.json({
        count: 2,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            content: '첫 번째 댓글입니다.',
            author: {
              id: 2,
              nickname: '댓글유저1',
              profile_img_url: null,
            },
            created_at: '2024-01-10T13:00:00Z',
            updated_at: '2024-01-10T13:00:00Z',
            is_author: false,
          },
          {
            id: 2,
            content: '두 번째 댓글입니다.',
            author: {
              id: 3,
              nickname: '댓글유저2',
              profile_img_url: null,
            },
            created_at: '2024-01-10T14:00:00Z',
            updated_at: '2024-01-10T14:00:00Z',
            is_author: false,
          },
          {
            id: 3,
            content: '세 번째 댓글입니다.',
            author: {
              id: 4,
              nickname: '댓글유저3',
              profile_img_url: null,
            },
            created_at: '2024-01-10T14:00:00Z',
            updated_at: '2024-01-10T14:00:00Z',
            is_author: false,
          },
          {
            id: 4,
            content: '네 번째 댓글입니다.',
            author: {
              id: 5,
              nickname: '댓글유저4',
              profile_img_url: null,
            },
            created_at: '2024-01-10T14:00:00Z',
            updated_at: '2024-01-10T14:00:00Z',
            is_author: false,
          },
          {
            id: 5,
            content: '다섯 번째 댓글입니다.',
            author: {
              id: 6,
              nickname: '댓글유저5',
              profile_img_url: null,
            },
            created_at: '2024-01-10T14:00:00Z',
            updated_at: '2024-01-10T14:00:00Z',
            is_author: false,
          },
        ],
      })
    }
  ),

  /**
   * 커뮤니티 게시글 삭제
   * DELETE /api/v1/posts/{postId}
   */
  http.delete(
    'https://api.ozcodingschool.site/api/v1/posts/:postId',
    () => {
      return HttpResponse.json({
        detail: '게시글이 삭제되었습니다.',
      })
    }
  ),
]
