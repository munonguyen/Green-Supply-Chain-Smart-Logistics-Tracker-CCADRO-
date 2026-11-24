import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TripTrackingPage from '../systems/operations/features/tracking/TripTrackingPage';

const api = vi.hoisted(() => Object.fromEntries(['getLiveTripTelemetry','getTrip','getTripTelemetry','getTripProposals','getContainers','calculateTripReroute','decideRerouteProposal'].map(name=>[name,vi.fn()])));
vi.mock('../services/api', () => ({ api, gatewayUrl: path => path }));
vi.mock('../shared/map/MapView', () => ({ default: ({ children }) => <div data-testid="map">{children}</div> }));
vi.mock('../shared/map/RoutePolyline', () => ({ default: ({ positions, dashArray, routingMetadataJson }) => <div data-testid={dashArray === '10, 7' ? 'proposed-line' : 'route-line'} data-vertices={positions?.length || 0} data-has-meta={Boolean(routingMetadataJson)} /> }));
vi.mock('../shared/map/VehicleMarker', () => ({ default: () => null }));
vi.mock('../shared/map/OriginMarker', () => ({ default: () => null }));
vi.mock('../shared/map/DestinationMarker', () => ({ default: () => null }));
vi.mock('../shared/map/DeviationMarker', () => ({ default: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  api.getTrip.mockResolvedValue({ result: { id: 'trip-1', status: 'EN_ROUTE' } });
  api.getLiveTripTelemetry.mockResolvedValue({ result: { tripId: 'trip-1', routeWaypoints: [[10.8,106.7],[10.9,106.8]], routingMetadataJson: '{"trafficSource":"TOMTOM_AVAILABLE_LIVE_AND_HISTORICAL","guidance":{"instructions":[{"message":"Đi thẳng 2 km","routeOffsetInMeters":500}]}}' } });
  api.getTripTelemetry.mockResolvedValue({ result: [] });
  api.getContainers.mockResolvedValue({ result: [] });
  api.getTripProposals.mockResolvedValue({ result: [] });
});

const mount = () => render(<MemoryRouter initialEntries={['/trips/trip-1']}><Routes><Route path="/trips/:tripId" element={<TripTrackingPage />} /></Routes></MemoryRouter>);

it('calculates a road proposal, previews its separate geometry and approves its identity', async () => {
  const proposal = { id: 'proposal-1', status: 'PENDING_DISPATCHER', routeGeometryAvailable: true,
    proposedDistanceMeters: 24000, proposedDurationSeconds: 1200, benefitRatio: 0.2,
    routeWaypoints: [[10.8,106.7],[10.81,106.71],[10.9,106.8]], routingMetadataJson: '{"trafficSource":"NOT_AVAILABLE"}' };
  api.calculateTripReroute.mockImplementation(async () => { api.getTripProposals.mockResolvedValue({ result: [proposal] }); return { result: proposal, message: 'Đã tính đề xuất từ đường thực' }; });
  api.decideRerouteProposal.mockImplementation(async () => { api.getTripProposals.mockResolvedValue({ result: [] }); return { result: { ...proposal, status: 'ACCEPTED' } }; });
  mount();
  const calculate = await screen.findByRole('button', { name: 'Tính đổi tuyến từ GPS hiện tại' });
  await waitFor(() => expect(calculate).toBeEnabled());
  fireEvent.click(calculate);
  expect(await screen.findByTestId('proposed-line')).toHaveAttribute('data-vertices','3');
  expect(screen.getByTestId('route-line')).toHaveAttribute('data-has-meta', 'true');
  expect(screen.getByText(/Đi thẳng 2 km/)).toBeInTheDocument();
  expect(screen.getByText(/24.00 km · 20 phút/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Phê Duyệt Đổi Tuyến/ }));
  await waitFor(() => expect(api.decideRerouteProposal).toHaveBeenCalledWith('proposal-1','ACCEPTED',expect.any(Object)));
  expect(api.calculateTripReroute).toHaveBeenCalledWith('trip-1');
});

it('keeps an estimated proposal unapproved when no road geometry is available', async () => {
  api.getTripProposals.mockResolvedValue({ result: [{id:'old-estimate',status:'PENDING_DISPATCHER',routeGeometryAvailable:false}] });
  mount();
  expect(await screen.findByRole('button',{name:/Phê Duyệt Đổi Tuyến/})).toBeDisabled();
  expect(screen.getByText(/chưa có hình học đường mới/)).toBeInTheDocument();
});
