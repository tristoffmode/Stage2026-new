import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { MaterialIcons } from '@expo/vector-icons';
import StatistiqueCapteurFilters from '../../components/statistiques/StatistiqueCapteurFiltres';
import StatistiqueCapteurContent from '../../components/statistiques/StatistiqueCapteurContent';
import ModalEnvoyerStats from '../../components/statistiques/ModalEnvoyerStats';
import { StatistiquesProvider } from '../../contexts/StatistiquesContext';

/**
 * Écran des statistiques des capteurs pour l'application.
 */
const StatistiqueCapteurs = () => {
	const insets = useSafeAreaInsets();
	const headerHeight = useHeaderHeight();
	const [modalVisible, setModalVisible] = useState<boolean>(false);
	const isWeb = Platform.OS === 'web';
	const buttonBottomPosition = isWeb ? 22 : (insets.bottom + 16);
	const topOffset = isWeb ? Math.max(64, headerHeight) : Math.max(8, headerHeight - 56);
	const webButtonTop = topOffset + 10;

	return (
		<View style={styles.safeArea}>
			<StatistiquesProvider>
				<View style={[styles.container, { paddingTop: topOffset }]}>
					<StatistiqueCapteurFilters topInset={0} />

					<StatistiqueCapteurContent
						topInset={0}
						hasFloatingButton={true}
						isAndroid={Platform.OS === 'android'}
					/>
				</View>

				<View
					style={[
						styles.boutonContainer,
						isWeb
							? {
								top: webButtonTop,
								left: 0,
								right: 16,
								alignItems: 'flex-end',
								position: 'absolute',
								zIndex: 999,
							}
							: {
								bottom: buttonBottomPosition,
								position: 'absolute',
								zIndex: 999,
							}
					]}
					pointerEvents="box-none"
				>
					<TouchableOpacity
						style={[styles.boutonEnvoiMail, isWeb && styles.boutonEnvoiMailWeb]}
						onPress={() => setModalVisible(true)}
						accessibilityLabel="Envoyer les statistiques par email"
					>
						<MaterialIcons name="email" size={isWeb ? 20 : 24} color="#fff" />
						{!isWeb && <Text style={styles.texteBouton}>Envoyer</Text>}
					</TouchableOpacity>
				</View>

				<ModalEnvoyerStats
					visible={modalVisible}
					setVisible={setModalVisible}
				/>
			</StatistiquesProvider>
		</View>
	);
};

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
		position: 'relative'
	},
	boutonContainer: {
		left: 0,
		right: 0,
		alignItems: 'center',
	},
	boutonEnvoiMail: {
		height: 50,
		minWidth: 120,
		paddingHorizontal: 20,
		backgroundColor: '#0a7ea4',
		borderRadius: 25,
		elevation: 6,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	boutonEnvoiMailWeb: {
		height: 44,
		width: 44,
		minWidth: 44,
		paddingHorizontal: 0,
		borderRadius: 22,
	},
	texteBouton: {
		color: '#ffffff',
		fontWeight: '600',
		fontSize: 16,
		marginLeft: 8,
	},
});

export default StatistiqueCapteurs;