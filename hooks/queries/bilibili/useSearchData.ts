import appStore from '@/hooks/stores/appStore'
import { bilibiliApi } from '@/lib/api/bilibili/bilibili.api'
import { returnOrThrowAsync } from '@/utils/neverthrowUtils'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

export const searchQueryKeys = {
	all: ['bilibili', 'search'] as const,
	results: (query: string) =>
		[...searchQueryKeys.all, 'results', query] as const,
	hotSearches: () => [...searchQueryKeys.all, 'hotSearches'] as const,
} as const

// 搜索结果查询
export const useSearchResults = (query: string) => {
	const enabled =
		query.trim().length > 0 && !!appStore.getState().bilibiliCookieString
	return useInfiniteQuery({
		queryKey: searchQueryKeys.results(query),
		queryFn: ({ pageParam = 1 }) =>
			returnOrThrowAsync(bilibiliApi.searchVideos(query, pageParam)),
		staleTime: 5 * 60 * 1000,
		enabled: enabled,
		initialPageParam: 1,
		getNextPageParam: (lastPage, allPages) => {
			if (lastPage.numPages === allPages.length) {
				return undefined
			}
			return allPages.length + 1
		},
	})
}

// 热门搜索查询
export const useHotSearches = () => {
	const enabled = !!appStore.getState().bilibiliCookieString
	return useQuery({
		queryKey: searchQueryKeys.hotSearches(),
		queryFn: () => returnOrThrowAsync(bilibiliApi.getHotSearches()),
		staleTime: 15 * 60 * 1000,
		enabled: enabled,
	})
}
