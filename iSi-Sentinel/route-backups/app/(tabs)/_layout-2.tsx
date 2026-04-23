import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Image, View, TouchableOpacity, Platform, Dimensions, Text } from 'react-native';
import { useRouter } from 'expo-router';

interface TabBarIconProps {
	color: string;
	size: number;
}

/**
 * Mise en page des onglets pour l'application.
 * 
 * @component
 * @returns {React.FC} Composant fonctionnel représentant la mise en page des onglets.
 * 
 * @description
 * Ce composant configure la navigation par onglets avec des styles personnalisés, 
 * des icônes, et des titres dynamiques basés sur la route active. Il inclut également 
 * un bouton de déconnexion dans l'en-tête.
 * 
 * @remarks
 * - Utilise `Tabs` pour gérer la navigation entre les écrans.
 * - Personnalise l'apparence de la barre d'onglets et de l'en-tête.
 * - Affiche un logo, un titre dynamique, et un bouton de déconnexion dans l'en-tête.
 * - Gère les erreurs de chargement d'image pour le logo.
 */

const TabLayout: React.FC = () => {
	const router = useRouter();
	
	const { height } = Dimensions.get('window');
	
	const handleLogout = () => {
		router.push('/logout');
	};

	return (
		<Tabs    screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#0a7ea4',
        tabBarStyle: {
            height: Platform.OS === 'ios' ? 75 : 65,
            paddingBottom: 8,
            paddingTop: 5,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 8,
            zIndex: 9999, 
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#ddd',
        },
        keyboardHidesTabBar: true, 
        tabBarHideOnKeyboard: true,

				headerStyle: {
					height: 70,
					paddingTop: 2,
				},
				tabBarLabelStyle: {
					fontSize: 11,
					paddingBottom: 4, 
				},
				headerLeft: () => (
					<View style={styles.logoContainer}>
						<Image
							source={require('../../assets/images/iSi_Sentinel_sans_bg.png')}
							style={styles.logo}
							onError={(error) => console.error('Erreur de chargement de l\'image :', error.nativeEvent.error)}
						/>
					</View>
				),
				headerTitle: () => {
					const routeName = route.name;
					let title = '';
					
					if (routeName === 'affichage-capteurs') {
						title = 'Affichage des capteurs';
					} else if (routeName === 'modification-capteurs') {
						title = 'Modification des capteurs';
					} else if (routeName === 'statistique-capteurs') {
						title = 'Statistiques des capteurs';
					}
					
					return (
						<Text style={styles.headerTitle}>{title}</Text>
					);
				},
				headerRight: () => (
					<TouchableOpacity 
						onPress={handleLogout}
						style={{ marginRight: 15 }}
					>
						<MaterialIcons name="logout" size={24} color="#0a7ea4" />
					</TouchableOpacity>
				),
				headerTitleAlign: 'center',
			})}
		>
			<Tabs.Screen
				name="affichage-capteurs"
				options={{
					title: 'Affichage',
					tabBarIcon: ({ color, size }: TabBarIconProps) => (
						<MaterialIcons name="sensors" size={size} color={color} />
					),
				}}
			/>

			<Tabs.Screen
				name="modification-capteurs"
				options={{
					title: 'Modification',
					tabBarIcon: ({ color, size }: TabBarIconProps) => (
						<MaterialIcons name="edit" size={size} color={color} />
					),
				}}
			/>

			<Tabs.Screen
				name="statistique-capteurs"
				options={{
					title: 'Statistiques',
					tabBarIcon: ({ color, size }: TabBarIconProps) => (
						<MaterialIcons name="bar-chart" size={size} color={color} />
					),
				}}
			/>
		</Tabs>
	);
};

const styles = StyleSheet.create({
	logoContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		marginLeft: 15,
	},
	logo: {
		width: 40,
		height: 40,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: '#ccc',
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#333',
		textAlign: 'center',
	},
});

export default TabLayout;