import axios, { AxiosResponse } from 'axios';
import { Alert } from 'react-native';
import { CapteurService } from './capteurService';

export interface Calendrier {
id?: number;
capteur_id: number;
day_of_week: string;
start_time: string;
end_time: string;
}

/**
 * Service de gestion des calendriers et des plannings pour les capteurs.
 * 
 * @class
 * @description
 * Ce service permet de gérer les plannings associés aux capteurs, incluant la récupération,
 * la mise à jour et la suppression des plages horaires.
 * 
 * @remarks
 * - Utilise la même instance axios que CapteurService pour assurer la cohérence des requêtes.
 * - Fournit des méthodes pour gérer individuellement et collectivement les plannings.
 * - Inclut une gestion détaillée des erreurs avec des logs et des alertes utilisateur.
 */

export class CalendrierService {
private static axiosInstance = CapteurService.axiosInstance;

static async getCalendriers(capteurId: number): Promise<Calendrier[]> {
	try {
	console.log('Récupération des plannings pour le capteur ID:', capteurId);
	
	const response: AxiosResponse = await this.axiosInstance.get(
		`/api/get_schedules?capteur_id=${capteurId}`
	);
	
	console.log('Plannings récupérés:', response.data);
	return response.data;
	} catch (error: any) {
	console.error('Erreur lors de la récupération des plages horaires:', error);
	
	if (error.response) {
		console.error('Détails de l\'erreur:', error.response.data);
		Alert.alert('Erreur', `Impossible de récupérer les plages horaires: ${error.response.status}`);
	} else {
		Alert.alert('Erreur', 'Impossible de récupérer les plages horaires.');
	}
	
	return [];
	}
}

static async updateSchedule(
	capteurId: number,
	dayOfWeek: string,
	startTime: string,
	endTime: string
): Promise<boolean> {
	try {
	console.log('Mise à jour du planning:', { capteurId, dayOfWeek, startTime, endTime });
	
	const formData = new FormData();
	formData.append('capteur_id', capteurId.toString());
	formData.append('day_of_week', dayOfWeek);
	formData.append('start_time', startTime);
	formData.append('end_time', endTime);
	
	const response: AxiosResponse = await this.axiosInstance.post(
		'/api/update_schedule',
		formData,
		{
		headers: {
			'Content-Type': 'multipart/form-data',
		},
		}
	);
	
	console.log('Réponse de mise à jour du planning:', response.data);
	
	if (response.data.success) {
		return true;
	}
	return false;
	} catch (error: any) {
	console.error('Erreur lors de la mise à jour de la plage horaire:', error);
	
	if (error.response) {
		console.error('Détails de l\'erreur:', error.response.data);
		Alert.alert('Erreur', `Impossible de mettre à jour la plage horaire: ${error.response.status}`);
	} else {
		Alert.alert('Erreur', 'Impossible de mettre à jour la plage horaire.');
	}
	
	return false;
	}
}

static async deleteSchedule(scheduleId: number): Promise<boolean> {
	try {
	console.log('Suppression du planning ID:', scheduleId);
	
	const response: AxiosResponse = await this.axiosInstance.post(
		'/api/delete_schedule',
		{ schedule_id: scheduleId }
	);
	
	console.log('Réponse de suppression du planning:', response.data);
	
	if (response.data.success) {
		return true;
	}
	return false;
	} catch (error: any) {
	console.error('Erreur lors de la suppression de la plage horaire:', error);
	
	if (error.response) {
		console.error('Détails de l\'erreur:', error.response.data);
		Alert.alert('Erreur', `Impossible de supprimer la plage horaire: ${error.response.status}`);
	} else {
		Alert.alert('Erreur', 'Impossible de supprimer la plage horaire.');
	}
	
	return false;
	}
}

static async updateAllSchedules(
	capteurId: number,
	schedules: {
	jour: string;
	debut: string;
	fin: string;
	actif: boolean;
	}[]
): Promise<boolean> {
	try {
	console.log('Mise à jour de toutes les plages horaires pour le capteur ID:', capteurId);
	console.log('Plages à mettre à jour:', schedules);
	
	if (schedules.length === 0) {
		const response: AxiosResponse = await this.axiosInstance.post(
		'/api/update_all_schedules',
		{
			capteur_id: capteurId,
			schedules: []
		}
		);
		
		console.log('Réponse de suppression des plannings:', response.data);
		return response.data.success || false;
	}
	
	const response: AxiosResponse = await this.axiosInstance.post(
		'/api/update_all_schedules',
		{
		capteur_id: capteurId,
		schedules: schedules
		}
	);
	
	console.log('Réponse de mise à jour globale des plannings:', response.data);
	
	if (response.data.success) {
		return true;
	}
	return false;
	} catch (error: any) {
	console.error('Erreur lors de la mise à jour des plages horaires:', error);
	
	if (error.response) {
		console.error('Détails de l\'erreur:', error.response.data);
		Alert.alert('Erreur', `Impossible de mettre à jour les plages horaires: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
	} else {
		Alert.alert('Erreur', 'Impossible de mettre à jour les plages horaires.');
	}
	
	return false;
	}
}
}