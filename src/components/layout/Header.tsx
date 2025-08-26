import React, { useState } from 'react';
import { Menu, Bell, BellOff } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import Button from '../ui/button';
import { requestNotificationPermission } from '../../firebaseInit';
import { toast } from 'react-hot-toast';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    Notification.permission === 'granted'
  );
  const [isRequestingPermission, setIsRequestingPermission] = useState<boolean>(false);

  const handleNotificationToggle = async () => {
    setIsRequestingPermission(true);
    try {
      const token = await requestNotificationPermission();
      if (token) {
        setNotificationsEnabled(true);
        toast.success('Notifications activées avec succès !');
      } else {
        toast.error('Vous avez refusé les notifications');
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
      toast.error('Une erreur est survenue');
    } finally {
      setIsRequestingPermission(false);
    }
  };

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
        <Button 
          color="secondary" 
          size="sm" 
          onClick={handleNotificationToggle}
          disabled={isRequestingPermission || notificationsEnabled}
          icon={notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        >
          {isRequestingPermission ? 'En cours...' : (notificationsEnabled ? 'Notifications actives' : 'Activer les notifications')}
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}

export default Header;
