import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable, FlatList } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchDirections, DirectionsResult } from '../lib/maps';

type Coords = { latitude: number; longitude: number };
type NearbyCar = { id: string; latitude: number; longitude: number };
type RideState = 'idle' | 'finding_driver' | 'driver_en_route' | 'at_pickup' | 'in_ride' | 'arrived';

function toNumber(value: string | string[] | undefined): number | null {
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function haversineKm(a: Coords, b: Coords): number {
  const R = 6371; // km
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function DirectionsPolyline({ origin, destination, onResult }: { origin: Coords; destination: Coords; onResult?: (res: DirectionsResult | null) => void }) {
  const [points, setPoints] = useState<Coords[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetchDirections(origin, destination);
        if (!mounted) return;
        if (res) {
          setPoints(res.polyline);
          onResult?.(res);
        } else {
          setPoints(null);
          onResult?.(null);
        }
      } catch {
        setPoints(null);
        onResult?.(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [origin.latitude, origin.longitude, destination.latitude, destination.longitude]);

  if (!points || points.length === 0) {
    return <Polyline coordinates={[origin, destination]} strokeColor="#2563EB" strokeWidth={4} />;
  }

  return <Polyline coordinates={points} strokeColor="#2563EB" strokeWidth={4} />;
}

export default function RideScreen() {
  const params = useLocalSearchParams();
  const dest: Coords | null = useMemo(() => {
    const lat = toNumber(params.lat);
    const lng = toNumber(params.lng);
    if (lat == null || lng == null) return null;
    return { latitude: lat, longitude: lng };
  }, [params.lat, params.lng]);

  const destName = typeof params.name === 'string' ? params.name : 'Destination';
  const destSubtitle = typeof params.subtitle === 'string' ? params.subtitle : '';

  const [user, setUser] = useState<Coords | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!mounted) return;
      if (status !== 'granted') {
        setPermissionDenied(true);
        return;
      }
      const current = await Location.getCurrentPositionAsync({});
      if (!mounted) return;
      const coords: Coords = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setUser(coords);
      const target = dest ?? coords;
      setRegion({
        latitude: (coords.latitude + target.latitude) / 2,
        longitude: (coords.longitude + target.longitude) / 2,
        latitudeDelta: Math.abs(coords.latitude - target.latitude) + 0.05,
        longitudeDelta: Math.abs(coords.longitude - target.longitude) + 0.05,
      });
    })();
    return () => {
      mounted = false;
    };
  }, [dest]);

  const estimate = useMemo(() => {
    if (!user || !dest) return null;
    const km = haversineKm(user, dest);
    const minutes = Math.max(5, Math.round(km * 3));
    const base = 2.5 + km * 1.8;
    return { km: km.toFixed(1), minutes, base };
  }, [user, dest]);

  const [apiEstimate, setApiEstimate] = useState<{ km: string; minutes: number } | null>(null);
  const [directionSteps, setDirectionSteps] = useState<
    { instruction: string; distanceMeters: number; durationSeconds: number }[] | null
  >(null);

  type RideOption = {
    id: string;
    name: string;
    etaMin: number;
    baseFare: number;
    perKm: number;
    perMin: number;
    surge: number;
  };

  const OPTIONS: RideOption[] = [
    { id: 'uberx', name: 'UberX', etaMin: 3, baseFare: 2.0, perKm: 1.2, perMin: 0.25, surge: 1.0 },
    { id: 'comfort', name: 'Comfort', etaMin: 4, baseFare: 3.0, perKm: 1.5, perMin: 0.3, surge: 1.05 },
    { id: 'xl', name: 'XL', etaMin: 5, baseFare: 4.0, perKm: 1.9, perMin: 0.35, surge: 1.1 },
  ];

  const [selectedId, setSelectedId] = useState<string>(OPTIONS[0].id);
  const [showConfirm, setShowConfirm] = useState(false);
  const [driverEtaMin, setDriverEtaMin] = useState<number | null>(null);
  const [nearbyCars, setNearbyCars] = useState<NearbyCar[]>([]);
  const nearbyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const etaTimerRef = useRef<NodeJS.Timeout | null>(null);
  const moveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [rideState, setRideState] = useState<RideState>('idle');
  const [vehiclePos, setVehiclePos] = useState<Coords | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [useImperial, setUseImperial] = useState<boolean>(false);
  const [stepsExpanded, setStepsExpanded] = useState<boolean>(false);

  function computeOptionPrice(option: RideOption): string | null {
    const source = apiEstimate ?? estimate;
    if (!source) return null;
    const km = Number(source.km);
    const minutes = source.minutes;
    const price = (option.baseFare + option.perKm * km + option.perMin * minutes) * option.surge;
    return price.toFixed(2);
  }

  // Seed and animate nearby cars around the user
  useEffect(() => {
    if (!user) return;
    const count = 5;
    const radius = 0.002;
    const seeded: NearbyCar[] = Array.from({ length: count }).map((_, i) => {
      const angle = (2 * Math.PI * i) / count;
      const r = radius * (0.7 + Math.random() * 0.6);
      const dLat = r * Math.cos(angle);
      const dLng = r * Math.sin(angle);
      return {
        id: `car-${i}`,
        latitude: user.latitude + dLat,
        longitude: user.longitude + dLng,
      };
    });
    setNearbyCars(seeded);

    if (nearbyTimerRef.current) clearInterval(nearbyTimerRef.current);
    nearbyTimerRef.current = setInterval(() => {
      setNearbyCars((cars) =>
        cars.map((c) => {
          const jitterLat = (Math.random() - 0.5) * 0.00025;
          const jitterLng = (Math.random() - 0.5) * 0.00025;
          return {
            ...c,
            latitude: c.latitude + jitterLat,
            longitude: c.longitude + jitterLng,
          };
        }),
      );
    }, 2000);

    return () => {
      if (nearbyTimerRef.current) clearInterval(nearbyTimerRef.current);
    };
  }, [user]);

  // Load and persist unit preference
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const val = await AsyncStorage.getItem('unitPreference');
        if (!mounted) return;
        if (val === 'imperial') setUseImperial(true);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem('unitPreference', useImperial ? 'imperial' : 'metric');
      } catch {}
    })();
  }, [useImperial]);

  // Handle confirming ride and simulated ETA countdown
  function onRequestRide() {
    setShowConfirm(true);
  }

  function onConfirmRide() {
    setShowConfirm(false);
    setRideState('finding_driver');
    // Simulate matching a driver and heading to pickup
    setTimeout(() => {
      if (!user) return;
      // Choose a nearby car start position or spawn near user
      const start: Coords = nearbyCars.length
        ? { latitude: nearbyCars[0].latitude, longitude: nearbyCars[0].longitude }
        : { latitude: user.latitude + 0.002, longitude: user.longitude - 0.0015 };
      setVehiclePos(start);
      const opt = OPTIONS.find((o) => o.id === selectedId);
      const initialEta = Math.max(2, (opt?.etaMin ?? 4));
      setDriverEtaMin(initialEta);
      setRideState('driver_en_route');
      // Faster demo countdown: 30s per ETA minute
      if (etaTimerRef.current) clearInterval(etaTimerRef.current);
      etaTimerRef.current = setInterval(() => {
        setDriverEtaMin((m) => {
          if (m == null) return m;
          if (m <= 1) {
            if (etaTimerRef.current) clearInterval(etaTimerRef.current);
            return 1;
          }
          return m - 1;
        });
      }, 30000);
      // Move driver towards user
      if (moveTimerRef.current) clearInterval(moveTimerRef.current);
      moveTimerRef.current = setInterval(() => {
        setVehiclePos((pos) => {
          if (!pos || !user) return pos;
          const next = moveTowards(pos, user, 0.2);
          if (haversineKm(next, user) < 0.05) {
            clearInterval(moveTimerRef.current as NodeJS.Timeout);
            setRideState('at_pickup');
            setDriverEtaMin(0);
            return user;
          }
          return next;
        });
      }, 1500);
    }, 2000);
  }

  useEffect(() => {
    return () => {
      if (etaTimerRef.current) clearInterval(etaTimerRef.current);
      if (moveTimerRef.current) clearInterval(moveTimerRef.current);
    };
  }, []);

  function onStartTrip() {
    if (!user || !dest) return;
    setRideState('in_ride');
    setVehiclePos(user);
    if (moveTimerRef.current) clearInterval(moveTimerRef.current);
    moveTimerRef.current = setInterval(() => {
      setVehiclePos((pos) => {
        if (!pos || !dest) return pos;
        const next = moveTowards(pos, dest, 0.12);
        if (haversineKm(next, dest) < 0.05) {
          clearInterval(moveTimerRef.current as NodeJS.Timeout);
          setRideState('arrived');
          saveLastRide();
          return dest;
        }
        return next;
      });
    }, 1500);
  }

  function moveTowards(a: Coords, b: Coords, fraction: number): Coords {
    return {
      latitude: a.latitude + (b.latitude - a.latitude) * fraction,
      longitude: a.longitude + (b.longitude - a.longitude) * fraction,
    };
  }

  async function saveLastRide() {
    try {
      const option = OPTIONS.find((o) => o.id === selectedId);
      const price = option ? computeOptionPrice(option) : null;
      const payload = {
        destName,
        destSubtitle,
        price,
        when: new Date().toISOString(),
      };
      await AsyncStorage.setItem('lastRide', JSON.stringify(payload));
      try {
        const raw = await AsyncStorage.getItem('rideHistory');
        const existing: any[] = raw ? JSON.parse(raw) : [];
        const next = [payload, ...existing].slice(0, 20);
        await AsyncStorage.setItem('rideHistory', JSON.stringify(next));
      } catch {}
    } catch {}
  }

  if (permissionDenied) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Text style={{ textAlign: 'center' }}>Location permission denied. Enable it in Settings.</Text>
      </SafeAreaView>
    );
  }

  if (!region) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Preparing route…</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView style={{ flex: 1 }} initialRegion={region}>
        {user && (
          <Marker coordinate={user} title="You" zIndex={9999}>
            <Ionicons name="person" size={26} color="#2563EB" />
          </Marker>
        )}
        {dest && <Marker coordinate={dest} title={destName} description={destSubtitle} />}
        {/* Directions polyline will replace straight line below; keeping as fallback */}
        {user && dest && (
          <DirectionsPolyline
            origin={user}
            destination={dest}
            onResult={(res) => {
              if (res) {
                // Update estimate using API distance/time
                // 1 km = 1000 m, convert seconds to minutes
                const km = (res.distanceMeters / 1000).toFixed(1);
                const minutes = Math.max(1, Math.round(res.durationSeconds / 60));
                setApiEstimate({ km, minutes });
                setDirectionSteps(res.steps);
                // Persist steps for dedicated screen
                AsyncStorage.setItem('routeSteps', JSON.stringify(res.steps)).catch(() => {});
              }
            }}
          />
        )}
        {driverEtaMin == null && nearbyCars.map((c) => (
          <Marker key={c.id} coordinate={{ latitude: c.latitude, longitude: c.longitude }}>
            <MaterialCommunityIcons name="taxi" size={28} color="#111827" />
          </Marker>
        ))}
        {vehiclePos && (
          <Marker coordinate={vehiclePos} title="Driver" zIndex={9998}>
            <MaterialCommunityIcons name="taxi" size={28} color="#111827" />
          </Marker>
        )}
      </MapView>

      <View
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 24,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 16,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 12,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{destName}</Text>
        {!!destSubtitle && <Text style={{ color: '#6B7280', marginTop: 2 }}>{destSubtitle}</Text>}
        {(() => {
          const src = apiEstimate ?? estimate;
          if (!src) return (
            <Text style={{ marginTop: 8, color: '#6B7280' }}>Calculating…</Text>
          );
          const kmNum = Number(src.km);
          const distanceText = useImperial
            ? `${(kmNum * 0.621371).toFixed(1)} mi`
            : `${kmNum.toFixed(1)} km`;
          return (
            <Text style={{ marginTop: 8, color: '#111827' }}>
              ~{src.minutes} min • {distanceText}
            </Text>
          );
        })()}

        {/* Toolbar: Steps toggle + Units toggle */}
        <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable
            onPress={() => setStepsExpanded((v) => !v)}
            style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#F3F4F6' }}
          >
            <Text style={{ color: '#111827', fontWeight: '600' }}>
              {stepsExpanded ? 'Hide steps' : `View steps${directionSteps ? ` (${directionSteps.length})` : ''}`}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              // Navigate to full steps screen
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const { router } = require('expo-router');
              router.push('/steps');
            }}
            style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#EEF2FF' }}
          >
            <Text style={{ color: '#4F46E5', fontWeight: '600' }}>Open steps</Text>
          </Pressable>
          <Pressable
            onPress={() => setUseImperial((v) => !v)}
            style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#F3F4F6' }}
          >
            <Text style={{ color: '#111827', fontWeight: '600' }}>Units: {useImperial ? 'mi' : 'km'}</Text>
          </Pressable>
        </View>

        {rideState === 'idle' && (apiEstimate || estimate) && (
          <View style={{ marginTop: 12 }}>
            <FlatList
              data={OPTIONS}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => {
                const price = computeOptionPrice(item);
                const selected = item.id === selectedId;
                return (
                  <Pressable
                    onPress={() => setSelectedId(item.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: selected ? '#EEF2FF' : '#F9FAFB',
                      borderWidth: selected ? 1 : 0,
                      borderColor: selected ? '#4F46E5' : 'transparent',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <MaterialCommunityIcons name="taxi" size={28} color="#111827" />
                      <View style={{ gap: 2 }}>
                        <Text style={{ color: '#111827', fontWeight: '700' }}>{item.name}</Text>
                        <Text style={{ color: '#6B7280' }}>~{item.etaMin} min</Text>
                      </View>
                    </View>
                    <Text style={{ color: '#111827', fontWeight: '700' }}>{price ? `$${price}` : '—'}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        )}
        {directionSteps && directionSteps.length > 0 && (
          <View style={{ marginTop: 12, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12 }}>
            <Text style={{ color: '#111827', fontWeight: '700', marginBottom: 8 }}>Route steps</Text>
            {(stepsExpanded ? directionSteps : directionSteps.slice(0, 5)).map((s, idx) => (
              <View key={idx} style={{ marginBottom: 6 }}>
                <Text style={{ color: '#111827' }}>{s.instruction}</Text>
                <Text style={{ color: '#6B7280', fontSize: 12 }}>
                  {(() => {
                    const km = s.distanceMeters / 1000;
                    return useImperial ? `${(km * 0.621371).toFixed(1)} mi` : `${km.toFixed(1)} km`;
                  })()} • {Math.max(1, Math.round(s.durationSeconds / 60))} min
                </Text>
              </View>
            ))}
          </View>
        )}
        {/* Route steps (when available) */}
        {/* For brevity, we won't show the full steps list implementation here */}
        {rideState === 'idle' && (
          <Pressable
            style={{ marginTop: 12, backgroundColor: '#111827', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            onPress={onRequestRide}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
              {(() => {
                const option = OPTIONS.find((o) => o.id === selectedId);
                const price = option ? computeOptionPrice(option) : null;
                return option && price ? `Request ${option.name} • $${price}` : 'Request Ride';
              })()}
            </Text>
          </Pressable>
        )}
        {rideState === 'finding_driver' && (
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8, color: '#111827' }}>Finding a driver…</Text>
          </View>
        )}
        {rideState === 'driver_en_route' && (
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <Text style={{ color: '#111827', fontWeight: '600' }}>Driver en route to pickup</Text>
          </View>
        )}
        {rideState === 'at_pickup' && (
          <Pressable
            style={{ marginTop: 12, backgroundColor: '#111827', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            onPress={onStartTrip}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Start trip</Text>
          </Pressable>
        )}
        {rideState === 'in_ride' && (
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <Text style={{ color: '#111827' }}>In ride… sit back and relax</Text>
          </View>
        )}
      </View>

      {/* Confirmation sheet */}
      {showConfirm && estimate && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 16,
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Confirm your ride</Text>
          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <MaterialCommunityIcons name="taxi" size={32} color="#111827" />
              <View>
                {(() => {
                  const opt = OPTIONS.find((o) => o.id === selectedId);
                  return (
                    <>
                      <Text style={{ color: '#111827', fontWeight: '700' }}>{opt?.name ?? 'Ride'}</Text>
                      <Text style={{ color: '#6B7280' }}>~{opt?.etaMin ?? estimate.minutes} min</Text>
                    </>
                  );
                })()}
              </View>
            </View>
            <Text style={{ color: '#111827', fontWeight: '700' }}>
              {(() => {
                const opt = OPTIONS.find((o) => o.id === selectedId);
                const price = opt ? computeOptionPrice(opt) : null;
                return price ? `$${price}` : '—';
              })()}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <Pressable
              onPress={() => setShowConfirm(false)}
              style={{ flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#111827', fontWeight: '600' }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirmRide}
              style={{ flex: 1, backgroundColor: '#111827', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Driver ETA banner */}
      {driverEtaMin != null && (rideState === 'driver_en_route' || rideState === 'at_pickup') && (
        <View
          style={{
            position: 'absolute',
            top: 20,
            left: 16,
            right: 16,
            backgroundColor: '#111827',
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 14,
          }}
        >
          <Text style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: '600' }}>
            Driver arriving in ~{driverEtaMin} min
          </Text>
        </View>
      )}

      {rideState === 'arrived' && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 16,
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Trip complete</Text>
          <Text style={{ marginTop: 6, color: '#6B7280' }}>{destName}{destSubtitle ? ` • ${destSubtitle}` : ''}</Text>
          <Text style={{ marginTop: 10, color: '#111827', fontWeight: '700' }}>
            {(() => {
              const option = OPTIONS.find((o) => o.id === selectedId);
              const price = option ? computeOptionPrice(option) : null;
              return price ? `$${price}` : '—';
            })()}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' }}>
            {[1,2,3,4,5].map((i) => (
              <Pressable key={i} onPress={() => setRating(i)}>
                <Text style={{ fontSize: 20 }}>{i <= rating ? '★' : '☆'}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() => {
              setRideState('idle');
              setDriverEtaMin(null);
              setVehiclePos(null);
              setRating(0);
            }}
            style={{ marginTop: 12, backgroundColor: '#111827', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Done</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}


