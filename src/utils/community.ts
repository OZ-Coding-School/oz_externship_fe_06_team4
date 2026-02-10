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

/**
 * 마크다운 및 HTML 태그를 제거하여 순수 텍스트만 추출합니다.
 */
export function stripMarkdown(text: string): string {
  if (!text) return ''

  // 1. HTML 엔티티 변환
  let s = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')

  // 2. 완성된 HTML 태그 반복적 제거 (중첩 태그 대응)
  let prevS = ''
  while (s !== prevS) {
    prevS = s
    s = s.replace(/<[^>]*>/g, '')
  }

  // 3. 마지막에 잘린 HTML 태그 제거 (보수적으로)
  const lastLt = s.lastIndexOf('<')
  if (lastLt !== -1 && s.indexOf('>', lastLt) === -1) {
    const trailing = s.slice(lastLt)
    if (!/[\uAC00-\uD7A3]/.test(trailing) && trailing.length < 40) {
      s = s.slice(0, lastLt)
    }
  }

  // 4. 마크다운 기호 제거
  s = s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // 이미지 -> alt
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 링크 -> text
    .replace(/(\*\*\*|\*\*|\*|___|__|_)((?:(?!\1).)+)\1/g, '$2') // 볼드/이탤릭 
    .replace(/~~((?:(?!~~).)+)~~/g, '$1') // 취소선
    .replace(/`{1,3}((?:(?!`).)+)\1/gs, '$1') // 코드

  // 5. 공백 및 특수 기호 정리
  s = s
    .replace(/^[#>\-\+\*\s]+/gm, '') // 줄 시작 마크다운 기호
    .replace(/\s+/g, ' ')
    .trim()

  // 6. 안전장치
  if (!s && text.trim()) {
    return text.replace(/<[^>]*>?/g, '').replace(/[*_~`#>-]/g, '').slice(0, 100).trim()
  }

  return s
}

/**
 * 마크다운 텍스트에서 첫 번째 이미지 URL 추출
 */
export function extractFirstImageUrl(markdown: string): string | null {
  if (!markdown) return null

  // 1. 마크다운 이미지 형식: ![alt](url)
  const markdownImageRegex = /!\[.*?\]\((.*?)\)/
  const markdownMatch = markdown.match(markdownImageRegex)
  
  if (markdownMatch && markdownMatch[1]) {
    return markdownMatch[1].trim()
  }
  
  // 2. HTML img 태그: <img src="url" ...> 또는 <img ... src="url" ...>
  const imgSrcRegex = /<img[^>]+src=["']([^"']+)["']/i
  const imgMatch = markdown.match(imgSrcRegex)
  
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1].trim()
  }
  
  // 3. HTML img 태그 (작은따옴표 없이): <img src=url>
  const imgSrcNoQuoteRegex = /<img[^>]+src=([^\s>]+)/i
  const imgNoQuoteMatch = markdown.match(imgSrcNoQuoteRegex)
  
  if (imgNoQuoteMatch && imgNoQuoteMatch[1]) {
    return imgNoQuoteMatch[1].trim()
  }
  
  return null
}