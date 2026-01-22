import { Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import CommunityDetailPage from './pages/community/CommunityDetailPage'
import CommunityListPage from './pages/community/CommunityListPage'
import CommunityCreatePage from './pages/community/CommunityCreatePage'
import CommunityEditPage from './pages/community/CommunityEditPage'

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pt-[96px]">
        <Routes>
          {/* 루트 접근 시 커뮤니티 목록으로 */}
          <Route path="/" element={<Navigate to="/community" replace />} />

          {/* 커뮤니티 */}
          <Route path="/community" element={<CommunityListPage />} />
          <Route path="/community/new" element={<CommunityCreatePage />} />
          <Route
            path="/community/:postId/edit"
            element={<CommunityEditPage />}
          />
          <Route path="/community/:postId" element={<CommunityDetailPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
