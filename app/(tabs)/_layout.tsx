import { MaterialBottomTabs as Tab } from '@/components/MaterialBottomTabBar'
import { useTheme } from 'react-native-paper'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'

export default function TabLayout() {
  const theme = useTheme()
  return (
    <Tab
      screenOptions={{
        tabBarHideOnKeyboard: true,
      }}
      sceneAnimationEnabled
      sceneAnimationType='opacity'
      theme={theme}
    >
      <Tab.Screen
        name='(home)/index'
        options={{
          title: '主页',
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons
              name='home'
              color={color}
              size={26}
            />
          ),
        }}
      />
      <Tab.Screen
        name='(search)/search'
        options={{
          title: '搜索',
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons
              name='magnify'
              color={color}
              size={26}
            />
          ),
        }}
      />
      <Tab.Screen
        name='(library)/library'
        options={{
          title: '音乐库',
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons
              name='library-shelves'
              color={color}
              size={26}
            />
          ),
        }}
      />
      <Tab.Screen
        name='test/index'
        options={{
          title: '测试',
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons
              name='wrench'
              color={color}
              size={26}
            />
          ),
        }}
      />
    </Tab>
  )
}
