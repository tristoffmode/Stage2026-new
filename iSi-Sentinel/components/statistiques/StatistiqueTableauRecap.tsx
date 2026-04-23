import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { format, isValid, parse, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ProcessedData {
    Date_Time: string;
    Temp_Moyenne: number | null;
    Temp_Minimum: number | null;
    Temp_Maximum: number | null;
    Humidite_Moyenne: number | null;
    Batterie_Minimum: number | null;
}

interface Props {
    data: ProcessedData[];
    startDate?: Date;
    endDate?: Date;
}

/**
 * Composant tableau récapitulatif des statistiques.
 */
const StatistiqueTableauRecap: React.FC<Props> = ({ data, startDate, endDate }) => {
  const isStartDateValid = startDate && isValid(startDate);
  const isEndDateValid = endDate && isValid(endDate);

  const diffDays = (isStartDateValid && isEndDateValid)
    ? differenceInDays(endDate!, startDate!)
    : 0;

  const sameDay = (isStartDateValid && isEndDateValid)
    ? format(startDate!, 'yyyy-MM-dd') === format(endDate!, 'yyyy-MM-dd')
    : false;

  // true => la plage est sur une seule journée (affichage par heure)
  const useHourFormat = diffDays === 0 || sameDay;

  const formatDate = (dateStr: string): string => {
    try {
      // Déjà une heure "HH:mm"
      if (dateStr.includes(':') && dateStr.length <= 5) {
        return dateStr;
      }
      // Format "yyyy-MM-dd"
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = parse(dateStr, 'yyyy-MM-dd', new Date());
        if (isValid(date)) {
          return format(date, 'dd/MM/yyyy', { locale: fr });
        }
      }
      // Date ISO ou autre
      const date = new Date(dateStr);
      if (isValid(date)) {
        return useHourFormat
          ? format(date, 'HH:mm', { locale: fr })
          : format(date, 'dd/MM/yyyy', { locale: fr });
      }
      return dateStr;
    } catch (error) {
      console.warn(`Erreur de formatage de date: ${dateStr}`, error);
      return dateStr;
    }
  };

  // ⬇️ Plus de limitation : on affiche toutes les lignes
  const rowsToRender = data;

  return (
    <View style={styles.tableContainer}>
      <Text style={styles.tableTitle}>Récapitulatif des mesures</Text>

      <ScrollView horizontal style={styles.tableWrapper}>
        <View>
          {/* En-tête du tableau */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: 100 }]}>
              {useHourFormat ? 'Heure' : 'Date'}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: 100 }]}>T°C Moyenne</Text>
            <Text style={[styles.tableHeaderCell, { width: 100 }]}>T°C Minimum</Text>
            <Text style={[styles.tableHeaderCell, { width: 100 }]}>T°C Maximum</Text>
            <Text style={[styles.tableHeaderCell, { width: 100 }]}>Humidité</Text>
            <Text style={[styles.tableHeaderCell, { width: 100 }]}>Batterie</Text>
          </View>

          {/* Corps du tableau */}
          {rowsToRender.map((row, index) => (
            <View key={index} style={[styles.tableRow, index % 2 === 0 ? styles.tableRowEven : null]}>
              <Text style={styles.tableCell}>
                {formatDate(row.Date_Time)}
              </Text>
              <Text style={[styles.tableCell, { width: 100 }]}>
                {row.Temp_Moyenne !== null ? `${row.Temp_Moyenne.toFixed(1)}°C` : 'N/A'}
              </Text>
              <Text style={[styles.tableCell, { width: 100 }]}>
                {row.Temp_Minimum !== null ? `${row.Temp_Minimum.toFixed(1)}°C` : 'N/A'}
              </Text>
              <Text style={[styles.tableCell, { width: 100 }]}>
                {row.Temp_Maximum !== null ? `${row.Temp_Maximum.toFixed(1)}°C` : 'N/A'}
              </Text>
              <Text style={[styles.tableCell, { width: 100 }]}>
                {row.Humidite_Moyenne !== null ? `${row.Humidite_Moyenne.toFixed(1)}%` : 'N/A'}
              </Text>
              <Text style={[styles.tableCell, { width: 100 }]}>
                {row.Batterie_Minimum !== null ? `${row.Batterie_Minimum.toFixed(2)}V` : 'N/A'}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Styles inchangés
  tableContainer: {
    marginBottom: 30,
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  tableWrapper: {
    marginHorizontal: -15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e0f7fa',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  tableHeaderCell: {
    padding: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tableRowEven: {
    backgroundColor: '#f5f5f5',
  },
  tableCell: {
    padding: 10,
    textAlign: 'center',
    width: 100,
  },
});

export default StatistiqueTableauRecap;
