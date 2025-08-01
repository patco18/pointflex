# Guide d'installation et d'utilisation

Ce document décrit comment installer et lancer les différents composants de PointFlex.

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
