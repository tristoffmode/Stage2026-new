import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, ActivityIndicator, Alert, Platform, Dimensions, Keyboard } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { NoteService, Note } from '../services/noteService';
import styles from '../styles/ModalAjouterNoteStyles';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Capteur {
	id?: number;
	name?: string;
	nom?: string;
}

interface ModalAjouterNoteProps {
	visible: boolean;
	setVisible: (visible: boolean) => void;
	capteur: Capteur | null;
	indexCapteur: number | null;
}

/**
 * Modal pour afficher la liste des notes existantes.
 */
const ModalNotesExistantes: React.FC<{
	visible: boolean;
	setVisible: (visible: boolean) => void;
	notes: Note[];
	chargement: boolean;
	supprimerNote: (id: number) => Promise<void>;
	formaterDate: (date: string) => string;
}> = ({
	visible,
	setVisible,
	notes,
	chargement,
	supprimerNote,
	formaterDate
}) => {
		return (
			<Modal
				animationType="slide"
				transparent={true}
				visible={visible}
				onRequestClose={() => setVisible(false)}
			>
				<View style={styles.fondModal}>
					<View style={styles.conteneurModal}>
						<TouchableOpacity
							style={styles.boutonFermer}
							onPress={() => setVisible(false)}
						>
							<MaterialIcons name="close" size={24} color="#333" />
						</TouchableOpacity>

						<Text style={styles.titreModal}>Notes précédentes</Text>

						{chargement ? (
							<ActivityIndicator size="large" color="#007bff" style={{ marginVertical: 20 }} />
						) : (
							<ScrollView style={{ maxHeight: 400, marginTop: 10 }}>
								{notes.length > 0 ? (
									notes.map((note, index) => {
										return (
											<View key={note.id || index} style={styles.noteExistante}>
												<View style={styles.noteHeader}>
													<Text style={styles.dateNote}>{formaterDate(note.timestamp)}</Text>
													<TouchableOpacity
														style={styles.deleteButton}
														onPress={() => {
															if (note.id !== undefined) {
																supprimerNote(note.id);
															} else {
																Alert.alert('Erreur', 'Impossible de supprimer cette note (ID manquant)');
															}
														}}
													>
														<MaterialIcons name="delete" size={18} color="#ff4d4d" />
													</TouchableOpacity>
												</View>
												<Text style={styles.texteNote}>{note.note}</Text>
											</View>
										);
									})
								) : (
									<Text style={styles.aucuneNote}>Aucune note pour ce capteur</Text>
								)}
							</ScrollView>
						)}

						<TouchableOpacity
							style={styles.boutonValider}
							onPress={() => setVisible(false)}
						>
							<Text style={styles.texteBoutonValider}>Fermer</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		);
	};

/**
 * Modal pour ajouter et gérer des notes associées à un capteur.
 */
