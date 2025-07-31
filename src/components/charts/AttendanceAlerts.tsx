import React from 'react';
import { AlertTriangle, Clock, UserCheck, UserX, Calendar, X } from 'lucide-react';

interface LatenessAlert {
  id: number;
  userId: number;
  userName: string;
  department?: string;
  lateCount: number;
  lateMinutes: number;
  lastLateDate: string;
  streak: number; // nombre de jours consécutifs de retard
}

interface AttendanceAlertProps {
  alerts: LatenessAlert[];
  onDismiss?: (id: number) => void;
  onViewDetails?: (id: number) => void;
}

const AttendanceAlertCard: React.FC<{ 
  alert: LatenessAlert;
  onDismiss?: (id: number) => void;
  onViewDetails?: (id: number) => void;
}> = ({ alert, onDismiss, onViewDetails }) => {
  // Définir la sévérité de l'alerte
  let severity: 'low' | 'medium' | 'high' = 'low';
  if (alert.streak >= 3 || alert.lateCount >= 5) {
    severity = 'high';
  } else if (alert.streak >= 2 || alert.lateCount >= 3) {
    severity = 'medium';
  }

  // Classes CSS selon la sévérité
  const severityClasses = {
    low: 'border-yellow-300 bg-yellow-50',
    medium: 'border-orange-300 bg-orange-50',
    high: 'border-red-300 bg-red-50'
  };

  return (
    <div className={`border-l-4 rounded-md p-4 mb-3 ${severityClasses[severity]} relative`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <div className="mr-3">
            {severity === 'high' ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : severity === 'medium' ? (
              <Clock className="h-5 w-5 text-orange-500" />
            ) : (
              <Clock className="h-5 w-5 text-yellow-500" />
            )}
          </div>
          <div>
            <div className="font-medium">
              {alert.userName}
              {alert.department && (
                <span className="text-sm text-gray-500 ml-1">({alert.department})</span>
              )}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {alert.lateCount} retard{alert.lateCount > 1 ? 's' : ''} ce mois-ci
              {alert.streak > 1 && (
                <span className="font-medium text-red-600 ml-1">
                  ({alert.streak} jours consécutifs)
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Dernier retard: {alert.lastLateDate} ({alert.lateMinutes} minutes)
            </div>
          </div>
        </div>
        
        <div className="flex">
          {onViewDetails && (
            <button 
              onClick={() => onViewDetails(alert.id)}
              className="text-blue-600 hover:text-blue-800 mr-2"
            >
              <UserCheck className="h-4 w-4" />
            </button>
          )}
          {onDismiss && (
            <button 
              onClick={() => onDismiss(alert.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function AttendanceAlerts({ alerts, onDismiss, onViewDetails }: AttendanceAlertProps) {
  // Trier les alertes par sévérité (streak, puis lateCount)
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (a.streak !== b.streak) {
      return b.streak - a.streak;
    }
    return b.lateCount - a.lateCount;
  });

  if (sortedAlerts.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Alertes de Retards</h2>
        </div>
        <div className="text-center py-6 text-gray-500">
          <UserCheck className="h-10 w-10 mx-auto mb-2 text-green-500" />
          <p>Aucune alerte de retard pour le moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Alertes de Retards</h2>
        <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
          {sortedAlerts.length} alerte{sortedAlerts.length > 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="space-y-2">
        {sortedAlerts.map(alert => (
          <AttendanceAlertCard
            key={alert.id}
            alert={alert}
            onDismiss={onDismiss}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </div>
  );
}
