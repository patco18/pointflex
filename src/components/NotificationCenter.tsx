import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle, X } from 'lucide-react';
import { notificationService } from '../services/api';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

/**
 * Composant NotificationCenter - Centre de notifications pour l'application
 * Affiche les notifications d'expiration d'abonnement et autres alertes
 */
const NotificationCenter = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Gérer les clics hors du dropdown pour le fermer
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Récupérer les notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationService.list();
      
      if (response.data.success) {
        setNotifications(response.data.notifications || []);
        const unreadCount = response.data.notifications.filter((n: Notification) => !n.read).length;
        setUnread(unreadCount);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications', error);
      toast.error('Impossible de charger les notifications');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Charger les notifications au chargement du composant
  useEffect(() => {
    fetchNotifications();
    
    // Rafraîchir les notifications toutes les 5 minutes
    const interval = setInterval(() => {
      fetchNotifications();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchNotifications]);
  
  // Gérer l'ouverture du menu
  const toggleDropdown = () => {
    setShowDropdown(prev => !prev);
  };
  
  // Marquer une notification comme lue
  const markAsRead = async (notificationId: number) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      // Mise à jour locale
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true } 
            : notif
        )
      );
      
      setUnread(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erreur lors du marquage de la notification comme lue', error);
      toast.error('Erreur lors du marquage de la notification');
    }
  };
  
  // Marquer toutes les notifications comme lues
  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      
      // Mise à jour locale
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      
      setUnread(0);
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications comme lues', error);
      toast.error('Erreur lors du marquage des notifications');
    }
  };
  
  // Formater la date relative
  const formatRelativeTime = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: fr });
    } catch (e) {
      return dateString;
    }
  };
  
  // Obtenir l'icône en fonction du type de notification
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
      case 'subscription_expiring_soon':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error':
      case 'subscription_expired':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };
  
  return (
    <div className="relative">
      {/* Bouton de notification */}
      <button
        className="relative p-2 rounded-full hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
        onClick={toggleDropdown}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute top-0 right-0 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs rounded-full">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      
      {/* Dropdown des notifications */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg w-80 max-h-96 overflow-hidden z-50"
          role="region"
          aria-live="polite"
          aria-label="Notifications"
        >
          {/* Entête du dropdown */}
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-semibold">Notifications</h3>
            {unread > 0 && (
              <button
                className="text-blue-600 text-sm hover:text-blue-800 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 rounded"
                onClick={markAllAsRead}
              >
                Marquer tout comme lu
              </button>
            )}
          </div>
          
          {/* Contenu des notifications */}
          <div className="overflow-y-auto max-h-72">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                Chargement des notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Aucune notification à afficher.
              </div>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li key={notification.id} className={!notification.read ? 'bg-blue-50' : ''}>
                    <button
                      className="w-full text-left p-3 border-b hover:bg-gray-50 flex items-start focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="mr-3 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{notification.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatRelativeTime(notification.created_at)}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* Pied du dropdown */}
          {notifications.length > 0 && (
            <div className="p-2 text-center border-t">
              <button
                className="text-blue-600 hover:text-blue-800 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 rounded"
                onClick={() => {
                  setShowDropdown(false);
                  navigate('/notifications/history');
                }}
              >
                Voir toutes les notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
