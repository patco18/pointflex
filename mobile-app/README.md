# PointFlex Mobile App

Application mobile pour le système de pointage PointFlex, développée avec React Native et Expo.

## Fonctionnalités

- **Authentification** : Connexion sécurisée avec JWT
- **Pointage géolocalisé** : Permet aux utilisateurs de pointer leur présence avec vérification par géolocalisation
- **Vue d'ensemble** : Consultation des pointages du jour avec statut (à l'heure/en retard)

## Prérequis

- Node.js 16+
- Expo CLI
- Un appareil mobile ou un émulateur Android/iOS

## Installation

1. Clonez ce dépôt :
```bash
git clone https://github.com/patco18/pointflex.git
cd pointflex/mobile-app
```

2. Installez les dépendances :
```bash
npm install
```

3. Configurez l'URL de l'API dans le fichier `.env` :
```bash
# Pour tester avec un émulateur Android
API_BASE_URL=http://10.0.2.2:5000/api

# Pour tester avec un simulateur iOS
# API_BASE_URL=http://localhost:5000/api

# Pour tester avec un appareil physique (remplacez par l'adresse IP de votre serveur)
# API_BASE_URL=http://192.168.1.10:5000/api
```

## Lancement

### Avec Expo Go

1. Démarrez le serveur de développement :
```bash
npx expo start
```

2. Scannez le QR code avec l'application Expo Go sur votre appareil Android/iOS, ou utilisez un émulateur.

### Pour un appareil physique

1. Assurez-vous que votre appareil est sur le même réseau Wi-Fi que votre ordinateur
2. Lancez le serveur de développement en mode tunnel :
```bash
npx expo start --tunnel
```
3. Scannez le QR code avec l'application Expo Go

## Conseils pour le développement

- Pour simuler différentes positions GPS dans l'émulateur Android :
  1. Ouvrez les Paramètres de l'émulateur
  2. Allez dans "Location"
  3. Définissez un point sur la carte ou entrez des coordonnées

- Pour accéder aux journaux de débogage :
  ```bash
  npx expo start --dev-client
  ```

## Structure du projet

- `/src/api` : Configuration Axios et endpoints API
- `/src/components` : Composants réutilisables
- `/src/contexts` : Contextes React (AuthContext, etc.)
- `/src/screens` : Écrans principaux de l'application
- `/src/services` : Services métier (authentification, pointage)

## Test des fonctionnalités

1. **Authentification** : Utilisez les comptes de démonstration du README principal.
2. **Pointage** : Après connexion, cliquez sur "Pointer maintenant" sur l'écran d'accueil.
3. **Vérification** : Les données de pointage s'afficheront sur l'écran d'accueil après actualisation.
