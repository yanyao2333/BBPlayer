// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    /* Buttons */
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    /* Other */
    FlatList: View,
    gestureHandlerRootHOC: jest.fn(),
    Directions: {},
  };
});

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');

  Reanimated.useSharedValue = jest.fn(initialValue => ({ value: initialValue }));
  Reanimated.useAnimatedStyle = jest.fn(updater => updater());
  Reanimated.withTiming = jest.fn((toValue, options, callback) => toValue);
  Reanimated.withSpring = jest.fn((toValue, options, callback) => toValue);
  Reanimated.withRepeat = jest.fn((animation, numberOfReps, reverse, callback) => animation);
  Reanimated.withSequence = jest.fn((...animations) => animations[0]);
  Reanimated.withDelay = jest.fn((delayMs, animation) => animation);
  Reanimated.interpolate = jest.fn((value, inputRange, outputRange, extrapolate) => {
    if (value < inputRange[0]) {
      return outputRange[0];
    }
    if (value > inputRange[inputRange.length - 1]) {
      return outputRange[outputRange.length - 1];
    }
    return outputRange[0];
  });
  Reanimated.Extrapolate = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' };


  return Reanimated;
});

// Mock expo-router
jest.mock('expo-router', () => {
  const MockStack = ({ children }) => <>{children}</>;
  MockStack.Screen = ({ children }) => <>{children}</>;

  return {
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: jest.fn(() => true),
      setParams: jest.fn(),
    })),
    useLocalSearchParams: jest.fn(() => ({})),
    useGlobalSearchParams: jest.fn(() => ({})),
    Link: jest.fn(({ href, children, ...props }) => <a href={href} {...props}>{children}</a>),
    Stack: MockStack,
    SplashScreen: jest.fn(() => null), // Mock SplashScreen if used
    // Add other exports from expo-router you use, e.g., Tabs, Slot, etc.
    // Tabs: jest.fn(({ children }) => <>{children}</>),
    // Slot: jest.fn(({ children }) => <>{children}</>),
  };
});
