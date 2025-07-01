import { BarChart3, TrendingUp } from 'lucide-react'

interface AttendanceData {
  date: string
  present: number
  late: number
  absent: number
}

interface AttendanceChartProps {
  data: AttendanceData[]
  title: string
}

export default function AttendanceChart({ data, title }: AttendanceChartProps) {
  const maxValue = Math.max(...data.map(d => d.present + d.late + d.absent))
  
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <BarChart3 className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">{item.date}</span>
              <span className="text-gray-500">
                {item.present + item.late + item.absent} total
              </span>
            </div>
            
            <div className="flex h-4 bg-gray-200 rounded-full overflow-hidden">
              {item.present > 0 && (
                <div 
                  className="bg-green-500 transition-all duration-300"
                  style={{ width: `${(item.present / maxValue) * 100}%` }}
                  title={`${item.present} présents`}
                />
              )}
              {item.late > 0 && (
                <div 
                  className="bg-yellow-500 transition-all duration-300"
                  style={{ width: `${(item.late / maxValue) * 100}%` }}
                  title={`${item.late} retards`}
                />
              )}
              {item.absent > 0 && (
                <div 
                  className="bg-red-500 transition-all duration-300"
                  style={{ width: `${(item.absent / maxValue) * 100}%` }}
                  title={`${item.absent} absents`}
                />
              )}
            </div>
            
            <div className="flex items-center space-x-4 text-xs text-gray-600">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>{item.present} présents</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span>{item.late} retards</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span>{item.absent} absents</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}