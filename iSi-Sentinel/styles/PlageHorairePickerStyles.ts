import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  fondModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  conteneurModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '85%', // Un peu plus large
    alignItems: 'center',
  },
  titreModalHeure: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  conteneurSelecteurs: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Aligner en bas pour compenser les étiquettes
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  groupeSelecteur: {
    alignItems: 'center',
    flex: 1,
  },
  etiquetteHeure: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  boutonHeure: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e6f0ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cce0ff',
    minWidth: 100,
  },
  texteHeure: {
    fontSize: 18,
    color: '#007bff',
    fontWeight: '500',
  },
  separateurHeure: {
    fontSize: 20,
    color: '#333',
    marginHorizontal: 10,
    marginBottom: 12, // Compensate for label
  },
  selecteurHeure: {
    width: '100%',
    marginTop: 10,
  },
  conteneurBoutons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  boutonAnnuler: {
    backgroundColor: '#ff4d4d',
    paddingVertical: 15,     // Plus grands
    paddingHorizontal: 20,   // Plus grands
    borderRadius: 8,
    flex: 0.48,              // Pour prendre presque la moitié de l'espace
    alignItems: 'center',
    justifyContent: 'center',
  },
  texteBoutonAnnuler: {
    color: '#fff',
    fontSize: 18,            // Police plus grande
    fontWeight: '600',
  },
  boutonValider: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 15,     // Plus grands
    paddingHorizontal: 20,   // Plus grands
    borderRadius: 8,
    flex: 0.48,              // Pour prendre presque la moitié de l'espace
    alignItems: 'center',
    justifyContent: 'center',
  },
  texteBoutonValider: {
    color: '#fff',
    fontSize: 18,            // Police plus grande
    fontWeight: '600',
  },
});