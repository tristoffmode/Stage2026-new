import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useStatistiques } from '../../contexts/StatistiquesContext';

/**
 * Section des statistiques des notes du capteur.
 * 
 * @component
 * @returns {React.FC} Composant fonctionnel affichant les notes du capteur.
 * 
 * @description
 * Ce composant affiche une liste des notes associées à un capteur, avec leur horodatage formaté.
 * Si aucune note n'est disponible, un message indiquant l'absence de notes est affiché.
 * 
 * @remarks
 * - Utilise le hook `useStatistiques` pour récupérer les données des notes.
 * - Formate les horodatages avec la bibliothèque `date-fns` et la locale française.
 */

const StatistiqueNotesSection: React.FC = () => {
	const { notes } = useStatistiques();

	return (
		<View style={styles.notesContainer}>
			<Text style={styles.sectionTitle}>Notes du capteur</Text>
			{notes.length > 0 ? (
				notes.map((note, index) => (
					<View key={index} style={styles.noteItem}>
						<Text style={styles.noteTimestamp}>
							{format(new Date(note.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr })}
						</Text>
						<Text style={styles.noteText}>{note.note}</Text>
					</View>
				))
			) : (
				<Text style={styles.emptyText}>Aucune note disponible</Text>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	notesContainer: {
		backgroundColor: '#f9f9f9',
		padding: 15,
		borderRadius: 10,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 15,
		color: '#333',
	},
	noteItem: {
		marginBottom: 15,
		padding: 10,
		backgroundColor: 'white',
		borderRadius: 5,
		borderLeftWidth: 4,
		borderLeftColor: '#0a7ea4',
	},
	noteTimestamp: {
		fontSize: 12,
		color: '#666',
		marginBottom: 5,
	},
	noteText: {
		fontSize: 14,
	},
	emptyText: {
		fontStyle: 'italic',
		color: '#777',
		textAlign: 'center',
		padding: 20,
	},
});

export default StatistiqueNotesSection;