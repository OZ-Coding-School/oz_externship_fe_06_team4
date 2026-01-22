import { Routes, Route } from 'react-router-dom'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import CommunityDetailPage from './pages/community/CommunityDetailPage'

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pt-[96px]">
        <Routes>
          <Route
            path="/community/:postId"
            element={<CommunityDetailPage />}
          />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
