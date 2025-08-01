# Guide d'utilisation de l'application mobile

Cette application React Native permet aux employés de pointer directement depuis leur smartphone.

## Installation rapide

1. Installez les dépendances :
   ```bash
   cd mobile
   npm install
   ```
2. Copiez le fichier `.env.example` en `.env` et renseignez `API_BASE_URL` avec l'URL de votre backend.
3. Lancez l'application sur un émulateur ou un appareil :
   ```bash
   npx react-native run-android   # ou run-ios
   ```

## Fonctionnalités principales

- **Authentification** : connexion avec email et mot de passe de votre compte PointFlex.
- **Pointage géolocalisé** : en un clic, l'application récupère votre position et envoie un pointage bureau.
- **Consultation rapide** : écran d'accueil simplifié avec possibilité de se déconnecter.

Ce guide sera enrichi au fur et à mesure de l'ajout de nouvelles fonctionnalités (missions, historique complet, etc.).
