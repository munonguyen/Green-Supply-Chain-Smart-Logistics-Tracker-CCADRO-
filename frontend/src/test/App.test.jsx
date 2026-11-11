import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../app/App';

// Mock fetch for api calls
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        status: 'UP',
        system: 'CCADRO - Smart Green Logistics Tracker',
        version: '0.1.0-SNAPSHOT',
        postgisVersion: '3.4 USE_GEOS=1 USE_PROJ=1 USE_STATS=1'
      })
  })
);

describe('CCADRO Frontend App', () => {
  it('renders brand and navigation menu links without crashing', () => {
    render(<App />);
    expect(screen.getByText('CCADRO')).toBeInTheDocument();
    expect(screen.getByText('Green Supply Chain')).toBeInTheDocument();
    expect(screen.getAllByText('Trang Chủ')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Định Hướng Net-Zero')[0]).toBeInTheDocument();
  });

  it('renders public landing page highlights and dedicated menu links', () => {
    render(<App />);
    expect(screen.getAllByText('Định Hướng Net-Zero')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Hệ Sinh Thái Giải Pháp')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Thống Kê Phát Thải')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Tin Tức & Báo Cáo')[0]).toBeInTheDocument();
  });
});
