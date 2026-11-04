import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { migrate } from '@/lib/db';
import { AppStateProvider, useApp } from '@/lib/store';
import { colors } from '@/theme';

function RootStack() {
  const { ready, profile } = useApp();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  const onboarded = !!profile;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="profile" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="create-food" options={{ presentation: 'modal' }} />
        <Stack.Screen name="program-setup" options={{ presentation: 'modal' }} />
        <Stack.Screen name="science" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout/[key]" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen
          name="exercise/[id]"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.85, 1],
            sheetGrabberVisible: true,
            sheetCornerRadius: 28,
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
        <Stack.Screen
          name="food-amount"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.85, 1],
            sheetGrabberVisible: true,
            sheetCornerRadius: 28,
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
        <Stack.Screen
          name="quick-add"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.8, 1],
            sheetGrabberVisible: true,
            sheetCornerRadius: 28,
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
        <Stack.Screen
          name="entry/[id]"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.75, 1],
            sheetGrabberVisible: true,
            sheetCornerRadius: 28,
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
        <Stack.Screen
          name="weight"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.62],
            sheetGrabberVisible: true,
            sheetCornerRadius: 28,
            contentStyle: { backgroundColor: colors.bg },
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SQLiteProvider databaseName="trackysf.db" onInit={migrate}>
        <AppStateProvider>
          <StatusBar style="light" />
          <RootStack />
        </AppStateProvider>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
