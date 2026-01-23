// src/utils/community.ts
export function formatRelativeTime(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()

  const sec = Math.floor(diff / 1000)
  if (sec < 60) return '방금 전'

  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}분 전`

  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}시간 전`

  const day = Math.floor(hour / 24)
  return `${day}일 전`
}
