import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RealTimeFleetMap3D from '../shared/map/RealTimeFleetMap3D';
import { gpsPosition, reconcileFleet } from '../shared/map/fleetTelemetry';

const mocks = vi.hoisted(() => ({ api: { getLiveFleetTelemetry: vi.fn() }, lines: vi.fn(), map: vi.fn() }));
vi.mock('../services/api', () => ({ api: mocks.api, gatewayUrl: (path) => path }));
vi.mock('../shared/map/MapView', () => ({ default: (props) => { mocks.map(props); return <div data-testid="map">{props.children}</div>; } }));
vi.mock('../shared/map/VehicleMarker', () => ({ default: (props) => <button aria-label={`Marker ${props.vehicleCode}`} onClick={props.onClick}>{props.position?.join(',')}</button> }));
vi.mock('../shared/map/RoutePolyline', () => ({ default: (props) => { mocks.lines(props); return null; } }));
vi.mock('../shared/map/OriginMarker', () => ({ default: () => null }));
vi.mock('../shared/map/DestinationMarker', () => ({ default: () => null }));
const item = (code, extra = {}) => ({ containerId: code, containerCode: code, tripId: `trip-${code}`, vehicleCode: 'SHARED-TRACTOR',
  latitude: 10.8, longitude: 106.7, speedKmh: 40, lastTelemetryAt: new Date().toISOString(),
  routeWaypoints: [[10.7,106.6],[10.8,106.7],[10.9,106.8]], routeSource: 'POSTGIS_ROUTE_VERSION', ...extra });
let stream;
class EventSourceMock {
  constructor() { this.handlers = {}; stream = this; }
  addEventListener(name, handler) { this.handlers[name] = handler; }
  close() {}
  send(name, value) { this.handlers[name]({ data: JSON.stringify(value) }); }
}

