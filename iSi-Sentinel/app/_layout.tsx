import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { AuthService } from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
const RootLayout: React.FC = () => {
	const router = useRouter();
	const isBootstrappedRef = useRef(false);
	const bootstrapPromiseRef = useRef<Promise<void> | null>(null);

	const bootstrapAuth = useCallback(async () => {
		if (bootstrapPromiseRef.current) {
			return bootstrapPromiseRef.current;
		}

		bootstrapPromiseRef.current = (async () => {
			try {
				await AuthService.initializeApiClient();
				const isAuthenticated = await AuthService.checkExistingSession();
				console.log('Session authenticated:', isAuthenticated);
				if (isAuthenticated) {
					router.replace('/(tabs)/affichage-capteurs');
				} else {
					router.replace('/(auth)/login');
				}
			} catch (error) {
				console.error('Failed to initialize auth:', error);
				router.replace('/(auth)/login');
			} finally {
				isBootstrappedRef.current = true;
			}
		})();

		return bootstrapPromiseRef.current;
	}, [router]);

	// Handle app state changes
	const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
		console.log('App state changed to:', nextAppState);

		if (nextAppState === 'active') {
			if (!isBootstrappedRef.current && bootstrapPromiseRef.current) {
				await bootstrapPromiseRef.current;
			}

			if (!isBootstrappedRef.current) {
				return;
			}

			// App came to foreground - verify session
			try {
				const stayLoggedIn = await AsyncStorage.getItem('stayLoggedIn');
				const isSessionValid = await AuthService.checkExistingSession();
				console.log('Session valid after app resume:', isSessionValid);

				if (!isSessionValid) {
					// Session expired while app was in background
					console.log('Session expired, redirecting to login');
					await AuthService.clearSession();
					router.replace('/(auth)/login');
				} else {
					// Session still valid, reset timeout only if not staying logged in
					if (stayLoggedIn !== 'true') {
						AuthService.resetTimeout(router);
					}
				}
			} catch (error) {
				console.error('Error checking session after resume:', error);
				// Don't log out automatically on error if "stay logged in" is enabled
				const stayLoggedIn = await AsyncStorage.getItem('stayLoggedIn');
				if (stayLoggedIn !== 'true') {
					router.replace('/(auth)/login');
				}
			}
		}
	}, [router]);

	// Initialize auth service and perform initial routing once
	useEffect(() => {
		bootstrapAuth();
	}, [bootstrapAuth]);

	// Add AppState listener for handling background/foreground transitions
	useEffect(() => {
		const subscription = AppState.addEventListener('change', handleAppStateChange);

		return () => {
			subscription.remove();
		};
	}, [handleAppStateChange]);

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="(auth)/login" />
			<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
		</Stack>
	);
};
export default RootLayout;