// services/statService.ts

import { format } from 'date-fns';
import axios from 'axios';
import { API_CONFIG } from '../constants/IpApi';

const API_URL = API_CONFIG.BASE_URL;

interface StatisticsParams {
	capteur_id: number;
	site_id: number;
	start_date: Date;
	end_date: Date;
}

interface StatisticsResult {
	labels: string[];
	temperatureData: (number | null)[];
	temperatureMin: (number | null)[];
	temperatureMax: (number | null)[];
	humidityData: (number | null)[];
	batteryData: (number | null)[];
	tableData: {
		Date_Time: string;
		Temp_Moyenne: number | null;
		Temp_Minimum: number | null;
		Temp_Maximum: number | null;
		Humidite_Moyenne: number | null;
		Batterie_Minimum: number | null;
	}[];
	error?: string;
}

/**
 * Service de statistiques pour l'application.
 * 
 * @class
 * @description
 * Ce service gère la récupération et le traitement des données statistiques des capteurs.
 * Il implémente des mécanismes de gestion d'erreurs, d'échantillonnage pour les grands volumes
 * de données et d'agrégation par jour ou heure selon la période sélectionnée.
 * 
 * @remarks
 * - Utilise axios pour les requêtes API avec gestion des cookies
 * - Implémente des méthodes d'agrégation pour traiter les données (par jour/heure)
 * - Gère les grands ensembles de données par échantillonnage
 * - Traite les valeurs manquantes ou invalides
 */

export class StatistiqueService {
	static axiosInstance = axios.create({
		baseURL: API_URL,
		withCredentials: true,
		headers: {
			'Content-Type': 'application/json',
		}
	});

	static async getStatistiques(params: StatisticsParams): Promise<StatisticsResult> {
		try {
			console.log('Fetching statistics data for:', {
				capteur_id: params.capteur_id,
				site_id: params.site_id,
				start_date: format(params.start_date, 'yyyy-MM-dd'),
				end_date: format(params.end_date, 'yyyy-MM-dd')
			});

			const response = await this.axiosInstance.get('/api/releves', {
				params: {
					capteur_id: params.capteur_id,
					site_id: params.site_id,
					start_date: format(params.start_date, 'yyyy-MM-dd'),
					end_date: format(params.end_date, 'yyyy-MM-dd')
				}
			});

			let data = response.data;

			if (!data || !Array.isArray(data) || data.length === 0) {
				console.log('No data or invalid data received from API');

				const diffDays = Math.ceil((params.end_date.getTime() - params.start_date.getTime()) / (1000 * 3600 * 24));
				return diffDays <= 1
					? this.emptyHourlyResult()
					: this.emptyDailyResult(params.start_date, params.end_date);
			}


			if (data.length > 5000) {
				console.log(`Large dataset detected (${data.length} records). Sampling data to avoid memory issues.`);
				data = this.sampleData(data, 5000);
				console.log(`Sampled down to ${data.length} records`);
			}

			data = data.filter((row: any) =>
				row &&
				row.Date_Time &&
				typeof row.Temperature === 'number'
			);

			if (data.length === 0) {
				console.log('All data was invalid and filtered out');

				const diffDays2 = Math.ceil((params.end_date.getTime() - params.start_date.getTime()) / (1000 * 3600 * 24));
				return diffDays2 <= 1
					? this.emptyHourlyResult()
					: this.emptyDailyResult(params.start_date, params.end_date);
			}

			console.log(`Processing ${data.length} valid records`);

			const diffDays = Math.ceil((params.end_date.getTime() - params.start_date.getTime()) / (1000 * 3600 * 24));

			let processedData;
			try {
				if (diffDays <= 1) {
					processedData = this.aggregateByHour(data);
				} else {
					processedData = this.aggregateByDay(data);
				}

				console.log('Data processing complete, returning results');

				return {
					labels: processedData.map(d => d.Date_Time),
					temperatureData: processedData.map(d => d.Temp_Moyenne),
					temperatureMin: processedData.map(d => d.Temp_Minimum),
					temperatureMax: processedData.map(d => d.Temp_Maximum),
					humidityData: processedData.map(d => d.Humidite_Moyenne),
					batteryData: processedData.map(d => d.Batterie_Minimum),
					tableData: processedData
				};
			} catch (processingError) {
				console.error('Error during data processing:', processingError);
				return this.emptyDailyResult(params.start_date, params.end_date);
			}
		} catch (error: any) {
			console.error('Error fetching statistics:', error);
			if (error.response) {
				console.error('Error response data:', error.response.data);
				console.error('Error response status:', error.response.status);
				console.error('Error response URL:', error.request?.responseURL);
			} else if (error.request) {
				console.error('No response received:', error.request);
			}
			return this.emptyDailyResult(params.start_date, params.end_date);
		}
	}

	private static emptyHourlyResult(): StatisticsResult {
		const labels: string[] = [];
		for (let h = 0; h < 24; h++) {
			labels.push(`${String(h).padStart(2, '0')}:00`);
		}
		return {
			labels,
			temperatureData: labels.map(() => null),
			temperatureMin: labels.map(() => null),
			temperatureMax: labels.map(() => null),
			humidityData: labels.map(() => null),
			batteryData: labels.map(() => null),
			tableData: labels.map(hour => ({
				Date_Time: hour,
				Temp_Moyenne: null,
				Temp_Minimum: null,
				Temp_Maximum: null,
				Humidite_Moyenne: null,
				Batterie_Minimum: null
			}))
		};
	}

