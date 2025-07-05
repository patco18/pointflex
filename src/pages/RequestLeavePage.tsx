import React from 'react';
import LeaveRequestForm from '../components/LeaveRequestForm';
import { useNavigate } from 'react-router-dom';

export default function RequestLeavePage() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    // Optionally navigate away or show a persistent success message on this page
    // For now, let's assume the toast in the form is enough and user might want to make another request
    // or navigate via sidebar.
    // Example: navigate('/leave-history');
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Can add a page header here if needed */}
      <LeaveRequestForm onSuccess={handleSuccess} />
    </div>
  );
}
