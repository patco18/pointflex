import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { testRoleLogic } from '../utils/roleUtils';
import { UserRole, ROLES } from '../types/roles';

/**
 * Page de test pour le système de rôles et permissions
 */
export default function RoleTestPage() {
  const { user } = useAuth();
  const { checkPermission, userRole } = usePermissions();
  const [testOutput, setTestOutput] = useState<string[]>([]);
  
  // Exécuter les tests et afficher les résultats
  const runTests = () => {
    // Redéfinir console.log pour capturer la sortie
    const originalConsoleLog = console.log;
    const outputs: string[] = [];
    
    console.log = (message?: any, ...optionalParams: any[]) => {
      const output = [message, ...optionalParams].join(' ');
      outputs.push(output);
      originalConsoleLog(message, ...optionalParams);
    };
    
    // Exécuter les tests
    testRoleLogic();
    
    // Restaurer console.log et définir l'output
    console.log = originalConsoleLog;
    setTestOutput(outputs);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">Test des Rôles et Privilèges</h1>
        
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <h2 className="text-lg font-semibold mb-2">Votre rôle actuel</h2>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-sm font-medium" 
                  style={{ 
                    backgroundColor: ROLES[userRole]?.color?.split(' ')[0] || 'bg-gray-100',
                    color: ROLES[userRole]?.color?.split(' ')[1] || 'text-gray-800'
                  }}>
              {ROLES[userRole]?.name || userRole}
            </span>
            <span className="text-sm text-gray-500">(Niveau {ROLES[userRole]?.level})</span>
          </div>
          <p className="mt-2 text-sm text-gray-600">{ROLES[userRole]?.description}</p>
        </div>
        
        <div className="mb-6">
          <button 
            onClick={runTests}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Exécuter les tests de rôles
          </button>
        </div>
        
        {testOutput.length > 0 && (
          <div className="mt-6 border rounded-md">
            <div className="bg-gray-100 px-4 py-2 border-b">
              <h3 className="font-medium">Résultats des tests</h3>
            </div>
            <div className="p-4 overflow-auto" style={{ maxHeight: '500px' }}>
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {testOutput.join('\n')}
              </pre>
            </div>
          </div>
        )}
        
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Liste des rôles et niveaux</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Niveau</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(Object.keys(ROLES) as UserRole[]).map((role) => (
                  <tr key={role}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                              style={{ 
                                backgroundColor: ROLES[role]?.color?.split(' ')[0] || 'bg-gray-100',
                                color: ROLES[role]?.color?.split(' ')[1] || 'text-gray-800'
                              }}>
                          {ROLES[role].name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ROLES[role].level}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ROLES[role].description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
