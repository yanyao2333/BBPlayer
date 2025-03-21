import TrackPlayer from 'react-native-track-player'
import { usePlayerStore } from '../store/usePlayerStore'

/**
 * 初始化播放器
 * 在应用启动时调用一次
 */
export const setupPlayer = async (): Promise<void> => {
  try {
    // 初始化播放器
    await usePlayerStore.getState().initPlayer()
  } catch (error) {
    console.error('初始化播放器失败:', error)
  }
}

/**
 * 重置播放器
 * 在应用退出或需要重置播放器时调用
 */
export const resetPlayer = async (): Promise<void> => {
  if (!global.playerIsReady) return

  try {
    await TrackPlayer.reset()
    global.playerIsReady = false
  } catch (error) {
    console.error('重置播放器失败:', error)
  }
}
