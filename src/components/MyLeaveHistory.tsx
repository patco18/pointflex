import React, { useState, useEffect } from 'react';
import { leaveService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import DataTable from './shared/DataTable'; // Assuming DataTable can be used
import LoadingSpinner from './shared/LoadingSpinner';
import { Download, Filter, ListChecks } from 'lucide-react';
import toast from 'react-hot-toast';

interface LeaveRequest {
    id: number;
    leave_type_name: string;
    start_date: string;
    end_date: string;
    start_day_period: string;
    end_day_period: string;
    requested_days: number;
    reason: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    approver_name: string | null;
    approver_comments: string | null;
    created_at: string;
}

interface PaginationState {
    page: number;
    per_page: number;
    total_pages: number;
    total_items: number;
}

export default function MyLeaveHistory() {
    const { user } = useAuth();
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [pagination, setPagination] = useState<PaginationState>({ page: 1, per_page: 10, total_pages: 1, total_items: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({
        start_date: '',
        end_date: '',
        status: '' // 'pending', 'approved', 'rejected', or '' for all
    });
    const [isDownloading, setIsDownloading] = useState(false);

    const fetchLeaveRequests = async (page = 1) => {
        if (!user) return;
        setIsLoading(true);
        try {
            const params: any = { page, per_page: pagination.per_page };
            if (filters.status) params.status = filters.status;
            if (filters.start_date) params.start_date = filters.start_date;
            if (filters.end_date) params.end_date = filters.end_date;

            const response = await leaveService.getMyLeaveRequests(page, pagination.per_page, filters.status);
            setLeaveRequests(response.data.requests || []);
            setPagination(response.data.pagination || { page: 1, per_page: 10, total_pages: 1, total_items: 0 });
        } catch (error) {
            toast.error("Erreur lors de la récupération de l'historique des congés.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaveRequests(1); // Fetch on initial load and when filters change (implicitly via handleFilterChange)
    }, [filters.status, filters.start_date, filters.end_date]); // Removed pagination.page from deps to avoid loop, handle via explicit calls

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleApplyFilters = () => {
        setPagination(prev => ({ ...prev, page: 1})); // Reset to page 1 when filters apply
        fetchLeaveRequests(1); // Fetch with new filters
    }

    const handleDownloadReport = async () => {
        setIsDownloading(true);
        try {
            const response = await leaveService.downloadMyLeaveReport(filters);
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const fileName = `mon_historique_conges_${user?.nom?.toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success("Rapport PDF téléchargé.");
        } catch (error) {
            toast.error("Erreur lors du téléchargement du rapport PDF.");
        } finally {
            setIsDownloading(false);
        }
    };

    const getStatusColor = (status: string) => {
        if (status === 'approved') return 'bg-green-100 text-green-800';
        if (status === 'rejected') return 'bg-red-100 text-red-800';
        if (status === 'pending') return 'bg-yellow-100 text-yellow-800';
        return 'bg-gray-100 text-gray-800';
    };

    const formatPeriod = (period: string) => {
        if (period === 'half_day_morning') return 'Matin';
        if (period === 'half_day_afternoon') return 'Après-midi';
        return 'Journée entière';
    };

    const columns = [
        { key: 'leave_type_name', label: 'Type de Congé' },
        { key: 'dates', label: 'Dates', render: (lr: LeaveRequest) => `${new Date(lr.start_date+'T00:00:00').toLocaleDateString('fr-CI', {day: 'numeric', month: 'numeric', year: 'numeric'}).replace(/\//g, '/')} - ${new Date(lr.end_date+'T00:00:00').toLocaleDateString('fr-CI', {day: 'numeric', month: 'numeric', year: 'numeric'}).replace(/\//g, '/')}` },
        { key: 'periods', label: 'Périodes', render: (lr: LeaveRequest) => `${formatPeriod(lr.start_day_period)} (Début) / ${formatPeriod(lr.end_day_period)} (Fin)`},
        { key: 'requested_days', label: 'Jours Dem.' },
        { key: 'status', label: 'Statut', render: (lr: LeaveRequest) => <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lr.status)}`}>{lr.status}</span> },
        { key: 'reason', label: 'Motif', render: (lr: LeaveRequest) => <span className="text-xs truncate max-w-xs block" title={lr.reason || ''}>{lr.reason || '-'}</span> },
        { key: 'approver_name', label: 'Approuvé par', render: (lr: LeaveRequest) => lr.approver_name || '-' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <ListChecks className="h-7 w-7 mr-2 text-primary-600" /> Mon Historique de Congés
                </h1>
                <button
                    onClick={handleDownloadReport}
                    disabled={isDownloading}
                    className="btn-secondary flex items-center"
                >
                    <Download className="h-4 w-4 mr-2" />
                    {isDownloading ? "Téléchargement..." : "Télécharger PDF"}
                </button>
            </div>

            <div className="card p-4 space-y-4">
                <h3 className="text-md font-semibold text-gray-700 flex items-center"><Filter size={18} className="mr-2"/>Filtres</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label htmlFor="start_date_filter" className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                        <input type="date" name="start_date" id="start_date_filter" value={filters.start_date} onChange={handleFilterChange} className="input-field"/>
                    </div>
                    <div>
                        <label htmlFor="end_date_filter" className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                        <input type="date" name="end_date" id="end_date_filter" value={filters.end_date} onChange={handleFilterChange} className="input-field"/>
                    </div>
                    <div>
                        <label htmlFor="status_filter" className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                        <select name="status" id="status_filter" value={filters.status} onChange={handleFilterChange} className="input-field">
                            <option value="">Tous</option>
                            <option value="pending">En attente</option>
                            <option value="approved">Approuvé</option>
                            <option value="rejected">Rejeté</option>
                            <option value="cancelled">Annulé</option>
                        </select>
                    </div>
                    <div className="md:self-end">
                        <button onClick={handleApplyFilters} className="btn-primary w-full md:w-auto">Appliquer Filtres</button>
                    </div>
                </div>
            </div>

            {isLoading ? <LoadingSpinner text="Chargement de l'historique..." /> : (
                <>
                    <DataTable
                        columns={columns}
                        data={leaveRequests}
                        searchTerm=""
                        onSearchChange={() => {}}
                        emptyMessage="Aucune demande de congé trouvée."
                    />
                    {pagination.total_pages > 1 && (
                        <div className="flex justify-center mt-4">
                            <nav className="pagination">
                                {Array.from({ length: pagination.total_pages }, (_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => {
                                            setPagination(prev => ({ ...prev, page: i + 1 }));
                                            fetchLeaveRequests(i + 1);
                                        }}
                                        className={`pagination-item ${pagination.page === i + 1 ? 'active' : ''}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
