import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	conteneur: {
		flex: 1,
		marginHorizontal: 8,
	},
	etiquette: {
		fontSize: 16,
		fontWeight: '700',
		color: '#00000c',
		marginBottom: 8,
	},
	dropdown: {
		backgroundColor: '#f9f9f9',
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		height: 45,
		paddingHorizontal: 15, // Ajouté pour donner plus d'espace pour la flèche
	},
	conteneurDropdown: {
		zIndex: 1000,
	},
	conteneurListeDeroulante: {
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		zIndex: 1000,
	},
	texteDropdown: {
		fontSize: 16,
		color: '#333',
	},
	fleche: {
		width: 15,
		height: 15,
		marginRight: 5, // Assure que la flèche ne touche pas le bord droit
	},
	icone: {
		width: 15,
		height: 15,
	},
	dropdownAndroid: {
		backgroundColor: '#f9f9f9',
		borderRadius: 8,
		height: 45,
		justifyContent: 'center',
		paddingHorizontal: 8,
	},
});