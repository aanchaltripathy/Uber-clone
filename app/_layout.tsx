import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ title: 'Search' }} />
      <Stack.Screen name="ride" options={{ title: 'Ride' }} />
      <Stack.Screen name="steps" options={{ title: 'Route Steps' }} />
    </Stack>
  );
}


