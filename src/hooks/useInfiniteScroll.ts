import { useEffect, useRef } from 'react'

interface UseInfiniteScrollOptions {
  onIntersect: () => void
  enabled?: boolean
  isLoading?: boolean
  threshold?: number
}

/**
 * 무한 스크롤 감지를 위한 커스텀 훅
 * 
 * @param onIntersect 요소가 화면에 보일 때 실행할 함수
 * @param enabled 무한 스크롤 작동 여부 (데이터가 더 있거나 검색 조건이 맞을 때 true)
 * @param isLoading 로딩 중인지 여부 (중복 실행 방지)
 * @param threshold 노출 임계값 (0.0 ~ 1.0)
 * 
 * @returns observerRef 감시할 DOM 요소에 할당할 ref
 */
export function useInfiniteScroll({
  onIntersect,
  enabled = true,
  isLoading = false,
  threshold = 0.1
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 작동 가능하지 않거나 로딩 중이면 관찰하지 않음
    if (!enabled || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        // 요소가 화면에 나타나면 콜백 실행
        if (entries[0].isIntersecting) {
          onIntersect()
        }
      },
      { threshold }
    )

    const currentElement = observerRef.current
    if (currentElement) {
      observer.observe(currentElement)
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement)
      }
    }
  }, [onIntersect, enabled, isLoading, threshold])

  return observerRef
}
