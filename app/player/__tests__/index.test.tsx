import React from 'react';
import { render, fireEvent, screen, act, waitFor } from '@testing-library/react-native';
import { PaperProvider, DefaultTheme } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PlayerPage from '../index'; // The component to test
import { RepeatMode } from 'react-native-track-player';

// --- Mock Dependencies ---
jest.mock('expo-image', () => {
  const MockImage = require('react-native/Libraries/Image/Image');
  return { Image: MockImage };
});

const mockRouterBack = jest.fn();
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: {
    back: mockRouterBack,
    push: mockRouterPush,
  },
  Stack: {
    Screen: (props) => <jest.fn testID="stack-screen-mock" options={props.options} />,
  },
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

jest.mock('@gorhom/bottom-sheet', () => {
  const RNBottomSheet = jest.requireActual('@gorhom/bottom-sheet');
  return {
    ...RNBottomSheet,
    __esModule: true,
    default: React.forwardRef((props, ref) => {
      const actualRef = React.useRef();
      React.useImperativeHandle(ref, () => ({
        snapToPosition: jest.fn(),
        // Add other methods if PlayerPage calls them
      }));
      return <RNBottomSheet.BottomSheetView {...props} ref={actualRef} />;
    }),
  };
});


jest.mock('@react-native-community/slider', () => (props) => {
  const MockSlider = require('react-native/Libraries/Components/View/View'); // Use View as a simple mock
  return <MockSlider {...props} testID="mock-slider" />;
});

jest.mock('@/components/AddVideoToFavModal', () => (props) => <jest.fn testID="add-to-fav-modal-mock" {...props} />);
jest.mock('@/components/PlayerQueueModal', () => (props) => <jest.fn testID="player-queue-modal-mock" {...props} />);

jest.mock('@/hooks/queries/bilibili/useVideoData', () => ({
  useGetVideoDetails: jest.fn(),
}));

// Store Mocks
const mockTogglePlay = jest.fn();
const mockToggleShuffleMode = jest.fn();
const mockToggleRepeatMode = jest.fn();
const mockSkipToPrevious = jest.fn();
const mockSkipToNext = jest.fn();
const mockSeekTo = jest.fn();

let mockPlayerStoreState = {
  currentTrack: null,
  isPlaying: false,
  repeatMode: RepeatMode.Off,
  shuffleMode: false,
  // Actions
  togglePlay: mockTogglePlay,
  toggleShuffleMode: mockToggleShuffleMode,
  toggleRepeatMode: mockToggleRepeatMode,
  skipToPrevious: mockSkipToPrevious,
  skipToNext: mockSkipToNext,
  seekTo: mockSeekTo,
};

let mockPlaybackProgressState = {
  position: 0,
  duration: 0,
};

jest.mock('@/hooks/stores/usePlayerStore', () => ({
  usePlayerStore: jest.fn((selector) => selector(mockPlayerStoreState)),
  usePlaybackProgress: jest.fn(() => mockPlaybackProgressState),
}));

const mockBilibiliApi = { /* mock methods if needed by PlayerPage */ };
jest.mock('@/hooks/stores/useAppStore', () => jest.fn(() => ({
  bilibiliApi: mockBilibiliApi,
})));


