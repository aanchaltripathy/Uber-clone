import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export default function HomeTab() {
  const [lastRide, setLastRide] = useState<{ destName: string; destSubtitle?: string; price?: string; when: string } | null>(null);
  const [recents, setRecents] = useState<Array<{ id: string; name: string; subtitle?: string; latitude: number; longitude: number; when: number }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('lastRide');
        if (raw) setLastRide(JSON.parse(raw));
        const r2 = await AsyncStorage.getItem('recentDestinations');
        if (r2) setRecents(JSON.parse(r2));
      } catch {}
    })();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="person" size={22} color="#111827" />
            </View>
            <View>
              <Text style={{ color: '#6B7280', fontSize: 12 }}>Welcome</Text>
              <Text style={{ color: '#111827', fontSize: 18, fontWeight: '600' }}>Uber Clone</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            style={{ padding: 8, borderRadius: 9999, backgroundColor: '#EEF2FF' }}
          >
            <Ionicons name="notifications" size={20} color="#4F46E5" />
          </Pressable>
        </View>

        {/* Where to card */}
        <View
          style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, marginBottom: 20 }}
        >
          <Text style={{ color: '#111827', fontSize: 16, fontWeight: '600', marginBottom: 12 }}>Where to?</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Link asChild href="/search">
              <Pressable
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3F4F6', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, flex: 1 }}
              >
                <Ionicons name="navigate" size={18} color="#111827" />
                <Text style={{ color: '#111827' }}>Set destination</Text>
              </Pressable>
            </Link>
            <Pressable
              style={{ backgroundColor: '#111827', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 }}
            >
              <Ionicons name="time" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Quick actions */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <Link asChild href="/(tabs)/map">
            <Pressable style={{ flex: 1, backgroundColor: '#DBEAFE', padding: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="car" size={22} color="#1D4ED8" />
              <Text style={{ color: '#1D4ED8', marginTop: 6, fontWeight: '600' }}>Book Ride</Text>
            </Pressable>
          </Link>
          <Link asChild href="/(tabs)/chat">
            <Pressable style={{ flex: 1, backgroundColor: '#FCE7F3', padding: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chatbubbles" size={22} color="#BE185D" />
              <Text style={{ color: '#BE185D', marginTop: 6, fontWeight: '600' }}>Messages</Text>
            </Pressable>
          </Link>
          <Link asChild href="/(tabs)/profile">
            <Pressable style={{ flex: 1, backgroundColor: '#DCFCE7', padding: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="person-circle" size={22} color="#15803D" />
              <Text style={{ color: '#15803D', marginTop: 6, fontWeight: '600' }}>Profile</Text>
            </Pressable>
          </Link>
        </View>

        {/* Recent destinations */}
        {recents.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: '#111827', fontSize: 16, fontWeight: '600', marginBottom: 12 }}>Recent destinations</Text>
            <View style={{ gap: 10 }}>
              {recents.map((r) => (
                <Link
                  key={r.id}
                  asChild
                  href={{ pathname: '/ride', params: { name: r.name, subtitle: r.subtitle ?? '', lat: String(r.latitude), lng: String(r.longitude) } }}
                >
                  <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#F3F4F6', borderRadius: 12 }}>
                    <Ionicons name="location" size={18} color="#111827" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#111827', fontWeight: '600' }}>{r.name}</Text>
                      {!!r.subtitle && <Text style={{ color: '#6B7280' }}>{r.subtitle}</Text>}
                    </View>
                    <Text style={{ color: '#6B7280', fontSize: 12 }}>{new Date(r.when).toLocaleDateString()}</Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          </View>
        )}

        {/* Last ride card */}
        {lastRide && (
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 14 }}>
            <Text style={{ color: '#111827', fontSize: 16, fontWeight: '700' }}>Last ride</Text>
            <Text style={{ color: '#111827', marginTop: 6 }}>{lastRide.destName}{lastRide.destSubtitle ? ` • ${lastRide.destSubtitle}` : ''}</Text>
            <Text style={{ color: '#6B7280', marginTop: 2 }}>{new Date(lastRide.when).toLocaleString()}</Text>
            {lastRide.price && <Text style={{ color: '#111827', fontWeight: '700', marginTop: 6 }}>{lastRide.price}</Text>}
          </View>
        )}

        {/* Promo card */}
        <View
          style={{ backgroundColor: '#111827', borderRadius: 16, padding: 18 }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 6 }}>Get 20% off your next ride</Text>
          <Text style={{ color: '#E5E7EB' }}>Use code RIDESAFE at checkout</Text>
        </View>

        {/* Recents */}
        <View style={{ marginTop: 20 }}>
          <Text style={{ color: '#111827', fontSize: 16, fontWeight: '600', marginBottom: 12 }}>Recent destinations</Text>
          <View style={{ gap: 10 }}>
            <Link
              asChild
              href={{ pathname: '/ride', params: { name: 'Airport', subtitle: 'SFO International', lat: String(37.6213), lng: String(-122.379) } }}
            >
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#F3F4F6', borderRadius: 12 }}>
                <Ionicons name="airplane" size={18} color="#111827" />
                <Text style={{ color: '#111827', fontWeight: '600' }}>Airport</Text>
                <Text style={{ color: '#6B7280' }}>SFO International</Text>
              </Pressable>
            </Link>
            <Link
              asChild
              href={{ pathname: '/ride', params: { name: 'Coffee', subtitle: 'Blue Bottle', lat: String(37.7763), lng: String(-122.4236) } }}
            >
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#F3F4F6', borderRadius: 12 }}>
                <Ionicons name="cafe" size={18} color="#111827" />
                <Text style={{ color: '#111827', fontWeight: '600' }}>Coffee</Text>
                <Text style={{ color: '#6B7280' }}>Blue Bottle</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


