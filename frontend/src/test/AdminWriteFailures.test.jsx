import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { it, expect, vi, afterEach } from 'vitest';
import GovernanceAndSafetyPage from '../systems/admin/features/governance/GovernanceAndSafetyPage';
import { api } from '../services/api';
vi.mock('../context/AuthContext', () => ({
 useAuth: () => ({user:{username:'admin',role:'ADMIN'},accounts:[],companies:[],identityRoles:[],identityPermissions:[]}),
 ENTERPRISE_ROLES:{DISPATCHER:{department:'Ops',permissions:[]}},ALL_SYSTEM_PERMISSIONS:[]
}));
vi.mock('../context/ThemeContext',()=>({useTheme:()=>({isDark:false})}));
afterEach(()=>vi.restoreAllMocks());
it('keeps an unconfirmed inspection in error when storage returns 503',async()=>{
 vi.spyOn(api,'getVehicles').mockResolvedValue({result:[]});vi.spyOn(api,'getDrivers').mockResolvedValue({result:[]});vi.spyOn(api,'getTrips').mockResolvedValue({result:[]});
 vi.spyOn(api,'submitPreTripInspection').mockRejectedValue(Object.assign(new Error('Storage unavailable'),{status:503}));
 render(<GovernanceAndSafetyPage defaultTab="PRETRIP"/>);
 fireEvent.submit(screen.getByRole('button',{name:/Xác Nhận Biên Bản/}).closest('form'));
 expect(await screen.findByText(/Chưa lưu được biên bản: Storage unavailable/)).toBeInTheDocument();
 expect(screen.queryByText(/Đã xác nhận đạt/)).not.toBeInTheDocument();
 await waitFor(()=>expect(api.submitPreTripInspection).toHaveBeenCalledOnce());
 const payload=api.submitPreTripInspection.mock.calls[0][0];
 expect(payload.fluidLevelPassed).toBe(false);expect(payload.cargoSecuringPassed).toBe(false);
});
it('does not report an incident as saved when the server rejects the write',async()=>{
 vi.spyOn(api,'getVehicles').mockResolvedValue({result:[]});vi.spyOn(api,'getDrivers').mockResolvedValue({result:[]});vi.spyOn(api,'getTrips').mockResolvedValue({result:[]});
 vi.spyOn(api,'createIncident').mockRejectedValue(new Error('Write failed'));
 render(<GovernanceAndSafetyPage defaultTab="INCIDENT"/>);
 fireEvent.submit(screen.getByRole('button',{name:'Gửi báo cáo sự cố'}).closest('form'));
 expect(await screen.findByText(/Chưa gửi được báo cáo: Write failed/)).toBeInTheDocument();
 expect(screen.queryByText(/Đã ghi nhận báo cáo/)).not.toBeInTheDocument();
});
