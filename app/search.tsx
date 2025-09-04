import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fetchPlacesAutocomplete, fetchPlaceDetails } from '../lib/maps';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Suggestion = {
  id: string;
  name: string;
  subtitle: string;
  latitude: number;
  longitude: number;
};

const FALLBACKS: Suggestion[] = [
  { id: '1', name: 'Airport', subtitle: 'SFO International', latitude: 37.6213, longitude: -122.379 },
  { id: '2', name: 'Downtown', subtitle: 'San Francisco', latitude: 37.7858, longitude: -122.401 },
];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Suggestion[]>(FALLBACKS);

  useEffect(() => {
    let active = true;
    const run = async () => {
      const q = query.trim();
      if (!q) {
        setResults(FALLBACKS);
        return;
      }
      try {
        setLoading(true);
        const predictions = await fetchPlacesAutocomplete(q);
        if (!active) return;
        setResults(
          predictions.map((p) => ({
            id: p.place_id,
            name: p.structured?.main_text ?? p.description,
            subtitle: p.structured?.secondary_text ?? '',
            latitude: 0,
            longitude: 0,
          })),
        );
      } catch {
        if (!active) return;
        setResults(FALLBACKS);
      } finally {
        if (active) setLoading(false);
      }
    };
    const t = setTimeout(run, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ padding: 16 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F3F4F6',
            borderRadius: 12,
            paddingHorizontal: 12,
          }}
        >
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            placeholder="Where to?"
            value={query}
            onChangeText={setQuery}
            style={{ flex: 1, paddingVertical: 12, marginLeft: 8 }}
            autoFocus
            returnKeyType="search"
          />
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: '#E5E7EB' }} />
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={async () => {
              try {
                setLoading(true);
                let lat = item.latitude;
                let lng = item.longitude;
                if (!lat && !lng) {
                  const loc = await fetchPlaceDetails(item.id);
                  if (loc) {
                    lat = loc.latitude;
                    lng = loc.longitude;
                  }
                }
                // Save to recent destinations (dedupe by id/name+coords, keep last 6)
                try {
                  const raw = await AsyncStorage.getItem('recentDestinations');
                  const existing: any[] = raw ? JSON.parse(raw) : [];
                  const next = [
                    { id: item.id, name: item.name, subtitle: item.subtitle, latitude: lat, longitude: lng, when: Date.now() },
                    ...existing.filter(
                      (r) => !(r.id === item.id || (r.name === item.name && r.latitude === lat && r.longitude === lng)),
                    ),
                  ].slice(0, 6);
                  await AsyncStorage.setItem('recentDestinations', JSON.stringify(next));
                } catch {}
                router.push({ pathname: '/ride', params: { name: item.name, subtitle: item.subtitle, lat: String(lat), lng: String(lng) } });
              } finally {
                setLoading(false);
              }
            }}
            style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="location" size={18} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>{item.name}</Text>
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </Pressable>
        )}
        ListFooterComponent={loading ? (
          <View style={{ padding: 16, alignItems: 'center' }}>
            <ActivityIndicator />
          </View>
        ) : null}
      />
    </SafeAreaView>
  );
}


