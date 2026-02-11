import { useQuery } from '@tanstack/react-query'
import { communityApi } from '../api/api'
import type { CommunityCategory } from '../types'

/**
 * 전역적으로 커뮤니티 카테고리 목록을 관리하는 훅입니다.
 * React Query를 사용하여 데이터 캐싱 및 자동 업데이트를 지원합니다.
 */
export function useCategories() {
  return useQuery<CommunityCategory[]>({
    queryKey: ['community', 'categories'],
    queryFn: communityApi.getCategories,
    staleTime: 1000 * 60 * 5, // 5분 동안은 신선한 데이터로 간주
    gcTime: 1000 * 60 * 30, // 30분 동안 캐시 유지
  })
}
