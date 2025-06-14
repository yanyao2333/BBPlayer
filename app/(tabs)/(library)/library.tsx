import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Image } from 'expo-image'
import { memo, useCallback, useState } from 'react'
import { FlatList, RefreshControl, TouchableOpacity, View } from 'react-native'
import {
	ActivityIndicator,
	Divider,
	Icon,
	Searchbar,
	SegmentedButtons,
	Text,
	useTheme,
} from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import NowPlayingBar from '@/components/NowPlayingBar'
import {
	useGetFavoritePlaylists,
	useInfiniteCollectionsList,
	useInfiniteFavoriteList,
} from '@/hooks/queries/bilibili/useFavoriteData'
import { usePersonalInformation } from '@/hooks/queries/bilibili/useUserData'
import type { BilibiliCollection } from '@/types/apis/bilibili'
import type { Playlist, Track } from '@/types/core/media'
import { formatDurationToHHMMSS } from '@/utils/times'
import type { RootStackParamList } from '../../../types/navigation'

export default function LibraryScreen() {
	const { colors } = useTheme()
	const insets = useSafeAreaInsets()
	const [value, setValue] = useState('favorite')

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			{/* 顶部区域 */}
			<View
				style={{
					paddingTop: insets.top + 8,
					paddingHorizontal: 16,
					paddingBottom: 8,
				}}
			>
				<View
					style={{
						marginBottom: 16,
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
					}}
				>
					<Text
						variant='headlineSmall'
						style={{ fontWeight: 'bold' }}
					>
						音乐库
					</Text>
				</View>

				{/* 分段按钮 */}
				<SegmentedButtons
					value={value}
					onValueChange={setValue}
					buttons={[
						{ value: 'favorite', label: '收藏夹', icon: 'star' },
						{ value: 'collection', label: '合集', icon: 'book' },
						{ value: 'multipage', label: '分 p', icon: 'video' },
					]}
					style={{
						marginBottom: 16,
						width: '100%',
						alignSelf: 'center',
					}}
				/>
			</View>

			{/* 内容区域 */}
			<View style={{ flex: 1, paddingHorizontal: 16 }}>
				<FavoriteFolderListComponent isHidden={value !== 'favorite'} />
				<CollectionListComponent isHidden={value !== 'collection'} />
				<MultiPageVideosListComponent isHidden={value !== 'multipage'} />
			</View>

			{/* 当前播放栏 */}
			<View
				style={{
					position: 'absolute',
					right: 0,
					bottom: 0,
					left: 0,
				}}
			>
				<NowPlayingBar />
			</View>
		</View>
	)
}

const FavoriteFolderListItem = memo(({ item }: { item: Playlist }) => {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()
	return (
		<View key={item.id}>
			<View style={{ marginVertical: 8, overflow: 'hidden' }}>
				<TouchableOpacity
					activeOpacity={0.7}
					onPress={() => {
						navigation.navigate('PlaylistFavorite', { id: String(item.id) })
					}}
				>
					<View
						style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}
					>
						<View style={{ marginLeft: 12, flex: 1 }}>
							<Text
								variant='titleMedium'
								numberOfLines={1}
							>
								{item.title}
							</Text>
							<Text variant='bodySmall'>{item.count} 首歌曲</Text>
						</View>
						<Icon
							source='arrow-right'
							size={24}
						/>
					</View>
				</TouchableOpacity>
			</View>
			<Divider />
		</View>
	)
})

FavoriteFolderListItem.displayName = 'FavoriteFolderListItem'

/**
 * 渲染收藏夹列表页
 */
