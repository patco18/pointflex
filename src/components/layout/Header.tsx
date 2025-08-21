import React from 'react';
import { Menu, Bell } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import Button from '../ui/button';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  return (
    <header className="flex items-center justify-between h-16 px-4 border-b border-border bg-background">
      <div className="flex items-center gap-2">
        <Button color="secondary" size="sm" onClick={onMenuToggle} icon={<Menu className="w-4 h-4" />} />
        <input
          type="search"
          placeholder="Search..."
          className="h-8 px-3 rounded-md border border-border bg-background text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button color="secondary" size="sm" icon={<Bell className="w-4 h-4" />} />
        <ThemeToggle />
      </div>
    </header>
  );
}

export default Header;
