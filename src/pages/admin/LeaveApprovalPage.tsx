import React, { useState } from 'react';
import DefaultLayout from '../../components/layout/DefaultLayout';
import LeaveApprovalSystem from '../../components/leave/LeaveApprovalSystem';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import TeamLeaveCalendar from '../../components/leave/TeamLeaveCalendar';
import AdminHeader from './AdminHeader';
import { useTitle } from './useTitle';

export default function LeaveApprovalPage() {
  useTitle('Approbation des Congés');
  const [activeTab, setActiveTab] = useState('pending');

  return (
    <DefaultLayout>
      <AdminHeader
        title="Approbation des Congés"
        subtitle="Gérez et approuvez les demandes de congés de votre équipe"
      />

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Tabs defaultValue="pending" onValueChange={(value) => setActiveTab(value)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 sm:w-[400px]">
              <TabsTrigger value="pending">En attente</TabsTrigger>
              <TabsTrigger value="all">Historique</TabsTrigger>
              <TabsTrigger value="calendar">Calendrier</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending">
              <div className="mt-6">
                <LeaveApprovalSystem onlyPending={true} showFilters={false} />
              </div>
            </TabsContent>
            
            <TabsContent value="all">
              <div className="mt-6">
                <LeaveApprovalSystem onlyPending={false} />
              </div>
            </TabsContent>
            
            <TabsContent value="calendar">
              <div className="mt-6 bg-white rounded-lg shadow p-6">
                <TeamLeaveCalendar
                  showFilters={true} 
                  showTeamSelector={true}
                  height={600}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DefaultLayout>
  );
}
