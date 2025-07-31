import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { leaveService } from '../../services/api';
import toast from 'react-hot-toast';
import { CalendarDays, Send, Info, Clock, Calendar, AlertCircle, Users } from 'lucide-react';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LeaveType, 
  LeaveBalance, 
  LeaveRequestFormData as LeaveRequestFormDataType,
  DayPeriod,
  TeamMember as TeamMemberType 
} from '../../types/leaveTypes';

const defaultValues: LeaveRequestFormDataType = {
  leave_type_id: '',
  start_date: '',
  end_date: '',
  start_day_period: 'full_day',
  end_day_period: 'full_day',
  reason: '',
  notify_team: true,
};

// Interface locale pour la compatibilité avec le code existant
interface TeamMember {
  id: string;
  name: string;
  role: string;
  department?: string;
}

interface EnhancedLeaveRequestFormProps {
  onSuccess?: () => void;
}

export default function EnhancedLeaveRequestForm({ onSuccess }: EnhancedLeaveRequestFormProps) {
  const { user } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isLoadingBalances, setIsLoadingBalances] = useState(true);
  const [isLoadingTeamMembers, setIsLoadingTeamMembers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculatedDuration, setCalculatedDuration] = useState<number | null>(null);
  const [isCalculatingDuration, setIsCalculatingDuration] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [teamLeaveConflicts, setTeamLeaveConflicts] = useState<any[]>([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);

  const { control, handleSubmit, watch, formState: { errors }, reset, setValue, getValues } = 
    useForm<LeaveRequestFormDataType>({ defaultValues });

  const selectedLeaveTypeId = watch('leave_type_id');
  const startDate = watch('start_date');
  const endDate = watch('end_date');
  const startDayPeriod = watch('start_day_period');
  const endDayPeriod = watch('end_day_period');
  const notifyTeam = watch('notify_team');

  // Fonction pour débouncer les appels d'API
  const debounce = <F extends (...args: any[]) => Promise<any>>(func: F, waitFor: number) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return async (...args: Parameters<F>): Promise<ReturnType<F>> => {
      return new Promise((resolve, reject) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          func(...args)
            .then(resolve)
            .catch(reject);
        }, waitFor);
      });
    };
  };

  // Appels API débounce
  const debouncedCalculateDuration = debounce(leaveService.calculateLeaveDuration, 500);
  
  // Charger les types de congés
  useEffect(() => {
    const fetchLeaveTypes = async () => {
      setIsLoadingTypes(true);
      try {
        const response = await leaveService.getLeaveTypes();
        setLeaveTypes(response.data || []);
      } catch (error) {
        console.error("Erreur lors du chargement des types de congés:", error);
        toast.error("Impossible de charger les types de congés.");
      } finally {
        setIsLoadingTypes(false);
      }
    };
    
    fetchLeaveTypes();
  }, []);

  // Charger les soldes de congés
  useEffect(() => {
    const fetchLeaveBalances = async () => {
      setIsLoadingBalances(true);
      try {
        const response = await leaveService.getLeaveBalances();
        setLeaveBalances(response.data || []);
      } catch (error) {
        console.error("Erreur lors du chargement des soldes de congés:", error);
        toast.error("Impossible de charger vos soldes de congés.");
      } finally {
        setIsLoadingBalances(false);
      }
    };
    
    fetchLeaveBalances();
  }, []);

  // Charger les membres de l'équipe pour les remplaçants
  useEffect(() => {
    const fetchTeamMembers = async () => {
      setIsLoadingTeamMembers(true);
      try {
        // Récupération des membres de l'équipe via l'API
        const response = await leaveService.getTeamMembers();
        setTeamMembers(response?.data || []);
      } catch (error) {
        console.error("Erreur lors du chargement des membres de l'équipe:", error);
      } finally {
        setIsLoadingTeamMembers(false);
      }
    };
    
    // Appeler l'API pour récupérer les membres de l'équipe
    fetchTeamMembers();
    
    // En cas d'échec, utiliser des données de test (fallback)
    setTimeout(() => {
      setTeamMembers([
        { id: '1', name: 'Jean Dupont', role: 'Développeur', department: 'IT' },
        { id: '2', name: 'Marie Martin', role: 'Designer', department: 'Marketing' },
        { id: '3', name: 'Pierre Durand', role: 'Chef de projet', department: 'IT' }
      ]);
      setIsLoadingTeamMembers(false);
    }, 500);
  }, []);

  // Calculer la durée du congé
  useEffect(() => {
    const calculateDuration = async () => {
      if (startDate && endDate && new Date(endDate) >= new Date(startDate)) {
        setIsCalculatingDuration(true);
        try {
          const response = await debouncedCalculateDuration({
            start_date: startDate,
            end_date: endDate,
            start_day_period: startDayPeriod,
            end_day_period: endDayPeriod,
          });
          setCalculatedDuration(response.data.calculated_days);
          
          // Vérifier les conflits d'équipe
          if (startDate && endDate && notifyTeam) {
            checkTeamConflicts();
          }
        } catch (error) {
          console.error("Erreur lors du calcul de la durée:", error);
          setCalculatedDuration(null);
        } finally {
          setIsCalculatingDuration(false);
        }
      } else {
        setCalculatedDuration(null);
      }
    };
    
    calculateDuration();
  }, [startDate, endDate, startDayPeriod, endDayPeriod]);

  // Vérifier les conflits avec les congés de l'équipe
  const checkTeamConflicts = async () => {
    setIsCheckingConflicts(true);
    try {
      // Simuler un appel API pour vérifier les conflits d'équipe
      // Remplacer par l'API réelle
      // const response = await leaveService.checkTeamConflicts({
      //   start_date: startDate,
      //   end_date: endDate
      // });
      // setTeamLeaveConflicts(response.data || []);
      
      // MOCK DATA en attendant l'API
      setTimeout(() => {
        if (Math.random() > 0.5) {
          setTeamLeaveConflicts([
            { 
              user_name: 'Marie Martin', 
              start_date: new Date(startDate), 
              end_date: new Date(new Date(startDate).setDate(new Date(startDate).getDate() + 3)),
              leave_type: 'Congé annuel'
            }
          ]);
        } else {
          setTeamLeaveConflicts([]);
        }
        setIsCheckingConflicts(false);
      }, 800);
    } catch (error) {
      console.error("Erreur lors de la vérification des conflits d'équipe:", error);
      setTeamLeaveConflicts([]);
      setIsCheckingConflicts(false);
    }
  };

  // Validation de la date de fin
  const validateEndDate = (value: string) => {
    if (startDate && new Date(value) < new Date(startDate)) {
      return "La date de fin doit être après la date de début.";
    }
    return true;
  };

  // Gérer l'upload de fichiers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  };

  // Supprimer un fichier uploadé
  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Soumettre le formulaire
  const onSubmit = async (data: LeaveRequestFormDataType) => {
    setIsSubmitting(true);
    
    try {
      // Créer un FormData pour l'envoi des fichiers
      const formData = new FormData();
      formData.append('leave_type_id', String(data.leave_type_id));
      formData.append('start_date', data.start_date);
      formData.append('end_date', data.end_date);
      formData.append('start_day_period', data.start_day_period);
      formData.append('end_day_period', data.end_day_period);
      formData.append('reason', data.reason);
      formData.append('notify_team', data.notify_team.toString());
      
      if (data.substitute_user_id) {
        formData.append('substitute_user_id', String(data.substitute_user_id));
      }
      
      if (data.custom_email_message) {
        formData.append('custom_email_message', data.custom_email_message);
      }
      
      // Ajouter les fichiers
      uploadedFiles.forEach((file, index) => {
        formData.append(`supporting_documents[${index}]`, file);
      });
      
      // Envoyer la demande
      const response = await leaveService.submitLeaveRequest(formData);
      
      toast.success("Votre demande de congé a été soumise avec succès!");
      reset(defaultValues);
      setUploadedFiles([]);
      setTeamLeaveConflicts([]);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Erreur lors de la soumission de la demande:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Une erreur est survenue lors de la soumission de votre demande.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Récupérer le solde pour un type de congé
  const getBalanceForLeaveType = (leaveTypeId: string) => {
    if (!leaveTypeId) return null;
    return leaveBalances.find(b => b.leave_type_id === parseInt(leaveTypeId));
  };

  // Trouver le type de congé sélectionné
  const selectedLeaveType = leaveTypes.find(lt => lt.id === (typeof selectedLeaveTypeId === 'string' ? parseInt(selectedLeaveTypeId || '0') : selectedLeaveTypeId));

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="bg-primary-600 text-white px-6 py-4">
        <h2 className="text-xl font-medium flex items-center">
          <CalendarDays className="h-6 w-6 mr-2" />
          Nouvelle Demande de Congé
        </h2>
        <p className="mt-1 text-sm text-primary-100">
          Remplissez le formulaire ci-dessous pour soumettre une demande de congé à votre responsable.
        </p>
      </div>
      
      {(isLoadingTypes || isLoadingBalances) ? (
        <div className="p-6 flex justify-center">
          <LoadingSpinner text="Chargement des données..." />
        </div>
      ) : (
        <div className="p-6">
          {/* Section des soldes de congés */}
          <div className="mb-6 bg-gray-50 rounded-lg p-4">
            <h3 className="text-md font-medium text-gray-700 mb-2">Mes soldes de congés</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {leaveBalances.map(balance => (
                <div key={balance.leave_type_id} className="bg-white rounded-md p-3 border border-gray-200 flex justify-between">
                  <span className="text-sm font-medium">{balance.leave_type_name}</span>
                  <span className="font-semibold">{balance.balance_days} jours</span>
                </div>
              ))}
            </div>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              {/* Type de congé */}
              <div>
                <label htmlFor="leave_type_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Type de Congé *
                </label>
                <Controller
                  name="leave_type_id"
                  control={control}
                  rules={{ required: "Veuillez sélectionner un type de congé." }}
                  render={({ field }) => (
                    <select {...field} id="leave_type_id" className="input-field">
                      <option value="">Sélectionner un type de congé</option>
                      {leaveTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name} {type.is_paid ? '(Payé)' : '(Non payé)'}</option>
                      ))}
                    </select>
                  )}
                />
                {errors.leave_type_id && <p className="form-error-text">{errors.leave_type_id.message}</p>}
                
                {selectedLeaveType?.description && (
                  <p className="mt-1 text-sm text-gray-500">{selectedLeaveType.description}</p>
                )}
                
                {selectedLeaveTypeId && (
                  <div className="mt-2 flex items-center">
                    <span className="text-sm mr-2">Solde disponible:</span>
                    <span className="font-medium">
                      {getBalanceForLeaveType(String(selectedLeaveTypeId))?.balance_days || 0} jours
                    </span>
                  </div>
                )}
              </div>
              
              {/* Dates de début et fin */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date de début *
                  </label>
                  <Controller
                    name="start_date"
                    control={control}
                    rules={{ required: "Date de début requise." }}
                    render={({ field }) => <input type="date" {...field} id="start_date" className="input-field" />}
                  />
                  {errors.start_date && <p className="form-error-text">{errors.start_date.message}</p>}
                </div>
                <div>
                  <label htmlFor="start_day_period" className="block text-sm font-medium text-gray-700 mb-1">
                    Période de début
                  </label>
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
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date de fin *
                  </label>
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
                  <label htmlFor="end_day_period" className="block text-sm font-medium text-gray-700 mb-1">
                    Période de fin
                  </label>
                  <Controller
                    name="end_day_period"
                    control={control}
                    render={({ field }) => (
                      <select {...field} id="end_day_period" className="input-field">
                        <option value="full_day">Journée entière</option>
                        <option value="half_day_morning">Matin (0.5 jour)</option>
                        <option value="half_day_afternoon">Après-midi (0.5 jour)</option>
                      </select>
                    )}
                  />
                </div>
              </div>
              
              {/* Message d'aide pour les périodes */}
              {startDate && endDate && startDate === endDate && 
              startDayPeriod !== "full_day" && endDayPeriod !== "full_day" && 
              startDayPeriod !== endDayPeriod && (
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-700 flex items-center">
                  <Info size={14} className="mr-1.5 flex-shrink-0" />
                  Pour un seul jour, sélectionnez la même période pour le début et la fin (ex: Matin & Matin) pour un demi-jour, 
                  ou "Journée entière" pour les deux.
                </div>
              )}
              
              {/* Durée calculée */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-blue-500 mr-2" />
                  <p className="text-sm font-medium text-blue-700">
                    Durée calculée de la demande:
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
                </div>
                <p className="text-xs text-blue-600 mt-1 ml-7">
                  Estimation basée sur les jours ouvrés et fériés de votre entreprise.
                </p>
              </div>
              
              {/* Afficher les conflits d'équipe */}
              {isCheckingConflicts ? (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-600 mr-2"></div>
                  <p className="text-sm text-gray-600">Vérification des congés en cours dans votre équipe...</p>
                </div>
              ) : teamLeaveConflicts.length > 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm font-medium text-amber-700 mb-1 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Autres membres de l'équipe en congé sur cette période:
                  </p>
                  <ul className="ml-6 list-disc text-xs text-amber-600">
                    {teamLeaveConflicts.map((conflict, idx) => (
                      <li key={idx}>
                        {conflict.user_name} - {new Date(conflict.start_date).toLocaleDateString()} au {new Date(conflict.end_date).toLocaleDateString()} ({conflict.leave_type})
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                startDate && endDate && notifyTeam && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center">
                    <div className="text-green-500 mr-2">✓</div>
                    <p className="text-sm text-green-600">Aucun autre membre de votre équipe n'est en congé sur cette période.</p>
                  </div>
                )
              )}
              
              {/* Motif */}
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                  Motif (optionnel)
                </label>
                <Controller
                  name="reason"
                  control={control}
                  render={({ field }) => (
                    <textarea 
                      {...field} 
                      id="reason" 
                      rows={3} 
                      className="input-field" 
                      placeholder="Ex: Congé familial, Fête traditionnelle, Rendez-vous médical..."
                    ></textarea>
                  )}
                />
              </div>
              
              {/* Options avancées (toggle) */}
              <div className="pt-2 border-t border-gray-200">
                <button 
                  type="button" 
                  className="text-primary-600 text-sm flex items-center focus:outline-none"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                >
                  {showAdvancedOptions ? (
                    <>Options avancées ▼</>
                  ) : (
                    <>Options avancées ▶</>
                  )}
                </button>
              </div>
              
              {/* Section des options avancées */}
              {showAdvancedOptions && (
                <div className="space-y-4 pt-2 pb-4 border-t border-gray-100">
                  {/* Remplaçant */}
                  <div>
                    <label htmlFor="substitute_user_id" className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      Remplaçant pendant mon absence
                    </label>
                    <Controller
                      name="substitute_user_id"
                      control={control}
                      render={({ field }) => (
                        <select {...field} id="substitute_user_id" className="input-field">
                          <option value="">Sélectionner un remplaçant (optionnel)</option>
                          {teamMembers.map(member => (
                            <option key={member.id} value={member.id}>
                              {member.name} - {member.role}{member.department ? `, ${member.department}` : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Cette personne sera notifiée et pourra répondre aux questions pendant votre absence.
                    </p>
                  </div>
                  
                  {/* Documents justificatifs */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Documents justificatifs (optionnel)
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4h-12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                            <span>Télécharger des fichiers</span>
                            <input 
                              id="file-upload" 
                              name="file-upload" 
                              type="file" 
                              multiple
                              className="sr-only" 
                              onChange={handleFileUpload}
                            />
                          </label>
                          <p className="pl-1">ou glisser-déposer</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, PDF jusqu'à 10 MB
                        </p>
                      </div>
                    </div>
                    
                    {/* Liste des fichiers uploadés */}
                    {uploadedFiles.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-xs font-medium text-gray-700 mb-2">Fichiers téléchargés:</h4>
                        <ul className="space-y-1">
                          {uploadedFiles.map((file, index) => (
                            <li key={index} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                              <span className="truncate max-w-xs">{file.name}</span>
                              <button 
                                type="button" 
                                onClick={() => removeFile(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                ✕
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  {/* Notification d'équipe */}
                  <div className="flex items-center">
                    <Controller
                      name="notify_team"
                      control={control}
                      render={({ field }) => (
                        <input 
                          type="checkbox" 
                          id="notify_team" 
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                      )}
                    />
                    <label htmlFor="notify_team" className="ml-2 text-sm text-gray-700">
                      Notifier mon équipe de mon absence
                    </label>
                  </div>
                  
                  {/* Message personnalisé */}
                  {notifyTeam && (
                    <div>
                      <label htmlFor="custom_email_message" className="block text-sm font-medium text-gray-700 mb-1">
                        Message personnalisé pour la notification (optionnel)
                      </label>
                      <Controller
                        name="custom_email_message"
                        control={control}
                        render={({ field }) => (
                          <textarea 
                            {...field} 
                            id="custom_email_message" 
                            rows={2} 
                            className="input-field" 
                            placeholder="Ex: Je serai joignable par téléphone en cas d'urgence au 01 23 45 67 89"
                          ></textarea>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}
              
              <div className="pt-4 text-right">
                <button 
                  type="submit" 
                  className="btn-primary flex items-center" 
                  disabled={isSubmitting || isCalculatingDuration}
                >
                  {isSubmitting ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4 mr-2" />}
                  Soumettre la Demande
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
