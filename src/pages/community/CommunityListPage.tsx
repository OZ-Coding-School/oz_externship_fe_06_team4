import { useMemo, useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import CommunityListItem from '../../components/community/list/CommunityListItem'
import CommunitySearchBar from '../../components/community/list/CommunitySearchBar'
import { communityApi } from '../../api/api'
import { useInfiniteScroll } from '../../hooks'
import type {
  CommunityCategory,
  CommunityPostListItem,
  SearchFilterOption,
} from '../../types'

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

type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

function ChevronLeftIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M15 18L9 12L15 6"
        stroke="#0F172A"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
function ChevronRightIcon() {
  return (
    <div className="rotate-180">
      <ChevronLeftIcon />
    </div>
  )
}

const ALL_CATEGORY_ID = 0 as const

// 정렬 옵션(피그마 기준)
type SortKey = 'views' | 'likes' | 'comments' | 'latest' | 'oldest'

const SORT_LABEL: Record<SortKey, string> = {
  views: '조회순',
  likes: '좋아요 순',
  comments: '댓글 순',
  latest: '최신순',
  oldest: '오래된 순',
}

// 서버 파라미터 매핑(백/MSW에 맞춰 필요하면 값만 바꿔)
const SORT_PARAM: Record<SortKey, string> = {
  views: 'views',
  likes: 'likes',
  comments: 'comments',
  latest: 'latest',
  oldest: 'oldest',
}

export default function CommunityListPage() {
  const navigate = useNavigate()
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(6)
  
  // 무한 스크롤 상태
  const [posts, setPosts] = useState<CommunityPostListItem[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  
  const [filter, setFilter] = useState<SearchFilterOption>('title_or_content')
  const [keyword, setKeyword] = useState('')

  // 정렬
  const [sortKey, setSortKey] = useState<SortKey>('latest')
  const [sortOpen, setSortOpen] = useState(false)
  const sortWrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!sortOpen) return
      const el = sortWrapRef.current
      if (!el) return
      if (e.target instanceof Node && !el.contains(e.target)) {
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [sortOpen])

  const { data: categoriesRaw } = useQuery({
    queryKey: ['community', 'categories'],
    queryFn: communityApi.getCategories,
  })

  const categories: CommunityCategory[] = useMemo(() => {
    const server = categoriesRaw ?? []
    return [{ id: ALL_CATEGORY_ID, name: '전체' }, ...server]
  }, [categoriesRaw])

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>()
    categories.forEach((c) => map.set(c.id, c.name))
    return map
  }, [categories])

  // 데이터 로드 함수
  const fetchPosts = async (targetPage: number, isInitial = false) => {
    if (isLoading || (!hasMore && !isInitial)) return

    try {
      setIsLoading(true)
      if (isInitial) {
        setIsInitialLoading(true)
      }
      
      const params = {
        page: targetPage,
        page_size: 10,
        search: keyword.trim() ? keyword.trim() : undefined,
        search_filter: keyword.trim() ? filter : undefined,
        category_id:
          selectedCategoryId === ALL_CATEGORY_ID
            ? undefined
            : selectedCategoryId,
        sort: SORT_PARAM[sortKey],
      }

      // 최소 200ms 로딩 시간 보장 (초기 로딩 시)
      const [res] = await Promise.all([
        communityApi.getPosts(params as any) as Promise<PaginatedResponse<CommunityPostListItem>>,
        isInitial ? new Promise(resolve => setTimeout(resolve, 200)) : Promise.resolve()
      ])

      if (isInitial) {
        setPosts(res.results || [])
      } else {
        setPosts((prev) => [...prev, ...(res.results || [])])
      }

      setHasMore(res.next !== null)
      setPage(targetPage)
    } catch (err) {
      console.error('Failed to fetch posts:', err)
    } finally {
      setIsLoading(false)
      setIsInitialLoading(false)
    }
  }

  // 필터나 카테고리 변경 시 초기화
  useEffect(() => {
    fetchPosts(1, true)
  }, [selectedCategoryId, keyword, filter, sortKey])

  // 무한 스크롤 커스텀 훅 적용
  const observerRef = useInfiniteScroll({
    onIntersect: () => fetchPosts(page + 1),
    enabled: hasMore,
    isLoading: isLoading,
  })

  const onSubmitSearch = () => {
    // keyword 상태가 변경되었을 때 useEffect가 트리거되도록 처리
    // 이미 useEffect[keyword]가 있으므로 setKeyword('') -> setKeyword(val) 식이면 되지만
    // 여기서는 단순히 trigger를 위해 keyword 상태만 확인
  }
  
  const onClickWrite = () => navigate('/community/new')

  return (
    <div className="w-full bg-white">
      <div className="mx-auto w-[944px] pt-[56px]">
        <h1 className="text-[32px] font-bold text-[#111111]">커뮤니티</h1>

        <div className="mt-[20px]">
          <CommunitySearchBar
            filter={filter}
            keyword={keyword}
            onChangeFilter={(v) => setFilter(v)}
            onChangeKeyword={(v) => setKeyword(v)}
            onSubmit={onSubmitSearch}
            onClickWrite={onClickWrite}
          />
        </div>

        {/* 카테고리 탭 + 정렬 */}
        <div className="mt-[60px] flex items-center justify-between">
          <div className="flex items-center gap-[14px] text-[14px] text-[#111111]">
            <button
              type="button"
              className="flex h-[24px] w-[24px] items-center justify-center text-[#6B6B6B] hover:text-[#111111]"
              onClick={() => {}}
              aria-label="이전 카테고리"
            >
              <ChevronLeftIcon />
            </button>

            {categories.map((c) => {
              const active = c.id === selectedCategoryId
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(c.id)
                  }}
                  className={[
                    'px-[10px] py-[6px]',
                    active
                      ? 'rounded-[6px] bg-[#EEE6FF] font-semibold text-[#6D28D9]'
                      : 'text-[#111111] hover:text-[#5A00FF]',
                  ].join(' ')}
                >
                  {c.name}
                </button>
              )
            })}

            <button
              type="button"
              className="flex h-[24px] w-[24px] items-center justify-center text-[#6B6B6B] hover:text-[#111111]"
              onClick={() => {}}
              aria-label="다음 카테고리"
            >
              <ChevronRightIcon />
            </button>
          </div>

          <div className="relative" ref={sortWrapRef}>
            <button
              type="button"
              className="flex items-center gap-[8px] text-[14px] text-[#6B6B6B]"
              onClick={() => setSortOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={sortOpen}
            >
              {SORT_LABEL[sortKey]}
              <img
                src="/icons/swap-vertical-outline.svg"
                alt=""
                aria-hidden="true"
                className="h-[16px] w-[16px]"
              />
            </button>

            {sortOpen && (
              <div
                role="menu"
                className="absolute top-[34px] right-0 w-[160px] rounded-[20px] bg-white p-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
              >
                {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => {
                  const active = k === sortKey
                  return (
                    <button
                      key={k}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setSortKey(k)
                        setSortOpen(false)
                      }}
                      className={[
                        'w-full rounded-[10px] px-[14px] py-[10px] text-left text-[16px] font-semibold',
                        active
                          ? 'bg-[#EEE6FF] text-[#6D28D9]'
                          : 'text-[#4D4D4D] hover:bg-[#F5F5F5]',
                      ].join(' ')}
                    >
                      {SORT_LABEL[k]}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-[16px] h-[1px] w-full bg-[#DCDCDC]" />

        <div className="mt-[10px] pb-20">
          {isInitialLoading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingDots />
            </div>
          ) : posts.length === 0 ? (
            <div className="px-[24px] py-[24px] text-[14px] text-[#777777]">
              게시글이 없습니다.
            </div>
          ) : (
            <>
              {posts.map((item) => (
                <CommunityListItem
                  key={item.id}
                  item={item}
                  categoryName={
                    categoryNameById.get(item.category_id) ?? '카테고리'
                  }
                />
              ))}
              
              {/* 무한 스크롤 트리거 */}
              {hasMore && (
                <div ref={observerRef} className="py-10 text-center">
                  {isLoading && <LoadingDots />}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

