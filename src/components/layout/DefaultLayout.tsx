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

      </div>
    </div>
  );
}
