# Guide d'implémentation des fonctionnalités de paramètres

Ce guide vous explique comment intégrer les nouvelles fonctionnalités développées pour la page des paramètres.

## 1. Structure existante

Nous avons créé les composants suivants :

- `src/components/SettingsTabs.tsx` - Contient les composants pour les nouveaux onglets :
  - `NotificationsTab`
  - `IntegrationsTab`
  - `ExportTab`

## 2. Modifications nécessaires

### 2.1 Dans CompanySettings.tsx

Après le JSX existant pour les onglets "general", "billing" et "leave", ajoutez :

```jsx
{/* ONGLET NOTIFICATIONS */}
{activeTab === 'notifications' && (
  <NotificationsTab 
    notificationSettings={notificationSettings}
    setNotificationSettings={setNotificationSettings}
    handleUpdateNotificationSettings={handleUpdateNotificationSettings}
  />
)}

{/* ONGLET INTEGRATIONS */}
{activeTab === 'integrations' && (
  <IntegrationsTab
    integrationSettings={integrationSettings}
    setIntegrationSettings={setIntegrationSettings}
    handleUpdateIntegrationSettings={handleUpdateIntegrationSettings}
  />
)}

{/* ONGLET EXPORTATION */}
{activeTab === 'export' && (
  <ExportTab
    exportFormat={exportFormat}
    setExportFormat={setExportFormat}
    handleExportData={handleExportData}
  />
)}
```

### 2.2 Backend API

Vous devrez implémenter les points d'API suivants :

#### Notifications
- `GET /admin/company/notification-settings` - Récupérer les paramètres de notification
- `PUT /admin/company/notification-settings` - Mettre à jour les paramètres de notification

#### Intégrations
- `GET /admin/company/integration-settings` - Récupérer les paramètres d'intégration
- `PUT /admin/company/integration-settings` - Mettre à jour les paramètres d'intégration

#### Exportation
- `GET /admin/company/export/:dataType?format=csv` - Exporter les données (dataType = employees, attendance, leaves, billing)

### 2.3 Exemple de mise en œuvre des routes backend

Dans `backend/routes/admin_routes.py`, ajoutez les routes suivantes :

```python
@admin_bp.route('/company/notification-settings', methods=['GET'])
@jwt_required()
@admin_required
def get_notification_settings():
    company = get_current_company()
    
    # Récupérer ou créer les paramètres de notification
    settings = {
        'email_notifications': True,
        'push_notifications': True,
        'attendance_alerts': True,
        'leave_alerts': True,
        'system_notifications': True
    }
    
    return jsonify({'settings': settings})

@admin_bp.route('/company/notification-settings', methods=['PUT'])
@jwt_required()
@admin_required
def update_notification_settings():
    company = get_current_company()
    data = request.json
    
    # Valider et sauvegarder les paramètres
    # Exemple simplifié
    
    return jsonify({'message': 'Paramètres de notification mis à jour', 'settings': data})

@admin_bp.route('/company/integration-settings', methods=['GET'])
@jwt_required()
@admin_required
def get_integration_settings():
    company = get_current_company()
    
    # Récupérer ou créer les paramètres d'intégration
    settings = {
        'webhook_url': '',
        'webhook_enabled': False,
        'webhook_events': [],
        'api_enabled': False
    }
    
    return jsonify({'settings': settings})

@admin_bp.route('/company/integration-settings', methods=['PUT'])
@jwt_required()
@admin_required
def update_integration_settings():
    company = get_current_company()
    data = request.json
    
    # Valider et sauvegarder les paramètres
    # Exemple simplifié
    
    return jsonify({'message': 'Paramètres d\'intégration mis à jour', 'settings': data})

@admin_bp.route('/company/export/<data_type>', methods=['GET'])
@jwt_required()
@admin_required
def export_company_data(data_type):
    company = get_current_company()
    export_format = request.args.get('format', 'csv')
    
    # Valider le type de données
    valid_types = ['employees', 'attendance', 'leaves', 'billing']
    if data_type not in valid_types:
        return jsonify({'error': 'Type de données invalide'}), 400
        
    # Valider le format
    valid_formats = ['csv', 'excel', 'json']
    if export_format not in valid_formats:
        return jsonify({'error': 'Format invalide'}), 400
    
    # Générer les données d'exportation
    # Exemple simplifié
    
    # Renvoyer le fichier correspondant
    # En utilisant send_file pour les formats binaires
    
    # Pour cet exemple, renvoyer un message simple
    return jsonify({'message': f'Exportation {data_type} au format {export_format} non implémentée'})
```

## 3. Modèles de base de données

Vous pouvez avoir besoin de créer des modèles pour les paramètres :

### 3.1 Modèle pour les paramètres de notification

Dans `backend/models/notification_settings.py` :

```python
from backend.database import db
from datetime import datetime

class NotificationSettings(db.Model):
    __tablename__ = 'notification_settings'

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False, unique=True)

    email_notifications = db.Column(db.Boolean, default=True, nullable=False)
    sms_notifications = db.Column(db.Boolean, default=False, nullable=False)
    push_notifications = db.Column(db.Boolean, default=True, nullable=False)
    daily_summary = db.Column(db.Boolean, default=True, nullable=False)
    attendance_alerts = db.Column(db.Boolean, default=True, nullable=False)
    leave_alerts = db.Column(db.Boolean, default=True, nullable=False)
    system_notifications = db.Column(db.Boolean, default=True, nullable=False)
    invoice_notifications = db.Column(db.Boolean, default=True, nullable=False)
    subscription_alerts = db.Column(db.Boolean, default=True, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    company = db.relationship('Company', backref=db.backref('notification_settings', lazy=True, uselist=False))
```

### 3.2 Modèle pour les paramètres d'intégration

Dans `backend/models/integration_setting.py` :

```python
from backend.database import db
from datetime import datetime
import json

class IntegrationSettings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('company.id'), nullable=False)
    
    webhook_url = db.Column(db.String(255), nullable=True)
    webhook_enabled = db.Column(db.Boolean, default=False)
    _webhook_events = db.Column(db.Text, default='[]')
    api_enabled = db.Column(db.Boolean, default=False)
    api_key = db.Column(db.String(64), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    company = db.relationship('Company', backref=db.backref('integration_settings', lazy=True, uselist=False))
    
    @property
    def webhook_events(self):
        return json.loads(self._webhook_events)
        
    @webhook_events.setter
    def webhook_events(self, events):
        self._webhook_events = json.dumps(events)
```

## 4. Conclusions

Avec ces modifications, votre application aura les fonctionnalités suivantes :

1. Configuration des notifications par email et push
2. Configuration des webhooks et API pour l'intégration avec d'autres systèmes
3. Exportation des données dans différents formats

La structure utilisant des onglets permet une navigation claire entre les différentes sections des paramètres, et le code est organisé de manière modulaire pour faciliter la maintenance.
