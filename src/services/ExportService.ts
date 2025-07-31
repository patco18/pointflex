// Importez ces bibliothèques après les avoir installées
// import jsPDF from 'jspdf';
// import html2canvas from 'html2canvas';
// import * as XLSX from 'xlsx';
// import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

// Déclarations de type pour éviter les erreurs TypeScript
declare const jsPDF: any;
declare const html2canvas: any;
declare const XLSX: any;
declare const saveAs: any;

// Types pour les données du rapport
interface AttendanceStats {
  totalRecords: number;
  totalPresences: number;
  totalLate: number;
  totalAbsences: number;
  totalWorkHours: number;
  totalQrCheckIns?: number;        // Pointages par QR code
  totalGeoCheckIns?: number;       // Pointages par géolocalisation
  totalLeaveRequests?: number;     // Demandes de congés
  totalValidatedAttendances?: number; // Pointages validés par superviseur
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
}

interface EmployeeStat {
  id: number;
  name: string;
  department: string;
  presences: number;
  absences: number;
  lates: number;
  workHours: number;
  attendanceRate: number;
  qrCheckIns?: number;            // Pointages par QR code
  geoCheckIns?: number;           // Pointages par géolocalisation
  leaveRequests?: number;         // Congés pris
  validatedAttendances?: number;  // Pointages validés
  pendingLeaves?: number;         // Demandes de congé en attente
}

interface ReportData {
  period: {
    start: string;
    end: string;
    days: number;
  };
  stats: AttendanceStats;
  departmentStats: DepartmentStat[];
  employeeStats: EmployeeStat[];
  topEmployees: EmployeeStat[];
  
  // Nouvelles données pour les fonctionnalités avancées
  leaveStats?: {
    approved: number;
    pending: number;
    rejected: number;
    byType: { [key: string]: number };  // Congés par type
  };
  checkInMethods?: {
    qrCode: number;
    manual: number;
    geolocation: number;
  };
  validationStats?: {
    validated: number;
    pending: number;
    rejected: number;
  };
  locationData?: Array<{
    locationName: string;
    checkInCount: number;
    employees: number;
  }>;
}

// Formatage des durées
const formatDuration = (durationInHours: number): string => {
  const hours = Math.floor(durationInHours);
  const minutes = Math.round((durationInHours - hours) * 60);
  return `${hours}h${minutes.toString().padStart(2, '0')}`;
};

// Export en PDF
export const exportToPDF = (reportData: ReportData, reportElement: HTMLElement): void => {
  try {
    toast.loading('Génération du PDF en cours...');
    
    // Vérification si la bibliothèque est disponible
    if (typeof window !== 'undefined' && 
        typeof (window as any).jspdf !== 'undefined' && 
        typeof (window as any).html2canvas !== 'undefined') {
      
      const jsPDF = (window as any).jspdf;
      const html2canvas = (window as any).html2canvas;
      
      const startDate = format(new Date(reportData.period.start), 'dd/MM/yyyy', { locale: fr });
      const endDate = format(new Date(reportData.period.end), 'dd/MM/yyyy', { locale: fr });
      const fileName = `rapport_assiduite_${startDate}_${endDate}.pdf`;
      
      html2canvas(reportElement).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imageWidth = canvas.width;
        const imageHeight = canvas.height;
        const ratio = pageWidth / imageWidth;
        const imageHeightScaled = imageHeight * ratio;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imageHeightScaled);
        
        if (imageHeightScaled > pageHeight) {
          let heightLeft = imageHeightScaled;
          let position = 0;
          heightLeft -= pageHeight;
          position -= pageHeight;
          
          while (heightLeft >= 0) {
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imageHeightScaled);
            heightLeft -= pageHeight;
            position -= pageHeight;
          }
        }
        
        pdf.save(fileName);
        toast.dismiss();
        toast.success('PDF généré avec succès');
      });
    } else {
      toast.dismiss();
      toast.error('La bibliothèque PDF n\'est pas disponible. Installez jsPDF et html2canvas.');
      console.error("Les bibliothèques jsPDF et html2canvas ne sont pas disponibles. Installez-les avec npm install jspdf html2canvas");
    }
  } catch (error) {
    toast.dismiss();
    toast.error('Erreur lors de la génération du PDF');
    console.error('Erreur lors de l\'export PDF:', error);
  }
  
  // Version simplifiée si les bibliothèques ne sont pas disponibles
  if (typeof jsPDF === 'undefined' || typeof html2canvas === 'undefined') {
    alert('Fonctionnalité d\'exportation PDF en cours d\'implémentation. Veuillez installer jsPDF et html2canvas.');
  }
};

