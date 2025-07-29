import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import CheckInMethods from '../../components/attendance/CheckInMethods'
import MissionCheckIn from '../../components/attendance/MissionCheckIn'

export default function CheckInPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pointage</h1>
        <p className="text-gray-600">
          Enregistrez votre présence au bureau ou en mission
        </p>
      </div>

      <Tabs defaultValue="office" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="office">Pointage Bureau</TabsTrigger>
          <TabsTrigger value="mission">Pointage Mission</TabsTrigger>
        </TabsList>
        
        <TabsContent value="office" className="mt-4">
          <CheckInMethods />
        </TabsContent>
        
        <TabsContent value="mission" className="mt-4">
          <MissionCheckIn />
        </TabsContent>
      </Tabs>
      
      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          Informations importantes
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Le pointage bureau nécessite l'autorisation de géolocalisation</li>
          <li>• Le pointage mission requiert un numéro d'ordre valide</li>
          <li>• Vos pointages sont automatiquement horodatés</li>
          <li>• En cas de problème, contactez votre administrateur</li>
        </ul>
      </div>
    </div>
  )
}
