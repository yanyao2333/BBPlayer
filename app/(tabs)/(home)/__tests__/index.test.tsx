import React from 'react';
import { render, fireEvent, screen, act, waitFor } from '@testing-library/react-native';
import { PaperProvider, DefaultTheme } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from '../index'; // Adjust path if HomePage is not in parent dir of __tests__

// --- Mock Dependencies ---
jest.mock('expo-image', () => {
  const MockImage = require('react-native/Libraries/Image/Image');
  return { Image: MockImage };
});

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: {
    push: jest.fn(),
  },
}));

jest.mock('@/components/NowPlayingBar', () => () => <jest.fn testID="now-playing-bar-mock" />);

// Mock custom hooks from queries
jest.mock('@/hooks/queries/bilibili/useFavoriteData', () => ({
  ...jest.requireActual('@/hooks/queries/bilibili/useFavoriteData'), // keep favoriteListQueryKeys
  useGetFavoritePlaylists: jest.fn(),
}));
jest.mock('@/hooks/queries/bilibili/useUserData', () => ({
  ...jest.requireActual('@/hooks/queries/bilibili/useUserData'), // keep userQueryKeys
  usePersonalInformation: jest.fn(),
  useRecentlyPlayed: jest.fn(),
}));

// Mock stores
const mockSetBilibiliCookie = jest.fn();
const mockSetSendPlayHistory = jest.fn();
const mockAddToQueue = jest.fn();
const mockBilibiliApi = {
  getVideoDetails: jest.fn(),
  getPageList: jest.fn(),
  getAudioStream: jest.fn(),
  reportPlaybackHistory: jest.fn(),
};

jest.mock('@/hooks/stores/useAppStore', () => jest.fn());
jest.mock('@/hooks/stores/usePlayerStore', () => ({
  usePlayerStore: jest.fn((selector) => {
    const state = {
      addToQueue: mockAddToQueue,
      // Assuming other parts of the store might be default or not directly accessed by HomePage itself
      // If HomePage directly accesses other state like `currentTrack` for example, it needs to be in this mock
    };
    // If selector is undefined, it means the component is calling usePlayerStore() directly (getting the whole store)
    // If selector is a function, it means it's usePlayerStore(state => state.something)
    return selector ? selector(state) : state;
  }),
}));


jest.mock('@/utils/log', () => {
  const mockLogInstance = {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    sentry: jest.fn(),
  };
  return {
    extend: () => mockLogInstance,
    info: mockLogInstance.info,
    debug: mockLogInstance.debug,
    error: mockLogInstance.error,
    sentry: mockLogInstance.sentry,
  };
});
jest.mock('@/utils/toast', () => ({
  error: jest.fn(),
  success: jest.fn(),
  warning: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}));


// --- Helper Functions & Data ---
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, 
      gcTime: Infinity, 
    },
  },
});

// Path for HomePage for the tests (relative to this test file)
// The test file is in app/(tabs)/(home)/__tests__/index.test.tsx
// So HomePage is in app/(tabs)/(home)/index.tsx which is ../index.tsx
const ActualHomePage = jest.requireActual('../index').default;


const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={DefaultTheme}>{component}</PaperProvider>
    </QueryClientProvider>
  );
};

const usePersonalInformationMock = require('@/hooks/queries/bilibili/useUserData').usePersonalInformation as jest.Mock;
const useRecentlyPlayedMock = require('@/hooks/queries/bilibili/useUserData').useRecentlyPlayed as jest.Mock;
const useGetFavoritePlaylistsMock = require('@/hooks/queries/bilibili/useFavoriteData').useGetFavoritePlaylists as jest.Mock;
const useAppStoreMock = require('@/hooks/stores/useAppStore') as jest.Mock;


const mockDefaultPersonalInfo = {
  name: 'TestUser',
  face: 'https://example.com/avatar.jpg',
  mid: '12345',
};

