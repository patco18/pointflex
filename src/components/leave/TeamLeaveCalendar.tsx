import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';
import 'moment/locale/fr';
import { leaveService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Users, RefreshCcw } from 'lucide-react';
import LoadingSpinner from '../shared/LoadingSpinner';
import { 
  LeaveCalendarEvent, 
  LeaveRequestStatus,
  LeaveType as LeaveTypeInterface,
  Department as DepartmentInterface
} from '../../types/leaveTypes';

moment.locale('fr');
const localizer = momentLocalizer(moment);

interface TeamLeaveCalendarProps {
  showFilters?: boolean;
  showToolbar?: boolean;
  showTeamSelector?: boolean;
  departmentId?: number;
  height?: number | string;
}

export default function TeamLeaveCalendar({ 
  showFilters = true, 
  showToolbar = true,
  departmentId,
  height = 700
}: TeamLeaveCalendarProps) {
  const { user } = useAuth();
  const { checkPermission } = usePermissions();
  
  // Vérification des permissions pour l'affichage des données
  const canViewTeamLeave = checkPermission('leave.view_team');
  const canViewDepartmentLeave = checkPermission('leave.view_department');
  const canViewAllLeave = checkPermission('leave.view_all');
  const [events, setEvents] = useState<LeaveCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'month' | 'week' | 'work_week' | 'day' | 'agenda'>('month');
  const [date, setDate] = useState(new Date());
  const [departments, setDepartments] = useState<DepartmentInterface[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeInterface[]>([]);
  
  const [filters, setFilters] = useState({
    departmentId: departmentId || 0,
    leaveTypeId: 0,
    userId: 0,
    status: 'approved',
    showPending: false,
    showRejected: false
  });
  
  // Fonction pour formater les événements
  const formatEvents = (leaveData: any[]): LeaveCalendarEvent[] => {
    return leaveData.map(leave => ({
      id: leave.id,
      title: `${leave.user.name} - ${leave.leave_type.name}`,
      start: new Date(leave.start_date),
      end: new Date(leave.end_date),
      allDay: true,
      user: {
        id: leave.user_id,
        name: leave.user.name,
        avatar: leave.user.avatar,
        department: leave.user.department?.name,
        department_id: leave.user.department?.id
      },
      leaveType: {
        id: leave.leave_type_id,
        name: leave.leave_type.name,
        color: leave.leave_type.color || '#3B82F6',
        is_paid: leave.leave_type.is_paid || true
      },
      status: leave.status,
      requested_days: leave.requested_days || 1
    }));
  };

  // Chargement initial des données
  useEffect(() => {
    // Vérifier si l'utilisateur a les permissions nécessaires
    if (!canViewTeamLeave && !canViewDepartmentLeave && !canViewAllLeave) {
      setIsLoading(false);
      return;
    }
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Charger les départements (pour les filtres)
        try {
          // const deptResponse = await leaveService.getDepartments();
          // setDepartments(deptResponse.data || []);
          
          // MOCK DATA en attendant l'API
          setDepartments([
            { id: 1, name: 'IT' },
            { id: 2, name: 'Marketing' },
            { id: 3, name: 'Finance' },
            { id: 4, name: 'RH' }
          ]);
        } catch (error) {
          console.error("Erreur lors du chargement des départements:", error);
        }
        
        // Charger les types de congés (pour les filtres)
        try {
          const typeResponse = await leaveService.getLeaveTypes();
          setLeaveTypes(typeResponse.data.map((type: any, index: number) => ({
            ...type,
            color: type.color || ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]
          })) || []);
        } catch (error) {
          console.error("Erreur lors du chargement des types de congés:", error);
        }
        
        // Charger les événements de congés
        // const response = await leaveService.getTeamLeaves({
        //   departmentId: filters.departmentId || undefined,
        //   leaveTypeId: filters.leaveTypeId || undefined,
        //   userId: filters.userId || undefined,
        //   status: filters.status,
        //   startDate: moment(date).startOf('month').format('YYYY-MM-DD'),
        //   endDate: moment(date).endOf('month').format('YYYY-MM-DD')
        // });
        
        // MOCK DATA en attendant l'API
        const mockLeaveData = generateMockLeaveData();
        setEvents(formatEvents(mockLeaveData));
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [filters.departmentId, filters.leaveTypeId, filters.userId, filters.status, date]);
  
  // Générer des données de test pour la démo
  const generateMockLeaveData = () => {
    const users = [
      { id: 1, name: 'Jean Dupont', department: { id: 1, name: 'IT' }, avatar: null, email: 'jean.dupont@example.com' },
      { id: 2, name: 'Marie Martin', department: { id: 2, name: 'Marketing' }, avatar: null, email: 'marie.martin@example.com' },
      { id: 3, name: 'Pierre Durand', department: { id: 3, name: 'Finance' }, avatar: null, email: 'pierre.durand@example.com' },
      { id: 4, name: 'Sophie Petit', department: { id: 4, name: 'RH' }, avatar: null, email: 'sophie.petit@example.com' }
    ];
    
    const leaveTypes: LeaveTypeInterface[] = [
      { id: 1, name: 'Congés payés', color: '#3B82F6', is_paid: true, is_active: true },
      { id: 2, name: 'RTT', color: '#10B981', is_paid: true, is_active: true },
      { id: 3, name: 'Maladie', color: '#F59E0B', is_paid: true, is_active: true },
      { id: 4, name: 'Congé sans solde', color: '#EF4444', is_paid: false, is_active: true }
    ];
    
    const statuses: LeaveRequestStatus[] = ['approved', 'pending', 'rejected'];
    
    // Générer des congés aléatoires pour le mois en cours
    return Array.from({ length: 20 }, (_, i) => {
      const user = users[Math.floor(Math.random() * users.length)];
      const leaveType = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)] as LeaveRequestStatus;
      
      // Date de début aléatoire dans le mois en cours
      const startMonth = date.getMonth();
      const startYear = date.getFullYear();
      const startDay = Math.floor(Math.random() * 28) + 1;
      const startDate = new Date(startYear, startMonth, startDay);
      
      // Durée aléatoire entre 1 et 5 jours
      const duration = Math.floor(Math.random() * 5) + 1;
      const endDate = new Date(startYear, startMonth, startDay + duration);
      
      return {
        id: i + 1,
        user_id: user.id,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          department: user.department.name,
          department_id: user.department.id
        },
        leave_type_id: leaveType.id,
        leave_type: leaveType,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status,
        requested_days: duration
      };
    });
  };
  
  // Gérer les changements de filtre
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: name === 'departmentId' || name === 'leaveTypeId' || name === 'userId' ? parseInt(value) : value
    }));
  };
  
  // Gérer les checkbox de statut
  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  // Navigation dans le calendrier
  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };
  
  // Changer la vue du calendrier
  const handleViewChange = (newView: string) => {
    setView(newView as any);
  };
  
  // Style personnalisé pour les événements
  const eventStyleGetter = (event: LeaveCalendarEvent) => {
    const backgroundColor = event.leaveType.color;
    
    // Styles différents selon le statut
    const style: React.CSSProperties = {
      backgroundColor,
      borderRadius: '4px',
      opacity: 1,
      color: '#fff',
      border: 'none',
      display: 'block',
      fontSize: '0.8em'
    };
    
    if (event.status === 'pending') {
      style.opacity = 0.7;
      style.border = '1px dashed #fff';
    } else if (event.status === 'rejected') {
      style.opacity = 0.5;
      style.textDecoration = 'line-through';
    }
    
    return {
      style
    };
  };
  
  // Formatter les titres des événements
  const formats = {
    eventTimeRangeFormat: () => '',
  };
  
  // Contenu de l'événement
  const EventComponent = ({ event }: { event: LeaveCalendarEvent }) => (
    <div className="flex items-center h-full">
      <div className="truncate">
        {event.user.name} - {event.leaveType.name}
        {event.status === 'pending' && <span className="ml-1">(En attente)</span>}
      </div>
    </div>
  );
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="bg-primary-600 text-white px-6 py-4">
        <h2 className="text-xl font-medium flex items-center">
          <CalendarIcon className="h-6 w-6 mr-2" />
          Calendrier des Congés et Absences
        </h2>
        <p className="mt-1 text-sm text-primary-100">
          Visualisez les absences planifiées de votre équipe et de l'entreprise.
        </p>
      </div>
      
      {showFilters && (
        <div className="px-6 py-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
            <h3 className="text-md font-medium text-gray-700 flex items-center mb-2 sm:mb-0">
              <Filter className="h-4 w-4 mr-2" /> Filtres
            </h3>
            <button
              onClick={() => {
                setFilters({
                  departmentId: departmentId || 0,
                  leaveTypeId: 0,
                  userId: 0,
                  status: 'approved',
                  showPending: false,
                  showRejected: false
                });
                setDate(new Date());
              }}
              className="text-sm text-gray-500 flex items-center hover:text-primary-600"
            >
              <RefreshCcw className="h-3 w-3 mr-1" /> Réinitialiser les filtres
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtre par département */}
            <div>
              <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700 mb-1">
                Département
              </label>
              <select
                id="departmentId"
                name="departmentId"
                value={filters.departmentId}
                onChange={handleFilterChange}
                className="input-field"
              >
                <option value={0}>Tous les départements</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            
            {/* Filtre par type de congé */}
            <div>
              <label htmlFor="leaveTypeId" className="block text-sm font-medium text-gray-700 mb-1">
                Type de congé
              </label>
              <select
                id="leaveTypeId"
                name="leaveTypeId"
                value={filters.leaveTypeId}
                onChange={handleFilterChange}
                className="input-field"
              >
                <option value={0}>Tous les types</option>
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
            
            {/* Filtre par statut */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showPending"
                  name="showPending"
                  checked={filters.showPending}
                  onChange={handleStatusChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="showPending" className="ml-2 text-sm text-gray-700">
                  Afficher les demandes en attente
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showRejected"
                  name="showRejected"
                  checked={filters.showRejected}
                  onChange={handleStatusChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="showRejected" className="ml-2 text-sm text-gray-700">
                  Afficher les refusées
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Légende des types de congés */}
      <div className="px-6 py-2 border-b">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-gray-500">Légende :</span>
          {leaveTypes.map((type) => (
            <div key={type.id} className="flex items-center">
              <span
                className="inline-block w-3 h-3 rounded-full mr-1"
                style={{ backgroundColor: type.color }}
              ></span>
              <span className="text-xs">{type.name}</span>
            </div>
          ))}
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full mr-1 border border-gray-300 bg-white"></span>
            <span className="text-xs">Congés approuvés</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full mr-1 border border-gray-300 bg-white opacity-70"></span>
            <span className="text-xs">En attente</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full mr-1 border border-gray-300 bg-white opacity-50 line-through"></span>
            <span className="text-xs">Refusés</span>
          </div>
        </div>
      </div>
      
      {/* Toolbar personnalisée */}
      {showToolbar && (
        <div className="px-6 py-3 border-b flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleNavigate(moment(date).subtract(1, view === 'month' ? 'months' : 'weeks').toDate())}
              className="p-1 rounded hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleNavigate(new Date())}
              className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => handleNavigate(moment(date).add(1, view === 'month' ? 'months' : 'weeks').toDate())}
              className="p-1 rounded hover:bg-gray-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-medium">
              {view === 'month'
                ? moment(date).format('MMMM YYYY')
                : view === 'week' || view === 'work_week'
                ? `Semaine du ${moment(date).startOf('week').format('D MMM')} au ${moment(date).endOf('week').format('D MMM YYYY')}`
                : moment(date).format('D MMMM YYYY')}
            </h3>
          </div>
          
          <div className="flex space-x-1">
            <button
              onClick={() => handleViewChange('month')}
              className={`px-3 py-1 text-sm rounded ${view === 'month' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}
            >
              Mois
            </button>
            <button
              onClick={() => handleViewChange('week')}
              className={`px-3 py-1 text-sm rounded ${view === 'week' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}
            >
              Semaine
            </button>
            <button
              onClick={() => handleViewChange('work_week')}
              className={`px-3 py-1 text-sm rounded ${view === 'work_week' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}
            >
              Semaine travaillée
            </button>
            <button
              onClick={() => handleViewChange('day')}
              className={`px-3 py-1 text-sm rounded ${view === 'day' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}
            >
              Jour
            </button>
            <button
              onClick={() => handleViewChange('agenda')}
              className={`px-3 py-1 text-sm rounded ${view === 'agenda' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}
            >
              Agenda
            </button>
          </div>
        </div>
      )}
      
      {isLoading ? (
        <div className="p-6 flex justify-center items-center" style={{ height: typeof height === 'number' ? `${height}px` : height }}>
          <LoadingSpinner text="Chargement du calendrier..." />
        </div>
      ) : (
        <div style={{ height: typeof height === 'number' ? `${height}px` : height }}>
          <Calendar
            localizer={localizer}
            events={events.filter(event => {
              // Vérifier les permissions de l'utilisateur
              const hasPermissionToView = canViewAllLeave || 
                (canViewDepartmentLeave && event.user.department_id && user?.company_id) ||
                (canViewTeamLeave && user?.id);
                
              if (!hasPermissionToView) return false;
              
              // Filtrer selon les statuts sélectionnés
              if (event.status === 'approved') return true;
              if (event.status === 'pending' && filters.showPending) return true;
              if (event.status === 'rejected' && filters.showRejected) return true;
              return false;
            })}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            views={['month', 'week', 'work_week', 'day', 'agenda']}
            view={view}
            date={date}
            onNavigate={handleNavigate}
            onView={handleViewChange}
            eventPropGetter={eventStyleGetter}
            formats={formats}
            components={{
              event: EventComponent,
              toolbar: () => null, // On utilise notre propre toolbar
            }}
            popup
            popupOffset={5}
            tooltipAccessor={(event: LeaveCalendarEvent) => `${event.user.name} - ${event.leaveType.name} (${event.status})`}
            messages={{
              today: "Aujourd'hui",
              previous: "Précédent",
              next: "Suivant",
              month: "Mois",
              week: "Semaine",
              day: "Jour",
              agenda: "Agenda",
              work_week: "Semaine travaillée",
              showMore: (total) => `+ ${total} autres`,
              noEventsInRange: "Aucun congé sur cette période"
            }}
          />
        </div>
      )}
    </div>
  );
}
