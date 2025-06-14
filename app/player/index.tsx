import type BottomSheet from '@gorhom/bottom-sheet'
import Slider from '@react-native-community/slider'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Image } from 'expo-image'
import * as WebBrowser from 'expo-web-browser'
import { memo, useCallback, useRef, useState } from 'react'
import { Dimensions, TouchableOpacity, View } from 'react-native'
import {
	Divider,
	IconButton,
	Menu,
	Text,
	Tooltip,
	useTheme,
} from 'react-native-paper'
import {
	type EdgeInsets,
	useSafeAreaInsets,
} from 'react-native-safe-area-context'
import { RepeatMode } from 'react-native-track-player'
import { useShallow } from 'zustand/react/shallow'
import AddToFavoriteListsModal from '@/components/modals/AddVideoToFavModal'
import PlayerQueueModal from '@/components/modals/PlayerQueueModal'
import useCurrentTrack from '@/hooks/playerHooks/useCurrentTrack'
import { useGetVideoDetails } from '@/hooks/queries/bilibili/useVideoData'
import {
	usePlaybackProgress,
	usePlayerStore,
} from '@/hooks/stores/usePlayerStore'
import { formatDurationToHHMMSS } from '@/utils/times'
import toast from '@/utils/toast'
import type { RootStackParamList } from '../../types/navigation'

