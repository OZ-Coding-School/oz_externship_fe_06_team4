import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  getCommunityPostDetail,
  getCommunityComments,
} from './../../api/api'
import type {
  CommunityPostDetail,
  CommunityComment,
} from './../../types'

const DEFAULT_AVATAR = '/icons/profile.svg'

export default function CommunityDetailPage() {
  const { postId } = useParams<{ postId: string }>()
  const [post, setPost] = useState<CommunityPostDetail | null>(null)
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!postId) {
      setLoading(false)
      setError('게시글 ID가 없습니다.')
      return
    }

    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        
        const postData = await getCommunityPostDetail(Number(postId))
        const commentData = await getCommunityComments(Number(postId))
        
        setPost(postData)
        setComments(commentData.results || [])
      } catch (err) {
        console.error('데이터 로딩 실패:', err)
        setError('게시글을 불러오는데 실패했습니다.')
        setPost(null)
        setComments([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [postId])

  // 시간 표시 포맷팅 함수
  const formatTimeAgo = (createdAt: string) => {
    const hours = Math.floor(
      (Date.now() - new Date(createdAt).getTime()) / 1000 / 60 / 60
    )
    
    if (hours < 1) return '방금 전'
    if (hours < 24) return `${hours}시간 전`
    
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}일 전`
    
    return new Date(createdAt).toLocaleDateString()
  }

  if (loading) return <div className="py-20 text-center">로딩 중...</div>
  if (error) return <div className="py-20 text-center text-red-500">{error}</div>
  if (!post) return <div className="py-20 text-center">게시글이 없습니다.</div>

  return (
    <div className="mx-auto max-w-[820px] px-4 py-12">
      {/* 카테고리 */}
      <span className="text-[20px] font-bold text-[#6201E0]">
        {post.category.name}
      </span>

      {/* 제목 + 작성자 */}
      <div className="mt-2 flex items-start justify-between">
        <h1 className="max-w-[640px] text-[32px] font-bold leading-tight text-[#121212]">
          {post.title}
        </h1>

        <div className="flex items-center gap-2">
          <img
            src={post.author.profile_img_url || DEFAULT_AVATAR}
            className="h-10 w-10 rounded-full object-cover"
            alt={`${post.author.nickname} 프로필`}
            onError={(e) => {
              e.currentTarget.src = DEFAULT_AVATAR
            }}
          />
          <span className="text-[16px] font-medium text-[#121212]">
            {post.author.nickname}
          </span>
        </div>
      </div>

      {/* 메타 정보 */}
      <div className="mt-3 flex items-center gap-4 text-[16px] text-[#9D9D9D]">
        <span>조회수 {post.view_count.toLocaleString()}</span>
        <span>좋아요 {post.like_count.toLocaleString()}</span>
        <span>{formatTimeAgo(post.created_at)}</span>
      </div>

      <hr className="my-6 border-[#CECECE]" />

      {/* 본문 */}
      <div className="whitespace-pre-wrap text-[16px] leading-relaxed text-[#121212]">
        {post.content}
      </div>

      {/* 좋아요 / 공유하기 */}
      <div className="mt-10 flex justify-end gap-3">
        <button 
          className="flex items-center gap-1 rounded-full border px-4 py-2 text-[14px] text-[#4D4D4D] hover:bg-gray-50"
          onClick={() => {
            // TODO: 좋아요 API 연결
            console.log('좋아요 클릭')
          }}
        >
          <img src="/icons/thumbs-up.svg" className="h-4 w-4" alt="좋아요" />
          {post.like_count.toLocaleString()}
        </button>

        <button 
          className="flex items-center gap-1 rounded-full border px-4 py-2 text-[14px] text-[#4D4D4D] hover:bg-gray-50"
          onClick={() => {
            // TODO: 공유 기능 구현
            navigator.clipboard.writeText(window.location.href)
            alert('링크가 복사되었습니다.')
          }}
        >
          <img src="/icons/link.svg" className="h-4 w-4" alt="공유" />
          공유하기
        </button>
      </div>

      <hr className="my-12 border-[#CECECE]"/>

      {/* 댓글 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[20px] font-bold">
          <img src="/icons/message-circle.svg" className="h-5 w-5" alt="댓글" />
          댓글 {post.comment_count}개
        </div>

        <button className="flex items-center gap-1 text-[16px] text-[#4D4D4D]">
          최신순
          <img
            src="/icons/swap-vertical-outline.svg"
            className="h-4 w-4"
            alt="정렬"
          />
        </button>
      </div>

      {/* 댓글 리스트 */}
      <ul>
        {comments.length === 0 ? (
          <li className="py-10 text-center text-[#9D9D9D]">
            첫 댓글을 남겨보세요!
          </li>
        ) : (
          comments.map((comment, index) => (
            <li
              key={comment.id}
              className="relative flex gap-3 py-6"
            >
              {/* 댓글 구분선 */}
              {index !== 0 && (
                <span
                  className="
                    absolute
                    left-[48px]
                    right-0
                    top-0
                    border-t
                    border-[#CECECE]
                  "
                />
              )}

              {/* 프로필 */}
              <img
                src={comment.author.profile_img_url || DEFAULT_AVATAR}
                className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
                alt={`${comment.author.nickname} 프로필`}
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_AVATAR
                }}
              />

              {/* 댓글 내용 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-[#121212]">
                    {comment.author.nickname}
                  </span>
                  <span className="text-[12px] text-[#9D9D9D]">
                    {formatTimeAgo(comment.created_at)}
                  </span>
                </div>

                <p className="mt-1 text-[16px] text-[#121212] break-words">
                  {comment.content}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}