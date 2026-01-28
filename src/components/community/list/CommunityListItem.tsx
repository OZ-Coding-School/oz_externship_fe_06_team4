
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CommunityPostListItem } from '../../../types'
import { formatRelativeTime } from '../../../utils/community'

type Props = {
  item: CommunityPostListItem
  categoryName: string
}

function LikeThumbIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.83317 18.3337H3.33317C2.89114 18.3337 2.46722 18.1581 2.15466 17.8455C1.8421 17.5329 1.6665 17.109 1.6665 16.667V10.8337C1.6665 10.3916 1.8421 9.96771 2.15466 9.65515C2.46722 9.34259 2.89114 9.16699 3.33317 9.16699H5.83317M11.6665 7.50033V4.16699C11.6665 3.50395 11.4031 2.86807 10.9343 2.39923C10.4654 1.93038 9.82954 1.66699 9.1665 1.66699L5.83317 9.16699V18.3337H15.2332C15.6351 18.3382 16.0252 18.1973 16.3314 17.937C16.6377 17.6767 16.8396 17.3144 16.8998 16.917L18.0498 9.41699C18.0861 9.17812 18.07 8.93423 18.0026 8.7022C17.9353 8.47018 17.8183 8.25557 17.6597 8.07325C17.5012 7.89094 17.3049 7.74527 17.0845 7.64634C16.8641 7.54741 16.6248 7.49759 16.3832 7.50033H11.6665Z"
        stroke="#707070"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
export default function CommunityListItem({ item, categoryName }: Props) {
  const nav = useNavigate()
  const timeText = useMemo(
    () => formatRelativeTime(item.created_at),
    [item.created_at]
  )
  const hasThumb = Boolean(item.thumbnail_img_url)

  return (
    <button
      type="button"
      onClick={() => nav(`/community/${item.id}`)}
      className="w-full text-left"
    >
      <div className="flex w-full items-start justify-between gap-[8px] px-[24px] py-[32px]">
        {/* 왼쪽 텍스트 */}
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-medium text-[#8A8A8A]">
            {categoryName}
          </div>

          <div className="mt-[10px] text-[18px] leading-[28px] font-bold text-[#111111]">
            {item.title}
          </div>

          <div className="mt-[10px] line-clamp-2 text-[14px] leading-[22px] text-[#8A8A8A]">
            {item.content_preview}
          </div>

          {/* 하단 메타 */}
          <div className="mt-[54px] flex items-center justify-between">
            <div className="flex items-center gap-[14px] text-[12px] text-[#8A8A8A]">
              <span className="inline-flex items-center gap-[6px]">
                <LikeThumbIcon />
                <span>좋아요 {item.like_count}</span>
              </span>
              <span className="inline-flex items-center gap-[6px]">
                <span>댓글 {item.comment_count}</span>
              </span>
              <span className="inline-flex items-center gap-[6px]">
                <span>조회수 {item.view_count}</span>
              </span>
            </div>

            <div className="flex items-center gap-[10px] text-[12px] text-[#8A8A8A]">
              <div className="h-[24px] w-[24px] overflow-hidden rounded-full bg-[#EDEDED]" />
              <div className="flex items-center gap-[8px]">
                <span className="text-[#6B6B6B]">{item.author.nickname}</span>
                <span className="text-[#B1B1B1]">{timeText}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽 썸네일 */}
        <div className="flex-shrink-0">
          {hasThumb ? (
            <div className="h-[116px] w-[164px] overflow-hidden rounded-[12px] bg-[#F2F2F2]">
              <img
                alt="thumbnail"
                src={item.thumbnail_img_url ?? ''}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="h-[116px] w-[164px] rounded-[12px] bg-[#F2F2F2]" />
          )}
        </div>
      </div>

      {/* 구분선 */}
      <div className="mx-[24px] h-[1px] bg-[#EDEDED]" />
    </button>
  )
}
