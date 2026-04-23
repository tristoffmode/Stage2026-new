import React, { useState } from 'react';
import { View, Text, Platform, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';
import styles from '../styles/DropdownFiltreStyles';

interface DropdownItem {
	label: string;
	value: string;
}

interface DropdownFiltreProps {
	label: string;
	ouvert: boolean;
	valeur: string | null;
	elements: DropdownItem[];
	setOuvert: any;
	setValeur: any;
	setElements: any;
	zIndex: number;
	zIndexInverse: number;
	useModalOnAndroid?: boolean;
	containerStyle?: any;
}

/**
 * Composant DropdownFiltre pour la sélection d'éléments dans une liste déroulante.
 * 
 * @component
 * @param {DropdownFiltreProps} props - Les propriétés du composant.
 * @returns {React.FC} Composant fonctionnel représentant un menu déroulant.
 * 
 * @description
 * Ce composant affiche un menu déroulant pour sélectionner une valeur parmi une liste d'éléments.
 * Il adapte son rendu en fonction de la plateforme (Android, iOS ou Web).
 * 
 * @remarks
 * - Sur Android, utilise le composant natif `Picker`.
 * - Sur iOS, utilise `DropDownPicker` pour une expérience utilisateur enrichie.
 * - Sur Web, utilise une modal pour afficher les options.
 * - Gère les styles, les événements de sélection et les états d'ouverture/fermeture.
 */
const DropdownFiltre: React.FC<DropdownFiltreProps> = ({
	label,
	ouvert,
	valeur,
	elements,
	setOuvert,
	setValeur,
	setElements,
	zIndex,
	zIndexInverse,
	useModalOnAndroid = false,
	containerStyle,
}) => {
	const isAndroid = Platform.OS === 'android';
	const isWeb = Platform.OS === 'web';
	const [modalVisible, setModalVisible] = useState<boolean>(false);

	const selectedItemLabel = elements.find(item => item.value === valeur)?.label || "Sélectionner...";

	if (isAndroid && !useModalOnAndroid) {
		return (
			<View style={[styles.conteneur, containerStyle]}>
				<Text style={styles.etiquette}>{label}</Text>
				<View style={[styles.dropdownAndroid, { borderWidth: 1, borderColor: '#ccc', borderRadius: 8 }]}>
					<Picker
						selectedValue={valeur}
						onValueChange={(itemValue) => setValeur(itemValue)}
						style={{ color: '#0a7ea4' }}
						dropdownIconColor="#0a7ea4"
					>
						<Picker.Item label="Sélectionner..." value="" />
						{elements.map((item) => (
							<Picker.Item
								key={item.value}
								label={item.label}
								value={item.value}
							/>
						))}
					</Picker>
				</View>
			</View>
		);
	}

	if (isWeb || (isAndroid && useModalOnAndroid)) {
		return (
			<View style={[styles.conteneur, containerStyle, { zIndex: zIndex }]}>
				<Text style={styles.etiquette}>{label}</Text>
				<TouchableOpacity
					style={webStyles.dropdownButton}
					onPress={() => setModalVisible(true)}
				>
					<Text style={webStyles.dropdownButtonText}>{selectedItemLabel}</Text>
					<MaterialIcons name="arrow-drop-down" size={24} color="#0a7ea4" />
				</TouchableOpacity>

				<Modal
					visible={modalVisible}
					transparent={true}
					animationType="fade"
					onRequestClose={() => setModalVisible(false)}
				>
					<TouchableOpacity
						style={webStyles.modalOverlay}
						activeOpacity={1}
						onPress={() => setModalVisible(false)}
					>
						<TouchableOpacity
							style={webStyles.modalContent}
							activeOpacity={1}
							onPress={() => { }}
						>
							<View style={webStyles.modalHeader}>
								<Text style={webStyles.modalTitle}>{label}</Text>
								<TouchableOpacity onPress={() => setModalVisible(false)}>
									<MaterialIcons name="close" size={24} color="#333" />
								</TouchableOpacity>
							</View>

							<ScrollView style={webStyles.optionsList} keyboardShouldPersistTaps="handled">
								{elements.map((item) => (
									<TouchableOpacity
										key={item.value}
										style={[
											webStyles.optionItem,
											valeur === item.value && webStyles.selectedOption
										]}
										onPress={() => {
											setValeur(item.value);
											setModalVisible(false);
										}}
									>
										<Text
											style={[
												webStyles.optionText,
												valeur === item.value && webStyles.selectedOptionText
											]}
										>
											{item.label}
										</Text>
										{valeur === item.value && (
											<MaterialIcons name="check" size={20} color="#0a7ea4" />
										)}
									</TouchableOpacity>
								))}
							</ScrollView>
						</TouchableOpacity>
					</TouchableOpacity>
				</Modal>
			</View>
		);
	}

	return (
		<View style={[styles.conteneur, containerStyle, { zIndex: zIndex + 10 }]}>
			<Text style={styles.etiquette}>{label}</Text>
			<DropDownPicker
				open={ouvert}
				value={valeur}
				items={elements}
				setOpen={setOuvert}
				setValue={setValeur}
				setItems={setElements}
				style={styles.dropdown}
				containerStyle={styles.conteneurDropdown}
				dropDownContainerStyle={[
					styles.conteneurListeDeroulante,
					{
						maxHeight: 400,
						overflow: 'visible',
						borderWidth: 0,
						borderColor: '#ccc',
					},
				]}
				listMode="FLATLIST"
				scrollViewProps={{
					persistentScrollbar: true,
					showsVerticalScrollIndicator: true,
					nestedScrollEnabled: true,
					scrollEnabled: true
				}}
				flatListProps={{
					nestedScrollEnabled: true,
					showsVerticalScrollIndicator: true,
					initialNumToRender: 10,
					maxToRenderPerBatch: 10,
				}}
				itemSeparator={true}
				itemSeparatorStyle={{
					backgroundColor: '#eaeaea',
				}}
				dropDownDirection="BOTTOM"
				labelStyle={{
					color: '#0a7ea4',
					fontWeight: '600',
				}}
				selectedItemContainerStyle={{
					backgroundColor: '#e6f0ff',
				}}
				selectedItemLabelStyle={{
					color: '#0a7ea4',
					fontWeight: '600',
				}}
				disableLocalSearch={true}
				closeAfterSelecting={true}
				zIndex={zIndex}
				zIndexInverse={zIndexInverse}
				placeholder="Sélectionner..."
				textStyle={styles.texteDropdown}
				arrowIconStyle={styles.fleche}
				closeIconStyle={styles.icone}
				tickIconStyle={styles.icone}
			/>
		</View>
	);
};

const webStyles = StyleSheet.create({
	dropdownButton: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		height: 45,
		backgroundColor: '#f9f9f9',
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		paddingHorizontal: 15,
	},
	dropdownButtonText: {
		fontSize: 16,
		color: '#0a7ea4',
		fontWeight: '600',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	modalContent: {
		width: '80%',
		maxWidth: 500,
		maxHeight: '80%',
		backgroundColor: '#ffffff',
		borderRadius: 10,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
		overflow: 'hidden',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 15,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
	},
	optionsList: {
		maxHeight: 400,
	},
	optionItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 15,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	selectedOption: {
		backgroundColor: '#e6f0ff',
	},
	optionText: {
		fontSize: 16,
		color: '#333',
	},
	selectedOptionText: {
		color: '#0a7ea4',
		fontWeight: '600',
	},
});

export default DropdownFiltre;