/**
 * 获取音频流入参（dash）
 */
interface BilibiliAudioStreamParams {
  bvid: string
  cid: number
  audioQuality: number
  enableDolby: boolean
  enableHiRes: boolean
}

/**
 * 获取音频流（dash）返回值
 */
interface BilibiliAudioStreamResponse {
  dash: {
    audio:
      | {
          id: number
          baseUrl: string
          backupUrl: string[]
        }[]
      | null
    dolby?: {
      type: number
      audio:
        | {
            id: number
            baseUrl: string
            backupUrl: string[]
          }[]
        | null
    } | null
    hiRes?: {
      display: boolean
      audio: {
        id: number
        baseUrl: string
        backupUrl: string[]
      } | null
    } | null
  }
}

/**
 * 历史记录获得的视频信息
 */
interface BilibiliHistoryVideo {
  aid: number
  bvid: string
  title: string
  pic: string
  owner: {
    name: string
  }
  duration: number
}

/**
 * 通过details接口获取的视频完整信息
 */
interface BilibiliVideoDetails {
  aid: number
  bvid: string
  title: string
  pic: string
  pubdate: number
  duration: number
  owner: {
    name: string
  }
  cid: number
}

/**
 * 收藏夹信息
 */
interface BilibiliPlaylist {
  id: number
  title: string
  media_count: number
}

/**
 * 搜索结果视频信息
 */
interface BilibiliSearchVideo {
  aid: number
  bvid: string
  title: string
  pic: string
  author: string
  duration: string
  senddate: number
}

/**
 * 热门搜索信息
 */
interface BilibiliHotSearch {
  keyword: string
  show_name: string
}

/**
 * 用户详细信息
 */
interface BilibiliUserInfo {
  mid: number
  name: string
  face: string
}

/**
 * 收藏夹内容项
 */
interface BilibiliFavoriteListContent {
  id: number
  bvid: string
  upper: {
    name: string
    face: string
  }
  title: string
  cover: string
  duration: number
  pubdate: number
  page: number
  type: number // 2：视频稿件 12：音频 21：视频合集
  attr: number // 失效	0: 正常；9: up自己删除；1: 其他原因删除
}

/**
 * 收藏夹内容列表
 */
interface BilibiliFavoriteListContents {
  info: {
    id: number
    title: string
    cover: string
    media_count: number
    intro: string
    upper: {
      name: string
      face: string
    }
  }
  medias: BilibiliFavoriteListContent[]
  has_more: boolean
  ttl: number
}

/**
 * 收藏夹所有内容（仅ID）
 */
type BilibiliFavoriteListAllContents = {
  id: number
  bvid: string
  type: number // 2：视频稿件 12：音频 21：视频合集
}[]

/**
 * 追更合集/收藏夹列表中的单项数据
 */
interface BilibiliCollection {
  id: number
  title: string
  cover: string
  upper: {
    mid: number
    name: string
    // face: string 恒为空
  }
  media_count: number
  ctime: number // 创建时间
  intro: string
  attr: number // 在不转换成 8-bit 的情况下，可能会有值：22 关注的别人收藏夹 0 追更视频合集 1 已失效（应通过 state 来区分）
  state: 0 | 1 // 0: 正常；1:收藏夹已失效
}

/**
 * 追更合集/收藏夹内容
 */
type BilibiliCollectionContent = {
  info: {
    id: number
    season_type: number // 未知
    title: string
    cover: string
    media_count: number
    intro: string
    upper: {
      name: string
      mid: number
    }
  }
  medias: {
    id: number // avid
    bvid: string
    title: string
    cover: string
    intro: string
    duration: number
    pubtime: number
    upper: {
      mid: number
      name: string
    }
  }
}

export type {
  BilibiliAudioStreamParams,
  BilibiliAudioStreamResponse,
  BilibiliHistoryVideo,
  BilibiliVideoDetails,
  BilibiliPlaylist,
  BilibiliSearchVideo,
  BilibiliHotSearch,
  BilibiliUserInfo,
  BilibiliFavoriteListContent,
  BilibiliFavoriteListContents,
  BilibiliFavoriteListAllContents,
  BilibiliCollection,
  BilibiliCollectionContent,
}
