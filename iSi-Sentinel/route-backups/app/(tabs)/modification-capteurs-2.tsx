import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, Alert, TextInput, Platform, Dimensions, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import CapteurCard from '../../components/CapteurCard';
import DropdownFiltre from '../../components/DropdownFiltre';
import ModalGestionCapteur from '../../components/ModalGestionCapteur';
import { useRouter } from 'expo-router';
import { AuthService } from '../../services/authService';
import { CapteurService, Capteur, Site } from '../../services/capteurService';
import styles from '../../styles/CapteurDashboardStyles';

interface FiltreItem {
    label: string;
    value: string;
}

/**
 * Écran de modification des capteurs pour l'application.
 * 
 * @component
 * @returns {React.FC} Composant fonctionnel représentant l'écran de modification des capteurs.
 * 
 * @description
 * Ce composant permet de visualiser, trier, filtrer et modifier les informations des capteurs
 * associés à différents établissements. Il inclut également des fonctionnalités de rafraîchissement
 * des données et de gestion des notifications.
 * 
 * @remarks
 * - Utilise `CapteurService` pour récupérer et mettre à jour les données des capteurs.
 * - Permet de trier les capteurs par température, humidité, batterie ou durée.
 * - Inclut un système de filtres pour sélectionner les capteurs par établissement.
 * - Gère les interactions utilisateur via des dropdowns, un pull-to-refresh et un modal.
 * - Réinitialise le délai d'inactivité via `AuthService.resetTimeout`.
 */
