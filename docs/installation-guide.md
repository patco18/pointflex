# Guide d'installation et d'utilisation

Ce document décrit comment installer et lancer les différents composants de PointFlex.

## Configuration initiale

Copiez le fichier `.env.example` en `.env` à la racine puis renseignez toutes les variables Firebase nécessaires (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, etc.). Ces paramètres sont requis pour les notifications web push.


## Backend Flask

### Installation
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate    # Windows
pip install -r requirements.txt
```

### Lancement
```bash
python app.py
```

## Frontend React

### Installation
```bash
npm install
```

### Lancement en développement
```bash
npm run dev
```

## Application mobile React Native

### Installation
```bash
cd mobile
npm install
cp .env.example .env  # configurer l'URL de l'API
```

### Démarrage
```bash
npx react-native run-android  # ou run-ios
```

## Exécution des tests

### Backend
```bash
cd backend
pytest
```

### Frontend
```bash
npm test
npx eslint .
```

Ces étapes permettent de mettre en place rapidement un environnement complet pour tester et utiliser PointFlex.
