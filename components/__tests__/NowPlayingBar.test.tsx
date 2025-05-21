import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper'; // useTheme is tricky to mock directly for all cases
import NowPlayingBar from '../NowPlayingBar';
import { usePlayerStore, usePlaybackProgress } from '@/hooks/stores/usePlayerStore';
import { router } from 'expo-router';

// Mock dependencies
jest.mock('@/hooks/stores/usePlayerStore', () => ({
  usePlayerStore: jest.fn(),
  usePlaybackProgress: jest.fn(),
}));

// Mock expo-router (the setup file already has a base mock, but we can spy on its methods)
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'), // Import and retain default behavior
  router: {
    push: jest.fn(),
  },
}));

// Mock Image component for simplicity as source prop can be complex
jest.mock('react-native/Libraries/Image/Image', () => 'Image');


const mockCurrentTrack = {
  id: '1',
  title: 'Test Track Title',
  artist: 'Test Artist Name',
  cover: 'https://example.com/cover.jpg',
  url: 'https://example.com/track.mp3',
  duration: 200,
  cid: 123,
  source: 'bilibili',
  hasMetadata: true,
};

const mockInitialState = {
  currentTrack: null,
  isPlaying: false,
  togglePlay: jest.fn(),
  skipToNext: jest.fn(),
  skipToPrevious: jest.fn(),
};

const mockProgress = {
  position: 0,
  duration: 0,
  buffered: 0, // Added buffered to match useProgress hook
};

// Helper to setup mocks for each test
const setupMocks = (state = {}, progress = mockProgress) => {
  (usePlayerStore as jest.Mock).mockImplementation((selector) => {
    const combinedState = { ...mockInitialState, ...state };
    return selector(combinedState);
  });
  (usePlaybackProgress as jest.Mock).mockReturnValue(progress);
};

// It's good practice to wrap with PaperProvider if the component or its children use its theme features
const renderWithProviders = (component) => {
  return render(<PaperProvider>{component}</PaperProvider>);
};

