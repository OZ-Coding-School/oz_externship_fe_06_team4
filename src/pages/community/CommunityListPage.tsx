import { useMemo, useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import CommunityListItem from '../../components/community/list/CommunityListItem'
import CommunitySearchBar from '../../components/community/list/CommunitySearchBar'
import { communityApi } from '../../api/api'
import type {
  CommunityCategory,
  CommunityPostListItem,
  SearchFilterOption,
} from '../../types'

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

/** 페이지네이션 아이콘들  */
function PageDoubleLeftIcon({ disabled }: { disabled?: boolean }) {
  const stroke = disabled ? '#BDBDBD' : '#4D4D4D'
  return (
    <div className="flex items-center">
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M11.5 16L5.5 10L11.5 4"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <svg
        className="-ml-[10px]"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M13 16L7 10L13 4"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
function PageLeftIcon({ disabled }: { disabled?: boolean }) {
  const stroke = disabled ? '#BDBDBD' : '#4D4D4D'
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13 16L7 10L13 4"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
function PageRightIcon({ disabled }: { disabled?: boolean }) {
  const stroke = disabled ? '#BDBDBD' : '#4D4D4D'
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7 16L13 10L7 4"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
function PageDoubleRightIcon({ disabled }: { disabled?: boolean }) {
  const stroke = disabled ? '#BDBDBD' : '#4D4D4D'
  return (
    <div className="flex items-center">
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M7 16L13 10L7 4"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <svg
        className="-ml-[10px]"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5.5 16L11.5 10L5.5 4"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
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
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(6)
  const [page, setPage] = useState(1)

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

  const { data: postsPage, isLoading } = useQuery({
    queryKey: [
      'community',
      'posts',
      { page, selectedCategoryId, keyword, filter, sortKey },
    ],
    queryFn: async () => {
      const params = {
        page,
        page_size: 10,
        search: keyword.trim() ? keyword.trim() : undefined,
        search_filter: keyword.trim() ? filter : undefined,
        category_id:
          selectedCategoryId === ALL_CATEGORY_ID
            ? undefined
            : selectedCategoryId,
        sort: SORT_PARAM[sortKey],
      }
      return (await communityApi.getPosts(
        params as any
      )) as PaginatedResponse<CommunityPostListItem>
    },
  })

  const posts = postsPage?.results ?? []
  const totalCount = postsPage?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / 10))

  const onSubmitSearch = () => setPage(1)
  const onClickWrite = () => alert('글쓰기(추후 라우팅 연결)')

  const blockStart = Math.floor((page - 1) / 10) * 10 + 1
  const blockEnd = Math.min(blockStart + 9, totalPages)
  const pages = Array.from(
    { length: blockEnd - blockStart + 1 },
    (_, i) => blockStart + i
  )

  const isFirstPage = page <= 1
  const isLastPage = page >= totalPages
  const isFirstBlock = blockStart === 1
  const isLastBlock = blockEnd === totalPages

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
                    setPage(1)
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
                        setPage(1)
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

        <div className="mt-[10px]">
          {isLoading ? (
            <div className="px-[24px] py-[24px] text-[14px] text-[#777777]">
              불러오는 중...
            </div>
          ) : posts.length === 0 ? (
            <div className="px-[24px] py-[24px] text-[14px] text-[#777777]">
              게시글이 없습니다.
            </div>
          ) : (
            posts.map((item) => (
              <CommunityListItem
                key={item.id}
                item={item}
                categoryName={
                  categoryNameById.get(item.category_id) ?? '카테고리'
                }
              />
            ))
          )}
        </div>

        <div className="mt-[18px] flex h-[85px] w-full items-center justify-center gap-[12px]">
          <button
            type="button"
            onClick={() => setPage(1)}
            disabled={isFirstBlock}
            className="flex h-[32px] items-center justify-center"
            aria-label="처음 페이지"
          >
            <PageDoubleLeftIcon disabled={isFirstBlock} />
          </button>

          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={isFirstPage}
            className="flex h-[32px] items-center justify-center"
            aria-label="이전 페이지"
          >
            <PageLeftIcon disabled={isFirstPage} />
          </button>

          <div className="flex items-center gap-[20px]">
            {pages.map((p) => {
              const active = p === page
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={
                    active
                      ? 'flex h-[32px] w-[32px] items-center justify-center rounded-[10px] bg-[#6D28D9] text-[14px] font-semibold text-white'
                      : 'flex h-[32px] w-[32px] items-center justify-center rounded-[10px] text-[14px] text-[#BDBDBD] hover:bg-[#EEE6FF] hover:text-[#6D28D9]'
                  }
                  aria-current={active ? 'page' : undefined}
                >
                  {p}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={isLastPage}
            className="flex h-[32px] items-center justify-center"
            aria-label="다음 페이지"
          >
            <PageRightIcon disabled={isLastPage} />
          </button>

          <button
            type="button"
            onClick={() => setPage(totalPages)}
            disabled={isLastBlock}
            className="flex h-[32px] items-center justify-center"
            aria-label="마지막 페이지"
          >
            <PageDoubleRightIcon disabled={isLastBlock} />
          </button>
        </div>
      </div>
    </div>
  )
}
