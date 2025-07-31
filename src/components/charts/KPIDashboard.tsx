import React from 'react';
import { 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Users, 
  Calendar
} from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
}

export const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  trend, 
  description 
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 transition-all hover:shadow-md">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <div className={`flex items-center text-xs mt-1 ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {trend.isPositive ? 
                <TrendingUp className="h-3 w-3 mr-1" /> : 
                <TrendingUp className="h-3 w-3 mr-1 transform rotate-180" />
              }
              <span>{Math.abs(trend.value)}% par rapport à la période précédente</span>
            </div>
          )}
          {description && (
            <p className="text-xs text-gray-500 mt-2">{description}</p>
          )}
        </div>
        <div className={`rounded-full p-2 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
};

interface KPIDashboardProps {
  data: {
    attendanceRate: number;
    attendanceTrend: number;
    onTimeRate: number;
    onTimeTrend: number;
    lateRate: number;
    lateTrend: number;
    averageHoursWorked: number;
    hoursTrend: number;
    absenceRate: number;
    absenceTrend: number;
    upcomingLeaves: number;
  };
  role: string;
}

export default function KPIDashboard({ data, role }: KPIDashboardProps) {
  // Définir le type pour les KPIs
  type KPI = {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    trend?: {
      value: number;
      isPositive: boolean;
    };
    description?: string;
  };

  // Générer les KPIs en fonction du rôle
  const generateKPIs = (): KPI[] => {
    const baseKPIs: KPI[] = [
      {
        title: "Taux de présence",
        value: `${data.attendanceRate}%`,
        icon: CheckCircle,
        color: "bg-green-500",
        trend: {
          value: data.attendanceTrend,
          isPositive: data.attendanceTrend > 0
        }
      },
      {
        title: "Taux de ponctualité",
        value: `${data.onTimeRate}%`,
        icon: Clock,
        color: "bg-blue-500",
        trend: {
          value: data.onTimeTrend,
          isPositive: data.onTimeTrend > 0
        }
      }
    ];

    // KPIs supplémentaires pour les rôles de gestion
    const managementKPIs: KPI[] = [
      {
        title: "Taux de retard",
        value: `${data.lateRate}%`,
        icon: AlertTriangle,
        color: "bg-yellow-500",
        trend: {
          value: data.lateTrend,
          isPositive: data.lateTrend < 0
        }
      },
      {
        title: "Taux d'absence",
        value: `${data.absenceRate}%`,
        icon: XCircle,
        color: "bg-red-500",
        trend: {
          value: data.absenceTrend,
          isPositive: data.absenceTrend < 0
        }
      }
    ];

    // KPIs spécifiques aux administrateurs
    const adminKPIs: KPI[] = [
      {
        title: "Moyenne d'heures travaillées",
        value: `${data.averageHoursWorked}h`,
        icon: TrendingUp,
        color: "bg-purple-500",
        trend: {
          value: data.hoursTrend,
          isPositive: data.hoursTrend > 0
        }
      },
      {
        title: "Congés à venir",
        value: data.upcomingLeaves,
        icon: Calendar,
        color: "bg-indigo-500",
        description: "Nombre de demandes de congés pour les 30 prochains jours"
      }
    ];

    if (role === 'superadmin' || role === 'admin_rh') {
      return [...baseKPIs, ...managementKPIs, ...adminKPIs];
    } else if (role === 'chef_service' || role === 'chef_projet' || role === 'manager') {
      return [...baseKPIs, ...managementKPIs];
    } else {
      return baseKPIs;
    }
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">Indicateurs de Performance (KPIs)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {generateKPIs().map((kpi, index) => (
          <KPICard 
            key={index}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            color={kpi.color}
            trend={kpi.trend}
            description={kpi.description}
          />
        ))}
      </div>
    </div>
  );
}
