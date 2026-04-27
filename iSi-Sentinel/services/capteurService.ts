import axios, { AxiosResponse } from 'axios';
import { Alert } from 'react-native';
import { API_CONFIG } from '../constants/IpApi';

const API_URL = API_CONFIG.BASE_URL;
export interface Capteur {
	id: number;
	name: string;
	last_temperature: number | null;
	last_humidity: number | null;
	last_date: string | null;
	last_minutes_ago: number | null;
	site_name: string;
	battery_level: number | null;
	rssi: number | null;
	seuil_temperature: number | null;
	euid: string;
	notif: boolean;
}

export interface Site {
	id: number;
	name: string;
}

/**
 * Service de gestion des capteurs
 * 
 * @class CapteurService
 * @description
 * Fournit des méthodes pour interagir avec l'API des capteurs, notamment pour récupérer,
 * mettre à jour et surveiller les capteurs et leurs données associées.
 * 
 * @remarks
 * - Utilise une instance Axios configurée avec la gestion automatique des cookies
 * - Gère les erreurs réseau avec des messages d'alerte appropriés
 * - Empêche la mise en cache des requêtes pour les données critiques
 */
export class CapteurService {
	// Créer une instance axios avec withCredentials pour gérer les cookies automatiquement
	static axiosInstance = axios.create({
		baseURL: API_URL,
		withCredentials: true,
		headers: {
			'Content-Type': 'application/json',
		}
	});


	static async getCapteurs(siteId?: number): Promise<Capteur[]> {
		try {
			console.log('Requête API pour obtenir les capteurs');
			const timestamp = new Date().getTime();
			const response: AxiosResponse = await this.axiosInstance.get('/api/capteurs', {
				params: {
					t: timestamp,
					...(siteId ? { site_id: siteId } : {})
				}
			});
			console.log(`${response.data.length} capteurs récupérés`);
			return response.data;
		} catch (error: any) {
			console.error('Erreur lors de la récupération des capteurs:', error);
			if (error.response) {
				Alert.alert('Erreur', `Erreur serveur: ${error.response.status} - ${error.response.statusText}`);
			} else if (error.request) {
				Alert.alert('Erreur', 'Impossible de contacter le serveur. Vérifiez le réseau.');
			} else {
				Alert.alert('Erreur', `Erreur inattendue: ${error.message}`);
			}
			return [];
		}
	}

	static async getSites(): Promise<Site[]> {
		try {
			const response: AxiosResponse = await this.axiosInstance.get('/api/sites');
			return response.data;
		} catch (error: any) {
			console.error('Erreur lors de la récupération des sites:', error);
			if (error.response) {
				Alert.alert('Erreur', `Erreur serveur: ${error.response.status} - ${error.response.statusText}`);
			} else if (error.request) {
				Alert.alert('Erreur', 'Impossible de contacter le serveur. Vérifiez le réseau.');
			} else {
				Alert.alert('Erreur', `Erreur inattendue: ${error.message}`);
			}
			return [];
		}
	}

	static async toggleMonitoring(capteurId: number): Promise<boolean> {
		try {
			const formData = new FormData();
			formData.append('capteur_id', capteurId.toString());

			const response: AxiosResponse = await this.axiosInstance.post(
				'/api/toggle_monitoring',
				formData,
				{
					headers: {
						'Content-Type': 'multipart/form-data',
					},
				}
			);

			if (response.data.success) {
				return response.data.notif;
			}
			return false;
		} catch (error: any) {
			console.error('Erreur lors du changement de statut de surveillance:', error);
			Alert.alert('Erreur', 'Impossible de modifier le statut de surveillance.');
			return false;
		}
	}


	static async updateCapteur(
		capteurId: number,
		name: string,
		seuilTemperature: string,
		notif: boolean
	): Promise<boolean> {
		try {
			console.log('Tentative de mise à jour du capteur:', { capteurId, name, seuilTemperature, notif });

			const response: AxiosResponse = await this.axiosInstance.post(
				'/api/update_capteur',
				{
					capteur_id: capteurId,
					name,
					seuil_temperature: seuilTemperature,
					notif: notif.toString()
				}
			);

			console.log('Réponse de mise à jour:', response.data);

			if (response.data.success) {
				return true;
			}
			return false;
		} catch (error: any) {
			console.error('Erreur lors de la mise à jour du capteur:', error);

			if (error.response) {
				console.error('Détails de l\'erreur:', error.response.data);
				console.error('Statut:', error.response.status);
				Alert.alert('Erreur', `Impossible de mettre à jour le capteur: ${error.response.status}`);
			} else {
				Alert.alert('Erreur', 'Impossible de mettre à jour le capteur.');
			}

			return false;
		}
	}

	static async getReleves({ capteur_id, site_id }: { capteur_id: number, site_id: number }): Promise<any[]> {
		try {
			const response = await this.axiosInstance.get('/api/releves', {
				params: { capteur_id, site_id }
			});

			if (!response.data || response.data.length === 0) {
				console.log('Aucune donnée reçue de l\'API pour ce capteur et cette période');
			}

			return response.data || [];
		} catch (error: any) {
			console.error('Erreur lors de la récupération des relevés:', error);

			if (error.response) {
				console.error('Détails:', error.response.data);
			}

			return [];
		}
	}
}