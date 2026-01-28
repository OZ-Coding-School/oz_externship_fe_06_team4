import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex h-[calc(100vh-216px)] w-full flex-col items-center justify-center gap-6">
      <h1 className="text-6xl font-bold text-[#7C3AED]">404</h1>
      <p className="text-xl text-gray-600">요청하신 페이지를 찾을 수 없습니다.</p>
      <Link
        to="/community"
        className="rounded-full bg-[#7C3AED] px-8 py-3 text-lg font-bold text-white transition-colors hover:bg-[#6D28D9]"
      >
        커뮤니티로 돌아가기
      </Link>
    </div>
  )
}