const FavoriteFolderListComponent = memo(
	({ isHidden }: { isHidden: boolean }) => {
		const navigation =
			useNavigation<NativeStackNavigationProp<RootStackParamList>>()
		const [query, setQuery] = useState('')
		const { data: userInfo } = usePersonalInformation()
		const {
			data: playlists,
			isPending: playlistsIsPending,
			isError: playlistsIsError,
		} = useGetFavoritePlaylists(userInfo?.mid)

		const renderPlaylistItem = useCallback(
			({ item }: { item: Playlist }) => <FavoriteFolderListItem item={item} />,
			[],
		)

		const keyExtractor = useCallback((item: Playlist) => item.id.toString(), [])

		if (isHidden) return null

		if (playlistsIsPending) {
			return (
				<View
					style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
				>
					<ActivityIndicator size='large' />
				</View>
			)
		}

		if (playlistsIsError) {
			return (
				<View
					style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
				>
					<Text
						variant='titleMedium'
						style={{ textAlign: 'center' }}
					>
						加载失败
					</Text>
				</View>
			)
		}

		const filteredPlaylists = playlists?.filter(
			(item) => !item.title.startsWith('[mp]'),
		)

		return (
			<View style={{ flex: 1 }}>
				<View
					style={{
						marginBottom: 8,
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
					}}
				>
					<Text
						variant='titleMedium'
						style={{ fontWeight: 'bold' }}
					>
						我的收藏夹
					</Text>
					<Text variant='bodyMedium'>{playlists?.length ?? 0} 个收藏夹</Text>
				</View>
				<Searchbar
					placeholder='搜索我的收藏夹内容'
					value={query}
					mode='bar'
					inputStyle={{
						alignSelf: 'center',
					}}
					onChangeText={setQuery}
					style={{
						borderRadius: 9999,
						textAlign: 'center',
						height: 45,
						marginBottom: 20,
						marginTop: 10,
					}}
					onSubmitEditing={() => {
						setQuery('')
						navigation.navigate('SearchResultFav', { query })
					}}
				/>
				<FlatList
					style={{ flex: 1 }}
					contentContainerStyle={{ paddingBottom: 80 }}
					showsVerticalScrollIndicator={false}
					data={filteredPlaylists}
					renderItem={renderPlaylistItem}
					keyExtractor={keyExtractor}
					ListFooterComponent={
						<Text
							variant='titleMedium'
							style={{ textAlign: 'center', paddingTop: 10 }}
						>
							•
						</Text>
					}
					ListEmptyComponent={
						<Text style={{ textAlign: 'center' }}>没有收藏夹</Text>
					}
				/>
			</View>
		)
	},
)

FavoriteFolderListComponent.displayName = 'FavoriteFolderListComponent'

/**
 * 渲染追更合集页
 */
const CollectionListComponent = memo(({ isHidden }: { isHidden: boolean }) => {
	const { data: userInfo } = usePersonalInformation()
	const {
		data: collections,
		isPending: collectionsIsPending,
		isError: collectionsIsError,
		refetch,
		hasNextPage,
		fetchNextPage,
	} = useInfiniteCollectionsList(Number(userInfo?.mid))
	const [refreshing, setRefreshing] = useState(false)
	const colors = useTheme().colors

	const renderCollectionItem = useCallback(
		({ item }: { item: BilibiliCollection }) => (
			<CollectionListItem item={item} />
		),
		[],
	)

	const keyExtractor = useCallback(
		(item: BilibiliCollection) => item.id.toString(),
		[],
	)

	if (isHidden) return null

	if (collectionsIsPending) {
		return (
			<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
				<ActivityIndicator size='large' />
			</View>
		)
	}

	if (collectionsIsError) {
		return (
			<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
				<Text
					variant='titleMedium'
					style={{ textAlign: 'center' }}
				>
					加载失败
				</Text>
			</View>
		)
	}

	return (
		<View style={{ flex: 1 }}>
			<View
				style={{
					marginBottom: 8,
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
				}}
			>
				<Text
					variant='titleMedium'
					style={{ fontWeight: 'bold' }}
				>
					我的合集/收藏夹追更
				</Text>
				<Text variant='bodyMedium'>
					{collections?.pages[0]?.count ?? 0} 个追更
				</Text>
			</View>
			<FlatList
				data={collections?.pages.flatMap((page) => page.list)}
				renderItem={renderCollectionItem}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={async () => {
							setRefreshing(true)
							await refetch()
							setRefreshing(false)
						}}
						colors={[colors.primary]}
						progressViewOffset={50}
					/>
				}
				keyExtractor={keyExtractor}
				contentContainerStyle={{ paddingBottom: 80 }}
				showsVerticalScrollIndicator={false}
				onEndReached={hasNextPage ? () => fetchNextPage() : undefined}
				ListFooterComponent={
					hasNextPage ? (
						<View
							style={{
								flexDirection: 'row',
								alignItems: 'center',
								justifyContent: 'center',
								padding: 16,
							}}
						>
							<ActivityIndicator size='small' />
						</View>
					) : (
						<Text
							variant='titleMedium'
							style={{ textAlign: 'center', paddingTop: 10 }}
						>
							•
						</Text>
					)
				}
			/>
		</View>
	)
})

CollectionListComponent.displayName = 'CollectionListComponent'

/**
 * 渲染追更合集项
 */
const CollectionListItem = memo(({ item }: { item: BilibiliCollection }) => {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()
	return (
		<View key={item.id}>
			<View style={{ marginVertical: 8, overflow: 'hidden' }}>
				<TouchableOpacity
					activeOpacity={0.7}
					disabled={item.state === 1}
					onPress={() => {
						if (item.attr === 0) {
							navigation.navigate('PlaylistCollection', { id: String(item.id) })
						} else {
							navigation.navigate('PlaylistFavorite', { id: String(item.id) })
						}
					}}
				>
					<View
						style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}
					>
						<Image
							source={{ uri: item.cover }}
							style={{ width: 48, height: 48, borderRadius: 4 }}
							transition={300}
						/>
						<View style={{ marginLeft: 12, flex: 1 }}>
							<Text
								variant='titleMedium'
								style={{ paddingRight: 8 }}
							>
								{item.title}
							</Text>
							<Text variant='bodySmall'>
								{item.state === 0 ? item.upper.name : '已失效'} •{' '}
								{item.media_count} 首歌曲
							</Text>
						</View>
						<Icon
							source='arrow-right'
							size={24}
						/>
					</View>
				</TouchableOpacity>
			</View>
			<Divider />
		</View>
	)
})

