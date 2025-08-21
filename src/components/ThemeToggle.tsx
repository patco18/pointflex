import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import Button from './ui/button';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      onClick={toggleTheme}
      color="secondary"
      size="sm"
      aria-label="Toggle theme"
      icon={theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    />
  );
}
