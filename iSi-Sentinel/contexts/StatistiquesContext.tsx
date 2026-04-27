import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { Alert } from 'react-native';
import { CapteurService } from '../services/capteurService';
import { NoteService } from '../services/noteService';
import { StatistiqueService } from '../services/statistiqueService';
import { addDays, format, subDays, parse } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Releve {
	Date_Time: string;
	Temperature: number;
	TX_Humidite: number | null;
	Batterie: number | null;
}

interface Note {
	id: number;
	timestamp: string;
	note: string;
}

interface ProcessedData {
	Date_Time: string;
	Temp_Moyenne: number | null;
	Temp_Minimum: number | null;
	Temp_Maximum: number | null;
	Humidite_Moyenne: number | null;
	Batterie_Minimum: number | null;
}

interface StatistiquesContextType {
	capteurOuvert: boolean;
	siteOuvert: boolean;
	selectedCapteur: string;
	selectedSite: string;
	capteurs: { label: string, value: string }[];
	sites: { label: string, value: string }[];
	setCapteurOuvert: React.Dispatch<React.SetStateAction<boolean>>;
	setSiteOuvert: React.Dispatch<React.SetStateAction<boolean>>;
	setSelectedCapteur: React.Dispatch<React.SetStateAction<string>>;
	setSelectedSite: React.Dispatch<React.SetStateAction<string>>;
	startDate: Date;
	endDate: Date;
	showStartDatePicker: boolean;
	showEndDatePicker: boolean;
	setStartDate: React.Dispatch<React.SetStateAction<Date>>;
	setEndDate: React.Dispatch<React.SetStateAction<Date>>;
	setShowStartDatePicker: React.Dispatch<React.SetStateAction<boolean>>;
	setShowEndDatePicker: React.Dispatch<React.SetStateAction<boolean>>;
	loading: boolean;
	refreshing: boolean;
	error: string | null;
	temperatureData: (number | null)[];
	temperatureMin: (number | null)[];
	temperatureMax: (number | null)[];
	humidityData: (number | null)[];
	batteryData: (number | null)[];
	labels: string[];
	notes: Note[];
	tableData: ProcessedData[];
	loadCapteurData: () => Promise<void>;
	onRefresh: () => void;
	onStartDateChange: (event: any, selectedDate?: Date) => void;
	onEndDateChange: (event: any, selectedDate?: Date) => void;

	filtersExpanded: boolean;
	setFiltersExpanded: (expanded: boolean) => void;
	filtersHeight: number;
	setFiltersHeight: (height: number) => void;
}

const StatistiquesContext = createContext<StatistiquesContextType | undefined>(undefined);

export const useStatistiques = () => {
	const context = useContext(StatistiquesContext);
	if (!context) {
		throw new Error('useStatistiques doit être utilisé dans un StatistiquesProvider');
	}
	return context;
};

