import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/fr';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { usePermissions } from '../../hooks/usePermissions';
import { LeaveCalendarEvent } from '../../types/leaveTypes';
import { AlertTriangle } from 'lucide-react';

// Configuration du localizer pour le calendrier
moment.locale('fr');
const localizer = momentLocalizer(moment);

/**
 * Page de calendrier des congés d'équipe
 * Accessible pour les utilisateurs ayant les permissions de voir les congés de l'équipe/département/tous
 */
export default function TeamLeaveCalendar() {
  const { checkPermission } = usePermissions();
  
  // Vérifier si l'utilisateur a les permissions nécessaires
  const canViewTeamLeave = checkPermission('leave.view_team');
  const canViewDepartmentLeave = checkPermission('leave.view_department');
  const canViewAllLeave = checkPermission('leave.view_all');
  
  const hasViewPermission = canViewTeamLeave || canViewDepartmentLeave || canViewAllLeave;
  
  // États pour les événements du calendrier et les filtres
  const [events, setEvents] = useState<LeaveCalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtres
  const [filters, setFilters] = useState({
    department: 'all',
    leaveType: 'all',
    status: 'all'
  });
  
  // Départements et types de congés disponibles (à extraire des données)
  const [departments, setDepartments] = useState<{ id: number, name: string }[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<{ id: number, name: string }[]>([]);
  
  // Date actuelle pour le calendrier
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Récupération des données (simulée)
  useEffect(() => {
    if (!hasViewPermission) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Simulation de l'appel API avec un délai
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Exemple de données de calendrier
        const mockEvents: LeaveCalendarEvent[] = [
          {
            id: 1,
            title: 'CP - Alice Martin',
            start: new Date(2024, 0, 15),
            end: new Date(2024, 0, 19),
            allDay: true,
            user: {
              id: 2,
              name: 'Alice Martin',
              avatar: '/avatars/alice.jpg',
              department: 'Marketing',
              department_id: 2
            },
            leaveType: {
              id: 1,
              name: 'Congés payés',
              color: '#4CAF50',
              is_paid: true
            },
            status: 'approved',
            requested_days: 5
          },
          {
            id: 2,
            title: 'RTT - Thomas Bernard',
            start: new Date(2024, 0, 22),
            end: new Date(2024, 0, 22),
            allDay: true,
            user: {
              id: 3,
              name: 'Thomas Bernard',
              avatar: '/avatars/thomas.jpg',
              department: 'Technique',
              department_id: 1
            },
            leaveType: {
              id: 2,
              name: 'RTT',
              color: '#2196F3',
              is_paid: true
            },
            status: 'approved',
            requested_days: 1
          },
          {
            id: 3,
            title: 'Maladie - Sophie Petit',
            start: new Date(2024, 0, 10),
            end: new Date(2024, 0, 12),
            allDay: true,
            user: {
              id: 4,
              name: 'Sophie Petit',
              avatar: '/avatars/sophie.jpg',
              department: 'Finance',
              department_id: 3
            },
            leaveType: {
              id: 3,
              name: 'Congé maladie',
              color: '#F44336',
              is_paid: true
            },
            status: 'approved',
            requested_days: 3
          },
          {
            id: 4,
            title: 'CP - Lucas Dubois',
            start: new Date(2024, 0, 25),
            end: new Date(2024, 0, 31),
            allDay: true,
            user: {
              id: 5,
              name: 'Lucas Dubois',
              avatar: '/avatars/lucas.jpg',
              department: 'Technique',
              department_id: 1
            },
            leaveType: {
              id: 1,
              name: 'Congés payés',
              color: '#4CAF50',
              is_paid: true
            },
            status: 'pending',
            requested_days: 7
          }
        ];
        
        // Extraire les départements uniques des événements
        const uniqueDepartments = Array.from(
          new Set(mockEvents.map(event => event.user.department_id).filter(Boolean))
        ).map(id => {
          const event = mockEvents.find(e => e.user.department_id === id);
          return event ? { 
            id: event.user.department_id || 0, 
            name: event.user.department || 'N/A' 
          } : null;
        }).filter(Boolean) as { id: number, name: string }[];
        
        // Extraire les types de congés uniques des événements
        const uniqueLeaveTypes = Array.from(
          new Set(mockEvents.map(event => event.leaveType.id))
        ).map(id => {
          const event = mockEvents.find(e => e.leaveType.id === id);
          return event ? { 
            id: event.leaveType.id, 
            name: event.leaveType.name 
          } : null;
        }).filter(Boolean) as { id: number, name: string }[];
        
        setEvents(mockEvents);
        setDepartments(uniqueDepartments);
        setLeaveTypes(uniqueLeaveTypes);
        setError(null);
      } catch (err) {
        setError('Erreur lors de la récupération des données du calendrier');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [hasViewPermission]);
  
  // Filtrer les événements du calendrier
  const filteredEvents = events.filter(event => {
    const matchDepartment = 
      filters.department === 'all' || 
      (event.user.department_id && event.user.department_id.toString() === filters.department);
    
    const matchLeaveType = 
      filters.leaveType === 'all' || 
      event.leaveType.id.toString() === filters.leaveType;
    
    const matchStatus = 
      filters.status === 'all' || 
      event.status === filters.status;
    
    return matchDepartment && matchLeaveType && matchStatus;
  });
  
  // Personnalisation de l'affichage des événements dans le calendrier
  const eventStyleGetter = (event: LeaveCalendarEvent) => {
    const style = {
      backgroundColor: event.leaveType.color,
      borderRadius: '5px',
      opacity: 0.9,
      color: '#fff',
      border: '0',
      display: 'block'
    };
    
    // Style différent pour les demandes en attente
    if (event.status === 'pending') {
      return {
        style: {
          ...style,
          backgroundColor: `${event.leaveType.color}80`, // Plus transparent
          border: `2px dashed ${event.leaveType.color}`,
        }
      };
    }
    
    return {
      style
    };
  };
  
  // Format d'affichage des événements dans le calendrier
  const eventPropGetter = (event: LeaveCalendarEvent) => {
    return {
      ...event,
      title: `${event.leaveType.name} - ${event.user.name}`,
    };
  };
  
  // Si l'utilisateur n'a pas la permission, afficher un message d'erreur
  if (!hasViewPermission) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Accès non autorisé</h2>
        <p className="text-gray-600">Vous n'avez pas la permission de voir le calendrier des congés.</p>
      </div>
    );
  }
  
  // Afficher un indicateur de chargement
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  // Afficher un message d'erreur si nécessaire
  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">{error}</h3>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Calendrier des congés</h2>
      
      {/* Filtres */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filtre par département */}
          <div>
            <label htmlFor="department-filter" className="block text-sm font-medium text-gray-700">
              Département
            </label>
            <select
              id="department-filter"
              name="department"
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="all">Tous les départements</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Filtre par type de congé */}
          <div>
            <label htmlFor="leave-type-filter" className="block text-sm font-medium text-gray-700">
              Type de congé
            </label>
            <select
              id="leave-type-filter"
              name="leaveType"
              value={filters.leaveType}
              onChange={(e) => setFilters({ ...filters, leaveType: e.target.value })}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="all">Tous les types</option>
              {leaveTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Filtre par statut */}
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
              Statut
            </label>
            <select
              id="status-filter"
              name="status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvé</option>
              <option value="rejected">Refusé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Légende */}
      <div className="mb-4 flex flex-wrap gap-4">
        {leaveTypes.map(type => {
          const event = events.find(e => e.leaveType.id === type.id);
          if (!event) return null;
          
          return (
            <div key={type.id} className="flex items-center">
              <div 
                className="w-4 h-4 rounded-full mr-2" 
                style={{ backgroundColor: event.leaveType.color }}
              ></div>
              <span className="text-sm text-gray-700">{type.name}</span>
            </div>
          );
        })}
        
        <div className="flex items-center ml-4">
          <div className="w-4 h-4 rounded-full mr-2 border-2 border-gray-400 border-dashed bg-gray-100"></div>
          <span className="text-sm text-gray-700">En attente</span>
        </div>
      </div>
      
      {/* Calendrier */}
      <div className="bg-white rounded-lg shadow-sm">
        <Calendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          eventPropGetter={eventStyleGetter}
          defaultView="month"
          views={['month', 'week', 'day']}
          date={currentDate}
          onNavigate={date => setCurrentDate(date)}
          popup
          messages={{
            today: "Aujourd'hui",
            previous: "Précédent",
            next: "Suivant",
            month: "Mois",
            week: "Semaine",
            day: "Jour",
            agenda: "Agenda"
          }}
          formats={{
            dayHeaderFormat: (date: Date) => moment(date).format('dddd DD MMMM')
          }}
          tooltipAccessor={(event: LeaveCalendarEvent) => 
            `${event.leaveType.name} - ${event.user.name}\n` +
            `${moment(event.start).format('DD/MM')} - ${moment(event.end).format('DD/MM')}\n` +
            `${event.requested_days} jour(s) - ${event.status === 'pending' ? 'En attente' : 
              event.status === 'approved' ? 'Approuvé' : 
              event.status === 'rejected' ? 'Refusé' : 'Annulé'}`
          }
        />
      </div>
    </div>
  );
}