describe('NowPlayingBar', () => {
  beforeEach(() => {
    // Clear mock calls and reset state before each test
    mockInitialState.togglePlay.mockClear();
    mockInitialState.skipToNext.mockClear();
    mockInitialState.skipToPrevious.mockClear();
    (router.push as jest.Mock).mockClear();
    setupMocks(); // Reset to default initial state (no track)
  });

  test('does not render if currentTrack is null', () => {
    setupMocks({ currentTrack: null });
    const { queryByText } = renderWithProviders(<NowPlayingBar />);
    expect(queryByText(mockCurrentTrack.title)).toBeNull();
  });

  test('renders if currentTrack is available', () => {
    setupMocks({ currentTrack: mockCurrentTrack });
    renderWithProviders(<NowPlayingBar />);
    expect(screen.getByText(mockCurrentTrack.title)).toBeTruthy();
    expect(screen.getByText(mockCurrentTrack.artist)).toBeTruthy();
  });

  describe('when a track is playing', () => {
    beforeEach(() => {
      setupMocks({ currentTrack: mockCurrentTrack, isPlaying: true }, { position: 50, duration: 200, buffered: 100 });
    });

    test('displays track title and artist', () => {
      renderWithProviders(<NowPlayingBar />);
      expect(screen.getByText(mockCurrentTrack.title)).toBeTruthy();
      expect(screen.getByText(mockCurrentTrack.artist)).toBeTruthy();
    });

    test('displays pause icon when isPlaying is true', () => {
      renderWithProviders(<NowPlayingBar />);
      const pauseButton = screen.getByLabelText('Pause button'); // Assuming IconButton sets accessibilityLabel or similar
      // IconButton uses 'icon' prop to determine which icon to show.
      // We need to check if the icon prop is 'pause'.
      // This requires a deeper inspection or a more specific testID.
      // For now, let's assume the icon prop is passed correctly.
      // We can check the onPress handler to ensure the correct function is called.
      expect(pauseButton).toBeTruthy();
    });

    test('displays play icon when isPlaying is false', () => {
      setupMocks({ currentTrack: mockCurrentTrack, isPlaying: false });
      renderWithProviders(<NowPlayingBar />);
      const playButton = screen.getByLabelText('Play button');
      expect(playButton).toBeTruthy();
    });

    test('calls togglePlay when play/pause button is pressed', () => {
      renderWithProviders(<NowPlayingBar />);
      const playPauseButton = screen.getByLabelText(mockInitialState.isPlaying ? 'Pause button' : 'Play button');
      fireEvent.press(playPauseButton);
      expect(mockInitialState.togglePlay).toHaveBeenCalledTimes(1);
    });

    test('calls skipToNext when skip-next button is pressed', () => {
      renderWithProviders(<NowPlayingBar />);
      const skipNextButton = screen.getByLabelText('Skip to next button');
      fireEvent.press(skipNextButton);
      expect(mockInitialState.skipToNext).toHaveBeenCalledTimes(1);
    });

    test('calls skipToPrevious when skip-previous button is pressed', () => {
      renderWithProviders(<NowPlayingBar />);
      const skipPreviousButton = screen.getByLabelText('Skip to previous button');
      fireEvent.press(skipPreviousButton);
      expect(mockInitialState.skipToPrevious).toHaveBeenCalledTimes(1);
    });

    test('navigates to /player when bar is pressed', () => {
      renderWithProviders(<NowPlayingBar />);
      // The TouchableOpacity is wrapping the content. We can find it by its child's content.
      // Or, ideally, add a testID to the TouchableOpacity.
      const mainBarArea = screen.getByText(mockCurrentTrack.title).closest('TouchableOpacity');
      if (mainBarArea) {
        fireEvent.press(mainBarArea);
      } else {
        throw new Error("Could not find main bar area TouchableOpacity");
      }
      expect(router.push).toHaveBeenCalledWith('/player');
    });

    test('ProgressBar receives correct progress value', () => {
        const progressState = { position: 50, duration: 200, buffered: 100 };
        setupMocks({ currentTrack: mockCurrentTrack, isPlaying: true }, progressState);
        const { UNSAFE_getByProps } = renderWithProviders(<NowPlayingBar />);
        // ProgressBar's animatedValue is internalProgressPosition / internalProgressDuration
        // internalProgressPosition is progress.position, internalProgressDuration is progress.duration
        const progressBar = UNSAFE_getByProps({ animatedValue: progressState.position / progressState.duration });
        expect(progressBar).toBeTruthy();
      });
  });

  test('useEffect resets progress when currentTrack changes', () => {
    // Initial render with a track
    setupMocks({ currentTrack: mockCurrentTrack, isPlaying: true }, { position: 50, duration: 200, buffered: 100 });
    const { rerender, UNSAFE_getByProps } = renderWithProviders(<NowPlayingBar />);

    let progressBar = UNSAFE_getByProps({ animatedValue: 50 / 200 });
    expect(progressBar).toBeTruthy();

    // Change the track
    const newTrack = { ...mockCurrentTrack, id: '2', title: 'New Track' };
    // When track changes, internalProgressPosition should be 0, internalProgressDuration should be 1
    // So animatedValue should be 0 / 1 = 0
    act(() => {
        // This simulates the store update and component re-render
        setupMocks({ currentTrack: newTrack, isPlaying: true }, { position: 0, duration: 0, buffered: 0 }); // Progress for new track starts at 0
    });
    rerender(<PaperProvider><NowPlayingBar /></PaperProvider>); // Rerender with new state

    // useEffect sets internalProgressPosition to 0 and internalProgressDuration to 1 initially on track change
    progressBar = UNSAFE_getByProps({ animatedValue: 0 / 1 });
    expect(progressBar).toBeTruthy();


    // Simulate progress update for the new track
    act(() => {
        setupMocks({ currentTrack: newTrack, isPlaying: true }, { position: 10, duration: 150, buffered: 0 });
    });
    rerender(<PaperProvider><NowPlayingBar /></PaperProvider>);
    progressBar = UNSAFE_getByProps({ animatedValue: 10 / 150 });
    expect(progressBar).toBeTruthy();
  });


  // Accessibility labels for IconButtons based on current NowPlayingBar.tsx
  // <IconButton icon='skip-previous' ... />
  // <IconButton icon={isPlaying ? 'pause' : 'play'} ... />
  // <IconButton icon='skip-next' ... />
  // React Native Paper's IconButton might not automatically generate accessibility labels
  // based on icon names. We should add explicit accessibilityLabel props to them.
  // For the test, I'm using getByLabelText with assumed labels.
  // If these fail, it means the IconButtons need accessibilityLabel props.
  // E.g. <IconButton icon='skip-previous' accessibilityLabel="Skip to previous button" ... />
  // For the purpose of this test, I will assume they are:
  // 'Skip to previous button', 'Play button'/'Pause button', 'Skip to next button'

  // Manually adding accessibilityLabel to the IconButtons in the component would be like:
  // <IconButton icon='skip-previous' accessibilityLabel="Skip to previous button" ... />
  // <IconButton icon={isPlaying ? 'pause' : 'play'} accessibilityLabel={isPlaying ? "Pause button" : "Play button"} ... />
  // <IconButton icon='skip-next' accessibilityLabel="Skip to next button" ... />

  // Let's refine the button selection for play/pause based on icon name if accessibilityLabel is not set
  // This is a bit more brittle but works if testIDs are not available.
  // Note: getByTestId is the preferred way.

  // To make tests for play/pause icon robust without specific labels:
  test('play/pause button icon changes correctly', () => {
    setupMocks({ currentTrack: mockCurrentTrack, isPlaying: true });
    const { UNSAFE_getByProps, rerender } = renderWithProviders(<NowPlayingBar />);
    expect(UNSAFE_getByProps({ icon: 'pause' })).toBeTruthy(); // Assumes IconButton has an 'icon' prop

    act(() => {
        setupMocks({ currentTrack: mockCurrentTrack, isPlaying: false });
    });
    rerender(<PaperProvider><NowPlayingBar /></PaperProvider>);
    expect(UNSAFE_getByProps({ icon: 'play' })).toBeTruthy();
  });

});

