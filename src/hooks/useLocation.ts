import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { turfAPI } from '../services/api';

export interface UserLocation {
    latitude: number;
    longitude: number;
    city?: string;
    state?: string;
}

export const useLocation = () => {
    const [location, setLocation] = useState<UserLocation | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [manualCity, setManualCity] = useState<string | null>(null);

    const detectLocation = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                setLoading(false);
                return;
            }

            const currentLocation = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = currentLocation.coords;

            // Detect city from backend
            try {
                const response = await turfAPI.detectCity({ latitude, longitude });
                const detectedCity = response.data.city;
                const detectedState = response.data.state;

                // Check for saved manual city
                const savedCity = await AsyncStorage.getItem('user_city');

                if (savedCity) {
                    setManualCity(savedCity);
                    // If we have a saved city, use it, but keep coords
                    setLocation({
                        latitude,
                        longitude,
                        city: savedCity,
                        state: detectedState,
                    });
                } else {
                    // Use detected city
                    setManualCity(null);
                    setLocation({
                        latitude,
                        longitude,
                        city: detectedCity,
                        state: detectedState,
                    });
                }
            } catch (apiError) {
                console.error('Error detecting city:', apiError);
                // Fallback or just set coords
                const savedCity = await AsyncStorage.getItem('user_city');
                if (savedCity) {
                    setManualCity(savedCity);
                }
                setLocation({
                    latitude,
                    longitude,
                    city: savedCity || undefined
                });
            }

        } catch (error) {
            console.error('Error getting location:', error);
            setErrorMsg('Failed to get current location');
        } finally {
            setLoading(false);
        }
    };

    const setCityManually = async (city: string) => {
        setManualCity(city);
        await AsyncStorage.setItem('user_city', city);
        // When city is set manually, we preserve coords but update city field
        setLocation(prev => prev ? { ...prev, city } : { latitude: 0, longitude: 0, city });
    };

    const loadSavedCity = async () => {
        try {
            const saved = await AsyncStorage.getItem('user_city');
            if (saved) {
                setManualCity(saved);
                return true;
            }
        } catch (e) {
            console.error('Failed to load saved city');
        }
        return false;
    };

    useEffect(() => {
        // Initial load
        detectLocation();
    }, []);

    const detectAndSetToCurrentCity = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                setLoading(false);
                return;
            }

            const currentLocation = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = currentLocation.coords;

            // Detect city from backend
            try {
                const response = await turfAPI.detectCity({ latitude, longitude });
                const detectedCity = response.data.city;
                const detectedState = response.data.state;

                // Explicitly set this detected city as the manual city and save it
                setCityManually(detectedCity);

                // Update location state
                setLocation({
                    latitude,
                    longitude,
                    city: detectedCity,
                    state: detectedState,
                });
            } catch (apiError) {
                console.error('Error detecting city:', apiError);
                // Fallback: Just set valid coordinates but no city if API fails
                setLocation({ latitude, longitude });
            }

        } catch (error) {
            console.error('Error getting location:', error);
            setErrorMsg('Failed to get current location');
        } finally {
            setLoading(false);
        }
    };

    return {
        location,
        errorMsg,
        loading,
        detectLocation,
        setCityManually,
        detectAndSetToCurrentCity,
        manualCity,
    };
};
