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
  // GET 요청 모킹
  http.get('/api/users', () => {
    const users: User[] = [
      { id: 1, name: '김철수', email: 'kim@example.com' },
      { id: 2, name: '이영희', email: 'lee@example.com' },
    ]
    return HttpResponse.json(users)
  }),

  // POST 요청 모킹
  http.post('/api/login', async ({ request }) => {
    //  TS에서 unknown으로 들어오는 경우가 많아서 타입 단언/검증이 필요함
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

  // 에러 응답 모킹
  http.get('/api/error', () => {
    return HttpResponse.json(
      { message: '서버 에러가 발생했습니다' },
      { status: 500 }
    )
  }),
]
