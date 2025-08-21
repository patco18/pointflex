import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../utils/cn';

export interface SidebarItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

export interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

interface SidebarProps {
  sections: SidebarSection[];
}

export function Sidebar({ sections }: SidebarProps) {
  return (
    <aside className="w-64 bg-primary-900 text-white hidden md:block">
      {sections.map((section) => (
        <div key={section.title} className="mt-4">
          <h2 className="px-4 text-sm font-semibold text-white/70">{section.title}</h2>
          <nav className="mt-2">
            {section.items.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-4 py-2 text-sm hover:bg-primary-800',
                    isActive && 'bg-primary-700'
                  )
                }
              >
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      ))}
    </aside>
  );
}

export default Sidebar;
