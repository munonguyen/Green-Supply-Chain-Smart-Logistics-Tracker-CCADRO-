import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg-primary, #f8fafc)', color: 'var(--text-main, #172b32)' }}>
      <section style={{ maxWidth: 440, textAlign: 'center' }}>
        <p style={{ fontSize: 48, fontWeight: 800, margin: 0 }}>404</p>
        <h1 style={{ fontSize: 24 }}>Không tìm thấy trang</h1>
        <p>Trang bạn yêu cầu không tồn tại hoặc không thể truy cập.</p>
        <Link className="btn btn-primary" to="/">Về trang chủ</Link>
      </section>
    </main>
  );
}
