import React, { ReactNode } from 'react';
import Sidebar, { SidebarSection } from './Sidebar';
import Header from './Header';

interface DefaultLayoutProps {
  children: ReactNode;
}

const defaultSections: SidebarSection[] = [
  {
    title: 'General',
    items: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Reports', href: '/reports' },
    ],
  },
];

export default function DefaultLayout({ children }: DefaultLayoutProps) {
  return (
    <div className="min-h-screen flex">
      <Sidebar sections={defaultSections} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