	private static emptyDailyResult(startDate: Date, endDate: Date): StatisticsResult {
		const result: StatisticsResult = {
			labels: [],
			temperatureData: [],
			temperatureMin: [],
			temperatureMax: [],
			humidityData: [],
			batteryData: [],
			tableData: []
		};
		const currentDate = new Date(startDate);
		while (currentDate <= endDate) {
			const dateStr = format(currentDate, 'yyyy-MM-dd');
			result.labels.push(dateStr);
			result.temperatureData.push(null);
			result.temperatureMin.push(null);
			result.temperatureMax.push(null);
			result.humidityData.push(null);
			result.batteryData.push(null);
			result.tableData.push({
				Date_Time: dateStr,
				Temp_Moyenne: null,
				Temp_Minimum: null,
				Temp_Maximum: null,
				Humidite_Moyenne: null,
				Batterie_Minimum: null
			});
			currentDate.setDate(currentDate.getDate() + 1);
		}
		return result;
	}

	private static sampleData(data: any[], targetSize: number): any[] {
		if (data.length <= targetSize) return data;

		const step = Math.floor(data.length / targetSize);
		const sampled = [];

		for (let i = 0; i < data.length; i += step) {
			sampled.push(data[i]);
			if (sampled.length >= targetSize) break;
		}

		return sampled;
	}

	private static aggregateByHour(data: any[]): any[] {
		const hourlyData: Record<string, any> = {};

		data.forEach(row => {
			try {
				const date = new Date(row.Date_Time);
				const hourKey = format(date, 'HH:00');

				if (!hourlyData[hourKey]) {
					hourlyData[hourKey] = {
						temps: [],
						humidity: [],
						battery: []
					};
				}

				if (typeof row.Temperature === 'number') {
					hourlyData[hourKey].temps.push(row.Temperature);
				}

				if (row.TX_Humidite !== undefined && row.TX_Humidite !== null) {
					hourlyData[hourKey].humidity.push(row.TX_Humidite);
				}

				if (row.Batterie !== undefined && row.Batterie !== null) {
					hourlyData[hourKey].battery.push(row.Batterie);
				}
			} catch (err) {
				console.error('Error processing row for hourly aggregation:', err);
			}
		});

		return Object.entries(hourlyData).map(([hourKey, values]: [string, any]) => {
			let tempMin = null;
			let tempMax = null;
			let tempAvg = null;
			let humidAvg = null;
			let batMin = null;

			if (values.temps && values.temps.length > 0) {
				tempMin = Math.min(...values.temps);
				tempMax = Math.max(...values.temps);
				tempAvg = this.average(values.temps);
			}

			if (values.humidity && values.humidity.length > 0) {
				humidAvg = this.average(values.humidity);
			}

			if (values.battery && values.battery.length > 0) {
				batMin = Math.min(...values.battery);
			}

			return {
				Date_Time: hourKey,
				Temp_Moyenne: tempAvg,
				Temp_Minimum: tempMin,
				Temp_Maximum: tempMax,
				Humidite_Moyenne: humidAvg,
				Batterie_Minimum: batMin
			};
		}).sort((a, b) => a.Date_Time.localeCompare(b.Date_Time));
	}

	private static aggregateByDay(data: any[]): any[] {
		const groupedData: Record<string, any> = {};

		data.forEach(row => {
			try {
				const date = format(new Date(row.Date_Time), 'yyyy-MM-dd');

				if (!groupedData[date]) {
					groupedData[date] = {
						temps: [],
						humidity: [],
						battery: []
					};
				}

				if (typeof row.Temperature === 'number') {
					groupedData[date].temps.push(row.Temperature);
				}

				if (row.TX_Humidite !== undefined && row.TX_Humidite !== null) {
					groupedData[date].humidity.push(row.TX_Humidite);
				}

				if (row.Batterie !== undefined && row.Batterie !== null) {
					groupedData[date].battery.push(row.Batterie);
				}
			} catch (err) {
				console.error('Error processing row for daily aggregation:', err);
			}
		});

		return Object.entries(groupedData).map(([date, values]: [string, any]) => {
			let tempMin = null;
			let tempMax = null;
			let tempAvg = null;
			let humidAvg = null;
			let batMin = null;

			if (values.temps && values.temps.length > 0) {
				tempMin = Math.min(...values.temps);
				tempMax = Math.max(...values.temps);
				tempAvg = this.average(values.temps);
			}

			if (values.humidity && values.humidity.length > 0) {
				humidAvg = this.average(values.humidity);
			}

			if (values.battery && values.battery.length > 0) {
				batMin = Math.min(...values.battery);
			}

			return {
				Date_Time: date,
				Temp_Moyenne: tempAvg,
				Temp_Minimum: tempMin,
				Temp_Maximum: tempMax,
				Humidite_Moyenne: humidAvg,
				Batterie_Minimum: batMin
			};
		}).sort((a, b) => a.Date_Time.localeCompare(b.Date_Time));
	}

	private static average(arr: number[]): number | null {
		if (!arr || arr.length === 0) return null;
		try {
			const validNumbers = arr.filter(val => typeof val === 'number' && !isNaN(val));
			if (validNumbers.length === 0) return null;
			return validNumbers.reduce((a, b) => a + b, 0) / validNumbers.length;
		} catch (error) {
			console.error('Error calculating average:', error, arr);
			return null;
		}
	}

	static async getSensorThreshold(capteurId: number): Promise<number | null> {
		try {
			const url = `/api/capteurs?id=${capteurId}`;

			const response = await this.axiosInstance.get(url);

			if (response.data && response.data.length > 0) {
				const seuil = response.data[0].seuil_temperature;
				const seuilNumber = seuil !== null && seuil !== undefined ? Number(seuil) : null;
				return seuilNumber;
			}
			console.log(`⚠️ Aucun seuil trouvé pour le capteur ${capteurId}`);
			return null;
		} catch (error) {
			console.error(`❌ Erreur récupération seuil pour capteur ${capteurId}:`, error);
			return null;
		}
	}

}