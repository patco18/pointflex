import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EmployeeManagement from './EmployeeManagement';
import { adminService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

jest.mock('../services/api', () => ({
  adminService: {
    getEmployees: jest.fn(),
    getOrganizationData: jest.fn(),
  }
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

const mockedAdminService = adminService as jest.Mocked<typeof adminService>;
const mockedUseAuth = useAuth as jest.Mock;

beforeEach(() => {
  mockedUseAuth.mockReturnValue({ isAdmin: true, isSuperAdmin: false });
});

const employees = [
  {
    id: 1,
    email: 'john@example.com',
    nom: 'Doe',
    prenom: 'John',
    role: 'employee',
    is_active: true,
    employee_number: 'E1',
    phone: '123',
    department_name: 'IT',
    service_name: 'Dev',
    position_name: 'Engineer',
    manager_id: null,
    manager_name: null,
    company_name: 'ACME',
    created_at: '2024-01-01'
  }
];

const orgData = {
  departments: [{ id: 2, name: 'IT' }],
  services: [{ id: 10, name: 'Dev', department_id: 2 }],
  positions: [{ id: 20, name: 'Engineer' }]
};


test('prefills organization fields when editing an employee', async () => {
  mockedAdminService.getEmployees.mockResolvedValue({ data: employees });
  mockedAdminService.getOrganizationData.mockResolvedValue({ data: orgData });

  render(<EmployeeManagement />);

  await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());

  fireEvent.click(screen.getByTitle('Modifier Employé'));

  await screen.findByText("Modifier l'employé");

  const deptOption = screen.getByRole('option', { name: 'IT' }) as HTMLOptionElement;
  const serviceOption = screen.getByRole('option', { name: 'Dev' }) as HTMLOptionElement;
  const positionOption = screen.getByRole('option', { name: 'Engineer' }) as HTMLOptionElement;

  expect(deptOption.selected).toBe(true);
  expect(serviceOption.selected).toBe(true);
  expect(positionOption.selected).toBe(true);
});
