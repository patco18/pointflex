# PointFlex SaaS - Système de Pointage Multi-Entreprises

Application SaaS complète de gestion des pointages avec architecture multi-tenant et rôles hiérarchiques.

## 🚀 Fonctionnalités

### 🔐 Système de Rôles
- **SuperAdmin** : Contrôle total de la plateforme
  - Gestion des entreprises (création, modification, suppression)
  - Vue d'ensemble globale avec statistiques
  - Gestion de tous les utilisateurs
  - Contrôle des abonnements et limites

- **Admin Entreprise** : Gestion de son entreprise
  - Gestion des employés de son entreprise
  - Configuration des paramètres de pointage
  - Rapports et statistiques d'entreprise
  - Pointage personnel

- **Employé** : Utilisation du système
  - Pointage bureau avec géolocalisation
  - Pointage mission avec numéro d'ordre
  - Consultation de son historique
  - Dashboard personnel

### 🏢 Multi-Tenant
- Isolation complète des données par entreprise
- Plans d'abonnement (Basic, Premium, Enterprise)
- Limites configurables par entreprise
- Gestion des statuts d'abonnement
- Prolongation d'abonnement avec génération de facture
- Suivi des factures et des paiements


### 📍 Pointage Intelligent
- **Pointage Bureau** : Géolocalisation avec rayon configurable
- **Pointage Mission** : Validation par numéro d'ordre
- Calcul automatique des retards
- Horodatage précis et sécurisé
- Notification en cas de retard ou de pointage

### 📊 Analytics & Reporting
- Statistiques globales (SuperAdmin)
- Statistiques par entreprise (Admin)
- Statistiques personnelles (Employé)
- Historique complet des pointages

## 🛠️ Technologies

### Backend
- **Python Flask** - Framework web
- **SQLAlchemy** - ORM
- **Flask-JWT-Extended** - Authentification JWT
- **SQLite** - Base de données (migratable vers PostgreSQL)
- **Flask-CORS** - Gestion CORS

### Frontend
- **React 18** avec TypeScript
- **Vite** - Build tool moderne
- **Tailwind CSS** - Framework CSS
- **React Router** - Navigation
- **Axios** - Client HTTP
- **React Hook Form** - Gestion des formulaires

## 📦 Installation

### Prérequis
- Node.js 16+
- Python 3.8+
- npm ou yarn

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

pip install -r requirements.txt
python app.py
```

### Frontend
```bash
npm install
npm run dev
```

### Tests

#### Backend
```bash
cd backend
pytest
```

#### Frontend
```bash
npm test
npm run lint  # analyse le code avec ESLint
```

## 🔐 Comptes de Démonstration

### SuperAdmin (Contrôle total)
- **Email** : superadmin@pointflex.com
- **Mot de passe** : superadmin123
- **Accès** : Dashboard SuperAdmin, Gestion entreprises

### Admin Entreprise (Entreprise Démo)
- **Email** : admin@pointflex.com
- **Mot de passe** : admin123
- **Accès** : Gestion employés, Configuration entreprise

### Employé (Entreprise Démo)
- **Email** : employee@pointflex.com
- **Mot de passe** : employee123
- **Accès** : Pointage, Dashboard personnel

### Chef de Service
- **Email** : chefservice@pointflex.com
- **Mot de passe** : chefservice123
- **Accès** : Gestion d'équipe, Validation des présences

### Chef de Projet
- **Email** : chefprojet@pointflex.com
- **Mot de passe** : chefprojet123
- **Accès** : Création et suivi des missions

### Manager
- **Email** : manager@pointflex.com
- **Mot de passe** : manager123
- **Accès** : Supervision d'équipe, Rapports

### Auditeur
- **Email** : auditeur@pointflex.com
- **Mot de passe** : auditeur123
- **Accès** : Lecture seule et rapports d'audit

## 🏗️ Architecture

### Base de Données
```
Company (Entreprises)
├── Users (Utilisateurs)
├── CompanySettings (Paramètres)
└── Pointages (via Users)
```

### API Endpoints

#### SuperAdmin
- `GET /api/superadmin/companies` - Liste des entreprises
- `POST /api/superadmin/companies` - Créer entreprise
- `PUT /api/superadmin/companies/:id` - Modifier entreprise
- `DELETE /api/superadmin/companies/:id` - Supprimer entreprise
- `GET /api/superadmin/stats` - Statistiques globales

#### Admin
- `GET /api/admin/employees` - Liste des employés
- `POST /api/admin/employees` - Créer employé
- `PUT /api/admin/employees/:id` - Modifier employé
- `DELETE /api/admin/employees/:id` - Supprimer employé

#### Pointage
- `POST /api/attendance/checkin/office` - Pointage bureau
- `POST /api/attendance/checkin/mission` - Pointage mission
- `GET /api/missions` - Liste des missions
- `POST /api/missions` - Créer mission
- `GET /api/attendance` - Historique pointages
- `GET /api/attendance/stats` - Statistiques personnelles

#### Profil
- `GET /api/profile` - Informations profil
- `PUT /api/profile` - Mettre à jour le profil
- `PUT /api/profile/password` - Changer le mot de passe
- `GET /api/profile/export` - Exporter les données utilisateur

## 🔧 Configuration

### Paramètres Entreprise
- Coordonnées GPS du bureau
- Rayon de pointage autorisé
- Heure de début de travail
- Seuil de tolérance pour les retards

### Plans d'Abonnement
- **Basic** : 10 employés max
- **Premium** : 50 employés max
- **Enterprise** : Illimité

## 🚀 Déploiement

### Déploiement Rapide avec Docker

#### Prérequis
- Docker et Docker Compose installés
- Git

#### Instructions

1. **Cloner le projet**
```bash
git clone https://github.com/patco18/pointflex.git
cd pointflex
```

2. **Configurer les variables d'environnement**
```bash
# Copier le fichier d'exemple
cp .env.example .env

