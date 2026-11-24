import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import L from 'leaflet';
import RoutePolyline from '../shared/map/RoutePolyline';

vi.mock('leaflet', () => ({ default: {
  polyline: vi.fn(() => ({ bindTooltip: vi.fn(), getBounds: vi.fn() })),
  layerGroup: vi.fn(() => ({ addTo: vi.fn().mockReturnValue({ remove: vi.fn() }) }))
} }));

describe('traffic on provider geometry', () => {
  beforeEach(() => vi.clearAllMocks());
  const positions = [[10.8, 106.7], [10.81, 106.71], [10.82, 106.72], [10.9, 106.8]];

  it('colors only the exact vertices of a reported delay and labels its calculation time', () => {
    render(<RoutePolyline map={{}} positions={positions} autoFit={false} showCorridorBuffer={false}
      routingMetadataJson={JSON.stringify({ fetchedAt: '2026-11-21T08:00:00Z', trafficSections: [
        { sectionType: 'TRAFFIC', startPointIndex: 1, endPointIndex: 2, delayInSeconds: 360 },
        { sectionType: 'TRAFFIC', startPointIndex: 0, endPointIndex: 99, delayInSeconds: 600 }
      ] })} />);
    expect(L.polyline).toHaveBeenCalledTimes(2);
    expect(L.polyline.mock.calls[1][0]).toEqual(positions.slice(1, 3));
    expect(L.polyline.mock.calls[1][1]).toMatchObject({ color: '#dc2626', smoothFactor: 0 });
    const overlay = L.polyline.mock.results[1].value;
    expect(overlay.bindTooltip.mock.calls[0][0].textContent).toContain('chậm 6 phút');
    expect(overlay.bindTooltip.mock.calls[0][0].textContent).toContain('dữ liệu');
  });

  it('does not invent congestion when traffic evidence is absent or invalid', () => {
    render(<RoutePolyline map={{}} positions={positions} autoFit={false} showCorridorBuffer={false}
      routingMetadataJson="{broken" />);
    expect(L.polyline).toHaveBeenCalledTimes(1);
    expect(L.polyline.mock.calls[0][0]).toBe(positions);
  });
});
