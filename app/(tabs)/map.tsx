import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';

type UserLocation = {
  latitude: number;
  longitude: number;
};

export default function MapTab() {
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const requestAndFetchLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!isMounted) return;
        if (status !== 'granted') {
          setPermissionStatus('denied');
          setErrorMessage('Location permission was denied. Enable it in Settings.');
          return;
        }
        setPermissionStatus('granted');

        const current = await Location.getCurrentPositionAsync({});
        if (!isMounted) return;

        const coords = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        };
        setUserLocation(coords);
        setRegion({
          ...coords,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } catch (err) {
        if (!isMounted) return;
        setErrorMessage('Failed to fetch location.');
      }
    };

    requestAndFetchLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  if (permissionStatus === 'undetermined' && !region) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Requesting location permission…</Text>
      </SafeAreaView>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
        <Text style={{ textAlign: 'center' }}>{errorMessage || 'Location permission denied.'}</Text>
      </SafeAreaView>
    );
  }

  if (!region) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Locating you…</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={region}
        showsUserLocation
        onRegionChangeComplete={(r) => setRegion(r)}
      >
        {userLocation && (
          <Marker coordinate={userLocation} title="You are here" />
        )}
      </MapView>
    </View>
  );
}


