import React, { createContext, useContext, useState } from 'react'

const TabsContext = createContext<{
  selectedTab: string
  setSelectedTab: (value: string) => void
}>({
  selectedTab: '',
  setSelectedTab: () => {}
})

interface TabsProps {
  defaultValue: string
  children: React.ReactNode
  className?: string
  onValueChange?: (value: string) => void
}

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
}

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

export function Tabs({ defaultValue, children, className = '', onValueChange }: TabsProps) {
  const [selectedTab, setSelectedTab] = useState(defaultValue)
  
  // Handler pour mettre à jour l'état et appeler le callback externe si fourni
  const handleTabChange = (value: string) => {
    setSelectedTab(value);
    if (onValueChange) {
      onValueChange(value);
    }
  };
  
  return (
    <TabsContext.Provider value={{ selectedTab, setSelectedTab: handleTabChange }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center space-x-2 rounded-md border p-1 ${className}`}>
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children, className = '' }: TabsTriggerProps) {
  const { selectedTab, setSelectedTab } = useContext(TabsContext)
  
  return (
    <button
      className={`flex-1 rounded-sm px-3 py-2 text-sm font-medium transition-all 
        ${selectedTab === value 
          ? 'bg-primary-500 text-white' 
          : 'bg-transparent text-gray-600 hover:bg-gray-100'
        } ${className}`}
      onClick={() => setSelectedTab(value)}
      type="button"
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const { selectedTab } = useContext(TabsContext)
  
  if (selectedTab !== value) return null
  
  return (
    <div className={className}>
      {children}
    </div>
  )
}
