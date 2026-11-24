import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import L from 'leaflet';
import VehicleMarker from '../shared/map/VehicleMarker';
const mocks = vi.hoisted(() => ({ marker: null }));
vi.mock('leaflet', () => ({ default: {
  marker: vi.fn(() => mocks.marker), divIcon: vi.fn((options) => options)
} }));

describe('persistent GPS marker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.marker = {
      addTo: vi.fn().mockReturnThis(), on: vi.fn().mockReturnThis(), remove: vi.fn(),
      setLatLng: vi.fn(), setIcon: vi.fn(), setZIndexOffset: vi.fn(), getElement: () => document.createElement('div'),
      unbindPopup: vi.fn(), getPopup: () => null, bindPopup: vi.fn()
    };
  });
  it('updates measured coordinates without recreating its icon and always calls the latest selection handler', () => {
    const first = vi.fn(), next = vi.fn(), map = {};
    const { rerender, unmount } = render(<VehicleMarker map={map} position={[10.8,106.7]} vehicleCode="CONT-A" showLabel={false} onClick={first} />);
    rerender(<VehicleMarker map={map} position={[10.81,106.71]} vehicleCode="CONT-A" showLabel={false} onClick={next} />);
    expect(L.marker).toHaveBeenCalledTimes(1);
    expect(mocks.marker.setIcon).toHaveBeenCalledTimes(1);
    expect(mocks.marker.setLatLng).toHaveBeenLastCalledWith([10.81,106.71]);
    expect(L.divIcon.mock.calls[0][0].html).toContain('display: none');
    mocks.marker.on.mock.calls[0][1]();
    expect(next).toHaveBeenCalledTimes(1); expect(first).not.toHaveBeenCalled();
    unmount(); expect(mocks.marker.remove).toHaveBeenCalledTimes(1);
  });
  it('hides an invalid GPS fix and restores a marker only when a complete valid pair arrives', () => {
    const map = {};
    const { rerender } = render(<VehicleMarker map={map} position={[null,106.7]} />);
    expect(L.marker).not.toHaveBeenCalled();
    rerender(<VehicleMarker map={map} position={[10.8,106.7]} />);
    expect(L.marker).toHaveBeenCalledTimes(1);
    rerender(<VehicleMarker map={map} position={[91,106.7]} />);
    expect(mocks.marker.remove).toHaveBeenCalledTimes(1);
  });
});
