import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, Dimensions, ScrollView, Platform } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useStatistiques } from '../../contexts/StatistiquesContext';
import StatistiqueTableauRecap from './StatistiqueTableauRecap';
import StatistiqueNotesSection from './StatistiqueNotesSection';
import { StatistiqueService } from '../../services/statistiqueService';

interface Props {
    topInset: number;
    hasFloatingButton?: boolean;
    isAndroid?: boolean;
}   

const StatistiqueCapteurContent: React.FC<Props> = ({ topInset, hasFloatingButton = false, isAndroid = false }) => {
    const {
        loading,
        refreshing,
        error,
        temperatureData,
        temperatureMin,
        temperatureMax,
        humidityData,
        batteryData,
        labels,
        tableData,
        onRefresh,
        loadCapteurData,
        selectedCapteur,
        filtersHeight,
        filtersExpanded
    } = useStatistiques();

    const screenWidth = Dimensions.get('window').width - 40;
    
    const [seuilTemperature, setSeuilTemperature] = useState<number | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    
    const previousCapteurRef = useRef<string | null>(null);
    const refreshSeuil = useRef<boolean>(true);
    
    const formattedLabels = labels.map((label, index) => {
        if (index % 6 !== 0 && index !== labels.length - 1) return '';
        
        if (label.includes(':')) return label;
        
        try {
            const dateParts = label.split('-');
            if (dateParts.length === 3) return `${dateParts[2]}/${dateParts[1]}`;
        } catch (e) {}
        
        return label;
    });

    const fetchSeuil = useCallback(async () => {
        if (!selectedCapteur || selectedCapteur === 'ALL') {
            console.log("Pas de capteur spécifique sélectionné - suppression du seuil");
            setSeuilTemperature(null);
            return;
        }

        try {
            console.log(`Récupération du seuil pour capteur ID: ${selectedCapteur}`);
            const seuil = await StatistiqueService.getSensorThreshold(Number(selectedCapteur));
            console.log(`Seuil récupéré: ${seuil} pour capteur ID: ${selectedCapteur}`);
            
            setSeuilTemperature(prevSeuil => {
                if (prevSeuil !== seuil) {
                    setRefreshKey(prev => prev + 1);
                }
                return seuil;
            });
        } catch (error) {
            console.error('Erreur lors de la récupération du seuil:', error);
            setSeuilTemperature(null);
        }
    }, [selectedCapteur]);

    useEffect(() => {
        if (previousCapteurRef.current !== selectedCapteur) {
            console.log(`Changement de capteur: ${previousCapteurRef.current} -> ${selectedCapteur}`);
            
            setSeuilTemperature(null);
            refreshSeuil.current = true;
            setRefreshKey(prev => prev + 1);
            
            previousCapteurRef.current = selectedCapteur;
        }
        
        if (refreshSeuil.current) {
            fetchSeuil();
            refreshSeuil.current = false;
        }
    }, [selectedCapteur, fetchSeuil]);

    const chartConfig = {
        backgroundColor: '#ffffff',
        backgroundGradientFrom: '#ffffff',
        backgroundGradientTo: '#ffffff',
        decimalPlaces: 1,
        color: (opacity = 1) => `rgba(10, 126, 164, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        style: {
            borderRadius: 16,
            paddingLeft: 0,
            paddingRight: 0,
            marginLeft: 0,
            paddingTop: 0,
            paddingBottom: 0,
        },
        propsForDots: {
            r: '2.5',
            strokeWidth: '1',
            stroke: '#0a7ea4',
        },
        propsForBackgroundLines: {
            strokeDasharray: '',
            strokeWidth: 0.5,
        },
        propsForLabels: {
            fontSize: 8,
            fontWeight: '400',
        },
        yAxisInterval: 2,
        horizontalLabelRotation: 0,
        verticalLabelRotation: 0,
    };

    if (loading && !refreshing) {
        return (
            <View style={[styles.loadingContainer, isAndroid && { paddingTop: topInset }]}>
                <ActivityIndicator size="large" color="#0a7ea4" />
                <Text style={styles.loadingText}>Chargement des statistiques...</Text>
            </View>
        );
    }

    const renderValueLabel = (value: string, unit: string) => {
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        return `${num.toFixed(1)}${unit}`;
    };

    const seuilDataset = seuilTemperature !== null ? {
        data: Array(labels.length).fill(seuilTemperature),
        color: (opacity = 1) => `rgba(255,0,0,${opacity})`,
        strokeWidth: 2,
        withDots: false,
    } : null;

    const tempChartKey = `temp-chart-${selectedCapteur}-${seuilTemperature}-${refreshKey}`;

    const renderCharts = () => (
        <>
            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            refreshSeuil.current = true;
                            loadCapteurData();
                        }}
                    >
                        <Text style={styles.buttonText}>Réessayer</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Graphique de Température */}
            <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Température</Text>
                <View style={styles.chartWrapper}>
                    <LineChart
                        data={{
                            labels: formattedLabels,
                            datasets: [
                                {
                                    data: temperatureMin,
                                    color: (opacity = 1) => `rgba(135, 206, 250, ${opacity})`,
                                    strokeWidth: 1.5,
                                },
                                {
                                    data: temperatureData,
                                    color: (opacity = 1) => `rgba(255, 69, 0, ${opacity})`,
                                    strokeWidth: 2.5,
                                },
                                {
                                    data: temperatureMax,
                                    color: (opacity = 1) => `rgba(220, 20, 60, ${opacity})`,
                                    strokeWidth: 1.5,
                                },
                                ...(seuilDataset ? [seuilDataset] : []),
                            ],
                        }}
                        width={screenWidth}
                        height={220}
                        chartConfig={{
                            ...chartConfig,
                            color: (opacity = 1) => `rgba(255, 69, 0, ${opacity})`,
                        }}
                        bezier
                        style={styles.chart}
                        withHorizontalLabels={true}
                        horizontalLabelRotation={0}
                        verticalLabelRotation={0}
                        withInnerLines={false}
                        withOuterLines={true}
                        withVerticalLines={false}
                        withShadow={false}
                        withDots={true}
                        segments={3}
                        formatYLabel={(value) => renderValueLabel(value, "°C")}
                        yAxisSuffix=""
                        yLabelsOffset={5}
                        xLabelsOffset={-5}
                        hidePointsAtIndex={[]}
                        key={tempChartKey}
                    />
                </View>
                <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: 'rgba(135, 206, 250, 1)' }]} />
                        <Text style={styles.legendText}>Min</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: 'rgba(255, 69, 0, 1)' }]} />
                        <Text style={styles.legendText}>Moy</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: 'rgba(220, 20, 60, 1)' }]} />
                        <Text style={styles.legendText}>Max</Text>
                    </View>
                    {seuilTemperature !== null && (
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: 'red' }]} />
                            <Text style={styles.legendText}>Seuil ({seuilTemperature}°C)</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Graphique d'Humidité */}
            <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Humidité</Text>
                <View style={styles.chartWrapper}>
                    <LineChart
                        data={{
                            labels: formattedLabels,
                            datasets: [
                                {
                                    data: humidityData,
                                    color: (opacity = 1) => `rgba(65, 105, 225, ${opacity})`,
                                    strokeWidth: 2.5,
                                },
                            ],
                        }}
                        width={screenWidth}
                        height={220}
                        chartConfig={{
                            ...chartConfig,
                            color: (opacity = 1) => `rgba(65, 105, 225, ${opacity})`,
                        }}
                        bezier
                        style={styles.chart}
                        withHorizontalLabels={true}
                        horizontalLabelRotation={0}
                        verticalLabelRotation={0}
                        withInnerLines={false}
                        withOuterLines={true}
                        withVerticalLines={false}
                        withShadow={false}
                        withDots={true}
                        segments={3}
                        formatYLabel={(value) => renderValueLabel(value, "%")}
                        yAxisSuffix=""
                        yLabelsOffset={5}
                        xLabelsOffset={-5}
                        key={`humidity-chart-${refreshKey}`}
                    />
                </View>
            </View>

            {/* Graphique de Batterie */}
            <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Batterie</Text>
                <View style={styles.chartWrapper}>
                    <LineChart
                        data={{
                            labels: formattedLabels,
                            datasets: [
                                {
                                    data: batteryData,
                                    color: (opacity = 1) => `rgba(50, 205, 50, ${opacity})`,
                                    strokeWidth: 2.5,
                                },
                            ],
                        }}
                        width={screenWidth}
                        height={220}
                        chartConfig={{
                            ...chartConfig,
                            color: (opacity = 1) => `rgba(50, 205, 50, ${opacity})`,
                        }}
                        bezier
                        style={styles.chart}
                        withHorizontalLabels={true}
                        horizontalLabelRotation={0}
                        verticalLabelRotation={0}
                        withInnerLines={false}
                        withOuterLines={true}
                        withVerticalLines={false}
                        withShadow={false}
                        withDots={true}
                        segments={3}
                        formatYLabel={(value) => renderValueLabel(value, "V")}
                        yAxisSuffix=""
                        yLabelsOffset={5}
                        xLabelsOffset={-5}
                        key={`battery-chart-${refreshKey}`}
                    />
                </View>
            </View>

            {tableData.length > 0 && <StatistiqueTableauRecap data={tableData} />}
            <StatistiqueNotesSection />
            <View style={{ height: hasFloatingButton ? 80 : 40 }} />
        </>
    );

    if (isAndroid) {
return (
        <ScrollView
            style={[
                styles.scrollView,
                { marginTop: 0, paddingTop: 0 }
            ]}
            contentContainerStyle={[
                styles.scrollContent,
                hasFloatingButton && { paddingBottom: 80 }
            ]}
            showsVerticalScrollIndicator={true}
            refreshControl={
                <RefreshControl 
                    refreshing={refreshing} 
                    onRefresh={() => {
                        refreshSeuil.current = true;
                        onRefresh();
                    }}
                    colors={['#0a7ea4']}
                />
            }
        >
            {renderCharts()}
        </ScrollView>
    );
    }

    return (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
                styles.scrollContent,
                hasFloatingButton && { paddingBottom: 96 }
            ]}
            showsVerticalScrollIndicator={true}
            refreshControl={
                <RefreshControl 
                    refreshing={refreshing} 
                    onRefresh={() => {
                        refreshSeuil.current = true;
                        onRefresh();
                    }}
                    colors={['#0a7ea4']}
                />
            }
        >
            {renderCharts()}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    scrollContent: {
        padding: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: '#555',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#0a7ea4',
    },
    errorContainer: {
        backgroundColor: '#ffebee',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
        alignItems: 'center',
    },
    errorText: {
        color: '#d32f2f',
        marginBottom: 10,
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#0a7ea4',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 5,
        marginTop: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
    },
    chartContainer: {
        marginBottom: 30,
        backgroundColor: '#f9f9f9',
        padding: 15,
        borderRadius: 10,
    },
    chartWrapper: {
        marginHorizontal: -15,
    },
    chartTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 15,
        color: '#333',
        textAlign: 'center',
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16,
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: 10,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 10,
        marginBottom: 5,
    },
    legendColor: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 5,
    },
    legendText: {
        fontSize: 12,
        color: '#555',
    },
});

export default StatistiqueCapteurContent;