export default function PlayerPage() {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList, 'Player'>>()
	const { colors } = useTheme()
	const insets = useSafeAreaInsets()
	const { width: screenWidth } = Dimensions.get('window')
	const sheetRef = useRef<BottomSheet>(null)
	const togglePlay = usePlayerStore((state) => state.togglePlay)
	const toggleShuffleMode = usePlayerStore((state) => state.toggleShuffleMode)
	const toggleRepeatMode = usePlayerStore((state) => state.toggleRepeatMode)
	const skipToPrevious = usePlayerStore((state) => state.skipToPrevious)
	const skipToNext = usePlayerStore((state) => state.skipToNext)
	const seekTo = usePlayerStore((state) => state.seekTo)
	const { position, duration } = usePlaybackProgress(100)

	const { isPlaying, repeatMode, shuffleMode } = usePlayerStore(
		useShallow((state) => {
			return {
				isPlaying: state.isPlaying,
				repeatMode: state.repeatMode,
				shuffleMode: state.shuffleMode,
			}
		}),
	)
	const currentTrack = useCurrentTrack()

	const { data: videoDetails } = useGetVideoDetails(currentTrack?.id)

	const [isSeeking, setIsSeeking] = useState(false)
	const [seekValue, setSeekValue] = useState(0)

	const handleSlidingStart = useCallback(() => {
		if (duration > 0) {
			setIsSeeking(true)
			setSeekValue(position)
		}
	}, [position, duration])

	const handleSlidingChange = useCallback((value: number) => {
		setSeekValue(value)
	}, [])

	const handleSlidingComplete = useCallback(
		(value: number) => {
			setIsSeeking(false)
			if (duration > 0) {
				seekTo(value)
			}
		},
		[seekTo, duration],
	)

	const isSliderEnabled =
		currentTrack != null && duration > 0 && !Number.isNaN(duration)
	const currentSliderPosition = isSeeking
		? seekValue
		: isSliderEnabled
			? Math.min(position, duration)
			: 0
	const maxSliderValue = isSliderEnabled ? duration : 1

	const [isFavorite, setIsFavorite] = useState(false)
	const [viewMode, setViewMode] = useState<'cover' | 'lyrics'>('cover')
	const [menuVisible, setMenuVisible] = useState(false)
	const [favModalVisible, setFavModalVisible] = useState(false)

	const toggleViewMode = () => {
		setViewMode('cover')
	}

	if (!currentTrack) {
		return (
			<View
				style={{
					flex: 1,
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: colors.background,
				}}
			>
				<Text style={{ color: colors.onBackground }}>没有正在播放的曲目</Text>
				<IconButton
					icon='arrow-left'
					onPress={() => navigation.goBack()}
				/>
			</View>
		)
	}

	return (
		<View
			style={{
				flex: 1,
				height: '100%',
				width: '100%',
				backgroundColor: colors.background,
				paddingTop: insets.top,
			}}
		>
			{/* 主内容区域 */}
			<View
				style={{
					flex: 1,
					justifyContent: 'space-between',
				}}
			>
				{/* 上半部分：顶部操作栏、封面和歌曲信息 */}
				<View>
					{/* 顶部操作栏 */}
					<View
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							justifyContent: 'space-between',
							paddingHorizontal: 16,
							paddingVertical: 8,
						}}
					>
						<IconButton
							icon='chevron-down'
							size={24}
							onPress={() => navigation.goBack()}
						/>
						<Text
							variant='titleMedium'
							style={{
								flex: 1,
								textAlign: 'center',
							}}
						>
							正在播放
						</Text>
						<IconButton
							icon='dots-vertical'
							size={24}
							onPress={() => setMenuVisible(true)}
						/>
					</View>

					{/* 封面区域 */}
					<View
						style={{
							alignItems: 'center',
							paddingHorizontal: 32,
							paddingVertical: 24,
						}}
					>
						<TouchableOpacity
							onPress={toggleViewMode}
							activeOpacity={0.8}
						>
							<Image
								source={{ uri: currentTrack.cover }}
								style={{
									width: screenWidth - 80,
									height: screenWidth - 80,
									borderRadius: 16,
								}}
								transition={300}
							/>
						</TouchableOpacity>
					</View>

					{/* 歌曲信息 */}
					<View style={{ paddingHorizontal: 24 }}>
						<View
							style={{
								flexDirection: 'row',
								alignItems: 'center',
								justifyContent: 'space-between',
							}}
						>
							<View style={{ flex: 1, marginRight: 8 }}>
								<Text
									variant='titleLarge'
									style={{ fontWeight: 'bold' }}
									numberOfLines={4}
								>
									{currentTrack.title}
								</Text>
								<Text
									variant='bodyMedium'
									style={{ color: colors.onSurfaceVariant }}
									numberOfLines={1}
								>
									{currentTrack.artist}
								</Text>
							</View>
							<IconButton
								icon={isFavorite ? 'heart' : 'heart-outline'}
								size={24}
								iconColor={isFavorite ? colors.error : colors.onSurfaceVariant}
								onPress={() => setIsFavorite(!isFavorite)}
							/>
						</View>
					</View>
				</View>

				<View
					style={{
						paddingHorizontal: 24,
						paddingBottom: insets.bottom > 0 ? insets.bottom : 20,
					}}
				>
					<View>
						<Slider
							style={{ width: '100%', height: 40 }}
							minimumValue={0}
							maximumValue={maxSliderValue}
							value={currentSliderPosition}
							minimumTrackTintColor={colors.primary}
							maximumTrackTintColor={colors.surfaceVariant}
							thumbTintColor={colors.primary}
							disabled={!isSliderEnabled}
							onSlidingStart={handleSlidingStart}
							onValueChange={handleSlidingChange}
							onSlidingComplete={handleSlidingComplete}
						/>
						<View
							style={{
								marginTop: -8,
								flexDirection: 'row',
								justifyContent: 'space-between',
								paddingHorizontal: 4,
							}}
						>
							<Text
								variant='bodySmall'
								style={{ color: colors.onSurfaceVariant }}
							>
								{formatDurationToHHMMSS(Math.trunc(currentSliderPosition))}
							</Text>
							<Text
								variant='bodySmall'
								style={{ color: colors.onSurfaceVariant }}
							>
								{formatDurationToHHMMSS(
									Math.trunc(isSliderEnabled ? duration : 0),
								)}
							</Text>
						</View>
					</View>

					<View
						style={{
							marginTop: 24,
							flexDirection: 'row',
							alignItems: 'center',
							justifyContent: 'center',
							gap: 40,
						}}
					>
						<IconButton
							icon='skip-previous'
							size={32}
							onPress={skipToPrevious}
						/>
						<IconButton
							icon={isPlaying ? 'pause' : 'play'}
							size={48}
							onPress={togglePlay}
							mode='contained'
						/>
						<IconButton
							icon='skip-next'
							size={32}
							onPress={skipToNext}
						/>
					</View>
					<View
						style={{
							marginTop: 12,
							flexDirection: 'row',
							alignItems: 'center',
							justifyContent: 'center',
							gap: 32,
						}}
					>
						<Tooltip title='切换随机播放模式'>
							<IconButton
								icon={shuffleMode ? 'shuffle-variant' : 'shuffle-disabled'}
								size={24}
								iconColor={
									shuffleMode ? colors.primary : colors.onSurfaceVariant
								}
								onPress={toggleShuffleMode}
							/>
						</Tooltip>
						<Tooltip title='切换循环播放模式'>
							<IconButton
								icon={
									repeatMode === RepeatMode.Off
										? 'repeat-off'
										: repeatMode === RepeatMode.Track
											? 'repeat-once'
											: 'repeat'
								}
								size={24}
								iconColor={
									repeatMode !== RepeatMode.Off
										? colors.primary
										: colors.onSurfaceVariant
								}
								onPress={toggleRepeatMode}
							/>
						</Tooltip>
						<Tooltip title='打开播放列表'>
							<IconButton
								icon='format-list-bulleted'
								size={24}
								iconColor={colors.onSurfaceVariant}
								onPress={() => sheetRef.current?.snapToPosition('75%')}
							/>
						</Tooltip>
					</View>
				</View>
			</View>

			<FunctionalMenu
				menuVisible={menuVisible}
				setMenuVisible={setMenuVisible}
				screenWidth={screenWidth}
				viewMode={viewMode}
				insets={insets}
				uploaderMid={videoDetails?.owner.mid}
				setFavModalVisible={setFavModalVisible}
			/>

			<AddToFavoriteListsModal
				visible={favModalVisible}
				setVisible={setFavModalVisible}
				bvid={currentTrack.id}
			/>

			{/* @ts-expect-error 忽略 BottomSheet 类型错误 */}
			<PlayerQueueModal sheetRef={sheetRef} />
		</View>
	)
}

