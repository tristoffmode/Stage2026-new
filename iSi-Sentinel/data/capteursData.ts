//ce sont des données fictives, des capteurs de test pour le développement de l'affichage
export interface Capteur {
  nom: string;
  temperature: string;
  temperatureMax: string;
  humidite: string;
  duree?: string;
  batterie?: string;
  euid?: string;
  signal?: string;
  statutMail: boolean;
}

export const capteurs: Capteur[] = [
  {
    nom: 'Capteur 1',
    temperature: '8°C',
    temperatureMax: '10°C',
    humidite: '20%',
    duree: '175min',
    batterie: '3.04 V',
    euid: 'A8A04176B183F5C4',
    signal: 'fort (-81.1 dBm)',
    statutMail: true,
  },
  {
    nom: 'Capteur 2',
    temperature: '12°C',
    temperatureMax: '10°C',
    humidite: '50%',
    duree: '180min',
    batterie: '3.02 V',
    euid: 'B9B14287C294G6D5',
    signal: 'moyen (-90.5 dBm)',
    statutMail: false,
  },
];