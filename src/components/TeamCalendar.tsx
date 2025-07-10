import React, { useState } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  MapPin,
  Filter,
  Briefcase, // For mission type
  Home, // For office type
  Download,
  Sunrise, Sunset, Sun, Moon // For half-day leave indicators
} from 'lucide-react';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  isSameMonth, isSameDay, parseISO
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { calendarService, adminService } from '../services/api'; // Assuming adminService for fetching employees
import { useAuth } from '../contexts/AuthContext'; // To determine user role for filtering
import toast from 'react-hot-toast';

interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO string
  end: string;   // ISO string
  type: 'pointage' | 'mission' | 'leave'; // 'leave' for future
  user_id: number | null;
  user_name?: string;
  pointage_type?: 'office' | 'mission';
  status?: string; // e.g., pointage status 'present', 'late'
  color?: string;
  allDay?: boolean;
  mission_status?: string;
  // Fields for leave periods
  start_day_period?: 'full_day' | 'half_day_morning' | 'half_day_afternoon';
  end_day_period?: 'full_day' | 'half_day_morning' | 'half_day_afternoon';
  requested_days?: number; // Could be useful for display
}

interface Employee {
  id: number;
  nom: string;
  prenom: string;
  email: string; // For display or key
}

export default function TeamCalendar() {
  const { user, isAdmin } = useAuth(); // Get current user and role
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Employee filtering
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [showUserFilter, setShowUserFilter] = useState(false); // For admins/managers

  useEffect(() => {
    if (isAdmin) { // Or manager role
      adminService.getEmployees()
        .then(resp => {
          const fetchedEmployees = resp.data.employees || resp.data; // Adjust based on actual API response
          setEmployees(fetchedEmployees || []);
          // By default, select all employees or current user if preferred
          // setSelectedEmployeeIds(fetchedEmployees.map(emp => emp.id));
          setShowUserFilter(true);
        })
        .catch(err => console.error("Failed to fetch employees for filter", err));
    }
  }, [isAdmin]);


  useEffect(() => {
    fetchEvents();
  }, [currentDate, selectedEmployeeIds, user]); // Refetch when month or filter changes

  const fetchEvents = async () => {
    if (!user) return;
    setLoadingEvents(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // API expects 1-indexed month

      let userIdsParam = 'self'; // Default for regular employees
      if (showUserFilter) { // If admin/manager and filters are active
        if (selectedEmployeeIds.length > 0) {
          userIdsParam = selectedEmployeeIds.join(',');
        } else {
          // If no employees selected in filter, maybe fetch none or all for the company (depends on desired UX)
          // For now, fetching none if filter is active and empty. Or fetch based on role.
          // If isAdmin and no selection, could imply all for company (backend handles this if user_ids is omitted by admin)
           userIdsParam = employees.map(e => e.id).join(','); // Fetch all if admin and no specific selection
        }
      }


      const response = await calendarService.getCalendarEvents(year, month, userIdsParam);
      setCalendarEvents(response.data || []);
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      toast.error('Erreur lors du chargement des événements du calendrier.');
      setCalendarEvents([]); // Clear events on error
    } finally {
      setLoadingEvents(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev =>
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const handleEmployeeFilterChange = (employeeId: number) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleDownloadICal = async () => {
    if (!calendarService.downloadICal) {
      toast.error('Export iCal non disponible');
      return;
    }
    try {
      const resp = await calendarService.downloadICal();
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'events.ics');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error("Erreur lors de l'export iCal");
    }
  };


  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInCalendar = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad days to fill the grid from Monday to Sunday
  const firstDayOfMonth = getDay(monthStart); // 0 for Sunday, 1 for Monday ...
  const startingDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth -1; // Adjust to make Monday the first day (0)

  const paddedDays = Array(startingDayIndex).fill(null).concat(daysInCalendar);


  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const getEventsForDay = (day: Date | null): CalendarEvent[] => {
    if (!day) return [];
    return calendarEvents.filter(event => {
      const eventStartDate = parseISO(event.start);
      // For all-day events or multi-day events, check if 'day' is within event.start and event.end
      if (event.allDay || (event.end && parseISO(event.end).getTime() !== eventStartDate.getTime())) {
         const eventEndDate = event.end ? parseISO(event.end) : eventStartDate;
         return day >= startOfDay(eventStartDate) && day <= endOfDay(eventEndDate);
      }
      return isSameDay(eventStartDate, day);
    });
  };

  // Helper for allDay events display (simplified)
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendrier d'Équipe</h1>
          <p className="text-gray-600">Vue d'ensemble des activités de l'équipe.</p>
        </div>
        <button onClick={handleDownloadICal} className="btn-secondary flex items-center">
          <Download className="h-4 w-4 mr-2" /> Export iCal
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filtres */}
        {showUserFilter && (
          <div className="lg:col-span-1">
            <div className="card">
              <div className="flex items-center mb-4">
                <Filter className="h-5 w-5 text-gray-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Filtres</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employés ({selectedEmployeeIds.length}/{employees.length})
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {employees.map(emp => (
                      <label key={emp.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedEmployeeIds.includes(emp.id)}
                          onChange={() => handleEmployeeFilterChange(emp.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{emp.prenom} {emp.nom}</span>
                      </label>
                    ))}
                  </div>
                   <button
                      onClick={() => setSelectedEmployeeIds(selectedEmployeeIds.length === employees.length ? [] : employees.map(e=>e.id))}
                      className="text-xs text-blue-600 hover:underline mt-2">
                      {selectedEmployeeIds.length === employees.length ? "Désélectionner tout" : "Sélectionner tout"}
                    </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendrier */}
        <div className={showUserFilter ? "lg:col-span-3" : "lg:col-span-4"}>
          <div className="card">
            {/* Navigation */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2 md:space-x-4">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 text-center flex-grow">
                  {format(currentDate, 'MMMM yyyy', { locale: fr })}
                </h2>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Grille du calendrier */}
            <div className="grid grid-cols-7 gap-px border-l border-t border-gray-200 bg-gray-200">
              {/* En-têtes des jours */}
              {weekDays.map(day => (
                <div key={day} className="p-2 text-center text-xs font-medium text-gray-500 bg-gray-50 border-r border-b">
                  {day}
                </div>
              ))}

              {/* Jours du mois */}
              {paddedDays.map((dayDate, index) => {
                const dayEvents = getEventsForDay(dayDate);
                return (
                  <div
                    key={dayDate ? dayDate.toISOString() : `empty-${index}`}
                    className={`min-h-28 p-1.5 border-r border-b border-gray-200 ${
                      dayDate ? 'bg-white cursor-pointer hover:bg-gray-50' : 'bg-gray-50'
                    } ${dayDate && isSameDay(dayDate, new Date()) ? 'bg-blue-50' : ''}`}
                    onClick={() => dayDate && setSelectedDate(dayDate)}
                  >
                    {dayDate && (
                      <>
                        <div className={`text-xs font-medium mb-1 ${
                          isSameMonth(dayDate, currentDate) ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                          {format(dayDate, 'd')}
                        </div>
                        <div className="space-y-1 overflow-hidden">
                          {dayEvents.slice(0, 3).map(event => ( // Show max 3 events initially
                            <div
                              key={event.id}
                              className={`text-xs px-1.5 py-0.5 rounded text-white truncate`}
                              style={{ backgroundColor: event.color || '#777' }}
                              title={event.title}
                            >

                              {/* Icon based on type */}
                              {event.type === 'pointage' && event.pointage_type === 'office' && <Home size={12} className="inline mr-0.5 flex-shrink-0" />}
                              {event.type === 'pointage' && event.pointage_type === 'mission' && <Briefcase size={12} className="inline mr-0.5 flex-shrink-0" />}
                              {event.type === 'mission' && <Briefcase size={12} className="inline mr-0.5 flex-shrink-0" />}
                              {event.type === 'leave' && event.requested_days === 0.5 && event.start_day_period === 'half_day_morning' && <Sunrise size={12} className="inline mr-0.5 flex-shrink-0" />}
                              {event.type === 'leave' && event.requested_days === 0.5 && event.start_day_period === 'half_day_afternoon' && <Sunset size={12} className="inline mr-0.5 flex-shrink-0" />}
                              {event.type === 'leave' && event.requested_days !== 0.5 && <Calendar size={12} className="inline mr-0.5 flex-shrink-0" />}

                              <span className="truncate">{event.title}</span>
                              {/* Text indicator for half-day leave, now more as a supplement to icon or if icons are too similar */}
                              {/* {event.type === 'leave' && event.requested_days === 0.5 && (
                                <span className="ml-1 text-gray-500 text-[9px]">
                                  {event.start_day_period === 'half_day_morning' && 'Matin'}
                                  {event.start_day_period === 'half_day_afternoon' && 'A-M'}
                                </span>
                              )} */}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-blue-600 mt-1">+ {dayEvents.length - 3} de plus</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
             {loadingEvents && <p className="text-center py-4 text-sm text-gray-500">Chargement des événements...</p>}
          </div>
        </div>
      </div>

      {/* Détails du jour sélectionné */}
      {selectedDate && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Événements du {format(selectedDate, 'dd MMMM yyyy', { locale: fr })}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {getEventsForDay(selectedDate).length > 0 ? (
              getEventsForDay(selectedDate).map(event => (
                <div key={event.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border" style={{borderColor: event.color || '#ccc'}}>
                  <div className="mt-1 flex-shrink-0">
                    {event.type === 'pointage' && event.pointage_type === 'office' && <Home className="h-5 w-5" style={{color: event.color}} />}
                    {event.type === 'pointage' && event.pointage_type === 'mission' && <Briefcase className="h-5 w-5" style={{color: event.color}} />}
                    {event.type === 'mission' && <Briefcase className="h-5 w-5" style={{color: event.color}} />}
                    {event.type === 'leave' && <Calendar className="h-5 w-5" style={{color: event.color || '#DC2626' /* Default red for leave */}} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{event.title}</p>

                    {event.type === 'leave' ? (
                      <>
                        <p className="text-xs text-gray-600">
                          Période: {
                            event.start_day_period === 'half_day_morning' ? 'Matinée uniquement' :
                            event.start_day_period === 'half_day_afternoon' ? 'Après-midi uniquement' : 'Journée entière'
                          }
                        </p>
                        <p className="text-xs text-gray-600">
                          Durée: {event.requested_days ? `${event.requested_days} jour(s)` : 'N/A'}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-600">
                        {format(parseISO(event.start), 'HH:mm')} - {event.end && !event.allDay ? format(parseISO(event.end), 'HH:mm') : (event.allDay ? 'Toute la journée' : 'N/A')}
                      </p>
                    )}

                    {event.type === 'pointage' && (
                       <span className={`text-xs px-2 py-0.5 rounded-full ${
                        event.status === 'present' ? 'bg-green-100 text-green-800' :
                        event.status === 'retard' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                       }`}>
                        {event.status}
                      </span>
                    )}
                     {event.type === 'mission' && (
                       <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                        {event.mission_status || event.status}
                      </span>
                    )}
                     {event.type === 'leave' && (
                       <span className={`text-xs px-2 py-0.5 rounded-full ${
                        event.status === 'approved' ? 'bg-green-100 text-green-800' :
                        event.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        event.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                       }`}>
                        Statut: {event.status}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">Aucun événement pour cette date.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}