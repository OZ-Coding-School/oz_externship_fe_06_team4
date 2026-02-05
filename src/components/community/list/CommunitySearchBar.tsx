
import { useEffect, useRef, useState } from 'react'
import type { SearchFilterOption } from '../../../types'
import { isLoggedIn } from '../../../api/api'

function WritePencilIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_1_796)">
        <path
          d="M18.4917 1.50855C18.2078 1.22592 17.8709 1.00232 17.5002 0.850679C17.1294 0.699038 16.7323 0.622358 16.3318 0.625069C15.9313 0.627782 15.5353 0.709832 15.1667 0.866479C14.7981 1.02313 14.4641 1.25127 14.1842 1.53772L2.10083 13.621L0.625 19.3752L6.37917 17.8994L18.4625 5.81605C18.7489 5.53611 18.9771 5.20218 19.1338 4.83354C19.2904 4.46492 19.3724 4.06891 19.3752 3.66839C19.3778 3.26786 19.3012 2.87078 19.1496 2.50006C18.9979 2.12935 18.7743 1.79235 18.4917 1.50855Z"
          stroke="#FAFAFA"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13.8379 1.88379L18.1162 6.16212"
          stroke="#FAFAFA"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12.0938 3.62793L16.3721 7.90626"
          stroke="#FAFAFA"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2.10059 13.6211L6.38309 17.8953"
          stroke="#FAFAFA"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_1_796">
          <rect width="20" height="20" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}

function DropdownChevron({ open }: { open: boolean }) {
  return (
    <div className={open ? 'rotate-180' : ''} aria-hidden="true">
      <svg
        width="14"
        height="8"
        viewBox="0 0 14 8"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12.75 0.750001L6.75 6.75L0.749999 0.750001"
          stroke="#707070"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

type Props = {
  filter: SearchFilterOption
  keyword: string
  onChangeFilter: (v: SearchFilterOption) => void
  onChangeKeyword: (v: string) => void
  onSubmit: () => void
  onClickWrite: () => void
}

const FILTER_ITEMS: Array<{ key: SearchFilterOption; label: string }> = [
  { key: 'title', label: '제목' },
  { key: 'content', label: '내용' },
  { key: 'nickname', label: '작성자' },
]

export default function CommunitySearchBar({
  filter,
  keyword,
  onChangeFilter,
  onChangeKeyword,
  onSubmit,
  onClickWrite,
}: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (filter === 'all') onChangeFilter('title')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!open) return
      const el = wrapRef.current
      if (!el) return
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [open])


  return (
    <div className="flex w-[944px] items-center justify-between">
      {/* 왼쪽: 검색유형 + 검색창 */}
      <div className="flex items-center gap-[12px]">
        {/* ✅ 검색유형(피그마: 버튼 + 드롭다운 패널) */}
        <div className="relative" ref={wrapRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-[40px] w-[132px] items-center justify-between border-0 bg-transparent px-[14px] text-[14px] text-[#979797] outline-none"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            {/* 닫혀있을 때는 '검색 유형'으로 보이게 */}
            <span>{open ? '검색 유형' : '검색 유형'}</span>
            <DropdownChevron open={open} />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute top-[44px] left-0 w-[140px] rounded-[16px] bg-white p-[10px] shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
            >
              {FILTER_ITEMS.map((item) => {
                const active = item.key === filter
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onChangeFilter(item.key)
                      setOpen(false)
                      onSubmit()
                    }}
                    className={[
                      'w-full rounded-[10px] px-[14px] py-[10px] text-left text-[14px] font-semibold',
                      active
                        ? 'bg-[#EEE6FF] text-[#6D28D9]'
                        : 'text-[#4D4D4D] hover:bg-[#F5F5F5]',
                    ].join(' ')}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/*  검색 입력 */}
        <div className="relative">
          <div className="pointer-events-none absolute top-1/2 left-[14px] -translate-y-1/2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 14.5C12.0376 14.5 14.5 12.0376 14.5 9C14.5 5.96243 12.0376 3.5 9 3.5C5.96243 3.5 3.5 5.96243 3.5 9C3.5 12.0376 5.96243 14.5 9 14.5Z"
                stroke="#9D9D9D"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16.5 16.5L13 13"
                stroke="#9D9D9D"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <input
            value={keyword}
            onChange={(e) => onChangeKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSubmit()
            }}
            placeholder="질문 검색"
            className="h-[40px] w-[520px] rounded-[1000px] border border-[#BDBDBD] bg-[#FAFAFA] pr-[16px] pl-[44px] text-[14px] text-[#111111] outline-none placeholder:text-[#B5B5B5]"
          />
        </div>
      </div>

      {/* 오른쪽: 글쓰기 - 로그인한 사용자에게만 표시 */}
      {isLoggedIn() && (
        <button
          type="button"
          onClick={onClickWrite}
          className="flex h-[40px] items-center justify-center gap-2 rounded-[6px] bg-[#6D28D9] px-[22px] text-[14px] font-semibold text-white hover:bg-[#5B21B6]"
        >
          <WritePencilIcon />
          글쓰기
        </button>
      )}
    </div>
  )
}