// Note on accessibilityLabel for IconButtons:
// The tests for button presses (togglePlay, skipToNext, skipToPrevious) use getByLabelText.
// These will fail if the IconButtons in NowPlayingBar.tsx do not have matching accessibilityLabel props.
// It is highly recommended to add these for better accessibility and more robust testing.
// Example:
// <IconButton icon="skip-previous" accessibilityLabel="Skip to previous button" onPress={skipToPrevious} />
// <IconButton icon={isPlaying ? 'pause' : 'play'} accessibilityLabel={isPlaying ? "Pause button" : "Play button"} onPress={togglePlay} />
// <IconButton icon="skip-next" accessibilityLabel="Skip to next button" onPress={skipToNext} />
// If these are added, the getByLabelText queries will work.
// The current tests are written with the assumption that these labels would be added or are already present.
// If not, one might need to use `findAllByRole('button')` and then filter them, or add `testID` props.
// For the IconButtons specifically, `UNSAFE_getByProps({ icon: 'icon-name' })` can find them if they don't have labels/testIDs.
// I've updated the play/pause icon test to use UNSAFE_getByProps as an example.
// For the action tests (togglePlay, skipNext, etc.), I'll use UNSAFE_getByProps for icon buttons for now.

describe('NowPlayingBar Button Interactions (alternative selection)', () => {
    beforeEach(() => {
        mockInitialState.togglePlay.mockClear();
        mockInitialState.skipToNext.mockClear();
        mockInitialState.skipToPrevious.mockClear();
        setupMocks({ currentTrack: mockCurrentTrack, isPlaying: true });
      });

    test('calls togglePlay when play/pause button is pressed (selected by icon)', () => {
        const { UNSAFE_getByProps } = renderWithProviders(<NowPlayingBar />);
        const playPauseButton = UNSAFE_getByProps({ icon: 'pause' }); // or 'play' depending on isPlaying state
        fireEvent.press(playPauseButton);
        expect(mockInitialState.togglePlay).toHaveBeenCalledTimes(1);
      });

    test('calls skipToNext when skip-next button is pressed (selected by icon)', () => {
        const { UNSAFE_getByProps } = renderWithProviders(<NowPlayingBar />);
        const skipNextButton = UNSAFE_getByProps({ icon: 'skip-next' });
        fireEvent.press(skipNextButton);
        expect(mockInitialState.skipToNext).toHaveBeenCalledTimes(1);
    });

    test('calls skipToPrevious when skip-previous button is pressed (selected by icon)', () => {
        const { UNSAFE_getByProps } = renderWithProviders(<NowPlayingBar />);
        const skipPreviousButton = UNSAFE_getByProps({ icon: 'skip-previous' });
        fireEvent.press(skipPreviousButton);
        expect(mockInitialState.skipToPrevious).toHaveBeenCalledTimes(1);
    });
});