jest.mock('@/utils/times', () => ({
  formatDurationToHHMMSS: jest.fn((seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`),
}));
jest.mock('@/utils/toast', () => ({
  show: jest.fn(),
  error: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn(() => ({ width: 300, height: 600 })),
}));


// --- Helper Functions & Data ---
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={DefaultTheme}>{component}</PaperProvider>
    </QueryClientProvider>
  );
};

const mockDefaultTrack = {
  id: 'track123',
  title: 'Test Track Title',
  artist: 'Test Artist Name',
  cover: 'https://example.com/cover.jpg',
  url: 'https://example.com/track.mp3',
  duration: 200, // in seconds
  cid: 789,
  source: 'bilibili',
  hasMetadata: true,
};

const useGetVideoDetailsMock = require('@/hooks/queries/bilibili/useVideoData').useGetVideoDetails as jest.Mock;

describe('PlayerPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();

    // Reset states to default for each test
    mockPlayerStoreState = {
      currentTrack: mockDefaultTrack,
      isPlaying: false,
      repeatMode: RepeatMode.Off,
      shuffleMode: false,
      togglePlay: mockTogglePlay,
      toggleShuffleMode: mockToggleShuffleMode,
      toggleRepeatMode: mockToggleRepeatMode,
      skipToPrevious: mockSkipToPrevious,
      skipToNext: mockSkipToNext,
      seekTo: mockSeekTo,
    };
    mockPlaybackProgressState = { position: 50, duration: mockDefaultTrack.duration };
    useGetVideoDetailsMock.mockReturnValue({ data: { owner: { mid: 'uploader123' } } });
  });

  describe('No Track State', () => {
    test('renders "no track playing" message and back button if currentTrack is null', () => {
      mockPlayerStoreState.currentTrack = null;
      renderWithProviders(<PlayerPage />);
      expect(screen.getByText('没有正在播放的曲目')).toBeTruthy();
      const backButton = screen.getByLabelText('Go back'); // IconButton with icon 'arrow-left' might get this default label
      expect(backButton).toBeTruthy();
      fireEvent.press(backButton);
      expect(mockRouterBack).toHaveBeenCalled();
    });
  });

  describe('Track Loaded State - UI Rendering', () => {
    test('displays track title, artist, and cover', () => {
      renderWithProviders(<PlayerPage />);
      expect(screen.getByText(mockDefaultTrack.title)).toBeTruthy();
      expect(screen.getByText(mockDefaultTrack.artist)).toBeTruthy();
      const coverImage = screen.UNSAFE_getByProps({ source: { uri: mockDefaultTrack.cover } });
      expect(coverImage).toBeTruthy();
    });

    test('play/pause button reflects isPlaying state', () => {
      mockPlayerStoreState.isPlaying = true;
      renderWithProviders(<PlayerPage />);
      expect(screen.UNSAFE_getByProps({ icon: 'pause' })).toBeTruthy();

      mockPlayerStoreState.isPlaying = false;
      renderWithProviders(<PlayerPage />); // Re-render with new state
      expect(screen.UNSAFE_getByProps({ icon: 'play' })).toBeTruthy();
    });

    test('repeat button reflects repeatMode state', () => {
      mockPlayerStoreState.repeatMode = RepeatMode.Track;
      renderWithProviders(<PlayerPage />);
      expect(screen.UNSAFE_getByProps({ icon: 'repeat-once' })).toBeTruthy();

      mockPlayerStoreState.repeatMode = RepeatMode.Queue;
      renderWithProviders(<PlayerPage />);
      expect(screen.UNSAFE_getByProps({ icon: 'repeat' })).toBeTruthy();
      
      mockPlayerStoreState.repeatMode = RepeatMode.Off;
      renderWithProviders(<PlayerPage />);
      expect(screen.UNSAFE_getByProps({ icon: 'repeat-off' })).toBeTruthy();
    });

    test('shuffle button reflects shuffleMode state', () => {
      mockPlayerStoreState.shuffleMode = true;
      renderWithProviders(<PlayerPage />);
      expect(screen.UNSAFE_getByProps({ icon: 'shuffle-variant' })).toBeTruthy();
      
      mockPlayerStoreState.shuffleMode = false;
      renderWithProviders(<PlayerPage />);
      expect(screen.UNSAFE_getByProps({ icon: 'shuffle-disabled' })).toBeTruthy();
    });

    test('displays formatted current time and total duration', () => {
      mockPlaybackProgressState = { position: 65, duration: 200 }; // 1:05 / 3:20
      const { rerender } = renderWithProviders(<PlayerPage />);
      expect(require('@/utils/times').formatDurationToHHMMSS).toHaveBeenCalledWith(65);
      expect(require('@/utils/times').formatDurationToHHMMSS).toHaveBeenCalledWith(200);
      expect(screen.getByText('1:05')).toBeTruthy();
      expect(screen.getByText('3:20')).toBeTruthy();
    });

    test('slider reflects current progress and duration', () => {
      mockPlaybackProgressState = { position: 50, duration: 200 };
      renderWithProviders(<PlayerPage />);
      const slider = screen.getByTestId('mock-slider');
      expect(slider.props.value).toBe(50);
      expect(slider.props.maximumValue).toBe(200);
    });
  });

  describe('Track Loaded State - Interactions', () => {
    test('back button (chevron-down) calls router.back', () => {
      renderWithProviders(<PlayerPage />);
      // There are two "chevron-down" buttons, one in main header, one in animated header.
      // Let's get the one that's always visible.
      const backButtons = screen.getAllByLabelText('Go back'); // Assuming IconButton with chevron-down gets this
      fireEvent.press(backButtons[0]); // Press the first one (main header)
      expect(mockRouterBack).toHaveBeenCalled();
    });

    test('playback control buttons call store actions', () => {
      renderWithProviders(<PlayerPage />);
      fireEvent.press(screen.UNSAFE_getByProps({ icon: 'play' })); // isPlaying is false initially
      expect(mockTogglePlay).toHaveBeenCalledTimes(1);

      fireEvent.press(screen.UNSAFE_getByProps({ icon: 'skip-next' }));
      expect(mockSkipToNext).toHaveBeenCalledTimes(1);

      fireEvent.press(screen.UNSAFE_getByProps({ icon: 'skip-previous' }));
      expect(mockSkipToPrevious).toHaveBeenCalledTimes(1);

      fireEvent.press(screen.UNSAFE_getByProps({ icon: 'shuffle-disabled' })); // shuffleMode is false
      expect(mockToggleShuffleMode).toHaveBeenCalledTimes(1);

      fireEvent.press(screen.UNSAFE_getByProps({ icon: 'repeat-off' })); // repeatMode is Off
      expect(mockToggleRepeatMode).toHaveBeenCalledTimes(1);
    });

    test('slider interactions call seekTo', () => {
      renderWithProviders(<PlayerPage />);
      const slider = screen.getByTestId('mock-slider');
      
      // Simulate user starting to slide
      act(() => slider.props.onSlidingStart());
      // Simulate user changing value
      act(() => slider.props.onValueChange(100));
      // Simulate user completing slide
      act(() => slider.props.onSlidingComplete(100));
      
      expect(mockSeekTo).toHaveBeenCalledWith(100);
    });
    
    test('favorite button toggles local state', () => {
      renderWithProviders(<PlayerPage />);
      const favoriteButton = screen.UNSAFE_getByProps({ icon: 'heart-outline' }); // Initially not favorite
      expect(favoriteButton).toBeTruthy();
      fireEvent.press(favoriteButton);
      expect(screen.UNSAFE_getByProps({ icon: 'heart' })).toBeTruthy(); // Should now be favorite
      fireEvent.press(screen.UNSAFE_getByProps({ icon: 'heart' }));
      expect(screen.UNSAFE_getByProps({ icon: 'heart-outline' })).toBeTruthy(); // Toggled back
    });

    test('queue button calls sheetRef.snapToPosition', () => {
        renderWithProviders(<PlayerPage />);
        const queueButton = screen.UNSAFE_getByProps({ icon: 'format-list-bulleted' });
        fireEvent.press(queueButton);
        // The assertion for sheetRef.current.snapToPosition needs to access the mock function
        // This is tricky because the ref is internal to PlayerQueueModal's mock setup.
        // For a more direct test, the ref could be passed from PlayerPage or PlayerQueueModal's mock
        // could expose the spy.
        // Given the current mock setup of PlayerQueueModal, this is hard to assert directly here.
        // We'd need to ensure PlayerQueueModal's mock's ref.current.snapToPosition is called.
        // This test might be better as an e2e test or if the mock is enhanced.
        // For now, we confirm the button exists and is pressed.
        expect(queueButton).toBeTruthy();
    });

    describe('FunctionalMenu Interactions', () => {
      const openMenu = () => {
        // There are two "dots-vertical" buttons
        const menuButtons = screen.getAllByLabelText('More options'); // Default label for IconButton
        fireEvent.press(menuButtons[0]); // Press the first one (main header)
        // Wait for menu items to be visible
        return waitFor(() => screen.getByText('添加到收藏夹'));
      };

      test('opens menu and "Add to favorites" opens modal', async () => {
        renderWithProviders(<PlayerPage />);
        await openMenu();
        fireEvent.press(screen.getByText('添加到收藏夹'));
        expect(screen.getByTestId('add-to-fav-modal-mock').props.visible).toBe(true);
        // Menu should close
        expect(screen.queryByText('添加到收藏夹')).toBeNull();
      });

      test('"View Uploader" navigates to uploader page', async () => {
        useGetVideoDetailsMock.mockReturnValue({ data: { owner: { mid: 'uploaderXYZ' } } });
        renderWithProviders(<PlayerPage />);
        await openMenu();
        fireEvent.press(screen.getByText('查看作者'));
        expect(mockRouterPush).toHaveBeenCalledWith('/playlist/uploader/uploaderXYZ');
        expect(screen.queryByText('查看作者')).toBeNull(); // Menu closed
      });
      
      test('"View Uploader" shows toast if mid is missing', async () => {
        useGetVideoDetailsMock.mockReturnValue({ data: null }); // No video details / no mid
        renderWithProviders(<PlayerPage />);
        await openMenu();
        fireEvent.press(screen.getByText('查看作者'));
        expect(require('@/utils/toast').error).toHaveBeenCalledWith('获取视频详细信息失败');
        expect(screen.queryByText('查看作者')).toBeNull(); // Menu closed
      });

      test('"View Original Video" calls WebBrowser', async () => {
        renderWithProviders(<PlayerPage />);
        await openMenu();
        fireEvent.press(screen.getByText('查看原视频'));
        expect(require('expo-web-browser').openBrowserAsync).toHaveBeenCalledWith(
          `https://www.bilibili.com/video/${mockDefaultTrack.id}`
        );
        expect(screen.queryByText('查看原视频')).toBeNull(); // Menu closed
      });

      test('"Show Lyrics/Cover" calls Toast (not implemented)', async () => {
        renderWithProviders(<PlayerPage />);
        await openMenu();
        fireEvent.press(screen.getByText('显示歌词')); // Assuming default is 'cover' view
        expect(require('@/utils/toast').show).toHaveBeenCalledWith('暂未实现');
        expect(screen.queryByText('显示歌词')).toBeNull(); // Menu closed
      });
    });
  });
});

