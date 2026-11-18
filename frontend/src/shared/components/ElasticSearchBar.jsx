import React from 'react';
import { RotateCcw, Search, Sparkles, Trash2, X } from 'lucide-react';

/**
 * Reusable Elastic-style Multi-Field Fuzzy Search Bar + Soft-Delete Trash Toggle.
 */
export default function ElasticSearchBar({
  value = '',
  onChange,
  placeholder = 'Tìm kiếm thông minh không dấu (Elastic Search)...',
  totalCount = 0,
  matchedCount = 0,
  tookMs = 0,
  showDeleted = false,
  onToggleDeleted = null,
  deletedCount = 0,
  minWidth = 260,
  rounded = 999,
  style = {}
}) {
  const hasQuery = Boolean(value && value.trim().length > 0);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        ...style
      }}
    >
      <div
        style={{
          position: 'relative',
          minWidth,
          flex: 1,
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <Search
          size={14}
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: hasQuery ? '#10b981' : '#94a3b8',
            pointerEvents: 'none'
          }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          style={{
            width: '100%',
            padding: hasQuery ? '8px 118px 8px 34px' : '8px 72px 8px 34px',
            borderRadius: rounded,
            border: hasQuery
              ? '1px solid rgba(16, 185, 129, 0.55)'
              : '1px solid rgba(148, 163, 184, 0.3)',
            background: hasQuery ? 'rgba(16, 185, 129, 0.06)' : 'rgba(148, 163, 184, 0.06)',
            color: 'inherit',
            fontSize: '0.8rem',
            outline: 'none',
            transition: 'border-color 0.2s ease, background 0.2s ease'
          }}
        />

        <div
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5
          }}
        >
          {hasQuery ? (
            <>
              <span
                title={`Elastic fuzzy match • ${tookMs || 0.1} ms`}
                style={{
                  fontSize: '0.67rem',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 999,
                  background: 'rgba(16, 185, 129, 0.16)',
                  color: '#10b981',
                  whiteSpace: 'nowrap'
                }}
              >
                {matchedCount}/{totalCount}
              </span>
              <button
                type="button"
                onClick={() => onChange('')}
                title="Xóa từ khóa tìm kiếm"
                style={{
                  border: 'none',
                  background: 'rgba(148, 163, 184, 0.2)',
                  color: 'inherit',
                  borderRadius: 999,
                  width: 20,
                  height: 20,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <X size={12} />
              </button>
            </>
          ) : (
            <span
              title="Elastic Search Engine (hỗ trợ gõ không dấu, nhiều từ khóa & sửa lỗi chính tả)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: '0.66rem',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 999,
                background: 'rgba(56, 189, 248, 0.12)',
                color: '#38bdf8',
                whiteSpace: 'nowrap',
                pointerEvents: 'none'
              }}
            >
              <Sparkles size={10} />
              Elastic
            </span>
          )}
        </div>
      </div>

      {typeof onToggleDeleted === 'function' && (
        <button
          type="button"
          onClick={() => onToggleDeleted(!showDeleted)}
          title={
            showDeleted
              ? 'Đang xem mục đã xóa mềm — bấm để quay lại danh sách hoạt động'
              : 'Xem các mục đã xóa mềm & khôi phục'
          }
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '7px 11px',
            borderRadius: rounded,
            border: showDeleted
              ? '1px solid rgba(245, 158, 11, 0.55)'
              : '1px solid rgba(148, 163, 184, 0.28)',
            background: showDeleted ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
            color: showDeleted ? '#f59e0b' : 'inherit',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          {showDeleted ? <RotateCcw size={13} /> : <Trash2 size={13} />}
          <span>{showDeleted ? `Thùng rác (${deletedCount})` : `Đã xóa mềm (${deletedCount})`}</span>
        </button>
      )}
    </div>
  );
}

