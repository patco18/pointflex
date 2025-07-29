import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Book, CheckCircle } from 'lucide-react';

// Système d'aide contextuelle pour les paramètres d'entreprise
export default function SettingsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Bouton flottant */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all"
        aria-label="Aide sur les paramètres"
      >
        <HelpCircle className="h-6 w-6" />
      </button>

      {/* Panel d'aide */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 animate-fade-in">
          <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
            <Book className="mr-2 h-5 w-5 text-primary-600" />
            Besoin d'aide?
          </h3>
          
          <div className="space-y-3 text-sm">
            <p className="text-gray-600">
              Découvrez comment configurer vos paramètres d'entreprise pour optimiser votre utilisation de PointFlex.
            </p>
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">Ressources disponibles:</h4>
              
              <a 
                href="/docs/GUIDE_PARAMETRES_ENTREPRISE.md" 
                target="_blank"
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Guide des paramètres
              </a>
              
              <Link 
                to="/support" 
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Contacter le support
              </Link>
            </div>
            
            <div className="bg-blue-50 p-2 rounded text-xs text-blue-700">
              <strong>Conseil:</strong> N'oubliez pas de sauvegarder vos modifications dans chaque onglet avant de passer au suivant.
            </div>
          </div>
          
          <button 
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" 
            onClick={() => setIsOpen(false)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