const mockDefaultAppStoreState = {
  bilibiliCookie: 'test-cookie',
  bilibiliApi: mockBilibiliApi,
  settings: { sendPlayHistory: false },
  setBilibiliCookie: mockSetBilibiliCookie,
  setSendPlayHistory: mockSetSendPlayHistory,
};

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();

    usePersonalInformationMock.mockReturnValue({
      data: mockDefaultPersonalInfo,
      isPending: false,
      isError: false,
    });
    useRecentlyPlayedMock.mockReturnValue({
      data: [{ id: 'rp1', title: 'Recently Played 1', artist: 'Artist RP', cover: 'cover.jpg', duration: 100, cid: 1, source: 'bilibili', hasMetadata: true, url: 'url' }],
      isPending: false,
      isError: false,
      refetch: jest.fn(),
    });
    useGetFavoritePlaylistsMock.mockReturnValue({
      data: [{ id: 'fav1', mid: 'mid1', title: 'Favorite Playlist 1', cover: 'cover.jpg', count: 10, media_count: 10, type: 1, intro: ''}],
      isPending: false,
      isError: false,
    });
    useAppStoreMock.mockImplementation((selector) => selector(mockDefaultAppStoreState));
  });

  test('renders BBPlayer title and greeting with user name', () => {
    renderWithProviders(<ActualHomePage />);
    expect(screen.getByText('BBPlayer')).toBeTruthy();
    expect(screen.getByText(`，${mockDefaultPersonalInfo.name}`)).toBeTruthy();
    const avatar = screen.UNSAFE_getByProps({ source: { uri: mockDefaultPersonalInfo.face } });
    expect(avatar).toBeTruthy();
  });

  test('shows "陌生人" (stranger) if personal info is pending or error', () => {
    usePersonalInformationMock.mockReturnValue({ data: null, isPending: true, isError: false });
    renderWithProviders(<ActualHomePage />);
    expect(screen.getByText('，陌生人')).toBeTruthy();

    queryClient.clear(); // Clear query client for next state
    usePersonalInformationMock.mockReturnValue({ data: null, isPending: false, isError: true });
    renderWithProviders(<ActualHomePage />); 
    expect(screen.getByText('，陌生人')).toBeTruthy();
  });

  test('opens SetCookieDialog when avatar is pressed', async () => {
    renderWithProviders(<ActualHomePage />);
    const avatar = screen.UNSAFE_getByProps({ source: { uri: mockDefaultPersonalInfo.face } });
    const touchableAvatarContainer = avatar.parent; 
    fireEvent.press(touchableAvatarContainer);
    await waitFor(() => expect(screen.getByText('设置 Bilibili Cookie')).toBeTruthy());
  });

  test('shows SetCookieDialog if no cookie is present initially', async () => {
    useAppStoreMock.mockImplementation((selector) => selector({
      ...mockDefaultAppStoreState,
      bilibiliCookie: '', 
    }));
    renderWithProviders(<ActualHomePage />);
    expect(require('@/utils/toast').warning).toHaveBeenCalledWith('看起来你还没设置 Cookie，请先设置一下吧！');
    await waitFor(() => expect(screen.getByText('设置 Bilibili Cookie')).toBeTruthy());
  });

  describe('FavoriteList Section', () => {
    test('renders favorite playlists', () => {
      renderWithProviders(<ActualHomePage />);
      expect(screen.getByText('收藏夹')).toBeTruthy();
      expect(screen.getByText('Favorite Playlist 1')).toBeTruthy();
      expect(screen.getByText('10 首歌曲')).toBeTruthy();
    });

    test('shows loading indicator for favorite playlists', () => {
      useGetFavoritePlaylistsMock.mockReturnValue({ data: null, isPending: true, isError: false });
      renderWithProviders(<ActualHomePage />);
      expect(screen.queryByText('Favorite Playlist 1')).toBeNull();
      expect(screen.queryByText('加载收藏夹失败')).toBeNull();
      expect(screen.UNSAFE_getAllByType('ActivityIndicator').length).toBeGreaterThanOrEqual(1);
    });

     test('shows error message for favorite playlists', () => {
      useGetFavoritePlaylistsMock.mockReturnValue({ data: null, isPending: false, isError: true });
      renderWithProviders(<ActualHomePage />);
      expect(screen.getByText('加载收藏夹失败')).toBeTruthy();
    });

    test('shows "暂无收藏夹" if no playlists', () => {
      useGetFavoritePlaylistsMock.mockReturnValue({ data: [], isPending: false, isError: false });
      renderWithProviders(<ActualHomePage />);
      expect(screen.getByText('暂无收藏夹')).toBeTruthy();
    });

    test('navigates to /library when "查看全部" for favorites is pressed', () => {
      renderWithProviders(<ActualHomePage />);
      const viewAllButtons = screen.getAllByText('查看全部');
      fireEvent.press(viewAllButtons[0]); 
      expect(require('expo-router').router.push).toHaveBeenCalledWith('/library');
    });
  });

  describe('RecentlyPlayed Section', () => {
    test('renders recently played tracks', () => {
      renderWithProviders(<ActualHomePage />);
      expect(screen.getByText('最近播放')).toBeTruthy();
      expect(screen.getByText('Recently Played 1')).toBeTruthy();
      expect(screen.getByText('Artist RP')).toBeTruthy();
    });

    test('shows loading indicator for recently played', () => {
      useRecentlyPlayedMock.mockReturnValue({ data: null, isPending: true, isError: false, refetch: jest.fn() });
      renderWithProviders(<ActualHomePage />);
      expect(screen.queryByText('Recently Played 1')).toBeNull();
      expect(screen.queryByText('加载最近播放失败')).toBeNull();
      expect(screen.UNSAFE_getAllByType('ActivityIndicator').length).toBeGreaterThanOrEqual(1);
    });

    test('shows error message for recently played', () => {
      useRecentlyPlayedMock.mockReturnValue({ data: null, isPending: false, isError: true, refetch: jest.fn() });
      renderWithProviders(<ActualHomePage />);
      expect(screen.getByText('加载最近播放失败')).toBeTruthy();
    });

    test('shows "暂无播放记录" if no recently played tracks', () => {
      useRecentlyPlayedMock.mockReturnValue({ data: [], isPending: false, isError: false, refetch: jest.fn() });
      renderWithProviders(<ActualHomePage />);
      expect(screen.getByText('暂无播放记录')).toBeTruthy();
    });

     test('"查看全部" for recently played logs to console', () => {
      renderWithProviders(<ActualHomePage />);
      const viewAllButtons = screen.getAllByText('查看全部');
      fireEvent.press(viewAllButtons[1]); 
      expect(require('@/utils/log').extend().info).toHaveBeenCalledWith('View All Recently Played pressed');
    });
  });

  test('renders NowPlayingBar mock', () => {
    renderWithProviders(<ActualHomePage />);
    expect(screen.getByTestId('now-playing-bar-mock')).toBeTruthy();
  });

  describe('SetCookieDialog Interaction', () => {
    const openDialog = async () => {
      const avatar = screen.UNSAFE_getByProps({ source: { uri: mockDefaultPersonalInfo.face } });
      const touchableAvatarContainer = avatar.parent;
      fireEvent.press(touchableAvatarContainer);
      await waitFor(() => screen.getByText('设置 Bilibili Cookie'));
    };

    test('dialog input and switch work correctly', async () => {
      useAppStoreMock.mockImplementation((selector) => selector({
        ...mockDefaultAppStoreState,
        bilibiliCookie: 'old-cookie',
        settings: { sendPlayHistory: false },
      }));
      renderWithProviders(<ActualHomePage />);
      await openDialog();

      const cookieInput = screen.getByLabelText('Cookie');
      fireEvent.changeText(cookieInput, 'new-test-cookie');
      expect(screen.getByLabelText('Cookie').props.value).toBe('new-test-cookie');

      const historySwitch = screen.getByRole('switch');
      expect(historySwitch.props.value).toBe(false); 
      fireEvent(historySwitch, 'onValueChange', true); // Note: Paper Switch uses onValueChange, not valueChange
      expect(screen.getByRole('switch').props.value).toBe(true);
    });

    test('dialog confirm button updates cookie and settings', async () => {
      useAppStoreMock.mockImplementation((selector) => selector({
        ...mockDefaultAppStoreState,
        bilibiliCookie: 'old-cookie',
        settings: { sendPlayHistory: false },
      }));
      renderWithProviders(<ActualHomePage />);
      await openDialog();

      const newCookieValue = 'new-cookie-value';
      fireEvent.changeText(screen.getByLabelText('Cookie'), newCookieValue);
      fireEvent(screen.getByRole('switch'), 'onValueChange', true);

      fireEvent.press(screen.getByText('确定'));

      expect(mockSetBilibiliCookie).toHaveBeenCalledWith(newCookieValue);
      expect(mockSetSendPlayHistory).toHaveBeenCalledWith(true);
      await waitFor(() => {
        expect(screen.queryByText('设置 Bilibili Cookie')).toBeNull();
      });
    });

     test('dialog cancel button closes dialog without changes', async () => {
      renderWithProviders(<ActualHomePage />);
      await openDialog();

      fireEvent.changeText(screen.getByLabelText('Cookie'), 'some-new-text');
      fireEvent.press(screen.getByText('取消'));

      expect(mockSetBilibiliCookie).not.toHaveBeenCalled();
      expect(mockSetSendPlayHistory).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.queryByText('设置 Bilibili Cookie')).toBeNull();
      });
    });
  });

  test('greeting message changes based on time of day', () => {
    const RealDate = global.Date;
    const mockDate = (isoDateString) => {
      const MockDateClass = class extends RealDate {
        constructor() {
          super(isoDateString); // Construct with the specific date
        }
        // Override other methods if necessary, like getHours for consistency with new Date()
        getHours() {
          return new RealDate(isoDateString).getHours();
        }
      };
      global.Date = MockDateClass as any;
    };

    try {
      mockDate('2023-01-01T03:00:00Z'); // 3 AM in UTC
      renderWithProviders(<ActualHomePage />);
      expect(screen.getByText(/凌晨好/)).toBeTruthy();
      
      queryClient.clear();
      usePersonalInformationMock.mockReturnValue({ data: mockDefaultPersonalInfo, isPending: false, isError: false });
      useAppStoreMock.mockImplementation((selector) => selector(mockDefaultAppStoreState));
      
      mockDate('2023-01-01T14:00:00Z'); // 2 PM in UTC
      renderWithProviders(<ActualHomePage />);
      expect(screen.getByText(/下午好/)).toBeTruthy();

    } finally {
      global.Date = RealDate; 
    }
  });
});
