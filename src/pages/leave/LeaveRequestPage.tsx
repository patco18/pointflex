import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Clock, AlertCircle } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { LeaveRequest, LeaveType, LeaveRequestStatus, DayPeriod } from '../../types/leaveTypes';

/**
 * Composant pour la demande de congés
 * Accessible pour tous les rôles ayant la permission 'leave.request'
 */
export default function LeaveRequestPage() {
  const navigate = useNavigate();
  const { checkPermission } = usePermissions();
  
  // Vérifier si l'utilisateur a la permission de demander des congés
  const canRequestLeave = checkPermission('leave.request');
  
  // Types de congés disponibles (à récupérer depuis une API)
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([
    { id: 1, name: 'Congés payés', description: 'Congés annuels rémunérés', color: '#4CAF50', icon: 'beach', is_paid: true, is_active: true },
    { id: 2, name: 'RTT', description: 'Réduction du temps de travail', color: '#2196F3', icon: 'clock', is_paid: true, is_active: true },
    { id: 3, name: 'Congé maladie', description: 'Absence pour raison médicale', color: '#F44336', icon: 'medical', is_paid: true, is_active: true },
    { id: 4, name: 'Congé sans solde', description: 'Absence non rémunérée', color: '#FF9800', icon: 'money-off', is_paid: false, is_active: true }
  ]);
  
  // État du formulaire
  const [formData, setFormData] = useState({
    leave_type_id: '',
    startDate: '',
    endDate: '',
    startHalfDay: 'morning',
    endHalfDay: 'afternoon',
    reason: '',
    attachments: [] as File[],
    notify_team: true
  });
  
  // Gestion du changement dans les champs du formulaire
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Gestion du téléchargement de fichiers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...Array.from(e.target.files || [])]
      }));
    }
  };
  
  // Suppression d'un fichier
  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };
  
  // Calcul du nombre de jours de congés
  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    // Différence en jours
    const diffTime = Math.abs(end.getTime() - start.getTime());
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    // Ajustement pour demi-journées
    if (formData.startHalfDay === 'afternoon' && formData.endHalfDay === 'morning') {
      diffDays -= 1;
    } else if ((formData.startHalfDay === 'afternoon' && formData.endHalfDay === 'afternoon') || 
               (formData.startHalfDay === 'morning' && formData.endHalfDay === 'morning')) {
      diffDays -= 0.5;
    }
    
    return diffDays;
  };
  
  // Soumission du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.leave_type_id || !formData.startDate || !formData.endDate) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    // Créer l'objet de demande de congé
    const leaveRequestData = {
      leave_type_id: parseInt(formData.leave_type_id),
      start_date: formData.startDate,
      end_date: formData.endDate,
      start_day_period: formData.startHalfDay === 'morning' ? 'half_day_morning' : 'half_day_afternoon' as DayPeriod,
      end_day_period: formData.endHalfDay === 'morning' ? 'half_day_morning' : 'half_day_afternoon' as DayPeriod,
      reason: formData.reason,
      status: 'pending' as LeaveRequestStatus,
      requested_days: calculateDays(),
      notify_team: formData.notify_team
    };
    
    // Envoi à l'API (à implémenter)
    console.log('Envoi de la demande de congé :', leaveRequestData);
    
    // Redirection vers la liste des demandes
    navigate('/leave/my-history', { state: { success: true } });
  };
  
  // Si l'utilisateur n'a pas la permission, afficher un message d'erreur
  if (!canRequestLeave) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Accès non autorisé</h2>
        <p className="text-gray-600">Vous n'avez pas la permission de demander des congés.</p>
      </div>
    );
  }
  
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Nouvelle demande de congé</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type de congé */}
        <div className="space-y-2">
          <label htmlFor="leaveTypeId" className="block text-sm font-medium text-gray-700">
            Type de congé *
          </label>
          <select
            id="leave_type_id"
            name="leave_type_id"
            value={formData.leave_type_id}
            onChange={handleChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            required
          >
            <option value="" disabled>Sélectionnez un type de congé</option>
            {leaveTypes.map(type => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date de début */}
          <div className="space-y-2">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              Date de début *
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              required
            />
            <div className="mt-2 flex items-center">
              <select
                id="startHalfDay"
                name="startHalfDay"
                value={formData.startHalfDay}
                onChange={handleChange}
                className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-md"
              >
                <option value="morning">Matin</option>
                <option value="afternoon">Après-midi</option>
              </select>
            </div>
          </div>
          
          {/* Date de fin */}
          <div className="space-y-2">
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
              Date de fin *
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              min={formData.startDate}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              required
            />
            <div className="mt-2 flex items-center">
              <select
                id="endHalfDay"
                name="endHalfDay"
                value={formData.endHalfDay}
                onChange={handleChange}
                className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-md"
              >
                <option value="morning">Matin</option>
                <option value="afternoon">Après-midi</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Nombre de jours */}
        <div className="flex items-center p-4 bg-gray-50 rounded-lg">
          <Clock className="h-5 w-5 text-primary-600 mr-2" />
          <span className="text-sm text-gray-700">
            Durée : <span className="font-semibold">{calculateDays()} jour(s)</span>
          </span>
        </div>
        
        {/* Commentaire */}
        <div className="space-y-2">
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
            Commentaire (optionnel)
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={3}
            value={formData.reason}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            placeholder="Informations complémentaires sur votre absence..."
          />
        </div>
        
        {/* Pièces jointes */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Pièces jointes (optionnel)
          </label>
          
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                >
                  <span>Télécharger un fichier</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    multiple
                  />
                </label>
                <p className="pl-1">ou glisser-déposer</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, PDF jusqu'à 10MB</p>
            </div>
          </div>
          
          {/* Liste des fichiers sélectionnés */}
          {formData.attachments.length > 0 && (
            <ul className="mt-3 border border-gray-200 rounded-md divide-y divide-gray-200">
              {formData.attachments.map((file, index) => (
                <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                  <div className="w-0 flex-1 flex items-center">
                    <svg className="flex-shrink-0 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-2 flex-1 w-0 truncate">{file.name}</span>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="font-medium text-red-600 hover:text-red-500"
                    >
                      Supprimer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Boutons d'action */}
        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            onClick={() => navigate('/leave/my-history')}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Soumettre la demande
          </button>
        </div>
      </form>
    </div>
  );
}
