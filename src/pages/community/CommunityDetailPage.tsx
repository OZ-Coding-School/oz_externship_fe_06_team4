import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getCommunityPostDetail,
  getCommunityComments,
  createCommunityComment,
  likeCommunityPost,
  unlikeCommunityPost,
  isLoggedIn,
} from './../../api/api'
import type { CommunityPostDetail, CommunityComment } from './../../types'

const DEFAULT_AVATAR = '/icons/profile.svg'
const MAX_COMMENT_LENGTH = 500

export default function CommunityDetailPage() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()

  const [post, setPost] = useState<CommunityPostDetail | null>(null)
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 댓글 작성
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitClicked, setIsSubmitClicked] = useState(false)

  // 좋아요 상태
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)

  // 댓글 정렬
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest')

  // 댓글 삭제 팝업
  const [deleteCommentId, setDeleteCommentId] = useState<number | null>(null)

  // 멘션 기능
  const [showMentionModal, setShowMentionModal] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mentionModalRef = useRef<HTMLDivElement>(null)

  // 실시간 시간 업데이트
  const [currentTime, setCurrentTime] = useState(Date.now())

  // 로그인 상태
  const loggedIn = isLoggedIn()

  // 1분마다 시간 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 60000) // 60초마다 업데이트

    return () => clearInterval(interval)
  }, [])

  // 멘션 모달 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mentionModalRef.current &&
        !mentionModalRef.current.contains(event.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node)
      ) {
        setShowMentionModal(false)
      }
    }

    if (showMentionModal) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMentionModal])

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
        setIsLiked(postData.is_liked || false)
        setLikeCount(postData.like_count || 0)
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

  // 댓글 작성자들로부터 유저 목록 추출
  const getCommentAuthors = () => {
    const authors = new Map()
    
    // 게시글 작성자 추가
    if (post) {
      authors.set(post.author.id, {
        id: post.author.id,
        nickname: post.author.nickname,
        profile_img_url: post.author.profile_img_url
      })
    }
    
    // 댓글 작성자들 추가
    comments.forEach(comment => {
      if (!authors.has(comment.author.id)) {
        authors.set(comment.author.id, {
          id: comment.author.id,
          nickname: comment.author.nickname,
          profile_img_url: comment.author.profile_img_url
        })
      }
      
      // 댓글에 태그된 유저들도 추가 (타입에 tagged_users가 있는 경우)
      const commentWithTags = comment as CommunityComment & { 
        tagged_users?: Array<{ id: number; nickname: string }> 
      }
      if (commentWithTags.tagged_users && commentWithTags.tagged_users.length > 0) {
        commentWithTags.tagged_users.forEach(taggedUser => {
          if (!authors.has(taggedUser.id)) {
            authors.set(taggedUser.id, {
              id: taggedUser.id,
              nickname: taggedUser.nickname,
              profile_img_url: null // tagged_users에는 profile_img_url이 없을 수 있음
            })
          }
        })
      }
    })
    
    return Array.from(authors.values())
  }

  // 시간 표시 포맷팅 (실시간 반영)
  const formatTimeAgo = (createdAt: string) => {
    const hours = Math.floor(
      (currentTime - new Date(createdAt).getTime()) / 1000 / 60 / 60
    )

    if (hours < 1) return '방금 전'
    if (hours < 24) return `${hours}시간 전`

    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}일 전`

    return new Date(createdAt).toLocaleDateString()
  }

  // 좋아요 토글
  const handleLikeToggle = async () => {
    if (!loggedIn) {
      if (window.confirm('로그인이 필요한 기능입니다. 로그인 하시겠습니까?')) {
        navigate('/login', { state: { from: `/community/${postId}` } })
      }
      return
    }

    try {
      if (isLiked) {
        await unlikeCommunityPost(Number(postId))
        setIsLiked(false)
        setLikeCount((prev) => prev - 1)
      } else {
        await likeCommunityPost(Number(postId))
        setIsLiked(true)
        setLikeCount((prev) => prev + 1)
      }
    } catch (err) {
      console.error('좋아요 처리 실패:', err)
      window.alert('좋아요 처리에 실패했습니다.')
    }
  }

  // 댓글 입력 처리 (멘션 기능 포함)
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart

    setNewComment(value)
    setCursorPosition(cursorPos)

    // @ 입력 감지
    const textBeforeCursor = value.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
      
      // @와 커서 사이에 공백이나 다른 @가 없는 경우만 모달 표시
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('@')) {
        setMentionSearch(textAfterAt)
        setShowMentionModal(true)
      } else {
        setShowMentionModal(false)
      }
    } else {
      setShowMentionModal(false)
    }
  }

  // 멘션 선택
  const handleSelectMention = (user: { id: number; nickname: string; profile_img_url: string | null }) => {
    const textBeforeCursor = newComment.slice(0, cursorPosition)
    const textAfterCursor = newComment.slice(cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    // @부터 커서까지의 텍스트를 선택한 유저의 닉네임으로 교체
    const newText = 
      textBeforeCursor.slice(0, lastAtIndex) + 
      `@${user.nickname} ` + 
      textAfterCursor

    setNewComment(newText)
    setShowMentionModal(false)
    setMentionSearch('')

    // 포커스 복귀
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = lastAtIndex + user.nickname.length + 2 // @ + 닉네임 + 공백
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  // 필터링된 유저 목록 (댓글 작성자들만)
  const filteredUsers = getCommentAuthors().filter(user =>
    user.nickname.toLowerCase().includes(mentionSearch.toLowerCase())
  )

  // 댓글 작성
  const handleCommentSubmit = async () => {
    if (!loggedIn) {
      window.alert('로그인이 필요합니다.')
      navigate('/login', { state: { from: `/community/${postId}` } })
      return
    }

    if (!newComment.trim()) {
      window.alert('댓글 내용을 입력해주세요.')
      return
    }

    if (newComment.length > MAX_COMMENT_LENGTH) {
      window.alert(`댓글은 최대 ${MAX_COMMENT_LENGTH}자까지 작성 가능합니다.`)
      return
    }

    try {
      setIsSubmitting(true)
      setIsSubmitClicked(true)
      await createCommunityComment(Number(postId), { content: newComment })

      // 댓글 목록 새로고침
      const commentData = await getCommunityComments(Number(postId))
      setComments(commentData.results || [])

      // 게시글 정보도 업데이트 (댓글 개수 반영)
      const postData = await getCommunityPostDetail(Number(postId))
      setPost(postData)

      setNewComment('')
      window.alert('댓글이 등록되었습니다.')

      setTimeout(() => setIsSubmitClicked(false), 200)
    } catch (err) {
      console.error('댓글 작성 실패:', err)
      window.alert('댓글 작성에 실패했습니다.')
      setIsSubmitClicked(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 댓글 삭제
  const handleDeleteComment = async (commentId: number) => {
    try {
      setComments(prev => prev.filter(c => c.id !== commentId))

      if (post) {
        setPost({ ...post, comment_count: post.comment_count - 1 })
      }

      setDeleteCommentId(null)
      window.alert('댓글이 삭제되었습니다.')
    } catch (err) {
      console.error('댓글 삭제 실패:', err)
      window.alert('댓글 삭제에 실패했습니다.')
    }
  }

  // 댓글 정렬 토글
  const handleSortToggle = () => {
    setSortOrder((prev) => (prev === 'latest' ? 'oldest' : 'latest'))
  }

  // 정렬된 댓글 목록
  const sortedComments = [...comments].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime()
    const dateB = new Date(b.created_at).getTime()
    return sortOrder === 'latest' ? dateB - dateA : dateA - dateB
  })

  // 공유하기
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    window.alert('링크가 복사되었습니다.')
  }

  if (loading) return <div className="py-20 text-center">로딩 중...</div>
  if (error)
    return <div className="py-20 text-center text-red-500">{error}</div>
  if (!post) return <div className="py-20 text-center">게시글이 없습니다.</div>

  return (
    <div className="mx-auto max-w-[820px] px-4 py-12">
      {/* 카테고리 */}
      <span className="text-[20px] font-bold text-[#6201E0]">
        {post.category.name}
      </span>

      {/* 제목 + 작성자 */}
      <div className="mt-2 flex items-start justify-between">
        <h1 className="max-w-[700px] text-[32px] font-bold leading-tight text-[#121212]">
          {post.title}
        </h1>

        <div className="flex items-center gap-2 mt-6 self-start">
          <img
            src={post.author.profile_img_url || DEFAULT_AVATAR}
            className="h-10 w-10 rounded-full object-cover"
            alt={`${post.author.nickname} 프로필`}
            onError={(e) => {
              e.currentTarget.src = DEFAULT_AVATAR
            }}
          />
          <span className="text-[16px] font-medium text-[#4D4D4D]">
            {post.author.nickname}
          </span>
        </div>
      </div>

      {/* 메타 정보 */}
      <div className="mt-3 flex items-center gap-4 text-[16px] text-[#9D9D9D]">
        <span>조회수 {post.view_count.toLocaleString()}</span>
        <span>좋아요 {likeCount.toLocaleString()}</span>
        <span>{formatTimeAgo(post.created_at)}</span>
      </div>

      {/* 구분선 */}
      <div className="my-6 flex justify-center">
        <hr className="w-[944px] border-[#CECECE]" />
      </div>

      {/* 본문 */}
      <div className="whitespace-pre-wrap text-[16px] leading-relaxed text-[#121212]">
        {post.content}
      </div>

      {/* 좋아요 / 공유하기 */}
      <div className="mt-10 flex justify-end gap-3">
        <button
          className={`flex items-center gap-1 rounded-full border-2 px-4 py-2 text-[12px] transition-all ${isLiked
            ? 'border-[#6201E0] bg-[#F5EFFF] text-[#6201E0]'
            : 'border-[#CECECE] bg-white text-[#707070]'
            }`}
          onClick={handleLikeToggle}
        >
          <img
            src="/icons/thumbs-up.svg"
            className="h-4 w-4"
            alt="좋아요"
            style={{
              filter: isLiked
                ? 'invert(21%) sepia(100%) saturate(6534%) hue-rotate(268deg) brightness(91%) contrast(117%)'
                : 'none'
            }}
          />
          {likeCount.toLocaleString()}
        </button>

        <button
          className="flex items-center gap-1 rounded-full border px-4 py-2 text-[12px] text-[#707070] border-[#CECECE] hover:bg-gray-50"
          onClick={handleShare}
        >
          <img src="/icons/link.svg" className="h-4 w-4" alt="공유" />
          공유하기
        </button>
      </div>

      {/* 구분선 */}
      <div className="my-8 flex justify-center">
        <hr className="w-[944px] border-[#CECECE]" />
      </div>

      {/* 댓글 작성 영역 - 로그인한 경우만 표시 */}
      {loggedIn && (
        <div className="mb-6 flex justify-center">
          <div className="relative w-[944px] h-[120px] rounded-[12px] border border-[#CECECE] bg-white p-4 focus-within:border-[#6201E0] transition-colors">
            {/* 멘션 모달 - textarea 안에 위치 */}
            {showMentionModal && filteredUsers.length > 0 && (
              <div
                ref={mentionModalRef}
                className="absolute bottom-full mb-2 left-0 z-50 w-[300px] max-h-[200px] overflow-y-auto bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-[#E5E5E5]"
              >
                {filteredUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectMention(user)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F5EFFF] transition-colors text-left border-b border-[#F5F5F5] last:border-b-0"
                  >
                    <img
                      src={user.profile_img_url || DEFAULT_AVATAR}
                      className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                      alt={user.nickname}
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_AVATAR
                      }}
                    />
                    <span className="text-[14px] font-medium text-[#121212]">
                      {user.nickname}
                    </span>
                  </button>
                ))}
              </div>
            )}
            
            <textarea
              ref={textareaRef}
              className="w-full h-[60px] resize-none bg-transparent text-[16px] text-[#121212] placeholder-[#CECECE] focus:outline-none"
              placeholder="개인정보를 공유 및 요청하거나, 명예 회손, 무단 광고, 불법 정보 유포시 모니터링 후 삭제될 수 있습니다."
              value={newComment}
              onChange={handleCommentChange}
              maxLength={MAX_COMMENT_LENGTH}
            />
            <div className="absolute bottom-4 right-4 flex items-center gap-3">
              <span className="text-[14px] text-[#9D9D9D]">
                {newComment.length}/{MAX_COMMENT_LENGTH}
              </span>
              <button
                onClick={handleCommentSubmit}
                disabled={!newComment.trim() || isSubmitting}
                className={`
                rounded-full px-5 py-1.5 text-[16px] font-medium transition-all
                ${!newComment.trim() || isSubmitting
                    ? 'bg-[#E5E5E5] text-[#9D9D9D] cursor-not-allowed'
                    : 'bg-[#EFE6FC] text-[#6201E0] border-2 border-[#6201E0] hover:bg-[#DED3F5] active:scale-95'
                  }
              `}
              >
                {isSubmitting ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 댓글 헤더 */}
      <div className="mb-8 flex justify-center">
        <div className="w-[944px] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[20px] font-bold text-[#121212]">
            <img src="/icons/message-circle.svg" className="h-5 w-5" alt="댓글" />
            댓글 {post.comment_count}개
          </div>

          <button
            className="flex items-center gap-1 text-[16px] text-[#4D4D4D] hover:text-[#6201E0]"
            onClick={handleSortToggle}
          >
            {sortOrder === 'latest' ? '최신순' : '오래된 순'}
            <img
              src="/icons/swap-vertical-outline.svg"
              className="h-4 w-4"
              alt="정렬"
            />
          </button>
        </div>
      </div>

      {/* 댓글 리스트 */}
      <div className="flex justify-center">
        <ul className="w-[944px]">
          {sortedComments.length === 0 ? (
            <li className="py-10 text-center text-[#9D9D9D]">
              첫 댓글을 남겨보세요!
            </li>
          ) : (
            sortedComments.map((comment, index) => (
              <li key={comment.id} className="relative flex gap-3 py-6">
                {/* 댓글 구분선 */}
                {index !== 0 && (
                  <span className="absolute left-0 right-0 top-0 border-t border-[#E5E5E5]" />
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-medium text-[#121212]">
                      {comment.author.nickname}
                    </span>
                    <span className="text-[16px] text-[#9D9D9D]">
                      {formatTimeAgo(comment.created_at)}
                    </span>
                    {/* 삭제 버튼 - 로그인한 경우 표시 (임시) */}
                    {loggedIn && (
                      <>
                        <span className="text-[16px] text-[#9D9D9D]">|</span>
                        <button
                          onClick={() => setDeleteCommentId(comment.id)}
                          className="text-[16px] text-[#6201E0] hover:underline"
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </div>

                  <p className="mt-1 break-words text-[16px] text-[#4D4D4D]">
                    {comment.content}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* 댓글 삭제 확인 팝업 */}
      {deleteCommentId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="w-[428px] h-[165px] rounded-[24px] bg-white p-10 shadow-xl border border-[#E5E5E5] flex flex-col">
            <h2 className="text-left text-[16px] font-regular text-[#303030]">
              댓글을 삭제하시겠습니까?
            </h2>

            <div className="flex justify-end gap-3 mt-auto -mb-4">
              <button
                onClick={() => setDeleteCommentId(null)}
                className="
                  w-[76px] h-[42px]
                  rounded-full
                  bg-[#EFE6FC]
                  text-[16px] font-medium text-[#4E01B3]
                  flex items-center justify-center
                  hover:bg-[#E1D2FA]
                  transition-colors
                "
              >
                취소
              </button>
              <button
                onClick={() => handleDeleteComment(deleteCommentId)}
                className="
                  w-[76px] h-[42px]
                  rounded-full
                  bg-[#6201E0]
                  text-[16px] font-medium text-white
                  flex items-center justify-center
                  hover:bg-[#5200BE]
                  transition-colors
                "
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}