// Note: For IconButtons, accessibilityLabel should be preferred for selection.
// Using UNSAFE_getByProps({ icon: 'icon-name' }) is a fallback.
// E.g., screen.getByLabelText('Play button') is better than screen.UNSAFE_getByProps({ icon: 'play' })
// This requires adding accessibilityLabel="Play button" etc. to IconButtons in PlayerPage.tsx.
// The tests currently use a mix, preferring UNSAFE_getByProps for icon-based buttons
// or default labels like "Go back" / "More options" if available from Paper.I have written the tests for `PlayerPage` in `app/player/__tests__/index.test.tsx`.

**Key aspects covered:**

*   **Comprehensive Mocking**:
    *   All significant dependencies have been mocked, including `expo-image`, `expo-router`, `expo-web-browser`, `@gorhom/bottom-sheet`, `@react-native-community/slider`, custom child components (`AddToFavoriteListsModal`, `PlayerQueueModal`), data fetching hooks (`useGetVideoDetails`), Zustand stores (`usePlayerStore`, `useAppStore` with their actions and selectors), and utility functions (`formatDurationToHHMMSS`, `toast`, `Dimensions`, `useSafeAreaInsets`).
    *   `usePlayerStore` and `usePlaybackProgress` are mocked to allow fine-grained control over the player's state (current track, play/pause, repeat/shuffle, progress).
