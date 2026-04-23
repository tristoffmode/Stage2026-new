import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, LayoutChangeEvent } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import DropdownFiltre from '../DropdownFiltre';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useStatistiques } from '../../contexts/StatistiquesContext';

const isWeb = Platform.OS === 'web';

interface Props {
	topInset: number;
	onLayoutMeasured?: (height: number) => void;
}

const StatistiqueCapteurFilters: React.FC<Props> = ({ topInset, onLayoutMeasured }) => {
	const {
		siteOuvert,
		capteurOuvert,
		selectedSite,
		selectedCapteur,
		sites,
		capteurs,
		setSiteOuvert,
		setCapteurOuvert,
		setSelectedSite,
		setSelectedCapteur,
		startDate,
		endDate,
		showStartDatePicker,
		showEndDatePicker,
		setShowStartDatePicker,
		setShowEndDatePicker,
		onStartDateChange,
		onEndDateChange,
		filtersExpanded,
		setFiltersExpanded,
		setFiltersHeight
	} = useStatistiques();

	const formatDateForInput = (date: Date): string => {
		return date.toISOString().split('T')[0];
	};

	const handleWebStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const dateValue = e.target.value;
		if (dateValue) {
			const newDate = new Date(dateValue);
			if (!isNaN(newDate.getTime())) {
				onStartDateChange({ type: 'set' }, newDate);
			}
		}
	};

	const handleWebEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const dateValue = e.target.value;
		if (dateValue) {
			const newDate = new Date(dateValue);
			if (!isNaN(newDate.getTime())) {
				onEndDateChange({ type: 'set' }, newDate);
			}
		}
	};

	const isAndroid = Platform.OS === 'android';
	const animatedHeight = useRef(new Animated.Value(filtersExpanded ? 1 : 0)).current;
	const contentRef = useRef<View>(null);

	const onLayout = (event: LayoutChangeEvent) => {
		const { height } = event.nativeEvent.layout;
		if (onLayoutMeasured) {
			onLayoutMeasured(height);
		}
	};

	const toggleFilters = () => {
		const newValue = !filtersExpanded;
		setFiltersExpanded(newValue);

		Animated.timing(animatedHeight, {
			toValue: newValue ? 1 : 0,
			duration: 300,
			useNativeDriver: false
		}).start();
	};

	const handleOpenSite = (isOpen: boolean) => {
		setSiteOuvert(isOpen);
		if (isOpen) setCapteurOuvert(false);
	};

	const handleOpenCapteur = (isOpen: boolean) => {
		setCapteurOuvert(isOpen);
		if (isOpen) setSiteOuvert(false);
	};

	const capteursOptions = [
		{ label: 'Tous les capteurs', value: 'ALL' },
		...capteurs
	];

	if (isAndroid) {
		return (
			<View
				style={[styles.androidFilterContainer, { paddingTop: topInset }]}
				onLayout={onLayout}
			>
				<View style={styles.headerRow}>
					<Text style={styles.headerTitle}>Filtres</Text>
					<TouchableOpacity onPress={toggleFilters} style={styles.androidArrowButton}>
						<MaterialIcons
							name={filtersExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
							size={24}
							color="#0a7ea4"
						/>
					</TouchableOpacity>
				</View>

				{filtersExpanded && (
					<View style={styles.androidFilterContent}>
						{/* Site dropdown */}
						<View style={styles.androidDropdownContainer}>
							<DropdownFiltre
								label="Établissement :"
								ouvert={siteOuvert}
								valeur={selectedSite || null}
								elements={sites}
								setOuvert={handleOpenSite}
								setValeur={(value: string) => setSelectedSite(value)}
								setElements={() => { }}
								zIndex={1000}
								zIndexInverse={500}
								useModalOnAndroid={true}
								containerStyle={styles.statsDropdownFullWidth}
							/>
						</View>

						{/* Capteur dropdown */}
						<View style={styles.androidDropdownContainer}>
							<DropdownFiltre
								label="Capteur :"
								ouvert={capteurOuvert}
								valeur={selectedCapteur || null}
								elements={capteursOptions}
								setOuvert={handleOpenCapteur}
								setValeur={(value: string) => setSelectedCapteur(value)}
								setElements={() => { }}
								zIndex={500}
								zIndexInverse={1000}
								useModalOnAndroid={true}
								containerStyle={styles.statsDropdownFullWidth}
							/>
						</View>

						{/* Date pickers */}
						<View style={styles.datePickersContainer}>
							<View style={styles.dateItem}>
								<Text style={styles.label}>Du :</Text>
								{isWeb ? (
									<input
										type="date"
										value={formatDateForInput(startDate)}
										onChange={handleWebStartDateChange}
										max={formatDateForInput(new Date())}
										style={{
											fontSize: '16px',
											padding: '6px',
											borderRadius: '8px',
											border: '1px solid #ccc',
											backgroundColor: '#f9f9f9',
											width: '100%',
											boxSizing: 'border-box'
										}}
									/>
								) : (
									<TouchableOpacity
										style={styles.datePicker}
										onPress={() => setShowStartDatePicker(true)}
									>
										<Text>{format(startDate, 'dd/MM/yyyy', { locale: fr })}</Text>
										<MaterialIcons name="calendar-today" size={20} color="#0a7ea4" />
									</TouchableOpacity>
								)}
							</View>

							<View style={styles.arrowContainer}>
								<Text style={[styles.label, styles.arrowText]}>→</Text>
							</View>

							<View style={styles.dateItem}>
								<Text style={styles.label}>Au :</Text>
								{isWeb ? (
									<input
										type="date"
										value={formatDateForInput(endDate)}
										onChange={handleWebEndDateChange}
										min={formatDateForInput(startDate)}
										max={formatDateForInput(new Date())}
										style={{
											fontSize: '16px',
											padding: '8px',
											borderRadius: '8px',
											border: '1px solid #ccc',
											backgroundColor: '#f9f9f9',
											width: '100%'
										}}
									/>
								) : (
									<TouchableOpacity
										style={styles.datePicker}
										onPress={() => setShowEndDatePicker(true)}
									>
										<Text>{format(endDate, 'dd/MM/yyyy', { locale: fr })}</Text>
										<MaterialIcons name="calendar-today" size={20} color="#0a7ea4" />
									</TouchableOpacity>
								)}
							</View>
						</View>
					</View>
				)}

				{/* Date pickers modals - only on native */}
				{!isWeb && showStartDatePicker && (
					<DateTimePicker
						value={startDate}
						mode="date"
						display="default"
						onChange={onStartDateChange}
						maximumDate={new Date()}
					/>
				)}

				{!isWeb && showEndDatePicker && (
					<DateTimePicker
						value={endDate}
						mode="date"
						display="default"
						onChange={onEndDateChange}
						minimumDate={startDate}
						maximumDate={new Date()}
					/>
				)}
			</View>
		);
	}

	return (
		<View style={[styles.filterContainer, { paddingTop: topInset }]}>
			<View style={styles.headerRow}>
				<Text style={styles.headerTitle}>Filtres</Text>
			</View>

			<Animated.View
				ref={contentRef}
				style={[
					styles.filterContent,
					{
						maxHeight: animatedHeight.interpolate({
							inputRange: [0, 1],
							outputRange: [0, 500]
						}),
						opacity: animatedHeight,
						overflow: 'hidden'
					}
				]}
				onLayout={onLayout}
			>
				<View style={[styles.dropdownContainer, { zIndex: 3000 }]}>
					<DropdownFiltre
						label="Établissement :"
						ouvert={siteOuvert}
						valeur={selectedSite || null}
						elements={sites}
						setOuvert={handleOpenSite}
						setValeur={(value: string) => setSelectedSite(value)}
						setElements={() => { }}
						zIndex={10000}
						zIndexInverse={1000}
						containerStyle={styles.statsDropdownFullWidth}
					/>
				</View>

				<View style={[styles.dropdownContainer, { zIndex: 2000 }]}>
					<DropdownFiltre
						label="Capteur :"
						ouvert={capteurOuvert}
						valeur={selectedCapteur || null}
						elements={capteursOptions}
						setOuvert={handleOpenCapteur}
						setValeur={(value: string) => setSelectedCapteur(value)}
						setElements={() => { }}
						zIndex={4000}
						zIndexInverse={2000}
						containerStyle={styles.statsDropdownFullWidth}
					/>
				</View>

				<View style={styles.datePickersContainer}>
					<View style={styles.dateItem}>
						<Text style={styles.label}>Du :</Text>
						{isWeb ? (
							<input
								type="date"
								value={formatDateForInput(startDate)}
								onChange={handleWebStartDateChange}
								max={formatDateForInput(new Date())}
								style={{
									fontSize: '16px',
									padding: '8px',
									borderRadius: '8px',
									border: '1px solid #ccc',
									backgroundColor: '#f9f9f9',
									width: '100%'
								}}
							/>
						) : (
							<TouchableOpacity
								style={styles.datePicker}
								onPress={() => setShowStartDatePicker(true)}
							>
								<Text>{format(startDate, 'dd/MM/yyyy', { locale: fr })}</Text>
								<MaterialIcons name="calendar-today" size={20} color="#0a7ea4" />
							</TouchableOpacity>
						)}
					</View>

					<View style={styles.arrowContainer}>
						<Text style={[styles.label, styles.arrowText]}>→</Text>
					</View>

					<View style={styles.dateItem}>
						<Text style={styles.label}>Au :</Text>
						{isWeb ? (
							<input
								type="date"
								value={formatDateForInput(endDate)}
								onChange={handleWebEndDateChange}
								min={formatDateForInput(startDate)}
								max={formatDateForInput(new Date())}
								style={{
									fontSize: '16px',
									padding: '8px',
									borderRadius: '8px',
									border: '1px solid #ccc',
									backgroundColor: '#f9f9f9',
									width: '100%'
								}}
							/>
						) : (
							<TouchableOpacity
								style={styles.datePicker}
								onPress={() => setShowEndDatePicker(true)}
							>
								<Text>{format(endDate, 'dd/MM/yyyy', { locale: fr })}</Text>
								<MaterialIcons name="calendar-today" size={20} color="#0a7ea4" />
							</TouchableOpacity>
						)}
					</View>
				</View>

				{/* Date pickers modals - only on native */}
				{!isWeb && showStartDatePicker && (
					<DateTimePicker
						value={startDate}
						mode="date"
						display="default"
						onChange={onStartDateChange}
						maximumDate={new Date()}
					/>
				)}

				{!isWeb && showEndDatePicker && (
					<DateTimePicker
						value={endDate}
						mode="date"
						display="default"
						onChange={onEndDateChange}
						minimumDate={startDate}
						maximumDate={new Date()}
					/>
				)}
			</Animated.View>

			{/* Flèche positionnée en bas au milieu */}
			<TouchableOpacity
				onPress={toggleFilters}
				style={styles.arrowButton}
			>
				<MaterialIcons
					name={filtersExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
					size={24}
					color="#0a7ea4"
				/>
			</TouchableOpacity>
		</View>
	);
};

const styles = StyleSheet.create({
	// Styles iOS (inchangés)
	filterContainer: {
		backgroundColor: '#ffffff',
		paddingHorizontal: 15,
		borderBottomWidth: 1,
		borderBottomColor: '#ddd',
		elevation: 5,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		paddingBottom: 12,
		zIndex: 20,
	},
	headerRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 10,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#333',
	},
	arrowButton: {
		alignSelf: 'center',
		marginTop: 6,
		width: 30,
		height: 30,
		backgroundColor: '#fff',
		borderRadius: 15,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#ddd',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		shadowRadius: 2,
		elevation: 3,
		zIndex: 21,
	},
	filterContent: {},
	statsDropdownFullWidth: {
		width: '100%',
		marginHorizontal: 0,
		flex: 0,
	},
	dropdownContainer: {
		marginBottom: 14,
		position: 'relative',
	},

	// Styles communs
	datePickersContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 10,
		marginBottom: 10,
		...(isWeb && { maxWidth: '94%', flexWrap: 'nowrap' }),
		...(!isWeb && { flexWrap: 'wrap', rowGap: 8 }),

	},
	dateItem: {
		width: '43%',
	},
	datePicker: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		height: 40,
		borderColor: '#ccc',
		borderWidth: 1,
		borderRadius: 8,
		paddingHorizontal: 10,
		backgroundColor: '#f9f9f9',
	},
	label: {
		fontSize: 14,
		marginBottom: 5,
		fontWeight: '600',
		color: '#333',
	},
	arrowContainer: {
		width: '8%',
		alignItems: 'center',
		justifyContent: 'center',
	},
	arrowText: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#0a7ea4',
	},

	androidFilterContainer: {
		backgroundColor: '#ffffff',
		paddingHorizontal: 15,
		borderBottomWidth: 1,
		borderBottomColor: '#ddd',
		elevation: 5,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		paddingBottom: 10, // Réduit (était 20)
	},
	androidHeaderRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 10,
	},
	androidArrowButton: {
		position: 'absolute',
		right: 0,
		padding: 5,
	},
	androidFilterContent: {
		paddingTop: 10,
		paddingBottom: 10,
	},
	androidDropdownContainer: {
		marginBottom: 16,
		zIndex: 1000,
	},
	arrowButtonAndroid: {
		position: 'absolute',
		bottom: -15,
		left: '50%',
		marginLeft: -15,
		width: 30,
		height: 30,
		backgroundColor: '#fff',
		borderRadius: 15,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#ddd',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		shadowRadius: 2,
		elevation: 3,
		zIndex: 1001,
	},
});

export default StatistiqueCapteurFilters;