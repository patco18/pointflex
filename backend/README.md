# PointFlex Backend

Backend Flask pour l'application de pointage PointFlex.

## Installation

1. Créer un environnement virtuel :
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows
```

2. Installer les dépendances :
```bash
pip install -r requirements.txt
```

3. Lancer l'application :
```bash
python app.py
```

## API Endpoints

### Authentification
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Informations utilisateur

### Pointage
- `POST /api/attendance/checkin/office` - Pointage bureau
- `POST /api/attendance/checkin/mission` - Pointage mission
- `POST /api/attendance/checkout` - Enregistrer l'heure de départ
- `GET /api/attendance` - Historique des pointages
- `GET /api/attendance/stats` - Statistiques

### Notifications
- `GET /api/notifications` - Liste des notifications de l'utilisateur

## Comptes de test

- Admin: admin@pointflex.com / admin123
- Employé: employee@pointflex.com / employee123
