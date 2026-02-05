import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  getCommunityPostDetail,
  getCommunityComments,
  createCommunityComment,
  deleteCommunityComment,
  likeCommunityPost,
  unlikeCommunityPost,
  deleteCommunityPost,
  isLoggedIn,
  getCurrentUser,
} from './../../api/api'
import { useInfiniteScroll } from './../../hooks'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import type { CommunityPostDetail, CommunityComment } from './../../types'

const DEFAULT_AVATAR = '/icons/profile.svg'
const MAX_COMMENT_LENGTH = 500
const COMMENTS_PER_PAGE = 10

// 로딩 애니메이션 컴포넌트
const LoadingDots = () => {
  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -10 }
  }

  const containerVariants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.2
      }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="flex items-center justify-center gap-2"
    >
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          variants={dotVariants}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
          className="w-3 h-3 rounded-full bg-[#6201E0]"
        />
      ))}
    </motion.div>
  )
}

export default function CommunityDetailPage() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const [post, setPost] = useState<CommunityPostDetail | null>(null)
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 목록에서 전달받은 썸네일 URL
  const thumbnailFromList = location.state?.thumbnail_img_url || null

  // 로그인 상태 및 현재 사용자 정보
  const loggedIn = isLoggedIn()
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  // 현재 로그인한 사용자가 게시글 작성자인지 확인 (currentUserId와 post.author.id 비교)
  const isAuthor = loggedIn && currentUserId !== null && post !== null && Number(post.author.id) === Number(currentUserId)

  // 무한 스크롤
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // 무한 스크롤 커스텀 훅 적용
  const observerRef = useInfiniteScroll({
    onIntersect: () => loadMoreComments(),
    enabled: hasMore,
    isLoading: isLoadingMore,
  })

  // 댓글 작성
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 좋아요 상태
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)

  // 댓글 정렬
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest')
  const [showSortModal, setShowSortModal] = useState(false)
  const sortButtonRef = useRef<HTMLButtonElement>(null)
  const sortModalRef = useRef<HTMLDivElement>(null)

  // 댓글 삭제 팝업
  const [deleteCommentId, setDeleteCommentId] = useState<number | null>(null)

  // 게시글 삭제 모달
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 멘션 기능
  const [showMentionModal, setShowMentionModal] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mentionModalRef = useRef<HTMLDivElement>(null)

  // 실시간 시간 업데이트
  const [currentTime, setCurrentTime] = useState(Date.now())

  // 1분마다 시간 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  // 현재 로그인한 사용자 정보 가져오기 (API 호출)
  useEffect(() => {
    async function fetchCurrentUser() {
      if (loggedIn) {
        try {
          const userData = await getCurrentUser()
          setCurrentUserId(userData.id)
        } catch (err) {
          console.error('사용자 정보 조회 실패:', err)
          setCurrentUserId(null)
        }
      } else {
        setCurrentUserId(null)
      }
    }
    fetchCurrentUser()
  }, [loggedIn])

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

  // 정렬 모달 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sortModalRef.current &&
        !sortModalRef.current.contains(event.target as Node) &&
        sortButtonRef.current &&
        !sortButtonRef.current.contains(event.target as Node)
      ) {
        setShowSortModal(false)
      }
    }

    if (showSortModal) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSortModal])

  // 초기 데이터 로드
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

        // 1. 게시글 상세 조회 (필수)
        const postData = await getCommunityPostDetail(Number(postId))
        setPost(postData)
        setIsLiked(postData.is_liked || false)
        setLikeCount(postData.like_count || 0)

        // 2. 댓글 목록 조회 (선택 - 실패해도 게시글은 보여줌)
        try {
          const commentData = await getCommunityComments(Number(postId), {
            page: 1,
            page_size: COMMENTS_PER_PAGE
          })
          setComments(commentData.results || [])
          setHasMore(commentData.next !== null)
        } catch (commentErr) {
          console.error('댓글 로딩 실패 (무시됨):', commentErr)
          setComments([])
          setHasMore(false)
        }

        setPage(1)
      } catch (err) {
        console.error('게시글 데이터 로딩 실패:', err)
        setError('게시글을 불러오는데 실패했습니다.')
        setPost(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [postId])

  // 추가 댓글 로드
  const loadMoreComments = async () => {
    if (isLoadingMore || !hasMore || !postId) return

    try {
      setIsLoadingMore(true)
      const nextPage = page + 1

      const commentData = await getCommunityComments(Number(postId), {
        page: nextPage,
        page_size: COMMENTS_PER_PAGE
      })

      setComments(prev => [...prev, ...(commentData.results || [])])
      setHasMore(commentData.next !== null)
      setPage(nextPage)
    } catch (err) {
      console.error('댓글 로드 실패:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }

  // 댓글 작성자들로부터 유저 목록 추출
  const getCommentAuthors = () => {
    const authors = new Map()

    if (post) {
      authors.set(post.author.id, {
        id: post.author.id,
        nickname: post.author.nickname,
        profile_img_url: post.author.profile_img_url
      })
    }

    comments.forEach(comment => {
      if (!authors.has(comment.author.id)) {
        authors.set(comment.author.id, {
          id: comment.author.id,
          nickname: comment.author.nickname,
          profile_img_url: comment.author.profile_img_url
        })
      }

      const commentWithTags = comment as CommunityComment & {
        tagged_users?: Array<{ id: number; nickname: string }>
      }
      if (commentWithTags.tagged_users && commentWithTags.tagged_users.length > 0) {
        commentWithTags.tagged_users.forEach(taggedUser => {
          if (!authors.has(taggedUser.id)) {
            authors.set(taggedUser.id, {
              id: taggedUser.id,
              nickname: taggedUser.nickname,
              profile_img_url: null
            })
          }
        })
      }
    })

    return Array.from(authors.values())
  }

  // 시간 표시 포맷팅
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

  // 댓글 입력 처리
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart

    setNewComment(value)
    setCursorPosition(cursorPos)

    const textBeforeCursor = value.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)

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

    const newText =
      textBeforeCursor.slice(0, lastAtIndex) +
      `@${user.nickname} ` +
      textAfterCursor

    setNewComment(newText)
    setShowMentionModal(false)
    setMentionSearch('')

    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = lastAtIndex + user.nickname.length + 2
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  // 필터링된 유저 목록
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
      await createCommunityComment(Number(postId), { content: newComment })

      // 첫 페이지만 새로고침
      const commentData = await getCommunityComments(Number(postId), {
        page: 1,
        page_size: COMMENTS_PER_PAGE
      })
      setComments(commentData.results || [])
      setHasMore(commentData.next !== null)
      setPage(1)

      const postData = await getCommunityPostDetail(Number(postId))
      setPost(postData)

      setNewComment('')
      window.alert('댓글이 등록되었습니다.')

    } catch (err) {
      console.error('댓글 작성 실패:', err)
      window.alert('댓글 작성에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 댓글 삭제
  const handleDeleteComment = async (commentId: number) => {
    if (!postId) return

    try {
      // API 호출로 실제 댓글 삭제 (postId와 commentId 모두 필요)
      await deleteCommunityComment(Number(postId), commentId)

      // 프론트엔드 상태 업데이트
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
    setShowSortModal(!showSortModal)
  }

  // 정렬 옵션 선택
  const handleSortSelect = (order: 'latest' | 'oldest') => {
    setSortOrder(order)
    setShowSortModal(false)
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

  // 게시글 삭제
  const handleDeletePost = async () => {
    if (!postId) return

    try {
      setIsDeleting(true)
      await deleteCommunityPost(Number(postId))
      
      setShowDeleteModal(false)
      window.alert('게시글이 삭제되었습니다.')
      navigate('/community')
    } catch (err) {
      console.error('게시글 삭제 실패:', err)
      window.alert('게시글 삭제에 실패했습니다.')
      setIsDeleting(false)
    }
  }

  if (loading) return <LoadingDots />
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

        <div className="flex flex-col items-end gap-2 ">
          {/* 프로필 이미지 + 닉네임 (가로 배치) */}
          <div className="flex items-center gap-2">
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
      </div>

      {/* 메타 정보 */}
      <div className="mt-8 flex items-center justify-between">
        <div className="flex items-center gap-4 text-[16px] text-[#9D9D9D]">
          <span>조회수 {post.view_count.toLocaleString()}</span>
          <span>좋아요 {likeCount.toLocaleString()}</span>
          <span>{formatTimeAgo(post.created_at)}</span>
        </div>

        {/* 작성자 본인이고 로그인한 경우에만 수정/삭제 버튼 표시 */}
        {loggedIn && isAuthor && (
          <div className="flex items-center gap-2 text-[16px] text-[#9D9D9D]">
            <button
              onClick={() => navigate(`/community/${postId}/edit`)}
              className="hover:text-[#6201E0]"
            >
              수정
            </button>
            <span>|</span>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="hover:text-[#6201E0]"
            >
              삭제
            </button>
          </div>
        )}
      </div>

      {/* 구분선 */}
      <div className="my-6 flex justify-center">
        <hr className="w-[944px] border-[#CECECE]" />
      </div>

      {/* 썸네일 이미지 */}
      {thumbnailFromList && thumbnailFromList.trim() !== '' && (
        <div className="mb-6 flex justify-center">
          <div className="w-full max-w-[944px] overflow-hidden rounded-[12px]">
            <img
              src={thumbnailFromList}
              alt={post.title}
              className="w-full h-auto object-cover"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        </div>
      )}

      {/* 본문 (Markdown Rendering) */}
      <div className="prose prose-sm max-w-none text-[16px] leading-relaxed text-[#121212] font-['Pretendard']">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            h1: ({ node, ...props }) => <h1 className="text-2xl font-bold my-4 border-b pb-2" {...props} />,
            h2: ({ node, ...props }) => <h2 className="text-xl font-bold my-3" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-lg font-bold my-2" {...props} />,
            p: ({ node, ...props }) => <p className="mb-4 whitespace-pre-wrap" {...props} />,
            ul: ({ node, ...props }) => <ul className="list-disc ml-6 mb-4" {...props} />,
            ol: ({ node, ...props }) => <ol className="list-decimal ml-6 mb-4" {...props} />,
            blockquote: ({ node, ...props }) => (
              <blockquote className="border-l-4 border-gray-200 pl-4 py-1 my-4 italic bg-gray-50" {...props} />
            ),
            img: ({ node, ...props }) => {
              if (!props.src || props.src.trim() === '') return null
              return <img className="max-w-full h-auto my-4 rounded shadow-md" {...props} />
            },
            a: ({ node, ...props }) => (
              <a className="text-[#6201E0] hover:underline transition-colors" target="_blank" rel="noopener noreferrer" {...props} />
            ),
          }}
        >
          {post.content}
        </ReactMarkdown>
      </div>

      {/* 좋아요 / 공유하기 */}
      <div className="mt-10 flex justify-end gap-3">
        <button
          className={`flex items-center gap-1 rounded-full border px-4 py-2 text-[12px] transition-all ${isLiked
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

      {/* 댓글 작성 영역 */}
      {loggedIn && (
        <div className="mb-6 flex justify-center">
          <div className="relative w-[944px] h-[120px] rounded-[12px] border border-[#CECECE] bg-white p-4 focus-within:border-[#6201E0] transition-colors">
            {/* 멘션 모달 */}
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
              className="w-full h-[60px] resize-none bg-transparent text-[16px] text-[#121212] placeholder-[#CECECE] focus:outline-none scrollbar-hide overflow-y-auto"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
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
                    ? 'bg-[#ECECEC] text-[#4D4D4D] border border-[#CECECE] cursor-not-allowed'
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

          <div className="relative">
            <button
              ref={sortButtonRef}
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

            {/* 정렬 모달 */}
            {showSortModal && (
              <div
                ref={sortModalRef}
                className="absolute top-full right-0 mt-2 w-[160px] bg-white rounded-[12px] shadow-lg border border-[#E5E5E5] overflow-hidden z-50"
              >
                <button
                  onClick={() => handleSortSelect('latest')}
                  className={`w-full px-4 py-3 text-left text-[16px] transition-colors ${sortOrder === 'latest'
                    ? 'bg-[#F5EFFF] text-[#6201E0] font-medium'
                    : 'text-[#4D4D4D] hover:bg-[#F9F9F9]'
                    }`}
                >
                  최신순
                </button>
                <button
                  onClick={() => handleSortSelect('oldest')}
                  className={`w-full px-4 py-3 text-left text-[16px] transition-colors ${sortOrder === 'oldest'
                    ? 'bg-[#F5EFFF] text-[#6201E0] font-medium'
                    : 'text-[#4D4D4D] hover:bg-[#F9F9F9]'
                    }`}
                >
                  오래된 순
                </button>
              </div>
            )}
          </div>
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
            <>
              {sortedComments.map((comment, index) => (
                <li key={comment.id} className="relative flex gap-3 py-6">
                  {index !== 0 && (
                    <span className="absolute left-0 right-0 top-0 border-t border-[#E5E5E5]" />
                  )}

                  <img
                    src={comment.author.profile_img_url || DEFAULT_AVATAR}
                    className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
                    alt={`${comment.author.nickname} 프로필`}
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_AVATAR
                    }}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[16px] font-medium text-[#121212]">
                        {comment.author.nickname}
                      </span>
                      <span className="text-[16px] text-[#9D9D9D]">
                        {formatTimeAgo(comment.created_at)}
                      </span>
                      
                      {loggedIn && Number(currentUserId) === Number(comment.author.id) && (
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
              ))}

              {/* 무한 스크롤 트리거 */}
              {hasMore && (
                <div ref={observerRef} className="py-8 text-center">
                  {isLoadingMore && <LoadingDots />}
                </div>
              )}
            </>
          )}
        </ul>
      </div>

      {/* 댓글 삭제 확인 팝업 */}
      {deleteCommentId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent">
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

      {/* 게시글 삭제 확인 팝업 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(18, 18, 18, 0.7)' }}>
          <div className="w-[428px] h-[182px] rounded-[24px] bg-white px-8 pt-8 pb-6 shadow-xl flex flex-col justify-between">
            <h2 className="text-left text-[16px] font-regular text-[#121212] leading-relaxed">
              삭제된 내용은 복구할 수 없습니다.<br />
              정말로 삭제하시겠습니까?
            </h2>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="
                  w-[76px] h-[43px]
                  rounded-full
                  bg-[#EFE6FC]
                  text-[16px] font-semibold text-[#6201E0]
                  flex items-center justify-center
                  hover:bg-[#E1D2FA]
                  transition-colors
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                "
              >
                취소
              </button>
              <button
                onClick={handleDeletePost}
                disabled={isDeleting}
                className="
                  w-[76px] h-[43px]
                  rounded-full
                  bg-[#6201E0]
                  text-[16px] font-semibold text-white
                  flex items-center justify-center
                  hover:bg-[#5200BE]
                  transition-colors
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                "
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
