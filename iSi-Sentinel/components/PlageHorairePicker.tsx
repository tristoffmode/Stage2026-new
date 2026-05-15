import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import styles from '../styles/PlageHorairePickerStyles';
import { MaterialIcons } from '@expo/vector-icons';

interface PlageHoraire {
	debut: Date;
	fin: Date;
}

interface PlageHorairePickerProps {
	visible: boolean;
	setVisible: (visible: boolean) => void;
	jour: string;
	plageHoraire: PlageHoraire;
	setPlageHoraire: (plage: PlageHoraire) => void;
}

const PlageHorairePicker: React.FC<PlageHorairePickerProps> = ({
	visible,
	setVisible,
	jour,
	plageHoraire,
	setPlageHoraire,
}) => {
	const [modeHeure, setModeHeure] = useState<'debut' | 'fin'>('debut');
	const [heureTemporaire, setHeureTemporaire] = useState<Date>(plageHoraire.debut);
	const [datePickerVisible, setDatePickerVisible] = useState<boolean>(false);
	const [heureModifiee, setHeureModifiee] = useState<PlageHoraire>(plageHoraire);

	const isWeb = Platform.OS === 'web';

	useEffect(() => {
		if (!visible) return;

		// Keep local picker state aligned with selected day schedule when modal opens.
		setHeureModifiee(plageHoraire);
		setHeureTemporaire(plageHoraire.debut);
		setModeHeure('debut');
		setDatePickerVisible(false);
	}, [visible, plageHoraire]);

	const formaterHeure = (date: Date): string => {
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	};

	const formatHeureForInput = (date: Date): string => {
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		return `${hours}:${minutes}`;
	};

	const ouvrirSelecteurHeure = (mode: 'debut' | 'fin'): void => {
		setModeHeure(mode);
		setHeureTemporaire(mode === 'debut' ? heureModifiee.debut : heureModifiee.fin);
		if (!isWeb) {
			setDatePickerVisible(true);
		}
	};

	const gererChangementHeure = (event: any, heureSelectionnee?: Date): void => {
		setDatePickerVisible(false);

		if (event.type === 'dismissed' || !heureSelectionnee) {
			return;
		}

		const nouvellePlage = {
			...heureModifiee,
			[modeHeure === 'debut' ? 'debut' : 'fin']: new Date(heureSelectionnee)
		};

		setHeureModifiee(nouvellePlage);
		setHeureTemporaire(new Date(heureSelectionnee));
	};

	const handleWebTimeChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'debut' | 'fin') => {
		const timeString = e.target.value;
		if (timeString) {
			const [hours, minutes] = timeString.split(':').map(Number);

			const newDate = new Date();
			newDate.setHours(hours, minutes, 0, 0);

			setHeureModifiee(prev => ({
				...prev,
				[type]: newDate
			}));
		}
	};

	const sauvegarderEtFermer = () => {
		let plageFinale = heureModifiee;

		if (plageFinale.debut > plageFinale.fin) {
			plageFinale = {
				debut: new Date(plageFinale.fin),
				fin: new Date(plageFinale.debut),
			};
		}

		setPlageHoraire(plageFinale);
		setVisible(false);
	};

	const annuler = () => {
		setVisible(false);
	};

	return (
		<Modal
			animationType="fade"
			transparent={true}
			visible={visible}
			onRequestClose={annuler}
		>
			<View style={styles.fondModal}>
				<View style={styles.conteneurModal}>
					<Text style={styles.titreModalHeure}>
						Plage horaire pour {jour}
					</Text>

					<View style={styles.conteneurSelecteurs}>
						<View style={styles.groupeSelecteur}>
							<Text style={styles.etiquetteHeure}>Début</Text>
							{isWeb ? (
								<input
									type="time"
									value={formatHeureForInput(heureModifiee.debut)}
									onChange={(e) => handleWebTimeChange(e, 'debut')}
									style={{
										fontSize: '16px',
										padding: '10px',
										borderRadius: '8px',
										border: '1px solid #cce0ff',
										backgroundColor: '#e6f0ff',
										color: '#000000',
										width: '100%',
										minWidth: '100px',
									}}
								/>
							) : (
								<TouchableOpacity
									style={styles.boutonHeure}
									onPress={() => ouvrirSelecteurHeure('debut')}
								>
									<MaterialIcons name="access-time" size={18} color="#0a7ea4" style={{ marginRight: 5 }} />
									<Text style={styles.texteHeure}>{formaterHeure(heureModifiee.debut)}</Text>
								</TouchableOpacity>
							)}
						</View>

						<Text style={styles.separateurHeure}>–</Text>

						<View style={styles.groupeSelecteur}>
							<Text style={styles.etiquetteHeure}>Fin</Text>
							{isWeb ? (
								<input
									type="time"
									value={formatHeureForInput(heureModifiee.fin)}
									onChange={(e) => handleWebTimeChange(e, 'fin')}
									style={{
										fontSize: '16px',
										padding: '10px',
										borderRadius: '8px',
										border: '1px solid #cce0ff',
										backgroundColor: '#e6f0ff',
										color: '#000000',
										width: '100%',
										minWidth: '100px',
									}}
								/>
							) : (
								<TouchableOpacity
									style={styles.boutonHeure}
									onPress={() => ouvrirSelecteurHeure('fin')}
								>
									<MaterialIcons name="access-time" size={18} color="#0a7ea4" style={{ marginRight: 5 }} />
									<Text style={styles.texteHeure}>{formaterHeure(heureModifiee.fin)}</Text>
								</TouchableOpacity>
							)}
						</View>
					</View>

					{!isWeb && datePickerVisible && (
						<DateTimePicker
							value={heureTemporaire}
							mode="time"
							is24Hour={true}
							display={Platform.OS === 'ios' ? 'spinner' : 'default'}
							onChange={gererChangementHeure}
							style={styles.selecteurHeure}
						/>
					)}

					<View style={styles.conteneurBoutons}>
						<TouchableOpacity
							style={styles.boutonAnnuler}
							onPress={annuler}
						>
							<Text style={styles.texteBoutonAnnuler}>Annuler</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.boutonValider}
							onPress={sauvegarderEtFermer}
						>
							<Text style={styles.texteBoutonValider}>Confirmer</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
};

export default PlageHorairePicker;