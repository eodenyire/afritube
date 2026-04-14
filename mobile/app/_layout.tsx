import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="watch/[id]" options={{ title: '', headerTransparent: true }} />
        <Stack.Screen name="creator/[id]" options={{ title: 'Creator Profile' }} />
        <Stack.Screen name="upload" options={{ title: 'Upload Content' }} />
        <Stack.Screen name="search" options={{ title: 'Search' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
