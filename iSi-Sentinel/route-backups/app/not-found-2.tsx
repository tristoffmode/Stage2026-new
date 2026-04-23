import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

/**
 * Écran "Not Found" pour l'application.
 * 
 * @component
 * @returns {React.FC} Composant fonctionnel représentant l'écran d'erreur 404.
 * 
 * @description
 * Ce composant est affiché lorsque l'utilisateur tente d'accéder à une page qui n'existe pas.
 * Il propose un message d'erreur et un lien pour retourner à l'écran d'accueil.
 */
export default function NotFoundScreen() {
	return (
		<>
			<Stack.Screen options={{ title: 'Oops!' }} />
			<ThemedView style={styles.container}>
				<ThemedText type="title">This screen doesn't exist.</ThemedText>
				<Link href="/" style={styles.link}>
					<ThemedText type="link">Go to home screen!</ThemedText>
				</Link>
			</ThemedView>
		</>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
	},
	link: {
		marginTop: 15,
		paddingVertical: 15,
	},
});