// Export en Excel
export const exportToExcel = (reportData: ReportData): void => {
  try {
    toast.loading('Génération de l\'Excel en cours...');
    
    // Vérification si les bibliothèques sont disponibles
    if (typeof window !== 'undefined' && typeof (window as any).XLSX !== 'undefined') {
      const XLSX = (window as any).XLSX;
      
      const startDate = format(new Date(reportData.period.start), 'dd/MM/yyyy', { locale: fr });
      const endDate = format(new Date(reportData.period.end), 'dd/MM/yyyy', { locale: fr });
      const fileName = `rapport_assiduite_${startDate}_${endDate}.xlsx`;
      
      // Préparation des données pour les feuilles Excel
      const overviewData = [
        ['Rapport d\'assiduité', '', ''],
        ['Période:', `${startDate} - ${endDate}`, ''],
        ['', '', ''],
        ['Statistiques générales:', '', ''],
        ['Total enregistrements:', reportData.stats.totalRecords.toString(), ''],
        ['Total présences:', reportData.stats.totalPresences.toString(), ''],
        ['Total retards:', reportData.stats.totalLate.toString(), ''],
        ['Total absences:', reportData.stats.totalAbsences.toString(), ''],
        ['Heures travaillées:', formatDuration(reportData.stats.totalWorkHours), '']
      ];
      
      const departmentData = [
        ['Département', 'Employés', 'Présences', 'Absences', 'Retards', 'Heures travaillées', 'Taux présence (%)']
      ];
      
      reportData.departmentStats.forEach(dept => {
        departmentData.push([
          dept.name,
          dept.employeeCount.toString(),
          dept.presences.toString(),
          dept.absences.toString(),
          dept.lates.toString(),
          formatDuration(dept.workHours),
          dept.attendanceRate.toFixed(1)
        ]);
      });
      
      const employeeData = [
        ['Nom', 'Département', 'Présences', 'Absences', 'Retards', 'Heures travaillées', 'Taux présence (%)']
      ];
      
      reportData.employeeStats.forEach(emp => {
        employeeData.push([
          emp.name,
          emp.department,
          emp.presences.toString(),
          emp.absences.toString(),
          emp.lates.toString(),
          formatDuration(emp.workHours),
          emp.attendanceRate.toFixed(1)
        ]);
      });
      
      // Création du workbook et ajout des feuilles
      const workbook = XLSX.utils.book_new();
      
      const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Aperçu');
      
      const departmentSheet = XLSX.utils.aoa_to_sheet(departmentData);
      XLSX.utils.book_append_sheet(workbook, departmentSheet, 'Départements');
      
      const employeeSheet = XLSX.utils.aoa_to_sheet(employeeData);
      XLSX.utils.book_append_sheet(workbook, employeeSheet, 'Employés');
      
      // Création du fichier Excel et téléchargement
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
      
      if (typeof (window as any).saveAs === 'function') {
        (window as any).saveAs(data, fileName);
      } else {
        // Fallback si saveAs n'est pas disponible
        const url = window.URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      toast.dismiss();
      toast.success('Excel généré avec succès');
    } else {
      toast.dismiss();
      toast.error('Les bibliothèques nécessaires ne sont pas disponibles');
      alert('Fonctionnalité d\'exportation Excel en cours d\'implémentation. Veuillez installer xlsx et file-saver.');
    }
  } catch (error) {
    toast.dismiss();
    toast.error('Erreur lors de la génération de l\'Excel');
    console.error('Erreur lors de l\'export Excel:', error);
  }
};

// Export en CSV (plus simple, peut fonctionner sans bibliothèques supplémentaires)
export const exportToCSV = (reportData: ReportData): void => {
  try {
    toast.loading('Génération du CSV en cours...');
    
    const startDate = format(new Date(reportData.period.start), 'dd_MM_yyyy');
    const endDate = format(new Date(reportData.period.end), 'dd_MM_yyyy');
    const fileName = `rapport_assiduite_${startDate}_${endDate}.csv`;
    
    // Créer le contenu CSV
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // En-tête
    csvContent += 'Nom,Département,Présences,Absences,Retards,Heures,Taux de présence (%)\n';
    
    // Données des employés
    reportData.employeeStats.forEach(emp => {
      const row = [
        // Échapper les virgules dans les chaînes
        `"${emp.name.replace(/"/g, '""')}"`,
        `"${emp.department.replace(/"/g, '""')}"`,
        emp.presences,
        emp.absences,
        emp.lates,
        emp.workHours.toFixed(1),
        emp.attendanceRate.toFixed(1)
      ].join(',');
      csvContent += row + '\n';
    });
    
    // Créer un lien de téléchargement et le déclencher
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.dismiss();
    toast.success('CSV généré avec succès');
  } catch (error) {
    toast.dismiss();
    toast.error('Erreur lors de la génération du CSV');
    console.error('Erreur lors de l\'export CSV:', error);
  }
};

const ExportService = {
  exportToPDF,
  exportToExcel,
  exportToCSV
};

export default ExportService;