const ModificationCapteurs: React.FC = () => {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [capteurs, setCapteurs] = useState<Capteur[]>([]);
    const [capteursFiltres, setCapteursFiltres] = useState<Capteur[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const bottomPadding = Platform.OS === 'android' ? 100 : 50;
    
    const windowWidth = Dimensions.get('window').width;
    const isWebVersion = windowWidth > 768;
    const isWebPlatform = Platform.OS === 'web';
    
    const scrollMarginTop = isWebPlatform ? 90 : 160;
    const flatListPaddingTop = isWebPlatform ? 170 : 180;
    const numColumns = isWebVersion 
    ? (windowWidth > 1200 
        ? 4
        : (windowWidth > 900 
            ? 3
            : 2))
    : 1;

    const [filtreOuvert, setFiltreOuvert] = useState<boolean>(false);
    const [valeurFiltre, setValeurFiltre] = useState<string>('ALPHA_ASC');
    const [elementsFiltre, setElementsFiltre] = useState<FiltreItem[]>([
        { label: 'Nom A → Z', value: 'ALPHA_ASC' },
        { label: 'Nom Z → A', value: 'ALPHA_DESC' },
        { label: 'Température décroissante', value: 'TEMP_DESC' },
        { label: 'Température croissante', value: 'TEMP_ASC' },
        { label: 'Humidité décroissante', value: 'HUMID_DESC' },
        { label: 'Humidité croissante', value: 'HUMID_ASC' },
        { label: 'Batterie décroissante', value: 'BAT_DESC' },
        { label: 'Batterie croissante', value: 'BAT_ASC' },
        { label: 'Activité récente', value: 'DUR_ASC' },
        { label: 'Activité ancienne', value: 'DUR_DESC' },
    ]);
    const [etablissementOuvert, setEtablissementOuvert] = useState<boolean>(false);
    const [valeurEtablissement, setValeurEtablissement] = useState<string>('');
    const [elementsEtablissement, setElementsEtablissement] = useState<FiltreItem[]>([]);

    const [metriqueCliquee, setMetriqueCliquee] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [indexCapteurActuel, setIndexCapteurActuel] = useState<number | null>(null);

    const appliquerFiltres = (listeCapteurs: Capteur[], critere: string, etablissement: string) => {
        let resultat = [...listeCapteurs];
        
        if (etablissement) {
            resultat = resultat.filter(capteur => capteur.site_name === etablissement);
        }

        if (searchTerm.trim() !== '') {
            const searchTermLower = searchTerm.toLowerCase().trim();
            resultat = resultat.filter(capteur => 
                (capteur.name && capteur.name.toLowerCase().includes(searchTermLower)) ||
                (capteur.euid && capteur.euid.toLowerCase().includes(searchTermLower))
            );
        }
        
        switch (critere) {
            case 'ALPHA_ASC':
            resultat.sort((a, b) => {
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
        break;
            case 'ALPHA_DESC':
            resultat.sort((a, b) => {
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                return nameB.localeCompare(nameA);
            });
        break;
            case 'TEMP_DESC':
                resultat.sort((a, b) => (b.last_temperature || 0) - (a.last_temperature || 0));
                break;
            case 'TEMP_ASC':
                resultat.sort((a, b) => (a.last_temperature || 0) - (b.last_temperature || 0));
                break;
            case 'HUMID_DESC':
                resultat.sort((a, b) => (b.last_humidity || 0) - (a.last_humidity || 0));
                break;
            case 'HUMID_ASC':
                resultat.sort((a, b) => (a.last_humidity || 0) - (b.last_humidity || 0));
                break;
            case 'BAT_DESC':
                resultat.sort((a, b) => (b.battery_level || 0) - (a.battery_level || 0));
                break;
            case 'BAT_ASC':
                resultat.sort((a, b) => (a.battery_level || 0) - (b.battery_level || 0));
                break;
            case 'DUR_ASC':
                resultat.sort((a, b) => (a.last_minutes_ago || 9999) - (b.last_minutes_ago || 9999));
                break;
            case 'DUR_DESC':
                resultat.sort((a, b) => (b.last_minutes_ago || 0) - (a.last_minutes_ago || 0));
                break;
            default:
                break;
        }
        
        return resultat;
    };


const [updateCounter, setUpdateCounter] = useState(0);

const forceUpdate = () => {
    console.log("Forçage d'une mise à jour complète");
    setUpdateCounter(prev => prev + 1);
};

const fetchData = async () => {
    console.log("Début du rafraîchissement des données");
    setRefreshing(true);
    
    try {
        const sitesData = await CapteurService.getSites();
        const capteursData = await CapteurService.getCapteurs();
        
        setSites(sitesData);
        setCapteurs(capteursData);
        
        setElementsEtablissement([
            { label: 'Tous les établissements', value: '' },
            ...sitesData.map((site: Site) => ({
                label: site.name,
                value: site.name,
            }))
        ]);
        
        const capteursFiltered = appliquerFiltres(capteursData, valeurFiltre, valeurEtablissement);
        setCapteursFiltres(capteursFiltered);
        
        forceUpdate();
    } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
    } finally {
        setRefreshing(false);
    }
};

    useEffect(() => {
        if (capteurs.length > 0) {
            const filtered = appliquerFiltres(capteurs, valeurFiltre, valeurEtablissement);
            setCapteursFiltres(filtered);
        }
    }, [valeurFiltre, valeurEtablissement, capteurs, searchTerm, updateCounter]);

    useEffect(() => {
    fetchData();
    AuthService.resetTimeout(router);

    const intervalId = setInterval(() => {
        console.log("Rafraîchissement automatique des données");
        fetchData();
    }, 60000);

    return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        if (capteurs.length > 0) {
            const filtered = appliquerFiltres(capteurs, valeurFiltre, valeurEtablissement);
            setCapteursFiltres(filtered);
        }
    }, [valeurFiltre, valeurEtablissement, capteurs]);

    const onRefresh = async () => {
        AuthService.resetTimeout(router);
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleChangeFiltre = (value: string) => {
        setValeurFiltre(value);
    };

    const handleChangeEtablissement = (value: string) => {
        setValeurEtablissement(value);
    };

    const gererClicMetrique = (index: number, typeMetrique: string): void => {
        AuthService.resetTimeout(router);
        const cle = `${index}-${typeMetrique}`;
        setMetriqueCliquee((prev) => (prev === cle ? null : cle));
    };

    const ouvrirModal = (index: number): void => {
        AuthService.resetTimeout(router);
        setIndexCapteurActuel(index);
        setModalVisible(true);
    };

    const sauvegarderCapteur = async (
        capteurId: number, 
        nom: string, 
        seuilTemperature: string, 
        notif: boolean
    ) => {
        try {
            const success = await CapteurService.updateCapteur(
                capteurId,
                nom,
                seuilTemperature,
                notif
            );
            
            if (success) {
                console.log('Capteur mis à jour avec succès');
            }
            return success;
        } catch (error) {
            console.error('Erreur lors de la mise à jour du capteur:', error);
            return false;
        }
    };
    
    const renderGridItem = ({ item, index }) => {
        return (
            <View style={{
                flex: 1,
                margin: 8,
                maxWidth: isWebVersion ? `${100 / numColumns - 2}%` : '100%'
            }}>
                <CapteurCard
                    key={item.id}
                    capteur={{
                        nom: item.name,
                        temperature: item.last_temperature?.toString() + " °C" || 'N/A',
                        temperatureMax: item.seuil_temperature?.toString() + " °C" || 'N/A',
                        humidite: item.last_humidity?.toString() + " %" || 'N/A',
                        duree: item.last_minutes_ago?.toString() + " min."|| 'N/A',
                        batterie: item.battery_level?.toString() + " V" || 'N/A',
                        euid: item.euid,
                        signal: item.rssi?.toString() || 'N/A',
                        statutMail: item.notif,
                    }}
                    index={index}
                    metriqueCliquee={metriqueCliquee}
                    gererClicMetrique={gererClicMetrique}
                    ouvrirModal={ouvrirModal}
                    mode="modification"
                    isGridView={isWebVersion}
                />
            </View>
        );
    };

    const renderEmptyList = () => {
        if (refreshing) return null;
        return (
            <Text style={{ textAlign: 'center', marginTop: 50, color: '#666' }}>
                {searchTerm ? 'Aucun capteur trouvé pour cette recherche.' : 'Aucun capteur disponible. Tirez vers le bas pour actualiser.'}
            </Text>
        );
    };

    return (
        <View style={[styles.conteneur, { paddingTop: insets.top}]}>
            {/* Champ de recherche avec pointerEvents="box-none" pour ne pas bloquer le scroll */}
            <View style={[styles.searchContainer, { top: insets.top }]} pointerEvents="box-none">
                <View style={styles.searchInputContainer}>
                    <MaterialIcons name="search" size={24} color="#999" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Rechercher par nom ou EUID..."
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        clearButtonMode="while-editing"
                        autoCapitalize="none"
                    />
                </View>
            </View>

            {/* Conteneur de filtres avec pointerEvents="box-none" */}
            <View 
                style={[styles.conteneurFiltresFixe, { top: insets.top + 60}]} 
                pointerEvents="box-none"
            >
                <DropdownFiltre
                    label="Tri par :"
                    ouvert={filtreOuvert}
                    valeur={valeurFiltre}
                    elements={elementsFiltre}
                    setOuvert={setFiltreOuvert}
                    setValeur={handleChangeFiltre}
                    setElements={setElementsFiltre}
                    zIndex={3000}
                    zIndexInverse={1000}
                />
                <DropdownFiltre
                    label="Établissements :"
                    ouvert={etablissementOuvert}
                    valeur={valeurEtablissement}
                    elements={elementsEtablissement}
                    setOuvert={setEtablissementOuvert}
                    setValeur={handleChangeEtablissement}
                    setElements={setElementsEtablissement}
                    zIndex={2000}
                    zIndexInverse={2000}
                />
            </View>

            {!isWebVersion && (
                <ScrollView 
                    style={[styles.scrollView, { marginTop: scrollMarginTop }]} 
                    contentContainerStyle={[styles.contenuScrollView, { paddingTop: 20, paddingBottom: bottomPadding }]}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={onRefresh}
                            colors={['#0a7ea4']}
                            progressViewOffset={80}
                            tintColor="#0a7ea4"
                        />
                    }
                    showsVerticalScrollIndicator={true}
                    bounces={true}
                >
                    {capteursFiltres.map((capteur: Capteur, index: number) => (
                        <CapteurCard
                            key={capteur.id}
                            capteur={{
                                nom: capteur.name,
                                temperature: capteur.last_temperature?.toString() + " °C" || 'N/A',
                                temperatureMax: capteur.seuil_temperature?.toString() + " °C" || 'N/A',
                                humidite: capteur.last_humidity?.toString() + " %" || 'N/A',
                                duree: capteur.last_minutes_ago?.toString() + " min."|| 'N/A',
                                batterie: capteur.battery_level?.toString() + " V" || 'N/A',
                                euid: capteur.euid,
                                signal: capteur.rssi?.toString() || 'N/A',
                                statutMail: capteur.notif,
                            }}
                            index={index}
                            metriqueCliquee={metriqueCliquee}
                            gererClicMetrique={gererClicMetrique}
                            ouvrirModal={ouvrirModal}
                            mode="modification"
                            isGridView={false}
                        />
                    ))}
                    {capteursFiltres.length === 0 && renderEmptyList()}
                </ScrollView>
            )}

            {/* Version web avec FlatList en grille */}
            {isWebVersion && (
                <FlatList
                    data={capteursFiltres}
                    renderItem={renderGridItem}
                    keyExtractor={item => item.id.toString()}
                    numColumns={numColumns}
                    key={`grid-${numColumns}`}
                    contentContainerStyle={{ 
                        paddingHorizontal: 8,
                        paddingTop: flatListPaddingTop, 
                        paddingBottom: bottomPadding 
                    }}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={onRefresh}
                            colors={['#0a7ea4']}
                            progressViewOffset={180}
                            tintColor="#0a7ea4"
                        />
                    }
                    ListEmptyComponent={renderEmptyList}
                    showsVerticalScrollIndicator={true}
                />
            )}

            <ModalGestionCapteur
                visible={modalVisible}
                setVisible={setModalVisible}
                capteur={indexCapteurActuel !== null ? {
                    id: capteursFiltres[indexCapteurActuel]?.id,
                    nom: capteursFiltres[indexCapteurActuel]?.name,
                    temperatureMax: capteursFiltres[indexCapteurActuel]?.seuil_temperature?.toString() || '',
                    statutMail: capteursFiltres[indexCapteurActuel]?.notif
                } : null}
                indexCapteur={indexCapteurActuel}
                etablissement={capteursFiltres[indexCapteurActuel]?.site_name || ''}
                onSaveCapteur={sauvegarderCapteur}
                onSuccess={fetchData}
            />
        </View>
    );
};

export default ModificationCapteurs;