const ModalAjouterNote: React.FC<ModalAjouterNoteProps> = ({
	visible,
	setVisible,
	capteur,
	indexCapteur,
}) => {
	const [note, setNote] = useState<string>('');
	const [notesExistantes, setNotesExistantes] = useState<Note[]>([]);
	const [chargement, setChargement] = useState<boolean>(false);

	const [dateNote, setDateNote] = useState<Date>(new Date());
	const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
	const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
	const [tempDateNote, setTempDateNote] = useState<Date>(new Date());

	const [modalNotesVisible, setModalNotesVisible] = useState<boolean>(false);

	const screenWidth = Dimensions.get('window').width;
	const isSmallScreen = screenWidth < 400;
	const isWeb = Platform.OS === 'web';

	const nombreNotes = notesExistantes.length;

	useEffect(() => {
		const chargerNotes = async () => {
			if (visible && capteur?.id) {
				setChargement(true);
				try {
					const notes = await NoteService.getNotes(capteur.id);
					setNotesExistantes(notes);
				} catch (error) {
					console.error('Erreur lors de la récupération des notes:', error);
				} finally {
					setChargement(false);
				}
			}
		};

		chargerNotes();
	}, [visible, capteur]);

	const fermerModal = (): void => {
		setVisible(false);
		setNote('');
		setDateNote(new Date());
		setTempDateNote(new Date());
		setShowDatePicker(false);
		setDatePickerMode('date');
	};

	const onDateChange = (event: any, selectedDate?: Date): void => {
		if (Platform.OS === 'ios') {
			if (selectedDate) {
				setTempDateNote(selectedDate);
			}
			return;
		}

		if (event?.type === 'dismissed' || !selectedDate) {
			setShowDatePicker(false);
			setDatePickerMode('date');
			return;
		}

		setDateNote(selectedDate);

		if (datePickerMode === 'date') {
			setDatePickerMode('time');
			setShowDatePicker(true);
		} else {
			setShowDatePicker(false);
			setDatePickerMode('date');
		}
	};

	const formatDateForInput = (date: Date): string => {
		return date.toISOString().split('T')[0];
	};

	const formatTimeForInput = (date: Date): string => {
		return date.toTimeString().substring(0, 5);
	};

	const handleWebDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const dateValue = e.target.value;
		if (dateValue) {
			const newDate = new Date(dateNote);
			const [year, month, day] = dateValue.split('-').map(Number);
			newDate.setFullYear(year, month - 1, day);
			setDateNote(newDate);
		}
	};

	const handleWebTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const timeValue = e.target.value;
		if (timeValue) {
			const newDate = new Date(dateNote);
			const [hours, minutes] = timeValue.split(':').map(Number);
			newDate.setHours(hours, minutes, 0, 0);
			setDateNote(newDate);
		}
	};

	const showDateTimePicker = (mode: 'date' | 'time'): void => {
		if (!isWeb) {
			setTempDateNote(dateNote);
			setDatePickerMode(mode);
			setShowDatePicker(true);
		}
	};

	const confirmerDateIOS = (): void => {
		setDateNote(tempDateNote);
		setShowDatePicker(false);
		setDatePickerMode('date');
	};

	const annulerDateIOS = (): void => {
		setTempDateNote(dateNote);
		setShowDatePicker(false);
		setDatePickerMode('date');
	};

	const sauvegarderNote = async (): Promise<void> => {
		if (note.trim() && capteur?.id) {
			setChargement(true);
			try {
				const formattedDate = format(dateNote, 'yyyy-MM-dd HH:mm');

				const success = await NoteService.addNote(capteur.id, note.trim(), formattedDate);
				if (success) {
					const notes = await NoteService.getNotes(capteur.id);
					setNotesExistantes(notes);
					setNote('');
				}
			} catch (error) {
				console.error('Erreur lors de l\'ajout de la note:', error);
			} finally {
				setChargement(false);
			}
		}
	};

	const supprimerNote = async (noteId: number): Promise<void> => {
		try {
			setChargement(true);

			const success = await NoteService.deleteNote(noteId);

			if (success && capteur?.id) {
				const notes = await NoteService.getNotes(capteur.id);
				setNotesExistantes(notes);
			}
		} catch (error: any) {
			console.error('Exception lors de la suppression de la note:', error);
			Alert.alert(
				"Erreur",
				`Exception: ${error.message || "Erreur inconnue"}`,
				[{ text: "OK" }]
			);
		} finally {
			setChargement(false);
		}
	};

	const formaterDate = (dateStr: string): string => {
		const date = new Date(dateStr);
		return `${date.toLocaleDateString()} ${date.toLocaleTimeString().slice(0, 5)}`;
	};

	const nomCapteur = capteur?.name || capteur?.nom || 'Capteur';

	return (
		<Modal
			animationType="slide"
			transparent={true}
			visible={visible}
			onRequestClose={fermerModal}
		>
			<View style={styles.fondModal}>
				<View style={styles.conteneurModal}>
					<TouchableOpacity style={styles.boutonFermer} onPress={fermerModal}>
						<MaterialIcons name="close" size={24} color="#333" />
					</TouchableOpacity>

					<Text style={styles.titreModal}>Notes pour le capteur</Text>

					<View style={styles.conteneurCapteur}>
						<Text style={styles.etiquette}>Nom du capteur:</Text>
						<Text style={styles.texteCapteur}>{nomCapteur}</Text>
					</View>

					<Text style={styles.sousTitreSection}>Nouvelle note</Text>

					<View style={styles.datePickerContainer}>
						<Text style={styles.dateLabel}>Date et heure:</Text>
						<View style={styles.dateTimeSelectors}>
							{isWeb ? (
								<>
									<input
										type="date"
										value={formatDateForInput(dateNote)}
										onChange={handleWebDateChange}
										style={{
											fontSize: '16px',
											padding: '10px',
											borderRadius: '8px',
											border: '1px solid #cce0ff',
											backgroundColor: '#e6f0ff',
											color: '#007bff',
											marginRight: '10px',
											flex: 1,
										}}
										max={formatDateForInput(new Date())}
									/>
									<input
										type="time"
										value={formatTimeForInput(dateNote)}
										onChange={handleWebTimeChange}
										style={{
											fontSize: '16px',
											padding: '10px',
											borderRadius: '8px',
											border: '1px solid #cce0ff',
											backgroundColor: '#e6f0ff',
											color: '#007bff',
											flex: 1,
										}}
									/>
								</>
							) : (
								<>
									<TouchableOpacity
										style={styles.datePickerButton}
										onPress={() => showDateTimePicker('date')}
									>
										<Text style={styles.dateText}>
											{format(dateNote, 'dd/MM/yyyy', { locale: fr })}
										</Text>
										<MaterialIcons name="calendar-today" size={20} color="#0a7ea4" />
									</TouchableOpacity>

									<TouchableOpacity
										style={styles.timePickerButton}
										onPress={() => showDateTimePicker('time')}
									>
										<Text style={styles.dateText}>
											{format(dateNote, 'HH:mm', { locale: fr })}
										</Text>
										<MaterialIcons name="access-time" size={20} color="#0a7ea4" />
									</TouchableOpacity>
								</>
							)}
						</View>
					</View>

					{!isWeb && Platform.OS === 'android' && showDatePicker && (
						<DateTimePicker
							testID="dateTimePicker"
							value={dateNote}
							mode={datePickerMode}
							is24Hour={true}
							display="default"
							onChange={onDateChange}
							style={{ width: undefined }}
							maximumDate={new Date()}
						/>
					)}

					{!isWeb && Platform.OS === 'ios' && showDatePicker && (
						<Modal
							animationType="fade"
							transparent={true}
							visible={showDatePicker}
							onRequestClose={annulerDateIOS}
						>
							<View style={styles.fondPickerIOS}>
								<View style={styles.conteneurPickerIOS}>
									<Text style={styles.titrePickerIOS}>
										{datePickerMode === 'date' ? 'Choisir une date' : 'Choisir une heure'}
									</Text>
									<DateTimePicker
										testID="dateTimePickerIOS"
										value={tempDateNote}
										mode={datePickerMode}
										is24Hour={true}
										display="spinner"
										onChange={onDateChange}
										maximumDate={new Date()}
										style={styles.pickerIOS}
										themeVariant="light"
										textColor="#111827"
									/>
									<View style={styles.boutonsPickerIOS}>
										<TouchableOpacity style={styles.boutonAnnulerPickerIOS} onPress={annulerDateIOS}>
											<Text style={styles.texteBoutonAnnulerPickerIOS}>Annuler</Text>
										</TouchableOpacity>
										<TouchableOpacity style={styles.boutonValiderPickerIOS} onPress={confirmerDateIOS}>
											<Text style={styles.texteBoutonValiderPickerIOS}>Valider</Text>
										</TouchableOpacity>
									</View>
								</View>
							</View>
						</Modal>
					)}

					<TextInput
						style={[styles.champSaisie, { height: 80 }]}
						placeholder="Entrez votre note ici..."
						placeholderTextColor="#aab8ca"
						value={note}
						onChangeText={setNote}
						multiline={true}
						numberOfLines={3}
						returnKeyType="done"
						blurOnSubmit={true}
						onSubmitEditing={Keyboard.dismiss}
					/>

					<View style={styles.boutonsModal}>
						<TouchableOpacity style={styles.boutonAnnuler} onPress={fermerModal}>
							<Text style={styles.texteBouton}>Annuler</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.boutonSauvegarder, { opacity: note.trim() ? 1 : 0.5 }]}
							onPress={sauvegarderNote}
							disabled={!note.trim()}
						>
							<Text style={styles.texteBouton}>Sauvegarder</Text>
						</TouchableOpacity>
					</View>

					{/* Affichage des notes existantes selon la taille de l'écran */}
					{isSmallScreen ? (
						<TouchableOpacity
							style={styles.boutonNotesExistantes}
							onPress={() => setModalNotesVisible(true)}
						>
							<MaterialIcons name="list-alt" size={22} color="#fff" style={{ marginRight: 8 }} />
							<Text style={styles.texteBoutonNotes}>
								Voir les notes précédentes
								{nombreNotes > 0 ? ` (${nombreNotes})` : ''}
							</Text>
						</TouchableOpacity>
					) : (
						<>
							<Text style={[styles.sousTitreSection, { marginTop: 20 }]}>Notes précédentes</Text>
							{chargement ? (
								<ActivityIndicator size="large" color="#007bff" style={{ marginVertical: 20 }} />
							) : (
								<ScrollView style={{ maxHeight: 150, marginTop: 10 }}>
									{notesExistantes.length > 0 ? (
										notesExistantes.map((note, index) => {
											return (
												<View key={note.id || index} style={styles.noteExistante}>
													<View style={styles.noteHeader}>
														<Text style={styles.dateNote}>{formaterDate(note.timestamp)}</Text>
														<TouchableOpacity
															style={styles.deleteButton}
															onPress={() => {
																if (note.id !== undefined) {
																	supprimerNote(note.id);
																} else {
																	Alert.alert('Erreur', 'Impossible de supprimer cette note (ID manquant)');
																}
															}}
														>
															<MaterialIcons name="delete" size={18} color="#ff4d4d" />
														</TouchableOpacity>
													</View>
													<Text style={styles.texteNote}>{note.note}</Text>
												</View>
											);
										})
									) : (
										<Text style={styles.aucuneNote}>Aucune note pour ce capteur</Text>
									)}
								</ScrollView>
							)}
						</>
					)}

					{/* Modal pour afficher les notes existantes sur petits écrans */}
					<ModalNotesExistantes
						visible={modalNotesVisible}
						setVisible={setModalNotesVisible}
						notes={notesExistantes}
						chargement={chargement}
						supprimerNote={supprimerNote}
						formaterDate={formaterDate}
					/>
				</View>
			</View>
		</Modal>
	);
};

export default ModalAjouterNote;