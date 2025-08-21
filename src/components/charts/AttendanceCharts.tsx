import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis
} from 'recharts';

interface AttendanceStats {
  totalRecords: number;
  totalPresences: number;
  totalLate: number;
  totalAbsences: number;
  totalWorkHours: number;
  containsSimulatedData?: boolean;
}

interface DepartmentStat {
  id: number;
  name: string;
  employeeCount: number;
  presences: number;
  absences: number;
  lates: number;
  workHours: number;
  attendanceRate: number;
  isSimulated?: boolean;
}

interface AttendanceChartsProps {
  stats: AttendanceStats;
  departmentStats: DepartmentStat[];
}

const COLORS = ['#0088FE', '#FF8042', '#FFBB28'];

export const AttendanceOverviewChart: React.FC<{ stats: AttendanceStats }> = ({ stats }) => {
  // Données pour le graphique camembert des statuts
  const statusData = [
    { name: 'Présences', value: stats.totalPresences, color: '#4ade80' },
    { name: 'Retards', value: stats.totalLate, color: '#facc15' },
    { name: 'Absences', value: stats.totalAbsences, color: '#f87171' }
  ];

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={statusData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={100}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {statusData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [value, 'Nombre']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Répartition des présences</h3>
      {renderPieChart()}
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="bg-green-50 p-4 rounded-lg border">
          <p className="text-green-600 font-bold">{stats.totalPresences}</p>
          <p className="text-sm text-gray-500">Présences</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border">
          <p className="text-yellow-600 font-bold">{stats.totalLate}</p>
          <p className="text-sm text-gray-500">Retards</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border">
          <p className="text-red-600 font-bold">{stats.totalAbsences}</p>
          <p className="text-sm text-gray-500">Absences</p>
        </div>
      </div>
    </div>
  );
};

export const DepartmentPerformanceChart: React.FC<{ departmentStats: DepartmentStat[] }> = ({ departmentStats }) => {
  // Données pour le graphique à barres
  const sortedDepartments = [...departmentStats]
    .sort((a, b) => b.attendanceRate - a.attendanceRate)
    .slice(0, 5);

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={sortedDepartments}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12 }}
          height={60}
          interval={0}
          angle={-45}
          textAnchor="end"
        />
        <YAxis domain={[0, 100]} />
        <Tooltip formatter={(value) => [`${value}%`, 'Taux de présence']} />
        <Legend />
        <Bar dataKey="attendanceRate" name="Taux de présence (%)" fill="#4ade80" />
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Performance par département</h3>
      {renderBarChart()}
    </div>
  );
};

export const WorkHoursChart: React.FC<{ departmentStats: DepartmentStat[] }> = ({ departmentStats }) => {
  // Données pour le graphique à barres des heures travaillées
  const sortedByHours = [...departmentStats]
    .sort((a, b) => b.workHours - a.workHours)
    .slice(0, 5);

  const renderHoursChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={sortedByHours}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12 }}
          height={60}
          interval={0}
          angle={-45}
          textAnchor="end"
        />
        <YAxis />
        <Tooltip formatter={(value: number) => [`${value.toFixed(1)}h`, 'Heures travaillées']} />
        <Legend />
        <Bar dataKey="workHours" name="Heures travaillées" fill="#60a5fa" />
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Heures travaillées par département</h3>
      {renderHoursChart()}
    </div>
  );
};

const AttendanceCharts: React.FC<AttendanceChartsProps> = ({ stats, departmentStats }) => {
  return (
    <div className="space-y-8">
      <AttendanceOverviewChart stats={stats} />
      <DepartmentPerformanceChart departmentStats={departmentStats} />
      <WorkHoursChart departmentStats={departmentStats} />
    </div>
  );
};

export default AttendanceCharts;
