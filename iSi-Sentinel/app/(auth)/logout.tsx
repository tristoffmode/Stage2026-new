import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthService } from '../../services/authService';

/**
 * Écran de déconnexion pour l'application.
 * 
 * @component
 * @returns {React.FC} Composant fonctionnel représentant l'écran de déconnexion.
 * 
 * @description
 * Ce composant effectue la déconnexion de l'utilisateur en appelant le service `AuthService.logout`.
 * Une fois la déconnexion réussie (ou en cas d'erreur), l'utilisateur est redirigé vers la page de connexion.
 * 
 * @remarks
 * - Utilise `useEffect` pour déclencher automatiquement la déconnexion lors du montage du composant.
 * - Affiche un indicateur de chargement et un message pendant le processus de déconnexion.
 * - Redirige toujours vers `/(auth)/login` après la tentative de déconnexion.
 */

const LogoutScreen: React.FC = () => {
	const router = useRouter();

	useEffect(() => {
		const performLogout = async () => {
			try {
				await AuthService.logout();
				console.log('Déconnexion réussie');
				
				router.replace('/(auth)/login');
			} catch (error) {
				console.error('Erreur lors de la déconnexion:', error);
				router.replace('/(auth)/login');
			}
		};

		performLogout();
	}, [router]);

	return (
		<View style={styles.container}>
			<ActivityIndicator size="large" color="#0a7ea4" />
			<Text style={styles.text}>Déconnexion...</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fff',
	},
	text: {
		marginTop: 20,
		fontSize: 18,
		color: '#333',
	},
});

export default LogoutScreen;