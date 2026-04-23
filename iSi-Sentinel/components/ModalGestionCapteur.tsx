import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Switch, Alert, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import PlageHorairePicker from './PlageHorairePicker';
import { CapteurService } from '../services/capteurService';
import { CalendrierService } from '../services/calendrierService';
import styles from '../styles/ModalGestionCapteurStyles';

interface JourPlage {
  actif: boolean;
  debut: Date;
  fin: Date;
}

interface ModalGestionCapteurProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  capteur: {
    id?: number;
    nom?: string;
    temperatureMax?: string;
    statutMail?: boolean;
  } | null;
  indexCapteur: number | null;
  etablissement: string;
  onSaveCapteur: (capteurId: number, nom: string, seuilTemperature: string, notif: boolean) => Promise<boolean>;
  onSuccess: () => Promise<void>;
}

interface ModalPlagesHorairesProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  jours: Record<string, JourPlage>;
  setJours: React.Dispatch<React.SetStateAction<Record<string, JourPlage>>>;
  ouvrirSelecteurHeure: (jour: string, type: 'debut' | 'fin') => void;
}

// Composant pour la modal des plages horaires
const ModalPlagesHoraires: React.FC<ModalPlagesHorairesProps> = ({ 
  visible, 
  setVisible, 
  jours, 
  setJours, 
  ouvrirSelecteurHeure 
}) => {

  // Dans le composant ModalPlagesHoraires, remplacer la fonction basculerJour:
  const basculerJour = (jour: string): void => {
    setJours((prev) => {
      const estActif = !prev[jour].actif;
      if (estActif) {
        const debutJour = new Date();
        debutJour.setHours(0, 0, 0, 0); // 00:00:00
        
        const finJour = new Date();
        finJour.setHours(23, 59, 0, 0); // 23:59:00
        
        return {
          ...prev,
          [jour]: { 
            actif: estActif,
            debut: debutJour,
            fin: finJour
          }
        };
      } else {
        return {
          ...prev,
          [jour]: { ...prev[jour], actif: estActif }
        };
      }
    });
  };

  const formaterHeure = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.fondModal}>
        <View style={[styles.conteneurModal, { width: '95%', maxHeight: '85%' }]}>
          <TouchableOpacity 
            style={[styles.boutonFermer, { padding: 10 }]} 
            onPress={() => setVisible(false)}
          >
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>

          <Text style={[styles.titreModal, { marginTop: 10 }]}>Plages horaires de notification</Text>
          
          <ScrollView 
            style={[styles.scrollViewJours, { maxHeight: 450, marginVertical: 15 }]}
            showsVerticalScrollIndicator={true}
          >
            {Object.keys(jours).map((jour, index) => (
              <View key={index} style={[styles.ligneJourFullscreen]}>
                <View style={styles.jourContainerFullscreen}>
                  <View style={styles.jourSwitchFullscreen}>
                    <Switch
                      value={jours[jour].actif}
                      onValueChange={() => basculerJour(jour)}
                      thumbColor={jours[jour].actif ? '#007bff' : '#ccc'}
                      trackColor={{ false: '#767577', true: '#81b0ff' }}
                    />
                    <Text style={styles.etiquetteJourFullscreen}>{jour}</Text>
                  </View>
                  
                  {jours[jour].actif && (
                    <TouchableOpacity 
                      style={styles.timeDisplayContainer}
                      onPress={() => ouvrirSelecteurHeure(jour, 'debut')}
                    >
                      <MaterialIcons name="access-time" size={18} color="#0a7ea4" style={{marginRight: 8}} />
                      <Text style={styles.textePlageHoraireFullscreen}>
                        {formaterHeure(jours[jour].debut)} - {formaterHeure(jours[jour].fin)}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity 
            style={styles.boutonValider}
            onPress={() => setVisible(false)}
          >
            <Text style={styles.texteBoutonValider}>Valider</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Composant principal modifié
const ModalGestionCapteur: React.FC<ModalGestionCapteurProps> = ({
  visible,
  setVisible,
  capteur,
  indexCapteur,
  etablissement,
  onSaveCapteur,
  onSuccess,
}) => {
  // États existants...
  const [nomCapteur, setNomCapteur] = useState<string>(capteur?.nom || '');
  const [seuilTemperature, setSeuilTemperature] = useState<string>(capteur?.temperatureMax || '');
  const [notificationsActives, setNotificationsActives] = useState<boolean>(capteur?.statutMail || false);
  const [chargement, setChargement] = useState<boolean>(false);
  const [jours, setJours] = useState<Record<string, JourPlage>>({
    Lundi: { actif: false, debut: new Date(), fin: new Date() },
    Mardi: { actif: false, debut: new Date(), fin: new Date() },
    Mercredi: { actif: false, debut: new Date(), fin: new Date() },
    Jeudi: { actif: false, debut: new Date(), fin: new Date() },
    Vendredi: { actif: false, debut: new Date(), fin: new Date() },
    Samedi: { actif: false, debut: new Date(), fin: new Date() },
    Dimanche: { actif: false, debut: new Date(), fin: new Date() },
  });

  const [modalHeureVisible, setModalHeureVisible] = useState<boolean>(false);
  const [jourSelectionne, setJourSelectionne] = useState<string | null>(null);
  const [typeHeure, setTypeHeure] = useState<'debut' | 'fin'>('debut');

  // Nouvel état pour la modal des plages horaires
  const [modalPlagesVisible, setModalPlagesVisible] = useState<boolean>(false);

  // Détection de petits écrans
  const screenWidth = Dimensions.get('window').width;
  const isSmallScreen = screenWidth < 400; 

  // Fonctions...
  useEffect(() => {
    if (capteur) {
      setNomCapteur(capteur.nom || '');
      setSeuilTemperature(capteur.temperatureMax || '');
      setNotificationsActives(capteur.statutMail || false);
    }
  }, [capteur]);

useEffect(() => {
  const chargerPlagesHoraires = async () => {
    if (visible && capteur?.id && notificationsActives) {
      try {
        const calendrier = await CalendrierService.getCalendriers(capteur.id);
        
        // Crée une copie profonde du state jours actuel
        const nouveauxJours = { ...jours };
        
        // Initialiser tous les jours comme inactifs mais préserver leurs horaires précédents
        Object.keys(nouveauxJours).forEach(jour => {
          nouveauxJours[jour] = { 
            ...nouveauxJours[jour], 
            actif: false 
          };
        });
        
        // Appliquer les horaires spécifiques depuis l'API
        if (calendrier && calendrier.length > 0) {
          console.log('Plages horaires chargées:', calendrier.length);
          
          calendrier.forEach(schedule => {
            if (schedule.day_of_week && schedule.start_time && schedule.end_time) {
              const startTime = new Date();
              const endTime = new Date();
              
              const [startHour, startMinute] = schedule.start_time.split(':');
              const [endHour, endMinute] = schedule.end_time.split(':');
              
              startTime.setHours(parseInt(startHour), parseInt(startMinute), 0);
              endTime.setHours(parseInt(endHour), parseInt(endMinute), 0);
              
              nouveauxJours[schedule.day_of_week] = {
                actif: true,
                debut: startTime,
                fin: endTime
              };
              
              console.log(`Jour ${schedule.day_of_week}: ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`);
            }
          });
        } else {
          console.log('Aucune plage horaire trouvée');
        }
        
        setJours(nouveauxJours);
      } catch (error) {
        console.error('Erreur lors du chargement des plages horaires:', error);
      }
    }
  };
  
  chargerPlagesHoraires();
}, [visible, capteur, notificationsActives]);

  const fermerModal = useCallback((): void => {
    setVisible(false);
  }, [setVisible]);

  const basculerJour = useCallback((jour: string): void => {
    setJours((prev) => ({
      ...prev,
      [jour]: { ...prev[jour], actif: !prev[jour].actif },
    }));
  }, []);

  const ouvrirSelecteurHeure = useCallback((jour: string, type: 'debut' | 'fin' = 'debut'): void => {
    setJourSelectionne(jour);
    setTypeHeure(type);
    setModalHeureVisible(true);
  }, []);

  const formaterPlageHoraire = useCallback((debut: Date, fin: Date): string => {
    const formaterHeure = (date: Date) =>
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${formaterHeure(debut)} - ${formaterHeure(fin)}`;
  }, []);

  const sauvegarderCapteur = async (): Promise<void> => {
    if (!nomCapteur.trim() || !capteur?.id) {
      Alert.alert('Erreur', 'Veuillez saisir un nom pour le capteur.');
      return;
    }
    
    setChargement(true);
    
    try {
      console.log('Tentative de mise à jour du capteur ID:', capteur.id);
      const success = await onSaveCapteur(
        capteur.id,
        nomCapteur.trim(),
        seuilTemperature,
        notificationsActives
      );
      
      if (!success) {
        throw new Error('Échec de la mise à jour du capteur');
      }
      
      if (notificationsActives) {
        const schedulesToUpdate = Object.entries(jours)
          .filter(([_, plage]) => plage.actif)
          .map(([jour, plage]) => ({
            jour,
            debut: plage.debut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fin: plage.fin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actif: true
          }));
        
        console.log('Mise à jour des plages horaires:', schedulesToUpdate.length, 'plages');
        await CalendrierService.updateAllSchedules(capteur.id, schedulesToUpdate);
      } else {
        console.log('Notifications désactivées, suppression de toutes les plages horaires');
        await CalendrierService.updateAllSchedules(capteur.id, []);
      }
      
      setVisible(false);
      
      if (onSuccess) {
        console.log("Rafraîchissement des données après modification");
        await onSuccess();
      }
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour du capteur:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la mise à jour du capteur.');
    } finally {
      setChargement(false);
    }
  };

  // Calcul du nombre de jours actifs pour l'affichage du résumé
  const nombreJoursActifs = Object.values(jours).filter(jour => jour.actif).length;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={fermerModal}
    >
      <View style={styles.fondModal}>
        <View style={[
          styles.conteneurModal, 
          isSmallScreen && { paddingBottom: 80 }
        ]}>
          <TouchableOpacity style={styles.boutonFermer} onPress={fermerModal}>
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>

          <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={true}>
            <Text style={styles.titreModal}>Gestion du capteur</Text>

            <View style={styles.conteneurEtablissement}>
              <Text style={styles.etiquette}>Établissement :</Text>
              <Text style={styles.texteEtablissement}>{etablissement || 'Non défini'}</Text>
            </View>

            <Text style={styles.sousTitreSection}>Nom du capteur :</Text>
            <TextInput
              style={styles.champSaisie}
              placeholder="Saisir le nom..."
              value={nomCapteur}
              onChangeText={setNomCapteur}
            />

            <Text style={styles.sousTitreSection}>Seuil de température :</Text>
            <TextInput
              style={styles.champSaisie}
              placeholder="Saisir une valeur (°C)..."
              value={seuilTemperature}
              onChangeText={setSeuilTemperature}
              keyboardType="numeric"
            />

            <View style={styles.sectionNotifications}>
              <Text style={styles.etiquetteSaisie}>Notifications par email :</Text>
              <TouchableOpacity
                style={[
                  styles.boutonNotification,
                  { backgroundColor: notificationsActives ? '#00ff00' : '#ccc' },
                ]}
                onPress={() => setNotificationsActives(!notificationsActives)}
              >
                <MaterialIcons
                  name={notificationsActives ? 'notifications-active' : 'notifications-off'}
                  size={24}
                  color={notificationsActives ? '#fff' : '#666'}
                />
                <Text style={styles.texteNotification}>
                  {notificationsActives ? 'Activées' : 'Désactivées'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Affichage différent selon la taille de l'écran */}
            {notificationsActives && isSmallScreen && (
              <TouchableOpacity 
                style={styles.boutonPlagesHoraires}
                onPress={() => setModalPlagesVisible(true)}
              >
                <MaterialIcons name="schedule" size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.texteBoutonPlages}>
                  Configurer les plages horaires
                  {nombreJoursActifs > 0 ? ` (${nombreJoursActifs} jour${nombreJoursActifs > 1 ? 's' : ''} actif${nombreJoursActifs > 1 ? 's' : ''})` : ''}
                </Text>
              </TouchableOpacity>
            )}

            {/* Affichage classique pour les grands écrans */}
            {notificationsActives && !isSmallScreen && (
              <>
                <Text style={styles.sousTitreSection}>Plages horaires de notification :</Text>
                <ScrollView 
                  style={[styles.scrollViewJours, { maxHeight: 250 }]}
                  showsVerticalScrollIndicator={true}
                >
                  {Object.keys(jours).map((jour, index) => (
                    <View key={index} style={styles.ligneJour}>
                      <View style={styles.jourContainer}>
                        <View style={styles.jourSwitch}>
                          <Switch
                            value={jours[jour].actif}
                            onValueChange={() => basculerJour(jour)}
                            thumbColor={jours[jour].actif ? '#007bff' : '#ccc'}
                            trackColor={{ false: '#767577', true: '#81b0ff' }}
                          />
                          <Text style={styles.etiquetteJour}>{jour}</Text>
                        </View>
                        
                        {jours[jour].actif && (
                          <TouchableOpacity 
                            style={styles.timeDisplayContainer}
                            onPress={() => ouvrirSelecteurHeure(jour, 'debut')}
                          >
                            <MaterialIcons name="access-time" size={18} color="#0a7ea4" style={{marginRight: 8}} />
                            <Text style={styles.textePlageHoraire}>
                              {formaterPlageHoraire(jours[jour].debut, jours[jour].fin)}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
            
            {/* Espace pour éviter que le contenu ne soit masqué par les boutons fixes */}
            {isSmallScreen && <View style={{ height: 60 }} />}
          </ScrollView>

          {/* Modals pour la sélection d'heure et pour les petits écrans */}
          {jourSelectionne && (
            <PlageHorairePicker
              visible={modalHeureVisible}
              setVisible={(visible) => {
                setModalHeureVisible(visible);
                if (!visible) {
                  setJourSelectionne(null);
                }
              }}
              jour={jourSelectionne}
              plageHoraire={{
                debut: jours[jourSelectionne].debut,
                fin: jours[jourSelectionne].fin,
              }}
              setPlageHoraire={(nouvellePlage) =>
                setJours((prev) => ({
                  ...prev,
                  [jourSelectionne]: {
                    ...prev[jourSelectionne],
                    debut: nouvellePlage.debut,
                    fin: nouvellePlage.fin
                  },
                }))
              }
            />
          )}

          {/* Modal pour les plages horaires sur petits écrans */}
          <ModalPlagesHoraires
            visible={modalPlagesVisible}
            setVisible={setModalPlagesVisible}
            jours={jours}
            setJours={setJours}
            ouvrirSelecteurHeure={ouvrirSelecteurHeure}
          />

          <View style={[
            styles.boutonsModal,
            isSmallScreen && { 
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'white',
              padding: 10,
              paddingBottom: 20,
              borderTopWidth: 1,
              borderTopColor: '#eee',
              zIndex: 999
            }
          ]}>
            <TouchableOpacity 
              style={[
                styles.boutonAnnuler,
                isSmallScreen && { flex: 1, marginRight: 5 }
              ]} 
              onPress={fermerModal} 
              disabled={chargement}
            >
              <Text style={styles.texteBouton}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.boutonSauvegarder, 
                { opacity: chargement ? 0.7 : 1 },
                isSmallScreen && { flex: 1, marginLeft: 5 }
              ]} 
              onPress={sauvegarderCapteur}
              disabled={chargement}
            >
              <Text style={styles.texteBouton}>
                {chargement ? 'Sauvegarde...' : 'Sauvegarder'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ModalGestionCapteur;