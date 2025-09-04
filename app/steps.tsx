import { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Step = { instruction: string; distanceMeters: number; durationSeconds: number };

export default function StepsScreen() {
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('routeSteps');
        if (raw) {
          const parsed = JSON.parse(raw) as Step[];
          setSteps(parsed);
        }
      } catch {}
    })();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Route steps</Text>
        <FlatList
          data={steps}
          keyExtractor={(_, idx) => String(idx)}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <View style={{ backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10 }}>
              <Text style={{ color: '#111827' }}>{item.instruction}</Text>
              <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>
                {(item.distanceMeters / 1000).toFixed(1)} km • {Math.max(1, Math.round(item.durationSeconds / 60))} min
              </Text>
            </View>
          )}
          ListEmptyComponent={<Text style={{ color: '#6B7280' }}>No steps available</Text>}
        />
      </View>
    </SafeAreaView>
  );
}













