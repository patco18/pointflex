import React, { ReactNode } from 'react';

interface DefaultLayoutProps {
  children: ReactNode;
}

export default function DefaultLayout({ children }: DefaultLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        {/* Sidebar would go here in a real implementation */}
        <div className="hidden md:block md:w-64 bg-primary-900 text-white p-4">
          {/* Sidebar content */}
          <div className="py-4 text-xl font-bold mb-6">PointFlex</div>
          <nav>
            {/* Navigation items */}
          </nav>
        </div>
        
        {/* Main content */}
        <div className="flex-1">
          {/* Header would go here in a real implementation */}
          <header className="bg-white border-b h-16 flex items-center px-6 shadow-sm">
            {/* Header content */}
          </header>
          
          {/* Page content */}
          <main className="p-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
