import React from 'react'
import { Navigation, Wifi, Sun, Info } from 'lucide-react'

interface CheckInGuidanceProps {
  className?: string
}

const tips = [
  {
    icon: <Navigation className="h-4 w-4 text-amber-600" aria-hidden="true" />,
    label: 'Activez le GPS haute précision pour accélérer la convergence des coordonnées.'
  },
  {
    icon: <Sun className="h-4 w-4 text-amber-600" aria-hidden="true" />,
    label: 'Déplacez-vous à l\'extérieur ou près d\'une fenêtre afin de capter un meilleur signal.'
  },
  {
    icon: <Wifi className="h-4 w-4 text-amber-600" aria-hidden="true" />,
    label: 'Activez le Wi-Fi même hors connexion pour aider la triangulation de votre position.'
  }
]

export default function CheckInGuidance({ className = '' }: CheckInGuidanceProps) {
  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-lg p-4 text-left ${className}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="bg-amber-100 rounded-full p-2">
          <Info className="h-5 w-5 text-amber-600" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-800">Optimisez votre pointage</p>
          <p className="text-xs text-amber-700">
            Préparez votre appareil avant de lancer la localisation pour obtenir une précision maximale.
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {tips.map((tip, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-amber-800">
            <span className="mt-0.5">{tip.icon}</span>
            <span>{tip.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
