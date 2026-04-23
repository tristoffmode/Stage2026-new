import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
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
	const tabBarClearance = Platform.OS === 'ios' ? 84 : 76;
	const buttonBottomPosition = isWeb ? 22 : (insets.bottom + tabBarClearance);
	const topOffset = isWeb ? Math.max(64, headerHeight) : Math.max(8, headerHeight - 56);

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
						{
							bottom: buttonBottomPosition,
							position: 'absolute',
							zIndex: 999,
						}
					]}
					pointerEvents="box-none"
				>
					<TouchableOpacity
						style={styles.boutonEnvoiMail}
						onPress={() => setModalVisible(true)}
						accessibilityLabel="Envoyer les statistiques par mail"
					>
						<MaterialIcons name="email" size={22} color="#fff" />
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
		alignItems: 'flex-end',
		paddingHorizontal: 18,
	},
	boutonEnvoiMail: {
		height: 48,
		width: 48,
		backgroundColor: '#0a7ea4',
		borderRadius: 24,
		elevation: 6,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		alignItems: 'center',
		justifyContent: 'center',
	},
});

export default StatistiqueCapteurs;