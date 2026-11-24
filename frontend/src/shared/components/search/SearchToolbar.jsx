import React from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import SearchField from './SearchField';

/** SearchField composed with optional result metadata and a soft-delete filter. */
export default function SearchToolbar({
  value = '',
  onChange,
  label = 'Tìm kiếm',
  placeholder,
  hint,
  loading = false,
  totalCount,
  matchedCount,
  showDeleted = false,
  onToggleDeleted,
  deletedCount = 0,
  disabled = false,
  className = '',
  style,
  id
}) {
  const hasCounts = Number.isFinite(totalCount) && Number.isFinite(matchedCount);
  const hasQuery = String(value).trim().length > 0;
  return (
    <div className={['search-toolbar', className].filter(Boolean).join(' ')} style={style}>
      <div className="search-toolbar__row">
        <SearchField
          className="search-toolbar__field"
          id={id}
          value={value}
          onValueChange={onChange}
          label={label}
          placeholder={placeholder}
          loading={loading}
          disabled={disabled}
        />
        {typeof onToggleDeleted === 'function' && (
          <button
            type="button"
            className="search-toolbar__deleted"
            aria-pressed={showDeleted}
            onClick={() => onToggleDeleted(!showDeleted)}
            disabled={disabled}
            title={
              showDeleted
                ? 'Đang xem thùng rác; bấm để xem danh sách hoạt động'
                : 'Xem các mục đã xóa mềm'
            }
          >
            {showDeleted ? (
              <RotateCcw size={16} aria-hidden="true" />
            ) : (
              <Trash2 size={16} aria-hidden="true" />
            )}
            <span>Thùng rác ({deletedCount})</span>
          </button>
        )}
      </div>
      {(hasCounts || hint || loading) && (
        <div className="search-toolbar__meta">
          <span aria-live={loading ? 'off' : 'polite'} aria-atomic="true">
            {loading
              ? 'Đang tìm kiếm…'
              : hasCounts
                ? hasQuery
                  ? matchedCount.toLocaleString('vi-VN') +
                    ' / ' +
                    totalCount.toLocaleString('vi-VN') +
                    ' kết quả'
                  : totalCount.toLocaleString('vi-VN') + ' mục'
                : ''}
          </span>
          {hint && <span>{hint}</span>}
        </div>
      )}
    </div>
  );
}