# Modifier les valeurs (obligatoire pour la production!)
# Surtout SECRET_KEY et JWT_SECRET_KEY
```

3. **Déployer avec Docker**

**Windows:**
```bash
./deploy.bat
```

**Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh
```

4. **Accéder à l'application**
- Frontend: http://localhost
- API Backend: http://localhost:5000

#### Commandes utiles Docker
```bash
# Voir les logs
docker-compose logs -f

# Arrêter les services
docker-compose down

# Redémarrer
docker-compose restart

# Mise à jour
git pull
docker-compose up --build -d
```

### Déploiement en Développement

#### Setup automatique
```bash
# Windows
./dev-setup.bat

# Ensuite démarrer les services
npm run dev                # Frontend sur :5173
cd backend && python app.py  # Backend sur :5000
python run_worker.py         # Worker RQ pour les webhooks
```

#### Ou avec Docker
```bash
docker-compose -f docker-compose.dev.yml up
```
Ce fichier compose lance désormais un service **redis** indispensable pour les notifications en temps réel (SSE) et la limitation de débit.

### Variables d'Environnement

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

#### Backend (.env)
```env
FLASK_ENV=production
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
DATABASE_URL=sqlite:///instance/pointflex.db
CORS_ORIGINS=http://localhost,https://yourdomain.com
REDIS_URL=redis://localhost:6379/0
STRIPE_API_KEY=your-stripe-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret
STRIPE_PRICE_MAP={"price_basic_monthly_test":{"name":"basic","max_employees":10,"amount_eur":10,"interval_months":1}}
```
`STRIPE_PRICE_MAP` doit être un objet JSON mapant les identifiants de tarifs Stripe
aux informations de vos plans (nom, montant, durée, etc.).

### Production (Serveur)

#### Avec Docker Compose
```bash
# Sur votre serveur
git clone https://github.com/patco18/pointflex.git
cd pointflex

# Configurer .env pour la production
cp .env.example .env
nano .env  # Modifier les clés secrètes

# Déployer
docker-compose up -d

# Démarrer ensuite le worker RQ pour les webhooks
docker-compose exec backend python run_worker.py

Cette configuration inclut également un service **redis** nécessaire au bon fonctionnement des notifications SSE et du système de tâches.

# Configurer un reverse proxy (Nginx recommandé)
```

#### Variables d'environnement production
```env
FLASK_ENV=production
SECRET_KEY=votre-cle-secrete-unique-et-longue
JWT_SECRET_KEY=votre-cle-jwt-secrete-unique
DATABASE_URL=sqlite:///instance/pointflex.db
CORS_ORIGINS=https://votre-domaine.com
FCM_SERVER_KEY=votre-cle-fcm  # Necessaire pour les notifications push
TWO_FACTOR_ENCRYPTION_KEY=votre-cle-fernet-32-bytes  # Obligatoire pour le chiffrement 2FA
REDIS_URL=redis://localhost:6379/0
RATELIMIT_STORAGE_URL=redis://localhost:6379/2  # Configurez Redis pour Flask-Limiter
```

