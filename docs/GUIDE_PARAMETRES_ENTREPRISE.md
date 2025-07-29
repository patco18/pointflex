# Guide d'utilisation des paramètres d'entreprise

Ce document explique comment utiliser les différents paramètres disponibles dans la section "Paramètres de l'entreprise" de PointFlex.

## Onglet "Général"

L'onglet général vous permet de configurer les informations de base de votre entreprise ainsi que les paramètres de pointage.

### Localisation du bureau
- **Latitude et Longitude**: Coordonnées géographiques de votre bureau principal
- **Rayon autorisé**: Distance en mètres autour de votre bureau dans laquelle les employés peuvent pointer
- **Bouton "Utiliser ma position actuelle"**: Configure automatiquement les coordonnées de votre position actuelle

### Identité visuelle
- **Logo**: Téléversez le logo de votre entreprise qui apparaîtra dans l'application
- **Couleur principale**: Définit la couleur de thème de l'application pour votre entreprise

### Horaires de travail
- **Heure de début**: L'heure officielle à laquelle les employés doivent commencer à travailler
- **Tolérance retard**: Le temps en minutes après l'heure de début avant qu'un employé soit considéré en retard

## Onglet "Facturation"

### Abonnement actuel
Affiche les informations sur votre plan d'abonnement actuel, y compris:
- Le plan souscrit
- Le statut (actif, en attente, expiré)
- Le nombre maximum d'employés autorisés
- La date d'expiration

### Changer de plan
Vous permet de choisir un nouveau plan d'abonnement parmi les options disponibles. Tous les prix sont affichés en FCFA.

### Prolonger l'abonnement
Si vous rencontrez des difficultés de paiement, vous pouvez demander une prolongation temporaire de votre abonnement.

## Onglet "Congés"

### Semaine de travail
Configurez les jours considérés comme ouvrés pour le calcul des congés.

### Code Pays pour Jours Fériés
Définissez le code pays (CI pour Côte d'Ivoire) pour déterminer automatiquement les jours fériés nationaux.

### Jours Fériés Spécifiques
Ajoutez des jours fériés propres à votre entreprise (anniversaire de l'entreprise, fêtes locales, etc.).

## Onglet "Notifications"

### Notifications par Email
Configurez si et comment les notifications par email sont envoyées aux employés et administrateurs.

### Notifications Push et SMS
Configurez les notifications push pour les navigateurs et appareils mobiles, ainsi que les notifications SMS pour les employés sans accès internet constant.

### Catégories de Notifications
Choisissez quels types d'événements déclenchent des notifications (présence, congés, système).

## Onglet "Intégrations"

### Webhooks
Configurez des webhooks pour intégrer PointFlex avec d'autres systèmes. Sélectionnez les événements qui déclenchent des notifications webhook.

### Intégration Mobile Money
Activez l'intégration avec les services de paiement mobile populaires en Côte d'Ivoire (Orange Money, MTN Mobile Money, Moov Money).

### API Access
Générez des clés API pour permettre à des applications tierces d'accéder à vos données PointFlex de manière sécurisée.

## Onglet "Exportation"

### Format d'exportation
Choisissez entre CSV, Excel ou JSON pour vos exports de données.

### Types de données exportables
- **Données des Employés**: Informations sur tous vos employés, compatible avec les déclarations CNPS
- **Données de Présence**: Historique des pointages de tous les employés
- **Données de Congés**: Suivi des demandes et historique des congés
- **Données de Facturation**: Historique des factures et paiements au format compatible SYSCOHADA
