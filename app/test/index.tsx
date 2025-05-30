import * as EXPOFS from 'expo-file-system'
import { router } from 'expo-router'
import * as Updates from 'expo-updates'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import FileViewer from 'react-native-file-viewer'
import { Button, Card, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { usePlayerStore } from '@/hooks/stores/usePlayerStore'
import Toast from '@/utils/toast'

export default function TestPage() {
  const clearQueue = usePlayerStore((state) => state.clearQueue)
  const queue = usePlayerStore((state) => state.queue)
  const [loading, setLoading] = useState(false)
  const { isUpdatePending } = Updates.useUpdates()
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()

  const testCheckUpdate = async () => {
    try {
      const result = await Updates.checkForUpdateAsync()
      Toast.success('检查更新结果', {
        description: `isAvailable: ${result.isAvailable}, whyNotAvailable: ${result.reason}, isRollbackToEmbedding: ${result.isRollBackToEmbedded}`,
        duration: Number.POSITIVE_INFINITY,
      })
    } catch (error) {
      console.error('检查更新失败:', error)
      Toast.error('检查更新失败', { description: String(error) })
    }
  }

  const testUpdatePackage = async () => {
    try {
      if (isUpdatePending) {
        await Updates.reloadAsync()
        return
      }
      const result = await Updates.checkForUpdateAsync()
      if (!result.isAvailable) {
        Toast.error('没有可用的更新', {
          description: '当前已是最新版本',
        })
        return
      }
      const updateResult = await Updates.fetchUpdateAsync()
      if (updateResult.isNew === true) {
        Toast.success('有新版本可用', {
          description: '现在更新',
        })
        setTimeout(() => {
          Updates.reloadAsync()
        }, 1000)
      }
    } catch (error) {
      console.error('更新失败:', error)
      Toast.error('更新失败', { description: String(error) })
    }
  }

  const openLogFile = async () => {
    let date = new Date()
    const offset = date.getTimezoneOffset()
    date = new Date(date.getTime() - offset * 60 * 1000)
    const logFilePath = `${EXPOFS.documentDirectory}logs_${date.toISOString().split('T')[0]}.log`

    FileViewer.open(logFilePath)
      .then(() => {
        console.log('open file')
      })
      .catch((err) => {
        console.log('open file error', err)
        Toast.error('打开文件失败', {
          description: String(err),
          duration: Number.POSITIVE_INFINITY,
        })
      })
  }

  // 清空队列
  const handleClearQueue = async () => {
    try {
      setLoading(true)
      await clearQueue()
      Toast.success('队列已清空')
    } catch (error) {
      console.error('清空队列失败:', error)
      Toast.error('清空队列失败', { description: String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View
      style={{
        flex: 1,
        paddingBottom: 20,
        paddingTop: insets.top,
        backgroundColor: colors.background,
      }}
    >
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <View style={{ marginBottom: 16 }}>
          <Button
            mode='outlined'
            onPress={handleClearQueue}
            loading={loading}
            style={{ marginBottom: 8 }}
          >
            清空队列
          </Button>
          <Button
            mode='outlined'
            onPress={() => router.push('/player')}
            style={{ marginBottom: 8 }}
          >
            打开播放器
          </Button>
          <Button
            mode='contained'
            onPress={testCheckUpdate}
            loading={loading}
            style={{ marginBottom: 8 }}
          >
            查询是否有可热更新的包
          </Button>
          <Button
            mode='contained'
            onPress={testUpdatePackage}
            loading={loading}
            style={{ marginBottom: 8 }}
          >
            拉取更新并重载
          </Button>
          <Button
            mode='contained'
            loading={loading}
            style={{ marginBottom: 8 }}
            onPress={openLogFile}
          >
            打开运行日志
          </Button>
        </View>

        <Text
          variant='titleMedium'
          style={{ marginTop: 16, marginBottom: 8 }}
        >
          当前队列 ({queue.length}):
        </Text>
        {queue.map((track) => (
          <Card
            key={`${track.id}-${track.cid}`}
            style={{ marginBottom: 8 }}
          >
            <Card.Title
              title={track.hasMetadata ? track.title : track.id}
              subtitle={
                track.hasMetadata ? track.artist : '该视频还未获取元数据'
              }
            />
          </Card>
        ))}
      </ScrollView>
    </View>
  )
}
