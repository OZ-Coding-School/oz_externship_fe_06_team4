
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

  let stripped = text
    // 0. HTML 엔티티 변환 (&lt; -> <, &gt; -> >, &nbsp; -> 공백 등)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    // 1. HTML 태그 제거 (완성된 태그 및 잘린 태그 <span... 도 처리)
    .replace(/<[^>]*>?/g, '')
    // 2. 이미지 제거 ![alt](url) -> alt
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    // 3. 링크 제거 [text](url) -> text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // 4. Bold/Italic 제거 (***, **, *, ___, __, _)
    .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, '$2')
    // 5. 취소선 제거 ~~text~~ -> text
    .replace(/~~(.*?)~~/g, '$1')
    // 6. 코드 블록/인라인 코드 제거
    .replace(/`{1,3}(.*?)\1/gs, '$1')
    // 7. 남은 특수 문자 정리 (#, >, -, + 등 줄 시작 기호)
    .replace(/^[#>\-\+\*\s]+/gm, '')
    // 8. 여러 개의 줄바꿈을 공백으로 변경
    .replace(/\n+/g, ' ')
    .trim()

  return stripped
}
