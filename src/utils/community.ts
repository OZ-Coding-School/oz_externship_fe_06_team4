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
  // < 문자가 있고 그 뒤에 > 가 없는 경우, 마지막 < 부터 끝까지를 체크
  const lastLt = s.lastIndexOf('<')
  if (lastLt !== -1 && s.indexOf('>', lastLt) === -1) {
    const trailing = s.slice(lastLt)
    // 한글이 포함되어 있거나 40자 이상인 경우 태그가 아닌 실제 텍스트일 가능성이 높으므로 제거하지 않음
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

  // 6. 안전장치: 만약 모든 처리를 거친 결과가 비어있는데 원본에 데이터가 있었다면,
  // 태그만 단순하게 모두 지운 버전을 반환 
  if (!s && text.trim()) {
    return text.replace(/<[^>]*>?/g, '').replace(/[*_~`#>-]/g, '').slice(0, 100).trim()
  }

  return s
}
