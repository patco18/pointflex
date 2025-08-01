import React, { useState, useEffect } from 'react';
import { webhookService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Modal from './shared/Modal';
import DataTable from './shared/DataTable';
import LoadingSpinner from './shared/LoadingSpinner';
import { PlusCircle, Edit3, Trash2, Eye, Send, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// TODO: Fetch this from backend or define centrally
const VALID_EVENT_TYPES = [
    "user.created", "user.updated", "user.deleted",
    "company.created", "company.updated", // company.deleted is also valid
    "pointage.created", "pointage.updated",
    "invoice.created", "invoice.paid", "invoice.payment_failed",
    "subscription.created", "subscription.updated", "subscription.cancelled",
    "leave_request.created", "leave_request.approved", "leave_request.rejected",
    "leave_balance.updated", // Added this based on recent work
    "mission.created", "mission.updated", "mission.deleted",
    "ping.test" // For test pings
];

interface WebhookSubscription {
    id: number;
    target_url: string;
    subscribed_events: string[];
    is_active: boolean;
    secret?: string; // Only available on create
    created_at: string;
}

interface DeliveryLog {
    id: number;
    event_type: string;
    target_url: string;
    attempted_at: string;
    response_status_code: number | null;
    is_success: boolean;
    error_message: string | null;
    // payload: any; // Potentially large, handle carefully
}

interface WebhookFormState {
    target_url: string;
    subscribed_events: string[];
    is_active: boolean;
}

const initialFormState: WebhookFormState = {
    target_url: '',
    subscribed_events: [],
    is_active: true,
};

export default function WebhookManagement() {
    const { isAdmin } = useAuth();
    const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState<WebhookSubscription | null>(null);
    const [formState, setFormState] = useState<WebhookFormState>(initialFormState);
    const [actionLoading, setActionLoading] = useState(false);
    const [newSecret, setNewSecret] = useState<string | null>(null);

    const [showLogsModal, setShowLogsModal] = useState(false);
    const [selectedSubForLogs, setSelectedSubForLogs] = useState<WebhookSubscription | null>(null);
    const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logPagination, setLogPagination] = useState({ page: 1, per_page: 10, total_pages: 1, total_items: 0 });
    const [searchTerm, setSearchTerm] = useState('');

    const fetchSubscriptions = async () => {
        setIsLoading(true);
        try {
            const response = await webhookService.getSubscriptions();
            setSubscriptions(response.data || []);
        } catch (error) {
            toast.error("Erreur lors de la récupération des abonnements webhook.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchSubscriptions();
        }
    }, [isAdmin]);

    const handleOpenModal = (sub?: WebhookSubscription) => {
        setNewSecret(null);
        if (sub) {
            setEditingSubscription(sub);
            setFormState({
                target_url: sub.target_url,
                subscribed_events: [...sub.subscribed_events],
                is_active: sub.is_active,
            });
        } else {
            setEditingSubscription(null);
            setFormState(initialFormState);
        }
        setShowModal(true);
    };

    const handleEventToggle = (eventType: string) => {
        setFormState(prev => {
            const newEvents = prev.subscribed_events.includes(eventType)
                ? prev.subscribed_events.filter(e => e !== eventType)
                : [...prev.subscribed_events, eventType];
            return { ...prev, subscribed_events: newEvents };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formState.subscribed_events.length === 0) {
            toast.error("Veuillez sélectionner au moins un type d'événement.");
            return;
        }
        setActionLoading(true);
        try {
            if (editingSubscription) {
                await webhookService.updateSubscription(editingSubscription.id, formState);
                toast.success("Abonnement webhook mis à jour.");
            } else {
                const response = await webhookService.createSubscription(formState);
                setNewSecret(response.data.secret || null); // Show secret for new subscription
                toast.success("Abonnement webhook créé. Copiez votre clé secrète!");
            }
            setShowModal(false);
            fetchSubscriptions(); // Refresh list
        } catch (error) {
            // Toast error handled by interceptor mostly
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (subId: number) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer cet abonnement webhook ?")) return;
        setActionLoading(true);
        try {
            await webhookService.deleteSubscription(subId);
            toast.success("Abonnement webhook supprimé.");
            fetchSubscriptions();
        } catch (error) {
             // Toast error handled by interceptor
        } finally {
            setActionLoading(false);
        }
    };

    const handlePing = async (subId: number) => {
        setActionLoading(true);
        try {
            await webhookService.pingSubscription(subId);
            toast.success("Ping de test envoyé. Vérifiez vos logs de livraison.");
        } catch (error) {
            toast.error("Erreur lors de l'envoi du ping de test.");
        } finally {
            setActionLoading(false);
        }
    };

    const fetchDeliveryLogs = async (subId: number, page = 1) => {
        setLogsLoading(true);
        try {
            const response = await webhookService.getSubscriptionDeliveryLogs(subId, page, logPagination.per_page);
            setDeliveryLogs(response.data.logs || []);
            setLogPagination(response.data.pagination || { page: 1, per_page: 10, total_pages: 1, total_items: 0 });
        } catch (error) {
            toast.error("Erreur lors de la récupération des logs de livraison.");
        } finally {
            setLogsLoading(false);
        }
    };

    const handleViewLogs = (sub: WebhookSubscription) => {
        setSelectedSubForLogs(sub);
        setLogPagination({ page: 1, per_page: 10, total_pages: 1, total_items: 0 }); // Reset pagination
        fetchDeliveryLogs(sub.id, 1);
        setShowLogsModal(true);
    };

    if (!isAdmin) {
        return <div className="card text-center p-6"><p>Accès réservé aux administrateurs.</p></div>;
    }
    if (isLoading) {
        return <LoadingSpinner text="Chargement des abonnements webhook..." />;
    }

    const subscriptionColumns = [
        { key: 'target_url', label: 'URL Cible', render: (sub: WebhookSubscription) => <a href={sub.target_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-xs block">{sub.target_url}</a> },
        { key: 'events', label: 'Événements Souscrits', render: (sub: WebhookSubscription) => <span className="text-xs">{sub.subscribed_events.join(', ') || 'Aucun'}</span> },
        { key: 'is_active', label: 'Statut', render: (sub: WebhookSubscription) => <StatusBadge status={sub.is_active ? 'active' : 'inactive'} /> },
        { key: 'created_at', label: 'Créé le', render: (sub: WebhookSubscription) => new Date(sub.created_at).toLocaleDateString() },
    ];

    const filteredSubscriptions = subscriptions.filter(sub => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return sub.target_url.toLowerCase().includes(term) || sub.subscribed_events.join(',').toLowerCase().includes(term);
    });

    const logColumns = [
        { key: 'attempted_at', label: 'Date & Heure', render: (log: DeliveryLog) => new Date(log.attempted_at).toLocaleString() },
        { key: 'event_type', label: 'Événement' },
        { key: 'status', label: 'Statut Envoi', render: (log: DeliveryLog) => log.is_success ? <CheckCircle className="text-green-500 h-5 w-5" /> : <XCircle className="text-red-500 h-5 w-5" /> },
        { key: 'response_status_code', label: 'Code HTTP Réponse' },
        // { key: 'error_message', label: 'Erreur', render: (log: DeliveryLog) => <span className="text-xs truncate max-w-xs block">{log.error_message || 'N/A'}</span>},
    ];


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Gestion des Webhooks</h1>
                <button onClick={() => handleOpenModal()} className="btn-primary flex items-center">
                    <PlusCircle className="h-4 w-4 mr-2" /> Nouveau Webhook
                </button>
            </div>

            <DataTable
                columns={subscriptionColumns}
                data={filteredSubscriptions}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                emptyMessage="Aucun abonnement webhook configuré."
                actions={(sub: WebhookSubscription) => (
                    <div className="space-x-2 flex">
                        <button onClick={() => handleOpenModal(sub)} className="text-blue-600 hover:text-blue-800 p-1" title="Modifier"><Edit3 size={16}/></button>
                        <button onClick={() => handleDelete(sub.id)} className="text-red-600 hover:text-red-800 p-1" title="Supprimer"><Trash2 size={16}/></button>
                        <button onClick={() => handleViewLogs(sub)} className="text-gray-600 hover:text-gray-800 p-1" title="Voir Logs"><Eye size={16}/></button>
                        <button onClick={() => handlePing(sub.id)} className="text-green-600 hover:text-green-800 p-1" title="Envoyer Ping"><Send size={16}/></button>
                    </div>
                )}
            />

            {/* Create/Edit Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingSubscription ? "Modifier l'Abonnement Webhook" : "Créer un Abonnement Webhook"} size="2xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="target_url" className="block text-sm font-medium text-gray-700">URL Cible *</label>
                        <input type="url" id="target_url" value={formState.target_url} onChange={e => setFormState({...formState, target_url: e.target.value})} className="input-field" required placeholder="https://votre-endpoint.com/webhook"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Événements à Souscrire *</label>
                        <div className="max-h-60 overflow-y-auto border rounded-md p-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                            {VALID_EVENT_TYPES.map(eventType => (
                                <label key={eventType} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                                    <input type="checkbox" checked={formState.subscribed_events.includes(eventType)} onChange={() => handleEventToggle(eventType)} className="form-checkbox h-4 w-4 text-primary-600"/>
                                    <span className="text-xs">{eventType}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                     <div>
                        <label className="flex items-center space-x-2">
                            <input type="checkbox" checked={formState.is_active} onChange={e => setFormState({...formState, is_active: e.target.checked})} className="form-checkbox h-4 w-4 text-primary-600"/>
                            <span className="text-sm text-gray-700">Actif</span>
                        </label>
                    </div>
                    {newSecret && !editingSubscription && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-sm font-medium text-yellow-800">Clé Secrète (Secret Key):</p>
                            <p className="text-xs text-yellow-700 my-1">Ceci est la SEULE fois que la clé secrète sera affichée. Copiez-la et stockez-la en lieu sûr. Vous l'utiliserez pour vérifier la signature des webhooks entrants.</p>
                            <pre className="bg-gray-100 p-2 rounded text-xs break-all">{newSecret}</pre>
                        </div>
                    )}
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" disabled={actionLoading}>Annuler</button>
                        <button type="submit" className="btn-primary" disabled={actionLoading}>
                            {actionLoading ? <LoadingSpinner size="sm"/> : (editingSubscription ? "Mettre à Jour" : "Créer Abonnement")}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delivery Logs Modal */}
            {selectedSubForLogs && (
                <Modal isOpen={showLogsModal} onClose={() => setShowLogsModal(false)} title={`Logs de Livraison pour ${selectedSubForLogs.target_url.substring(0,50)}...`} size="3xl">
                    {logsLoading ? <LoadingSpinner text="Chargement des logs..."/> : (
                        deliveryLogs.length > 0 ? (
                            <>
                                <DataTable columns={logColumns} data={deliveryLogs} searchTerm="" onSearchChange={() => {}} emptyMessage="Aucun log de livraison." />
                                {/* Basic Pagination (can be improved) */}
                                <div className="flex justify-between items-center mt-4 text-sm">
                                    <button
                                        onClick={() => fetchDeliveryLogs(selectedSubForLogs.id, logPagination.page - 1)}
                                        disabled={logPagination.page <= 1}
                                        className="btn-secondary btn-sm"
                                    >Précédent</button>
                                    <span>Page {logPagination.page} sur {logPagination.total_pages} ({logPagination.total_items} logs)</span>
                                    <button
                                        onClick={() => fetchDeliveryLogs(selectedSubForLogs.id, logPagination.page + 1)}
                                        disabled={logPagination.page >= logPagination.total_pages}
                                        className="btn-secondary btn-sm"
                                    >Suivant</button>
                                </div>
                            </>
                        ) : <p>Aucun log de livraison trouvé pour cet abonnement.</p>
                    )}
                </Modal>
            )}
        </div>
    );
}