export const StatistiquesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [capteurOuvert, setCapteurOuvert] = useState(false);
	const [siteOuvert, setSiteOuvert] = useState(false);
	const [selectedCapteur, setSelectedCapteur] = useState<string>('');
	const [selectedSite, setSelectedSite] = useState<string>('');
	const [capteurs, setCapteurs] = useState<{ label: string, value: string }[]>([]);
	const [sites, setSites] = useState<{ label: string, value: string }[]>([]);

	const today = new Date();
	const [endDate, setEndDate] = useState(today);
	const [startDate, setStartDate] = useState(today);
	const [showStartDatePicker, setShowStartDatePicker] = useState(false);
	const [showEndDatePicker, setShowEndDatePicker] = useState(false);

	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [temperatureData, setTemperatureData] = useState<(number | null)[]>([]);
	const [temperatureMin, setTemperatureMin] = useState<(number | null)[]>([]);
	const [temperatureMax, setTemperatureMax] = useState<(number | null)[]>([]);
	const [humidityData, setHumidityData] = useState<(number | null)[]>([]);
	const [batteryData, setBatteryData] = useState<(number | null)[]>([]);
	const [labels, setLabels] = useState<string[]>([]);
	const [notes, setNotes] = useState<Note[]>([]);
	const [tableData, setTableData] = useState<ProcessedData[]>([]);
	const [filtersExpanded, setFiltersExpanded] = useState<boolean>(false);
	const [filtersHeight, setFiltersHeight] = useState<number>(60);


	useEffect(() => {
		const loadSites = async () => {
			try {
				const sitesData = await CapteurService.getSites();
				if (sitesData && sitesData.length > 0) {
					const options = sitesData.map(s => ({
						label: s.name,
						value: s.id.toString()
					}));
					setSites(options);
					setSelectedSite(options[0].value);
				} else {
					setError('Aucun site disponible');
				}
			} catch (e: any) {
				console.error('Erreur lors du chargement des sites:', e);
				setError('Erreur lors du chargement des sites');
			}
		};
		loadSites();
	}, []);

	useEffect(() => {
		const loadCapteurs = async () => {
			if (!selectedSite) return;

			try {
				const capteursData = await CapteurService.getCapteurs(parseInt(selectedSite));
				if (capteursData && capteursData.length > 0) {
					const options = capteursData.map(c => ({
						label: c.name,
						value: c.id.toString()
					}));
					setCapteurs(options);
					setSelectedCapteur(options[0].value);
				} else {
					setCapteurs([]);
					setError('Aucun capteur disponible pour ce site');
				}
			} catch (e: any) {
				console.error('Erreur lors du chargement des capteurs:', e);
				setError('Erreur lors du chargement des capteurs');
			}
		};

		if (selectedSite) {
			loadCapteurs();
		}
	}, [selectedSite]);

	const loadCapteurData = useCallback(async () => {
		if (!selectedCapteur || !selectedSite) return;

		try {
			setLoading(true);
			setError(null);

			setLabels([]);
			setTemperatureData([]);
			setTemperatureMin([]);
			setTemperatureMax([]);
			setHumidityData([]);
			setBatteryData([]);
			setTableData([]);

			if (selectedCapteur === 'ALL') {
				setError("L'affichage des statistiques n'est pas disponible pour l'option 'Tous les capteurs'.");
				setLoading(false);
				return;
			}

			const result = await StatistiqueService.getStatistiques({
				capteur_id: parseInt(selectedCapteur),
				site_id: parseInt(selectedSite),
				start_date: startDate,
				end_date: endDate
			});

			if (result.error) {
				console.error('Error returned from StatService:', result.error);
				setError(result.error);
				setLabels([]);
				setTemperatureData([]);
				setTemperatureMin([]);
				setTemperatureMax([]);
				setHumidityData([]);
				setBatteryData([]);
				setTableData([]);
			} else {
				setTableData(result.tableData || []);
				setLabels(result.labels || []);
				setTemperatureData(result.temperatureData || []);
				setTemperatureMin(result.temperatureMin || []);
				setTemperatureMax(result.temperatureMax || []);
				setHumidityData(result.humidityData || []);
				setBatteryData(result.batteryData || []);
			}

			const capteurNotes = await NoteService.getNotes(parseInt(selectedCapteur));
			setNotes(capteurNotes);

		} catch (e: any) {
			console.error('Error during data loading:', e);
			setError(e.message || 'Erreur lors du chargement des données');

			setLabels([format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')]);
			setTemperatureData([null, null]);
			setTemperatureMin([null, null]);
			setTemperatureMax([null, null]);
			setHumidityData([null, null]);
			setBatteryData([null, null]);
			setTableData([]);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [selectedCapteur, selectedSite, startDate, endDate]);

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		loadCapteurData();
	}, [loadCapteurData]);

	const onStartDateChange = (event: any, selectedDate?: Date) => {
		setShowStartDatePicker(false);
		if (selectedDate) {
			setStartDate(selectedDate);
		}
	};

	const onEndDateChange = (event: any, selectedDate?: Date) => {
		setShowEndDatePicker(false);
		if (selectedDate) {
			setEndDate(selectedDate);
		}
	};

	useEffect(() => {
		if (selectedCapteur && selectedSite && startDate && endDate) {
			loadCapteurData();
		}
	}, [selectedCapteur, selectedSite, startDate, endDate, loadCapteurData]);

	const value = {
		capteurOuvert,
		siteOuvert,
		selectedCapteur,
		selectedSite,
		capteurs,
		sites,
		setCapteurOuvert,
		setSiteOuvert,
		setSelectedCapteur,
		setSelectedSite,
		startDate,
		endDate,
		showStartDatePicker,
		showEndDatePicker,
		setStartDate,
		setEndDate,
		setShowStartDatePicker,
		setShowEndDatePicker,
		loading,
		refreshing,
		error,
		temperatureData,
		temperatureMin,
		temperatureMax,
		humidityData,
		batteryData,
		labels,
		notes,
		tableData,
		loadCapteurData,
		onRefresh,
		onStartDateChange,
		onEndDateChange,
		filtersExpanded,
		setFiltersExpanded,
		filtersHeight,
		setFiltersHeight

	};
	return (
		<StatistiquesContext.Provider value={value}>
			{children}
		</StatistiquesContext.Provider>
	);
};