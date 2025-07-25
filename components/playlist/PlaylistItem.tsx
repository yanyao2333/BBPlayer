import type { Track } from '@/types/core/media'
import { formatDurationToHHMMSS } from '@/utils/times'
import { Image } from 'expo-image'
import { memo, useState } from 'react'
import { View } from 'react-native'
import {
	Divider,
	IconButton,
	Menu,
	Surface,
	Text,
	TouchableRipple,
} from 'react-native-paper'

export interface TrackMenuItem {
	title: string
	leadingIcon: string
	onPress: (track: Track) => void
}

export const TrackMenuItemDividerToken = {
	title: 'divider',
	leadingIcon: '',
	onPress: () => {},
}

interface TrackListItemProps {
	item: Track
	index: number
	onTrackPress: (track: Track) => void
	menuItems: TrackMenuItem[]
	showCoverImage?: boolean
}

/**
 * 可复用的播放列表项目组件。
 */
export const TrackListItem = memo(function TrackListItem({
	item,
	index,
	onTrackPress,
	menuItems,
	showCoverImage = true,
}: TrackListItemProps) {
	const [isMenuVisible, setIsMenuVisible] = useState(false)
	const openMenu = () => setIsMenuVisible(true)
	const closeMenu = () => setIsMenuVisible(false)

	return (
		<TouchableRipple
			style={{ paddingVertical: 4 }}
			onPress={() => onTrackPress(item)}
		>
			<Surface
				style={{
					overflow: 'hidden',
					borderRadius: 8,
					backgroundColor: 'transparent',
				}}
				elevation={0}
			>
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						paddingHorizontal: 8,
						paddingVertical: 6,
					}}
				>
					{/* Index Number */}
					<Text
						variant='bodyMedium'
						style={{
							width: 35,
							textAlign: 'center',
							marginRight: 8,
							color: 'grey',
						}}
					>
						{index + 1}
					</Text>

					{/* Cover Image */}
					{showCoverImage ? (
						<Image
							source={{ uri: item.cover }}
							style={{ width: 45, height: 45, borderRadius: 4 }}
							transition={300}
							cachePolicy={'none'}
						/>
					) : null}

					{/* Title and Details */}
					<View style={{ marginLeft: 12, flex: 1, marginRight: 4 }}>
						<Text variant='bodySmall'>{item.title}</Text>
						<View
							style={{
								flexDirection: 'row',
								alignItems: 'center',
								marginTop: 2,
							}}
						>
							{/* Display Artist if available */}
							{item.artist && (
								<>
									<Text
										variant='bodySmall'
										numberOfLines={1}
									>
										{item.artist}
									</Text>
									<Text
										style={{ marginHorizontal: 4 }}
										variant='bodySmall'
									>
										•
									</Text>
								</>
							)}
							{/* Display Duration */}
							<Text variant='bodySmall'>
								{item.duration ? formatDurationToHHMMSS(item.duration) : ''}
							</Text>
						</View>
					</View>

					{/* Context Menu */}
					{menuItems.length > 0 && (
						<Menu
							visible={isMenuVisible}
							onDismiss={closeMenu}
							anchor={
								<IconButton
									icon='dots-vertical'
									size={20}
									onPress={openMenu}
								/>
							}
							anchorPosition='bottom'
						>
							{menuItems.map((menuItem, index) =>
								menuItem.title === 'divider' ? (
									<Divider key={`divider-${index}`} />
								) : (
									<Menu.Item
										key={menuItem.title}
										leadingIcon={menuItem.leadingIcon}
										onPress={() => {
											menuItem.onPress(item)
											closeMenu()
										}}
										title={menuItem.title}
									/>
								),
							)}
						</Menu>
					)}
				</View>
			</Surface>
		</TouchableRipple>
	)
})