const FunctionalMenu = memo(function FunctionalMenu({
	menuVisible,
	setMenuVisible,
	screenWidth,
	viewMode,
	insets,
	uploaderMid,
	setFavModalVisible,
}: {
	menuVisible: boolean
	setMenuVisible: (visible: boolean) => void
	screenWidth: number
	viewMode: string
	insets: EdgeInsets
	uploaderMid: number | undefined
	setFavModalVisible: (visible: boolean) => void
}) {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList, 'Player'>>()
	const currentTrack = useCurrentTrack()

	return (
		<Menu
			visible={menuVisible}
			onDismiss={() => setMenuVisible(false)}
			anchor={{ x: screenWidth - 24, y: insets.top + 24 }}
		>
			<Menu.Item
				onPress={() => {
					setMenuVisible(false)
					setFavModalVisible(true)
				}}
				title='添加到收藏夹'
				leadingIcon='playlist-plus'
			/>
			<Menu.Item
				onPress={() => {
					setMenuVisible(false)
					if (!uploaderMid) {
						toast.error('获取视频详细信息失败')
					} else {
						navigation.navigate('PlaylistUploader', {
							mid: String(uploaderMid),
						})
					}
				}}
				title='查看作者'
				leadingIcon='account-music'
			/>
			<Divider />
			<Menu.Item
				onPress={async () => {
					setMenuVisible(false)
					if (!currentTrack) return
					await WebBrowser.openBrowserAsync(
						`https://www.bilibili.com/video/${currentTrack.id}`,
					)
				}}
				title='查看原视频'
				leadingIcon='share-variant'
			/>
			<Menu.Item
				onPress={() => {
					toast.show('暂未实现')
					setMenuVisible(false)
					// toggleViewMode()
				}}
				title={viewMode === 'cover' ? '显示歌词' : '显示封面'}
				leadingIcon={viewMode === 'cover' ? 'text' : 'image'}
			/>
		</Menu>
	)
})

FunctionalMenu.displayName = 'FunctionalMenu'
