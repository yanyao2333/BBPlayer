import { withLayoutContext, Tabs } from 'expo-router'
import { createMaterialBottomTabNavigator } from 'react-native-paper/react-navigation'

const { Navigator } = createMaterialBottomTabNavigator()

export const MaterialBottomTabs = withLayoutContext(Navigator)

MaterialBottomTabs.Screen = Tabs.Screen
