import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { extractGeoJsonLineStringPoints, fetchLiveOsrmRoute } from '../services/roadRoutingService';
import RouteEvidence from '../shared/map/RouteEvidence';

describe('approved road geometry', () => {
  it('keeps each road vertex and converts GeoJSON longitude/latitude to map latitude/longitude', () => {
    expect(extractGeoJsonLineStringPoints({ type: 'LineString', coordinates: [[106.7, 10.8], [106.71, 10.81], [106.8, 10.9]] }))
      .toEqual([[10.8, 106.7], [10.81, 106.71], [10.9, 106.8]]);
  });
  it('rejects an entire malformed route instead of drawing a shortcut over a missing vertex', () => {
    for (const invalid of [[null, 10.81], [106.71, 190], ['', 10.81]]) {
      expect(extractGeoJsonLineStringPoints({ type: 'LineString', coordinates: [[106.7, 10.8], invalid, [106.8, 10.9]] })).toEqual([]);
    }
    expect(extractGeoJsonLineStringPoints('{broken')).toEqual([]);
    expect(extractGeoJsonLineStringPoints({ type: 'Polygon', coordinates: [[106.7, 10.8], [106.8, 10.9]] })).toEqual([]);
  });
});

describe('route evidence', () => {
  it('shows missing traffic and carbon estimation limits for OSRM', () => {
    render(<RouteEvidence candidate={{ routingMetadataJson: '{broken' }} />);
    expect(screen.getByText(/Chưa có nguồn giao thông thực tế/)).toBeInTheDocument();
    expect(screen.getByText(/chưa đo tiêu hao xe/)).toBeInTheDocument();
  });
  it('shows traffic delay and turn instructions from the provider', () => {
    render(<RouteEvidence candidate={{ routingMetadataJson: JSON.stringify({
      trafficSource: 'TOMTOM_AVAILABLE_LIVE_AND_HISTORICAL', shortestCandidate: true,
      summary: { trafficDelayInSeconds: 300 },
      guidance: { instructions: [{ message: 'Rẽ phải', routeOffsetInMeters: 200 }] }
    }) }} />);
    expect(screen.getByText(/Chậm do giao thông.*5 phút/)).toBeInTheDocument();
    expect(screen.getByText(/Rẽ phải/)).toBeInTheDocument();
    expect(screen.getByText('Ngắn nhất trong tập phương án')).toBeInTheDocument();
  });
});


describe('road preview integrity', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
  const response = (coordinates, extra = {}) => ({ ok: true, json: async () => ({ code: 'Ok', routes: [{
    distance: 30000, duration: 2400, geometry: { type: 'LineString', coordinates }, ...extra
  }] }) });

  it('rejects invalid coordinates before requesting directions', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    for (const origin of [[null, 106.7], ['', 106.7], [true, 106.7], [91, 106.7], [10.8, 181]]) {
      expect(await fetchLiveOsrmRoute(origin, [10.9, 106.8])).toBeNull();
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a route that silently snaps to a distant road', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([[106.72, 10.82], [106.8, 10.9]])));
    expect(await fetchLiveOsrmRoute([10.8, 106.7], [10.9, 106.8])).toBeNull();
  });

  it('retains fine coordinate differences and refreshes expired route previews', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockImplementation(async (url) => {
      const first = url.includes('106.700020') ? [106.70002, 10.80002] : [106.70001, 10.80001];
      return response([first, [106.71, 10.81], [106.8, 10.9]]);
    });
    vi.stubGlobal('fetch', fetch);
    const first = await fetchLiveOsrmRoute([10.80001, 106.70001], [10.9, 106.8]);
    expect(first.trafficSource).toBe('NOT_AVAILABLE');
    expect(first.points).toHaveLength(3);
    await fetchLiveOsrmRoute([10.80002, 106.70002], [10.9, 106.8]);
    await fetchLiveOsrmRoute([10.80001, 106.70001], [10.9, 106.8]);
    expect(fetch).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(60_001);
    await fetchLiveOsrmRoute([10.80001, 106.70001], [10.9, 106.8]);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[0][0]).toContain('radiuses=100;100');
  });
});