### CI/CD avec GitHub Actions

Le projet inclut une pipeline CI/CD qui :
- Teste le code à chaque push
- Construit les images Docker
- Déploie automatiquement sur la branche main

**Configuration requise dans GitHub Secrets:**
- `DOCKER_USERNAME`: Votre nom d'utilisateur Docker Hub
- `DOCKER_PASSWORD`: Votre mot de passe Docker Hub

### Hébergement Recommandé

#### Options Cloud
- **DigitalOcean Droplet** ($5/mois)
- **AWS EC2** (t3.micro gratuit)
- **Google Cloud Run** (Pay-as-you-go)
- **Heroku** (avec Docker)

#### Configuration Nginx (Exemple)
```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Frontend
Déployable sur :
- Vercel
- Netlify
- AWS S3 + CloudFront

### Backend
Déployable sur :
- Heroku
- Railway
- AWS EC2
- DigitalOcean

### Base de Données
Migration vers PostgreSQL pour la production :
```python
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://user:pass@host:port/db'
```

## 🔒 Sécurité

- Authentification JWT avec expiration
- Hachage des mots de passe (Werkzeug)
- Isolation des données par entreprise
- Validation des permissions par rôle
- Protection CORS configurée

## 📱 Interface

- Design responsive (mobile-first)
- Interface adaptée par rôle
- Thème moderne avec Tailwind CSS
- Notifications toast en temps réel
- Navigation intuitive

## 🔄 Évolutions Futures (Prochaines Étapes)

- [X] **API de facturation (Stripe)**: Intégration pour la gestion des abonnements et paiements. *(Backend et Frontend Admin Société implémentés; nécessite configuration Stripe et tests approfondis)*
- [X] **Notifications push**: Via Firebase Cloud Messaging. *(Backend et bases Frontend/Service Worker implémentés; nécessite configuration Firebase et intégration UI pour permissions)*
- [X] **Rapports PDF**: Génération de rapports de présence (entreprise, individuel) et logs d'audit. *(Backend implémenté; nécessite intégration UI Frontend pour téléchargement/filtrage)*
- [X] **Application mobile**: Conception initiale et bases pour une application React Native. *(Structure de base, Auth et API client conceptuels; développement complet requis)*
- [X] **Intégration calendrier**: Affichage des pointages et missions sur un calendrier d'équipe. *(Backend API et composant calendrier Frontend de base implémentés; améliorations UI/filtres possibles)*
- [X] **Gestion des congés**: Système de demande et d'approbation des congés avec gestion des soldes. *(Backend pour modèles, soumission par employé, approbation admin et gestion des soldes implémenté; nécessite UI Frontend complète et logique d'accumulation annuelle)*
- [X] **API webhooks**: Système permettant aux applications externes de souscrire à des événements système. *(Backend pour modèles, création/liste de souscriptions, et distribution d'événements clés implémenté; nécessite UI Frontend et intégration de plus d'événements)*
- [X] **Audit logs**: Journalisation complète des actions critiques. *(Modèle et utilitaires existants améliorés et intégrés plus largement; vue SuperAdmin existe; vue Admin Société est une amélioration possible)*

**Autres améliorations possibles / Prochaines étapes de développement:**
- Finalisation de l'interface utilisateur (Frontend) pour la Gestion des Congés.
- Finalisation de l'interface utilisateur (Frontend) pour la gestion des Webhooks par les administrateurs d'entreprise.
- Implémentation complète de l'application mobile React Native.
- Intégration de la logique d'accumulation annuelle automatique pour les soldes de congés.
- Tests unitaires et d'intégration exhaustifs pour toutes les nouvelles fonctionnalités.
- Documentation utilisateur et administrateur pour les nouvelles fonctionnalités.
- Optimisations de performance et de sécurité continues.

## 📄 Licence

MIT License - Voir le fichier LICENSE pour plus de détails.

---

**PointFlex SaaS** - Solution complète de pointage pour entreprises modernes 🚀
