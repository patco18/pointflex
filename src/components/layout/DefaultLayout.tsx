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
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar sections={defaultSections} />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </div>
    </div>
  );
}