describe('fleet selection and accurate GPS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('EventSource', EventSourceMock);
    const storage = new Map();
    vi.stubGlobal('localStorage', { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), clear: () => storage.clear() });
    Element.prototype.scrollTo = vi.fn();
    mocks.api.getLiveFleetTelemetry.mockResolvedValue({ result: [item('CONT-A'), item('CONT-B', { latitude: 10.85, driverName: 'Tài xế B' })] });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('selects the exact container from a marker and scrolls only its list to expanded details', async () => {
    render(<RealTimeFleetMap3D />);
    await screen.findByRole('button', { name: 'Marker CONT-B' });
    fireEvent.click(screen.getByRole('button', { name: 'Marker CONT-B' }));
    const details = screen.getByLabelText('Chi tiết CONT-B');
    expect(within(details).getByText('Tài xế B')).toBeInTheDocument();
    expect(within(details).getByText('10.850000, 106.700000')).toBeInTheDocument();
    expect(screen.queryByLabelText('Chi tiết CONT-A')).not.toBeInTheDocument();
    expect(Element.prototype.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
    expect(document.activeElement).toHaveAttribute('aria-expanded', 'true');
    expect(mocks.map.mock.calls.at(-1)[0].focusPosition).toBeNull();
    expect(mocks.lines.mock.calls.at(-1)[0].autoFit).toBe(false);
    expect(within(details).getByRole('link').getAttribute('href')).toBe('/containers?container=CONT-B');
  });

  it('preserves selection, route vertices and list order across updates; rejects older GPS', async () => {
    mocks.api.getLiveFleetTelemetry.mockResolvedValue({
      result: [
        item('CONT-A'),
        item('CONT-B', { latitude: 10.85, driverName: 'Tài xế B', routingMetadataJson: '{"trafficSource":"TOMTOM_AVAILABLE_LIVE_AND_HISTORICAL"}' })
      ]
    });
    render(<RealTimeFleetMap3D />);
    fireEvent.click(await screen.findByRole('button', { name: 'Marker CONT-B' }));
    expect(mocks.lines.mock.calls.at(-1)[0].routingMetadataJson).toContain('TOMTOM_AVAILABLE_LIVE_AND_HISTORICAL');
    const time = new Date(Date.now() + 1000).toISOString();
    act(() => stream.send('fleet-telemetry-update', item('CONT-B', { latitude: 10.86, lastTelemetryAt: time })));
    expect(screen.getByRole('button', { name: 'Marker CONT-B' })).toHaveTextContent('10.86,106.7');
    expect(screen.getByLabelText('Chi tiết CONT-B')).toBeInTheDocument();
    act(() => stream.send('fleet-telemetry-update', item('CONT-B', { latitude: 11, lastTelemetryAt: '2020-01-01T00:00:00Z' })));
    expect(screen.getByRole('button', { name: 'Marker CONT-B' })).toHaveTextContent('10.86,106.7');
    expect(screen.getAllByRole('button', { name: /Marker CONT-/ }).map((node) => node.getAttribute('aria-label'))).toEqual(['Marker CONT-A', 'Marker CONT-B']);
    expect(mocks.lines.mock.calls.at(-1)[0].positions).toHaveLength(3);
    expect(Element.prototype.scrollTo).toHaveBeenCalledTimes(1);
  });

  it('clears an empty authoritative snapshot instead of leaving ghost containers', async () => {
    render(<RealTimeFleetMap3D />);
    await screen.findByRole('button', { name: 'Marker CONT-A' });
    act(() => stream.send('fleet-snapshot', []));
    expect(screen.queryAllByRole('button', { name: /Marker CONT-/ })).toHaveLength(0);
    expect(screen.getByText(/Chưa có dữ liệu container/)).toBeInTheDocument();
    expect(mocks.lines.mock.calls.at(-1)[0].positions).toEqual([]);
  });

  it('never displays baseline vehicles or inferred positions on connection failure', async () => {
    window.localStorage.setItem('ccadro_user_booked_shipments_v2', JSON.stringify([{ shipmentCode: 'FAKE-BOOKING' }]));
    mocks.api.getLiveFleetTelemetry.mockRejectedValue(new Error('offline'));
    render(<RealTimeFleetMap3D />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Làm mới GPS' })).toBeEnabled());
    expect(screen.queryAllByRole('button', { name: /Marker / })).toHaveLength(0);
    expect(screen.queryByText(/FAKE-BOOKING|51C-888.99/)).not.toBeInTheDocument();
    window.localStorage.clear();
  });

  it('shows missing GPS as unknown and never moves a container onto its route by progress', async () => {
    mocks.api.getLiveFleetTelemetry.mockResolvedValue({ result: [item('CONT-X', { latitude: null, progressPercent: 80 })] });
    render(<RealTimeFleetMap3D />);
    expect(await screen.findByLabelText('Chi tiết CONT-X')).toHaveTextContent('Chưa có tọa độ GPS');
    expect(screen.queryByRole('button', { name: 'Marker CONT-X' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bám theo CONT-X' })).toBeDisabled();
  });

  it('does not let an old HTTP response overwrite an SSE snapshot', async () => {
    let resolve;
    mocks.api.getLiveFleetTelemetry.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<RealTimeFleetMap3D />);
    act(() => stream.send('fleet-snapshot', [item('NEW')]));
    await act(async () => resolve({ result: [item('OLD')] }));
    expect(screen.getByRole('button', { name: 'Marker NEW' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marker OLD' })).not.toBeInTheDocument();
  });
});

describe('GPS normalization', () => {
  it('validates coordinate pairs without coercing empty values to zero', () => {
    for (const pair of [[null, 106], ['', 106], [true, 106], [91, 106], [10, 181], [NaN, 106]]) expect(gpsPosition(...pair)).toBeNull();
    expect(gpsPosition(0, 0)).toEqual([0, 0]);
  });
  it('preserves geometry on partial updates but clears it on explicit removal', () => {
    const previous = reconcileFleet([], [item('A')]);
    const next = reconcileFleet(previous, [{ containerId: 'A', speedKmh: 0 }], { partial: true });
    expect(next[0].waypoints).toBe(previous[0].waypoints);
    expect(next[0].currentPos).toEqual([10.8, 106.7]);
    expect(reconcileFleet(next, [{ containerId: 'A', routeWaypoints: null }], { partial: true })[0].waypoints).toEqual([]);
  });
});
