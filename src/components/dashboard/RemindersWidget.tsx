import React from 'react'
import { Bell, AlertCircle, CalendarCheck } from 'lucide-react'
import Card from '../ui/card'

interface Reminder {
  id: number
  icon: React.ComponentType<any>
  title: string
  time: string
}

const defaultReminders: Reminder[] = [
  { id: 1, icon: CalendarCheck, title: "Réunion d'équipe", time: 'Aujourd\'hui 14:00' },
  { id: 2, icon: AlertCircle, title: 'Soumettre rapport mensuel', time: 'Demain' }
]

export default function RemindersWidget() {
  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <Bell className="h-5 w-5 mr-2" /> Rappels
      </h2>
      <ul className="space-y-3">
        {defaultReminders.map((reminder) => {
          const Icon = reminder.icon
          return (
            <li key={reminder.id} className="flex items-center">
              <Icon className="h-4 w-4 text-primary-600 mr-2" />
              <span className="text-sm text-foreground">{reminder.title}</span>
              <span className="ml-auto text-xs text-gray-500">{reminder.time}</span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

