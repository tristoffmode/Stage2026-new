import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { AuthService } from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
const RootLayout: React.FC = () => {
    const router = useRouter();

    // Check authentication on app startup
    useEffect(() => {
        const checkUser = async () => {
            try {
                const isAuthenticated = await AuthService.isAuthenticated();
                if (isAuthenticated) {
                    router.replace('/(tabs)/affichage-capteurs');
                } else {
                    router.replace('/login');
                }
            } catch (error) {
                console.error("Erreur lors de la vérification de l'utilisateur :", error);
                router.replace('/login');
            }
        };
        checkUser();
    }, [router]);

    // Initialize auth service
    useEffect(() => {
        const setupAuth = async () => {
            try {
                await AuthService.initializeApiClient();
                const isAuthenticated = await AuthService.checkExistingSession();
                console.log('Session authenticated:', isAuthenticated);
            } catch (error) {
                console.error('Failed to initialize auth:', error);
            }
        };
        
        setupAuth();
    }, []);

    // Add AppState listener for handling background/foreground transitions
    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        
        return () => {
            subscription.remove();
        };
    }, [router]);
    
    // Handle app state changes
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
        console.log('App state changed to:', nextAppState);
        
        if (nextAppState === 'active') {
            // App came to foreground - verify session
            try {
                const stayLoggedIn = await AsyncStorage.getItem('stayLoggedIn');
                const isSessionValid = await AuthService.checkExistingSession();
                console.log('Session valid after app resume:', isSessionValid);
                
                if (!isSessionValid) {
                    // Session expired while app was in background
                    console.log('Session expired, redirecting to login');
                    await AuthService.clearSession();
                    router.replace('/login');
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
                    router.replace('/login');
                }
            }
        }
    };

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
    );
};
export default RootLayout;