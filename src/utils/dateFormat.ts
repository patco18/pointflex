import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Format de date adapté au contexte ivoirien
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  // Format jour/mois/année (sans zéro devant le jour)
  return format(dateObj, 'd/MM/yyyy', { locale: fr });
};

// Format de date avec nom du mois en toutes lettres
export const formatLongDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  // Format jour mois année en toutes lettres (sans zéro devant le jour)
  return format(dateObj, 'd MMMM yyyy', { locale: fr });
};

// Format date et heure
export const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  // Format jour/mois/année heure:minute
  return format(dateObj, 'd/MM/yyyy HH:mm', { locale: fr });
};

// Format heure seulement
export const formatTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'HH:mm', { locale: fr });
};
