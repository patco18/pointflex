import React, { useState, useEffect } from 'react';
import { notificationService } from '../services/api';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  Clock, 
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

/**
 * Page d'historique de toutes les notifications pour tous les rôles
 */
const NotificationsHistory: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'read' | 'unread'>('all');

  // Récupérer les notifications
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        perPage,
        search: search || undefined,
        read: filter === 'all' ? undefined : filter === 'read'
      };

      const response = await notificationService.getHistory(params);
      
      if (response.data.success) {
        setNotifications(response.data.notifications || []);
        setTotalPages(response.data.pagination.pages || 1);
      } else {
        toast.error('Erreur lors du chargement des notifications');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des notifications', error);
      toast.error('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page, perPage, filter]);

  // Soumettre la recherche
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Réinitialiser à la première page lors d'une recherche
    fetchNotifications();
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
      
      toast.success('Notification marquée comme lue');
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
      
      toast.success('Toutes les notifications ont été marquées comme lues');
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

  // Format absolu pour la date (en tooltip)
  const formatAbsoluteDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'PPPpp', { locale: fr });
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

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Bell className="mr-2 h-6 w-6 text-blue-600" />
          Historique des notifications
        </h1>
        <p className="text-gray-600 mt-1">
          Consultez toutes vos notifications et gérez leur état.
        </p>
      </div>
      
      {/* Barre d'actions et filtres */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center space-x-2">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'read' | 'unread')}
            className="form-select rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
          >
            <option value="all">Toutes les notifications</option>
            <option value="read">Notifications lues</option>
            <option value="unread">Notifications non lues</option>
          </select>
          
          <button 
            onClick={() => fetchNotifications()}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSearchSubmit} className="flex w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-10 w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
          </div>
          <button
            type="submit"
            className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Rechercher
          </button>
        </form>
      </div>
      
      {/* Résumé des notifications */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-800 font-medium">Résumé</p>
            <p className="text-blue-600 text-sm mt-1">
              {notifications.length} notification{notifications.length !== 1 ? 's' : ''} au total, 
              dont {unreadCount} non lue{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>
          
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tout marquer comme lu
            </button>
          )}
        </div>
      </div>
      
      {/* Liste des notifications */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto" />
            <p className="mt-4 text-gray-600">Aucune notification à afficher.</p>
          </div>
        ) : (
          <ul>
            {notifications.map((notification) => (
              <li 
                key={notification.id} 
                className={`p-4 border-b hover:bg-gray-50 transition-colors ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start">
                  <div className="mr-4 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{notification.title}</h3>
                    <p className="mt-1 text-gray-700">{notification.message}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span 
                        className="text-sm text-gray-500 flex items-center"
                        title={formatAbsoluteDate(notification.created_at)}
                      >
                        <Clock className="mr-1 h-4 w-4" />
                        {formatRelativeTime(notification.created_at)}
                      </span>
                      
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Marquer comme lu
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-gray-600">
              Page {page} sur {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsHistory;