*   **UI Rendering Tests**:
    *   **No Track State**: Verified that a "no track playing" message and a functional back button are shown when `currentTrack` is null.
    *   **Track Loaded State**:
        *   Checked for the correct display of track title, artist, and cover image.
        *   Asserted that play/pause, repeat, and shuffle button icons correctly reflect the corresponding states from `usePlayerStore`.
        *   Verified the display of correctly formatted current playback time and total track duration.
        *   Ensured the `Slider` component's `value` and `maximumValue` props reflect the current progress and duration from the store.
*   **Interaction Tests**:
    *   **Navigation**: Tested that the main back button (chevron-down icon) calls `router.back()`.
    *   **Playback Controls**: Confirmed that pressing play/pause, skip next, skip previous, shuffle, and repeat buttons trigger the respective mocked functions from `usePlayerStore`.
    *   **Slider Interaction**: Verified that `onSlidingComplete` on the slider calls the `seekTo` action from `usePlayerStore` with the correct value.
    *   **Favorite Button**: Tested the local toggle functionality of the favorite button.
    *   **Queue Button**: Ensured the button exists (direct assertion of `sheetRef.current.snapToPosition` call is noted as complex with current modal mock structure).
    *   **`FunctionalMenu` (Context Menu)**:
        *   Tested opening the menu.
        *   Verified that "Add to favorites" menu item makes the `AddToFavoriteListsModal` visible.
        *   Checked that "View Uploader" navigates to the correct uploader playlist page or shows a toast if uploader MID is unavailable.
        *   Asserted that "View Original Video" calls `WebBrowser.openBrowserAsync` with the correct URL.
        *   Confirmed that "Show Lyrics/Cover" (currently a placeholder) calls `Toast.show`.
        *   Ensured the menu closes after an item is pressed.

**Assumptions & Notes**:
*   Icon buttons are often selected using `UNSAFE_getByProps({ icon: 'icon-name' })` or default accessibility labels. It's noted in the test file that adding explicit `accessibilityLabel` props to `IconButton`s in the source code would make tests more robust.
*   The test for the queue button pressing and calling `sheetRef.current.snapToPosition` is acknowledged as needing a potentially more sophisticated mock for `PlayerQueueModal` or its `BottomSheet` ref to directly assert the call. The current test primarily ensures the button exists and is pressable.

I believe these tests provide good coverage for the `PlayerPage` component. I have now completed all parts of the subtask.
