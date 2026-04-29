import axios, { AxiosResponse } from 'axios';
import { format } from 'date-fns';
import { Alert } from 'react-native';
import { API_CONFIG } from '../constants/IpApi';

const API_URL = API_CONFIG.BASE_URL;

export interface Note {
	id: number;
	timestamp: string;
	note: string;
}

/**
 * Service de gestion des notes pour les capteurs.
 * 
 * @class
 * @description
 * Cette classe fournit des méthodes pour interagir avec l'API de gestion des notes
 * associées aux capteurs, y compris la récupération, l'ajout, la mise à jour et 
 * la suppression des notes.
 * 
 * @remarks
 * - Utilise Axios pour toutes les requêtes API avec gestion automatique des cookies
 * - Gère les erreurs avec des alertes utilisateur et des logs console
 */

export class NoteService {
	// Créer une instance axios avec withCredentials pour gérer les cookies automatiquement
	private static axiosInstance = axios.create({
		baseURL: API_URL,
		withCredentials: true,
		headers: {
			'Content-Type': 'application/json',
		}
	});

	static async getNotes(capteurId: number): Promise<Note[]> {
		try {
			const response: AxiosResponse = await this.axiosInstance.get(
				`/api/capteur/notes?capteur_id=${capteurId}`
			);
			return response.data;
		} catch (error: any) {
			console.error('Erreur lors de la récupération des notes:', error);
			Alert.alert('Erreur', 'Impossible de récupérer les notes du capteur.');
			return [];
		}
	}

	static async addNote(capteurId: number, note: string, timestamp?: string): Promise<boolean> {
		try {
			const noteTimestamp = timestamp || format(new Date(), 'yyyy-MM-dd HH:mm');

			const response: AxiosResponse = await this.axiosInstance.post(
				'/api/capteur/notes',
				{
					capteur_id: capteurId,
					timestamp: noteTimestamp,
					note
				}
			);

			if (response.data.success) {
				Alert.alert('Succès', 'Note ajoutée avec succès.');
				return true;
			}
			return false;
		} catch (error: any) {
			console.error('Erreur lors de l\'ajout d\'une note:', error);
			Alert.alert('Erreur', 'Impossible d\'ajouter la note.');
			return false;
		}
	}

	static async deleteNote(noteId: number): Promise<boolean> {
		try {
			const response: AxiosResponse = await this.axiosInstance.delete(`/api/capteur/notes/${noteId}`);
			const data = response.data;

			if (data.success) {
				return true;
			} else {
				console.error('La suppression a échoué:', data);
				Alert.alert('Erreur', data.error || 'La suppression a échoué pour une raison inconnue');
				return false;
			}
		} catch (error: any) {
			console.error('Exception lors de la suppression de la note:', error);

			const errorMessage = error.message || 'Erreur inconnue';

			Alert.alert('Erreur de suppression', `Erreur: ${errorMessage}`);
			return false;
		}
	}

	static async updateNote(noteId: number, noteText: string): Promise<boolean> {
		try {
			const response: AxiosResponse = await this.axiosInstance.put(
				`/api/capteur/notes/${noteId}`,
				{
					note: noteText
				}
			);

			if (response.data.success) {
				Alert.alert('Succès', 'Note mise à jour avec succès.');
				return true;
			}
			return false;
		} catch (error: any) {
			console.error('Erreur lors de la mise à jour de la note:', error);
			Alert.alert('Erreur', 'Impossible de mettre à jour la note.');
			return false;
		}
	}
}