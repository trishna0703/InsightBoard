// Global Jest setup: runs before every test file.

// Expo injects EXPO_PUBLIC_* vars at build time; under Jest they're absent, so
// createClient() in services/supabase.ts would throw "supabaseUrl is required".
// Provide harmless test values so module-load side effects succeed.
process.env.EXPO_PUBLIC_SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "http://localhost:54321";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "test-anon-key";
process.env.EXPO_PUBLIC_TEAM_ID =
  process.env.EXPO_PUBLIC_TEAM_ID || "test-team";

// AsyncStorage has no native module under Jest — use the library's official mock.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Toast renders through native UI; stub it so hooks that fire toasts run headless.
jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn(), hide: jest.fn() },
}));
