import axios, { AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import qs from 'qs';
import { API_CONFIG } from '../constants/IpApi';

const API_URL = API_CONFIG.BASE_URL;

const api = axios.create({
	baseURL: API_URL,
	headers: API_CONFIG.HEADERS.FORM,
	withCredentials: true,
	timeout: API_CONFIG.TIMEOUT,
});

api.interceptors.request.use(async (config) => {
	const authToken = await AsyncStorage.getItem('auth_token');
	if (authToken) {
		config.headers.Authorization = `Bearer ${authToken}`;
	} else {
		const sessionCookie = await AsyncStorage.getItem('session_cookie');
		if (sessionCookie) {
			config.headers.Cookie = sessionCookie;
		}
	}
	return config;
});

api.interceptors.response.use(
	(response) => {
		const setCookieHeader = response.headers['set-cookie'];
		if (setCookieHeader) {
			AsyncStorage.setItem('session_cookie', setCookieHeader.join('; '));
		}
		return response;
	},
	async (error) => {
		return Promise.reject(error);
	}
);

interface User {
	id: number;
	username: string;
}

/**
 * Service d'authentification pour l'application de boulangerie.
 * 
 * @class AuthService
 * @description
 * Gère toutes les fonctionnalités liées à l'authentification utilisateur :
 * connexion, déconnexion, vérification de l'authentification et gestion du timeout d'inactivité.
 * 
 * @remarks
 * - Maintient une session utilisateur avec timeout d'inactivité de 20 minutes.
 * - Stocke les informations d'authentification dans AsyncStorage.
 * - Gère les erreurs de communication avec le serveur.
 * - Assure la redirection vers la page appropriée après connexion/déconnexion.
 */

export class AuthService {
	private static timeoutRef: ReturnType<typeof setTimeout> | null = null;
	private static readonly INACTIVITY_TIMEOUT = 20 * 60 * 1000;

	static initializeInactivityTimeout(router: ReturnType<typeof useRouter>) {
		this.resetTimeout(router);
	}

	static async resetTimeout(router: ReturnType<typeof useRouter>) {
		const stayLoggedIn = await AsyncStorage.getItem('stayLoggedIn');

		if (stayLoggedIn === 'true') {
			if (this.timeoutRef) {
				clearTimeout(this.timeoutRef);
				this.timeoutRef = null;
			}
			return;
		}

		if (this.timeoutRef) {
			clearTimeout(this.timeoutRef);
			this.timeoutRef = null;
		}
		this.timeoutRef = setTimeout(async () => {
			await this.logout();
			Alert.alert("Session expirée", "Vous avez été déconnecté en raison d'une inactivité.");
			router.replace('/(auth)/login');
		}, this.INACTIVITY_TIMEOUT);
	}

	static async login(username: string, password: string, router: ReturnType<typeof useRouter>, stayLoggedIn: boolean = false): Promise<boolean> {
		if (!username || !password) {
			Alert.alert('Erreur', "Veuillez entrer un nom d'utilisateur et un mot de passe.");
			return false;
		}

		try {
			const data = qs.stringify({
				username,
				password,
				remember: stayLoggedIn ? '1' : '0'
			});

			const response: AxiosResponse = await api.post(
				'/api/login',
				data,
				{
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						'Accept': 'application/json'
					}
				}
			);

			if (response.data.token) {
				await AsyncStorage.setItem('auth_token', response.data.token);
			} else {
				const cookies: string[] | undefined = response.headers['set-cookie'];
				if (cookies && cookies.length > 0) {
					await AsyncStorage.setItem('session_cookie', cookies.join('; '));
					console.log('Stored session cookie');
				} else {
					console.warn('No cookies received from server');
				}
			}

			const user: User = { id: response.data.user.id, username: response.data.user.username };
			await AsyncStorage.setItem('user', JSON.stringify(user));
			await AsyncStorage.setItem('stayLoggedIn', stayLoggedIn ? 'true' : 'false');

			// Pour le web, on gère aussi l'enregistrement explicite dans localStorage
			if (Platform.OS === 'web') {
				localStorage.setItem('stayLoggedIn', stayLoggedIn ? 'true' : 'false');

				// Stocker l'expiration pour le web (30 jours si rester connecté, sinon 1 jour)
				const expiryDate = new Date();
				const daysToAdd = stayLoggedIn ? 30 : 1;
				expiryDate.setTime(expiryDate.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
				localStorage.setItem('sessionExpiry', expiryDate.toISOString());

				// Stocker aussi les données utilisateur dans localStorage
				localStorage.setItem('user', JSON.stringify(user));
			}

			if (response.data.expiresAt) {
				await AsyncStorage.setItem('session_expiry', response.data.expiresAt);
			}

			if (!stayLoggedIn) {
				this.resetTimeout(router);
			} else {
				if (this.timeoutRef) {
					clearTimeout(this.timeoutRef);
					this.timeoutRef = null;
				}
			}

			router.replace('/(tabs)/affichage-capteurs');
			return true;
		} catch (error: any) {
			console.error(`Erreur complète:`, JSON.stringify(error, null, 2));
			console.error(`Code d'erreur:`, error.code);
			console.error(`Message d'erreur:`, error.message);
			console.error(`Requête:`, error.request ? JSON.stringify(error.request, null, 2) : 'Aucune requête');
			console.error(`Réponse:`, error.response ? JSON.stringify(error.response, null, 2) : 'Aucune réponse');
			if (error.code === 'ECONNABORTED') {
				Alert.alert('Erreur', "Délai de connexion dépassé. Vérifiez le réseau ou l'accessibilité de l'API.");
			} else if (error.response) {
				if (error.response.status === 401) {
					Alert.alert('Erreur', "Nom d'utilisateur ou mot de passe incorrect.");
				} else if (error.response.status === 400) {
					Alert.alert('Erreur', error.response.data.error || 'Requête invalide.');
				} else if (error.response.status === 500) {
					Alert.alert('Erreur', `Erreur serveur: ${error.response.data.error || 'Erreur interne du serveur.'}`);
				} else {
					Alert.alert('Erreur', `Erreur serveur: ${error.response.status} - ${error.response.statusText}`);
				}
			} else if (error.request) {
				Alert.alert('Erreur', "Impossible de contacter le serveur. Vérifiez l'URL ou le réseau.");
			} else {
				Alert.alert('Erreur', `Erreur inattendue: ${error.message}`);
			}
			return false;
		}
	}

	static async logout() {
		try {
			// API-first logout for mobile clients.
			await api.post('/api/logout', {}, {
				withCredentials: true,
				headers: { Accept: 'application/json' }
			});
		} catch {
			try {
				// Legacy fallback route kept for old deployments.
				await api.get('/logout', {
					withCredentials: true,
					headers: { Accept: 'application/json' }
				});
			} catch {
				// Keep silent: local session clear is enough for UX.
			}
		} finally {
			await this.clearSession();

			api.defaults.headers.common['Authorization'] = '';
			api.defaults.headers.common['Cookie'] = '';
		}

		return true;
	}

	static async isAuthenticated(): Promise<boolean> {
		// Vérification web spécifique
		if (Platform.OS === 'web') {
			const stayLoggedInWeb = localStorage.getItem('stayLoggedIn');
			const sessionExpiryWeb = localStorage.getItem('sessionExpiry');

			if (stayLoggedInWeb === 'true' && sessionExpiryWeb) {
				const expiryDate = new Date(sessionExpiryWeb);
				if (expiryDate > new Date()) {
					return true;
				}
			}
		}

		// Vérification classique — token OU cookie + user obligatoire
		const authToken = await AsyncStorage.getItem('auth_token');
		const sessionCookie = await AsyncStorage.getItem('session_cookie');
		const user = await AsyncStorage.getItem('user');
		return (!!authToken || !!sessionCookie) && !!user;
	}

	static async getCurrentUser(): Promise<User | null> {
		const user = await AsyncStorage.getItem('user');
		return user ? JSON.parse(user) : null;
	}

	static async checkExistingSession(): Promise<boolean> {
		try {
			// Vérification web spécifique
			if (Platform.OS === 'web') {
				const stayLoggedInWeb = localStorage.getItem('stayLoggedIn');
				const sessionExpiryWeb = localStorage.getItem('sessionExpiry');
				const userWeb = localStorage.getItem('user');

				if (stayLoggedInWeb === 'true' && sessionExpiryWeb && userWeb) {
					const expiryDate = new Date(sessionExpiryWeb);
					if (expiryDate > new Date()) {
						// Synchroniser avec AsyncStorage pour compatibilité
						await AsyncStorage.setItem('stayLoggedIn', 'true');
						await AsyncStorage.setItem('user', userWeb);
						await AsyncStorage.setItem('session_expiry', sessionExpiryWeb);
						return true;
					} else {
						// Session expirée, nettoyer
						localStorage.removeItem('stayLoggedIn');
						localStorage.removeItem('sessionExpiry');
						localStorage.removeItem('user');
					}
				}
			}

			// Vérification classique mobile
			const authToken = await AsyncStorage.getItem('auth_token');
			const sessionCookie = await AsyncStorage.getItem('session_cookie');
			const user = await AsyncStorage.getItem('user');
			const stayLoggedIn = await AsyncStorage.getItem('stayLoggedIn');

			// Exige au minimum un credential (token OU cookie) ET un objet user
			if ((!authToken && !sessionCookie) || !user) {
				return false;
			}

			const expiryStr = await AsyncStorage.getItem('session_expiry');
			if (expiryStr) {
				const expiry = new Date(expiryStr);
				if (expiry < new Date()) {
					await this.clearSession();
					return false;
				}
			}

			if (stayLoggedIn === 'true') {
				return true;
			}

			try {
				const response = await api.get('/api/verify-session');
				return response.status === 200;
			} catch (error) {
				const networkError = error as { message?: string; code?: string };
				if (networkError.message && (
					networkError.message.includes('Network Error') ||
					networkError.message.includes('timeout') ||
					networkError.code === 'ECONNABORTED'
				)) {
					console.log('Réseau indisponible, mais credentials présents');
					return true;
				}
				throw error;
			}
		} catch (error) {
			console.error('Erreur lors de la vérification de session:', error);
			return false;
		}
	}

	static async initializeApiClient() {
		try {
			const authToken = await AsyncStorage.getItem('auth_token');
			const sessionCookie = await AsyncStorage.getItem('session_cookie');

			if (authToken) {
				api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
				console.log('Auth token loaded and set in headers');
			}

			if (sessionCookie) {
				api.defaults.headers.common['Cookie'] = sessionCookie;
				console.log('Session cookie loaded and set in headers');
			}
		} catch (error) {
			console.error('Failed to initialize API client:', error);
		}
	}

	static async clearSession() {
		await AsyncStorage.removeItem('auth_token');
		await AsyncStorage.removeItem('session_cookie');
		await AsyncStorage.removeItem('user');
		await AsyncStorage.removeItem('session_expiry');
		await AsyncStorage.removeItem('stayLoggedIn');

		if (Platform.OS === 'web') {
			localStorage.removeItem('stayLoggedIn');
			localStorage.removeItem('sessionExpiry');
			localStorage.removeItem('user');
		}

		if (this.timeoutRef) {
			clearTimeout(this.timeoutRef);
			this.timeoutRef = null;
		}
	}
}