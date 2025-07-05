import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { leaveService } from '../services/api';
import toast from 'react-hot-toast';
import { CalendarDays, Send, Info } from 'lucide-react';
import LoadingSpinner from './shared/LoadingSpinner';

interface LeaveType {
  id: number;
  name: string;
  is_paid: boolean;
}

interface LeaveBalance {
  leave_type_id: number;
  leave_type_name: string;
  balance_days: number;
}

interface LeaveRequestFormData {
  leave_type_id: string; // Will be string from select, convert to number
  start_date: string;
  end_date: string;
  start_day_period: 'full_day' | 'half_day_morning' | 'half_day_afternoon';
  end_day_period: 'full_day' | 'half_day_morning' | 'half_day_afternoon';
  reason: string;
}

const defaultValues: LeaveRequestFormData = {
  leave_type_id: '',
  start_date: '',
  end_date: '',
  start_day_period: 'full_day',
  end_day_period: 'full_day',
  reason: '',
};

interface LeaveRequestFormProps {
  onSuccess?: () => void; // Callback on successful submission
}

export default function LeaveRequestForm({ onSuccess }: LeaveRequestFormProps) {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isLoadingBalances, setIsLoadingBalances] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculatedDuration, setCalculatedDuration] = useState<number | null>(null);
  const [isCalculatingDuration, setIsCalculatingDuration] = useState(false);

  const { control, handleSubmit, watch, formState: { errors }, reset } = useForm<LeaveRequestFormData>({ defaultValues });

  const selectedLeaveTypeId = watch('leave_type_id');
  const startDate = watch('start_date');
  const endDate = watch('end_date');
  const startDayPeriod = watch('start_day_period');
  const endDayPeriod = watch('end_day_period');

  // Debounce function
  const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
      new Promise(resolve => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => resolve(func(...args)), waitFor);
      });
  };

  const debouncedCalculateDuration = debounce(leaveService.calculateLeaveDuration, 500);

  useEffect(() => {
    if (startDate && endDate && new Date(endDate) >= new Date(startDate)) {
      setIsCalculatingDuration(true);
      debouncedCalculateDuration({
        start_date: startDate,
        end_date: endDate,
        start_day_period: startDayPeriod,
        end_day_period: endDayPeriod,
      })
      .then(response => {
        setCalculatedDuration(response.data.calculated_days);
      })
      .catch(error => {
        console.error("Error calculating duration:", error);
        setCalculatedDuration(null); // Clear on error
        // Optionally show a small error to user if calculation fails
      })
      .finally(() => {
        setIsCalculatingDuration(false);
      });
    } else {
      setCalculatedDuration(null); // Clear if dates are invalid
    }
  }, [startDate, endDate, startDayPeriod, endDayPeriod, debouncedCalculateDuration]); // Added debouncedCalculateDuration to dep array

  // Effect to manage interdependent period fields
  const { setValue } = useForm<LeaveRequestFormData>({ defaultValues }); // Get setValue from useForm

  useEffect(() => {
    const isSingleDay = startDate && endDate && startDate === endDate;

    if (isSingleDay) {
      if (startDayPeriod === 'half_day_morning') {
        setValue('end_day_period', 'half_day_morning', { shouldValidate: true, shouldDirty: true });
      } else if (startDayPeriod === 'half_day_afternoon') {
        setValue('end_day_period', 'half_day_afternoon', { shouldValidate: true, shouldDirty: true });
      } else { // full_day
        setValue('end_day_period', 'full_day', { shouldValidate: true, shouldDirty: true });
      }
    }
    // No specific restrictions for end_day_period if multi-day, as backend calculation handles it.
    // UI could further restrict options in dropdown if desired (e.g. end_day_period cannot be 'half_day_afternoon' if not single day)
  }, [startDate, endDate, startDayPeriod, setValue]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingTypes(true);
        const typesResponse = await leaveService.getLeaveTypes();
        setLeaveTypes(typesResponse.data || []);
      } catch (error) {
        toast.error("Erreur de chargement des types de congé.");
      } finally {
        setIsLoadingTypes(false);
      }

      try {
        setIsLoadingBalances(true);
        const balancesResponse = await leaveService.getLeaveBalances();
        setLeaveBalances(balancesResponse.data || []);
      } catch (error) {
        toast.error("Erreur de chargement des soldes de congé.");
      } finally {
        setIsLoadingBalances(false);
      }
    };
    fetchData();
  }, []);

  const currentBalanceForSelectedType = (): number | null => {
    if (!selectedLeaveTypeId) return null;
    const balance = leaveBalances.find(b => b.leave_type_id === parseInt(selectedLeaveTypeId, 10));
    return balance ? balance.balance_days : null;
  };

  const selectedLeaveTypeIsPaid = (): boolean => {
    if (!selectedLeaveTypeId) return false;
    const type = leaveTypes.find(t => t.id === parseInt(selectedLeaveTypeId, 10));
    return type ? type.is_paid : false;
  }

  const onSubmit = async (data: LeaveRequestFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        leave_type_id: parseInt(data.leave_type_id, 10),
      };
      await leaveService.submitLeaveRequest(payload);
      toast.success("Demande de congé soumise avec succès !");
      reset(defaultValues); // Reset form
      if (onSuccess) onSuccess();
      // Refresh balances after submission (optional, or handled by parent)
      try {
        const balancesResponse = await leaveService.getLeaveBalances();
        setLeaveBalances(balancesResponse.data || []);
      } catch (e) { /* ignore */ }

    } catch (error: any) {
      // Toast error usually handled by API interceptor
      console.error("Leave request submission error", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Basic validation for date range
  const validateEndDate = (value: string) => {
    if (startDate && value && new Date(value) < new Date(startDate)) {
      return "La date de fin ne peut pas être antérieure à la date de début.";
    }
    return true;
  };

  return (
    <div className="card max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
        <CalendarDays className="h-6 w-6 mr-2 text-primary-600" />
        Nouvelle Demande de Congé
      </h2>
      {(isLoadingTypes || isLoadingBalances) && <LoadingSpinner text="Chargement des données..." />}

      {!isLoadingTypes && !isLoadingBalances && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          <div>
            <label htmlFor="leave_type_id" className="block text-sm font-medium text-gray-700 mb-1">Type de congé *</label>
            <Controller
              name="leave_type_id"
              control={control}
              rules={{ required: "Veuillez sélectionner un type de congé." }}
              render={({ field }) => (
                <select {...field} id="leave_type_id" className="input-field">
                  <option value="">-- Sélectionner --</option>
                  {leaveTypes.map(lt => (
                    <option key={lt.id} value={lt.id}>{lt.name}</option>
                  ))}
                </select>
              )}
            />
            {errors.leave_type_id && <p className="form-error-text">{errors.leave_type_id.message}</p>}
            {selectedLeaveTypeId && selectedLeaveTypeIsPaid() && (
              <p className="text-xs text-gray-600 mt-1">
                Solde actuel pour ce type : <span className="font-medium">{currentBalanceForSelectedType() ?? 'N/A'}</span> jours.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">Date de début *</label>
              <Controller
                name="start_date"
                control={control}
                rules={{ required: "Date de début requise." }}
                render={({ field }) => <input type="date" {...field} id="start_date" className="input-field" />}
              />
              {errors.start_date && <p className="form-error-text">{errors.start_date.message}</p>}
            </div>
            <div>
              <label htmlFor="start_day_period" className="block text-sm font-medium text-gray-700 mb-1">Début de journée</label>
              <Controller
                name="start_day_period"
                control={control}
                render={({ field }) => (
                  <select {...field} id="start_day_period" className="input-field">
                    <option value="full_day">Journée entière</option>
                    <option value="half_day_morning">Matin (0.5 jour)</option>
                    <option value="half_day_afternoon">Après-midi (0.5 jour)</option>
                  </select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">Date de fin *</label>
              <Controller
                name="end_date"
                control={control}
                rules={{
                  required: "Date de fin requise.",
                  validate: validateEndDate
                }}
                render={({ field }) => <input type="date" {...field} id="end_date" className="input-field" />}
              />
              {errors.end_date && <p className="form-error-text">{errors.end_date.message}</p>}
            </div>
            <div>
              <label htmlFor="end_day_period" className="block text-sm font-medium text-gray-700 mb-1">Fin de journée</label>
              <Controller
                name="end_day_period"
                control={control}
                render={({ field }) => (
                  <select {...field} id="end_day_period" className="input-field">
                    <option value="full_day">Journée entière</option>
                    <option value="half_day_morning">Matin (0.5 jour)</option> {/* Useful if ending mid-day */}
                    <option value="half_day_afternoon">Après-midi (0.5 jour)</option>
                  </select>
                )}
              />
            </div>
          </div>

          {startDate && endDate && startDate === endDate && watch("start_day_period") !== "full_day" && watch("end_day_period") !== "full_day" && watch("start_day_period") !== watch("end_day_period") && (
             <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-700 flex items-center">
                <Info size={14} className="mr-1.5 flex-shrink-0" />
                Pour un seul jour, sélectionner la même période pour le début et la fin (ex: Matin & Matin) pour un demi-jour, ou "Journée entière" pour les deux.
             </div>
          )}


          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">Motif (optionnel)</label>
            <Controller
              name="reason"
              control={control}
              render={({ field }) => <textarea {...field} id="reason" rows={3} className="input-field" placeholder="Ex: Vacances annuelles, Rendez-vous personnel..."></textarea>}
            />
          </div>


          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm font-medium text-blue-700">
              Durée calculée de la demande :
              <span className="ml-1 font-semibold">
                {isCalculatingDuration ? (
                    <span className="italic text-xs">Calcul...</span>
                ) : calculatedDuration !== null ? (
                    `${calculatedDuration} jour(s)`
                ) : (
                    'N/A'
                )}
              </span>
            </p>
            <p className="text-xs text-blue-600 mt-1">Ceci est une estimation basée sur les jours ouvrés et fériés de votre entreprise. Le décompte final sera confirmé lors de l'approbation.</p>
          </div>

          <div className="pt-2 text-right">
            <button type="submit" className="btn-primary flex items-center" disabled={isSubmitting || isCalculatingDuration}>
              {isSubmitting ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4 mr-2" />}
              Soumettre la Demande
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