CollectionListItem.displayName = 'CollectionListItem'

/**
 * 渲染分 p 视频页面
 */
const MultiPageVideosListComponent = memo(
	({ isHidden }: { isHidden: boolean }) => {
		const { data: userInfo } = usePersonalInformation()
		const {
			data: playlists,
			isPending: playlistsIsPending,
			isError: playlistsIsError,
		} = useGetFavoritePlaylists(userInfo?.mid)
		const {
			data: favoriteData,
			isError: isFavoriteDataError,
			isLoading: isFavoriteDataLoading,
			fetchNextPage,
			hasNextPage,
		} = useInfiniteFavoriteList(
			playlists?.find((item) => item.title.startsWith('[mp]'))?.id,
		)

		const renderPlaylistItem = useCallback(
			({ item }: { item: Track }) => <MultiPageVideosItem item={item} />,
			[],
		)

		const keyExtractor = useCallback((item: Track) => item.id.toString(), [])

		if (isHidden) return null

		if (playlistsIsPending || isFavoriteDataLoading) {
			return (
				<View
					style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
				>
					<ActivityIndicator size='large' />
				</View>
			)
		}

		if (playlistsIsError || isFavoriteDataError) {
			return (
				<View
					style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
				>
					<Text
						variant='titleMedium'
						style={{ textAlign: 'center' }}
					>
						加载失败
					</Text>
				</View>
			)
		}

		if (!playlists?.find((item) => item.title.startsWith('[mp]'))) {
			return (
				<View
					style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
				>
					<Text
						variant='titleMedium'
						style={{ textAlign: 'center' }}
					>
						未找到分 p 视频收藏夹，请先创建一个收藏夹，并以 [mp] 开头
					</Text>
				</View>
			)
		}

		return (
			<View style={{ flex: 1 }}>
				<View
					style={{
						marginBottom: 8,
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
					}}
				>
					<Text
						variant='titleMedium'
						style={{ fontWeight: 'bold' }}
					>
						分P视频
					</Text>
					<Text variant='bodyMedium'>
						{favoriteData?.pages[0]?.favoriteMeta?.media_count ?? 0} 个分P视频
					</Text>
				</View>
				<FlatList
					style={{ flex: 1 }}
					contentContainerStyle={{ paddingBottom: 80 }}
					showsVerticalScrollIndicator={false}
					data={favoriteData?.pages.flatMap((page) => page.tracks)}
					renderItem={renderPlaylistItem}
					keyExtractor={keyExtractor}
					ListEmptyComponent={
						<Text style={{ textAlign: 'center' }}>没有分P视频</Text>
					}
					onEndReached={hasNextPage ? () => fetchNextPage() : undefined}
					ListFooterComponent={
						hasNextPage ? (
							<View
								style={{
									flexDirection: 'row',
									alignItems: 'center',
									justifyContent: 'center',
									padding: 16,
								}}
							>
								<ActivityIndicator size='small' />
							</View>
						) : (
							<Text
								variant='titleMedium'
								style={{ textAlign: 'center', paddingTop: 10 }}
							>
								•
							</Text>
						)
					}
				/>
			</View>
		)
	},
)

MultiPageVideosListComponent.displayName = 'MultiPageVideosListComponent'

/**
 * 渲染分 p 视频项
 */
const MultiPageVideosItem = memo(({ item }: { item: Track }) => {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()
	return (
		<View key={item.id}>
			<View style={{ marginVertical: 8, overflow: 'hidden' }}>
				<TouchableOpacity
					activeOpacity={0.7}
					onPress={() => {
						navigation.navigate('PlaylistMultipage', { bvid: item.id })
					}}
				>
					<View
						style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}
					>
						<Image
							source={{ uri: item.cover }}
							style={{ width: 48, height: 48, borderRadius: 4 }}
							transition={300}
						/>
						<View style={{ marginLeft: 12, flex: 1 }}>
							<Text
								variant='titleMedium'
								style={{ paddingRight: 8 }}
							>
								{item.title}
							</Text>
							<Text variant='bodySmall'>
								{item.artist} •{' '}
								{item.duration ? formatDurationToHHMMSS(item.duration) : ''}
							</Text>
						</View>
						<Icon
							source='arrow-right'
							size={24}
						/>
					</View>
				</TouchableOpacity>
			</View>
			<Divider />
		</View>
	)
})

MultiPageVideosItem.displayName = 'MultiPageVideosItem'
