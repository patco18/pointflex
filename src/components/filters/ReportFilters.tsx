import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface FilterOption {
  id: number | string;
  name: string;
}

interface ReportFiltersProps {
  onFilterChange: (filters: ReportFilters) => void;
  defaultPeriod: { start: string; end: string };
}

export interface ReportFilters {
  startDate: string;
  endDate: string;
  departmentId: string | number;
  serviceId: string | number;
  officeId: string | number;
}

const ReportFilters: React.FC<ReportFiltersProps> = ({ onFilterChange, defaultPeriod }) => {
  const [departments, setDepartments] = useState<FilterOption[]>([]);
  const [services, setServices] = useState<FilterOption[]>([]);
  const [offices, setOffices] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: defaultPeriod?.start || '',
    endDate: defaultPeriod?.end || '',
    departmentId: 'all',
    serviceId: 'all',
    officeId: 'all',
  });

  // Charger les options de filtre au montage du composant
  useEffect(() => {
    const fetchFilterOptions = async () => {
      setLoading(true);
      try {
        // Charger les départements
        const deptResponse = await api.get('/admin/departments');
        setDepartments([
          { id: 'all', name: 'Tous les départements' },
          ...deptResponse.data.map((dept: any) => ({ id: dept.id, name: dept.name }))
        ]);

        // Charger les services
        const serviceResponse = await api.get('/admin/services');
        setServices([
          { id: 'all', name: 'Tous les services' },
          ...serviceResponse.data.map((service: any) => ({ id: service.id, name: service.name }))
        ]);

        // Charger les bureaux
        const officeResponse = await api.get('/admin/offices');
        setOffices([
          { id: 'all', name: 'Tous les bureaux' },
          ...officeResponse.data.map((office: any) => ({ id: office.id, name: office.name }))
        ]);
      } catch (error) {
        console.error('Erreur lors du chargement des options de filtre:', error);
        // Valeurs par défaut en cas d'erreur
        setDepartments([{ id: 'all', name: 'Tous les départements' }]);
        setServices([{ id: 'all', name: 'Tous les services' }]);
        setOffices([{ id: 'all', name: 'Tous les bureaux' }]);
      } finally {
        setLoading(false);
      }
    };

    fetchFilterOptions();
  }, []);

  // Mettre à jour les filtres et notifier le parent
  const handleFilterChange = (key: keyof ReportFilters, value: string | number) => {
    const updatedFilters = { ...filters, [key]: value };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  return (
    <div className="bg-white border rounded-lg p-4 mb-6">
      <h3 className="font-bold text-lg mb-4">Filtres du rapport</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Période - Du</label>
          <input 
            type="date" 
            className="border rounded-md p-2 w-full"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Au</label>
          <input 
            type="date" 
            className="border rounded-md p-2 w-full"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Département</label>
          <select 
            className="border rounded-md p-2 w-full"
            value={filters.departmentId}
            onChange={(e) => handleFilterChange('departmentId', e.target.value)}
            disabled={loading}
          >
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
          <select 
            className="border rounded-md p-2 w-full"
            value={filters.serviceId}
            onChange={(e) => handleFilterChange('serviceId', e.target.value)}
            disabled={loading}
          >
            {services.map(service => (
              <option key={service.id} value={service.id}>{service.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bureau</label>
          <select 
            className="border rounded-md p-2 w-full"
            value={filters.officeId}
            onChange={(e) => handleFilterChange('officeId', e.target.value)}
            disabled={loading}
          >
            {offices.map(office => (
              <option key={office.id} value={office.id}>{office.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md w-full"
            onClick={() => onFilterChange(filters)}
            disabled={loading}
          >
            Appliquer les filtres
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportFilters;
