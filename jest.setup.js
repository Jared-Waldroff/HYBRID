
// Set up globals
global.__DEV__ = true;
global.window = {};
global.window.setTimeout = setTimeout;
global.window.clearTimeout = clearTimeout;
global.navigator = {};

// Mock React Native manually to avoid NativeModules access in Node env
jest.mock('react-native', () => {
    const React = require('react');
    const View = (props) => React.createElement('View', props, props.children);
    const Text = (props) => React.createElement('Text', props, props.children);

    return {
        NativeModules: {
            SettingsManager: { settings: { AppleLocale: 'en_US', AppleLanguages: ['en'] } },
            StatusBarManager: { getHeight: jest.fn() },
            PlatformConstants: { forceTouchAvailable: false },
        },
        AppState: {
            addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
            currentState: 'active',
        },
        Platform: {
            OS: 'ios',
            select: jest.fn(objs => objs.ios),
        },
        Dimensions: {
            get: jest.fn().mockReturnValue({ width: 375, height: 812, scale: 2, fontScale: 1 }),
            addEventListener: jest.fn(),
        },
        StyleSheet: {
            create: jest.fn(styles => styles),
            flatten: jest.fn(style => style),
        },
        View,
        Text,
        Image: (props) => React.createElement('Image', props),
        ScrollView: (props) => React.createElement('ScrollView', props, props.children),
        TextInput: (props) => React.createElement('TextInput', props),
        TouchableOpacity: (props) => React.createElement('TouchableOpacity', props, props.children),
        Pressable: (props) => React.createElement('Pressable', props, props.children),
        Alert: { alert: jest.fn() },
    };
});

// Mock Expo modules
jest.mock('expo-image', () => ({
    Image: {
        prefetch: jest.fn(),
    },
}));

jest.mock('expo-font', () => ({
    isLoaded: jest.fn().mockReturnValue(true),
    loadAsync: jest.fn(),
}));

jest.mock('expo-linear-gradient', () => ({
    LinearGradient: (props) => props.children,
}));

jest.mock('expo-haptics', () => ({
    impactAsync: jest.fn(),
    notificationAsync: jest.fn(),
    selectionAsync: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
    maybeCompleteAuthSession: jest.fn(),
    openAuthSessionAsync: jest.fn(),
}));

jest.mock('expo-auth-session', () => ({
    makeRedirectUri: jest.fn(),
    useAuthRequest: jest.fn().mockReturnValue([null, null, jest.fn()]),
    exchangeCodeAsync: jest.fn(),
    refreshAsync: jest.fn(),
    fetchUserInfoAsync: jest.fn(),
}));

jest.mock('expo-modules-core', () => ({
    NativeModulesProxy: {},
    EventEmitter: jest.fn(),
    requireNativeModule: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
}));

// Mock Navigation (minimal)
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({
        navigate: jest.fn(),
        goBack: jest.fn(),
        addListener: jest.fn(),
    }),
    useFocusEffect: jest.fn((cb) => cb()),
    useRoute: () => ({ params: {} }),
}));
