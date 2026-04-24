import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Image, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthService } from '../../services/authService';
import { Ionicons } from '@expo/vector-icons';

const LoginScreen: React.FC = () => {
	const placeholderColor = '#7a7a7a';
	const [username, setUsername] = useState<string>('');
	const [password, setPassword] = useState<string>('');
	const [stayLoggedIn, setStayLoggedIn] = useState<boolean>(false);
	const [showPassword, setShowPassword] = useState<boolean>(false);
	const router = useRouter();

	const isWeb = Platform.OS === 'web';
	const { width } = Dimensions.get('window');
	const isWideScreen = isWeb && width > 768;

	const handleLogin = async () => {
		const success = await AuthService.login(username, password, router, stayLoggedIn);
		if (!success) {
			console.log('Échec de la connexion');
		}
	};

	const resetTimeout = () => {
		AuthService.resetTimeout(router);
	};

	const toggleStayLoggedIn = () => {
		setStayLoggedIn(!stayLoggedIn);
	};

	return (
		<View style={[
			styles.container,
			isWideScreen && styles.webContainer
		]}>
			<View style={[
				styles.formContainer,
				isWideScreen && styles.webFormContainer
			]}>
				<View style={styles.logoContainer}>
					<Image
						source={require('../../assets/images/iSi_Sentinel_sans_bg.png')}
						style={styles.logo}
						onError={(error) => console.error('Erreur de chargement de l\'image:', error.nativeEvent.error)}
					/>
				</View>

				<Text style={styles.title}>Connexion</Text>

				<TextInput
					style={styles.input}
					placeholder="Nom d'utilisateur"
					placeholderTextColor={placeholderColor}
					value={username}
					onChangeText={setUsername}
					autoCapitalize="none"
					onPressIn={resetTimeout}
				/>

				<View style={styles.passwordContainer}>
					<TextInput
						style={[styles.input, { flex: 1, marginBottom: 0 }]}
						placeholder="Mot de passe"
						placeholderTextColor={placeholderColor}
						value={password}
						onChangeText={setPassword}
						secureTextEntry={!showPassword}
						onPressIn={resetTimeout}
					/>
					<TouchableOpacity
						style={styles.eyeButton}
						onPress={() => setShowPassword((prev) => !prev)}
						activeOpacity={0.7}
					>
						<Ionicons
							name={showPassword ? 'eye' : 'eye-off'}
							size={22}
							color="#888"
						/>
					</TouchableOpacity>
				</View>

				<TouchableOpacity
					style={styles.checkboxContainer}
					onPress={toggleStayLoggedIn}
					activeOpacity={0.7}
				>
					<View style={[styles.checkbox, stayLoggedIn && styles.checkboxChecked]}>
						{stayLoggedIn && <Ionicons name="checkmark" size={16} color="#fff" />}
					</View>
					<Text style={styles.checkboxLabel}>Rester connecté</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.loginButton}
					onPress={() => {
						resetTimeout();
						handleLogin();
					}}
				>
					<Text style={styles.loginButtonText}>Se connecter</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		padding: 20,
	},
	webContainer: {
		alignItems: 'center',
		backgroundColor: '#f5f5f5',
	},
	formContainer: {
		width: '100%',
	},
	webFormContainer: {
		width: 400,
		backgroundColor: '#fff',
		padding: 30,
		borderRadius: 10,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	logoContainer: {
		alignItems: 'center',
		marginBottom: 30,
	},
	logo: {
		width: 100,
		height: 100,
		resizeMode: 'contain',
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 20,
		textAlign: 'center',
		color: '#333',
	},
	input: {
		borderWidth: 1,
		borderColor: '#ccc',
		padding: 12,
		marginBottom: 15,
		borderRadius: 5,
		backgroundColor: '#fff',
		color: '#000000',
	},
	passwordContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 5,
		marginBottom: 15,
		paddingRight: 8,
		backgroundColor: '#fff',
	},
	eyeButton: {
		padding: 6,
	},
	checkboxContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 20,
	},
	checkbox: {
		width: 20,
		height: 20,
		borderRadius: 4,
		borderWidth: 2,
		borderColor: '#0a7ea4',
		marginRight: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
	checkboxChecked: {
		backgroundColor: '#0a7ea4',
	},
	checkboxLabel: {
		fontSize: 16,
		color: '#333',
	},
	loginButton: {
		backgroundColor: '#0a7ea4',
		padding: 12,
		borderRadius: 5,
		alignItems: 'center',
	},
	loginButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
});

export default LoginScreen;