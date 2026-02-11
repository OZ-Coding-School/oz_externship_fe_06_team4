import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import CommunityDetailPage from './pages/community/CommunityDetailPage'
import CommunityListPage from './pages/community/CommunityListPage'
import CommunityCreatePage from './pages/community/CommunityCreatePage'
import CommunityEditPage from './pages/community/CommunityEditPage'
import NotFoundPage from './pages/NotFoundPage'
import { getCurrentUser } from './api/api'

export default function App() {
  useEffect(() => {
    // 앱이 로드될 때 다른 서브도메인의 로그인 상태를 자동으로 확인
    getCurrentUser().catch(() => {
      // 비로그인 사용자면 에러가 나겠지만 무시함
    })
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />

      <main className="flex-1 pt-[96px] pb-[120px]">
        <Routes>
          <Route path="/" element={<CommunityListPage />} />
          <Route path="/new" element={<CommunityCreatePage />} />
          <Route
            path="/:postId/edit"
            element={<CommunityEditPage />}
          />
          <Route path="/:postId" element={<CommunityDetailPage />} />

          {/* 404 Not Found */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <Footer />
    </div>
  )
}
