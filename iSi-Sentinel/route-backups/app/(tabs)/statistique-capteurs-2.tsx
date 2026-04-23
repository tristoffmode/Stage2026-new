import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import StatistiqueCapteurFilters from '../../components/statistiques/StatistiqueCapteurFiltres';
import StatistiqueCapteurContent from '../../components/statistiques/StatistiqueCapteurContent';
import ModalEnvoyerStats from '../../components/statistiques/ModalEnvoyerStats';
import { StatistiquesProvider } from '../../contexts/StatistiquesContext';

/**
 * Écran des statistiques des capteurs pour l'application.
 */
const StatistiqueCapteurs = () => {
    const insets = useSafeAreaInsets();
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const screenHeight = Dimensions.get('window').height;
    
    if (Platform.OS === 'android') {
        const buttonPosition = Math.min(screenHeight - 120, screenHeight - 80 - insets.bottom);
        
        return (
            <View style={styles.safeArea}>
                <StatistiquesProvider>
                    <View style={styles.container}>
                        {/* Filtres en haut avec une position absolue */}
                        <View style={[styles.androidFilterWrapper]}>
                            <StatistiqueCapteurFilters 
                                topInset={0} 
                                onLayoutMeasured={(height) => {}}
                            />
                        </View>
                        
                        {/* Contenu qui commence après les filtres (avec padding-top) */}
                        <View style={[styles.androidContentContainer]}>
                            <StatistiqueCapteurContent 
                                topInset={0}
                                hasFloatingButton={true}
                                isAndroid={true}
                            />
                        </View>
                        
                        {/* Bouton d'envoi - position absolue mais avec une valeur de bottom fixe */}
                        <View 
                            style={[
                                styles.buttonWrapper, 
                                { bottom: buttonPosition > 0 ? 100 : 100 }
                            ]}
                            pointerEvents="box-none" 
                        >
                            <TouchableOpacity 
                                style={styles.boutonEnvoiMail}
                                onPress={() => setModalVisible(true)}
                            >
                                <MaterialIcons name="email" size={24} color="#fff" />
                                <Text style={styles.texteBouton}>Envoyer</Text>
                            </TouchableOpacity>
                        </View>

                        <ModalEnvoyerStats 
                            visible={modalVisible} 
                            setVisible={setModalVisible} 
                        />
                    </View>
                </StatistiquesProvider>
            </View>
        );
    }
    
    const isWeb = Platform.OS === 'web';
    const buttonBottomPosition = isWeb ? 80 : (20 + insets.bottom);
    
    return (
        <View style={styles.container}>
            <StatistiquesProvider>
                <View style={styles.iosWrapper}>
                    <StatistiqueCapteurFilters topInset={insets.top} />
                    
                    <StatistiqueCapteurContent 
                        topInset={insets.top} 
                        hasFloatingButton={true} 
                    />
                </View>
                
                <View 
                    style={[
                        styles.boutonContainer, 
                        { 
                            bottom: buttonBottomPosition,
                            position: 'absolute',
                            zIndex: 999 
                        }
                    ]}
                    pointerEvents="box-none" 
                >
                    <TouchableOpacity 
                        style={styles.boutonEnvoiMail}
                        onPress={() => setModalVisible(true)}
                    >
                        <MaterialIcons name="email" size={24} color="#fff" />
                        <Text style={styles.texteBouton}>Envoyer</Text>
                    </TouchableOpacity>
                </View>

                <ModalEnvoyerStats 
                    visible={modalVisible} 
                    setVisible={setModalVisible} 
                />
            </StatistiquesProvider>
        </View>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
        position: 'relative',
    },
    androidFilterWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        zIndex: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    androidContentContainer: {
        flex: 1,
        paddingTop: 70, 
        paddingBottom: 80,
    },
    header: {
        backgroundColor: '#ffffff',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        zIndex: 10,
    },
    contentContainer: {
        flex: 1,
        zIndex: 1,
        paddingBottom: 80,
    },
    buttonWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1000,
    },
    iosWrapper: {
        flex: 1,
        position: 'relative',
    },
    boutonContainer: {
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    boutonEnvoiMail: {
        height: 50,
        minWidth: 120, 
        paddingHorizontal: 20,
        backgroundColor: '#0a7ea4',
        borderRadius: 25,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    texteBouton: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 16,
        marginLeft: 8,
    },
});

export default StatistiqueCapteurs;