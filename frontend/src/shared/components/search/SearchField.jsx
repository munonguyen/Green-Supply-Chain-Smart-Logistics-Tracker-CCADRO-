import React, { forwardRef, useId, useImperativeHandle, useRef } from 'react';
import { LoaderCircle, Search, X } from 'lucide-react';
import './search.css';

/** Controlled search input. onValueChange receives a string; filtering stays in the feature. */
const SearchField = forwardRef(function SearchField(
  {
    id,
    value = '',
    onValueChange,
    label = 'Tìm kiếm',
    hideLabel = false,
    placeholder = 'Nhập từ khóa tìm kiếm…',
    hint,
    error,
    loading = false,
    disabled = false,
    readOnly = false,
    clearLabel = 'Xóa tìm kiếm',
    tone = 'brand',
    className = '',
    style,
    onKeyDown,
    onCompositionStart,
    onCompositionEnd,
    'aria-describedby': describedBy,
    'aria-invalid': ariaInvalid,
    ...inputProps
  },
  forwardedRef
) {
  const generatedId = useId();
  const inputId = id || 'search-' + generatedId;
  const inputRef = useRef(null);
  const composing = useRef(false);
  useImperativeHandle(forwardedRef, () => inputRef.current);
  const text = String(value ?? '');
  const canClear = text.length > 0 && !disabled && !readOnly && typeof onValueChange === 'function';
  const messageId = error || hint ? inputId + '-message' : undefined;
  const description = [describedBy, messageId].filter(Boolean).join(' ') || undefined;

  const clear = () => {
    inputRef.current?.focus();
    onValueChange?.('');
  };

  return (
    <div
      className={[
        'search-field',
        tone === 'blue' && 'search-field--blue',
        disabled && 'search-field--disabled',
        error && 'search-field--error',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      <label
        className={hideLabel ? 'search-field__sr-only' : 'search-field__label'}
        htmlFor={inputId}
      >
        {label}
      </label>
      <div className="search-field__control">
        {loading ? (
          <LoaderCircle
            size={18}
            className="search-field__icon search-field__spinner"
            aria-hidden="true"
          />
        ) : (
          <Search size={18} className="search-field__icon" aria-hidden="true" />
        )}
        <input
          {...inputProps}
          id={inputId}
          ref={inputRef}
          className="search-field__input"
          type="search"
          value={text}
          disabled={disabled}
          readOnly={readOnly}
          placeholder={placeholder}
          autoComplete={inputProps.autoComplete ?? 'off'}
          enterKeyHint={inputProps.enterKeyHint ?? 'search'}
          aria-describedby={description}
          aria-invalid={error ? true : ariaInvalid}
          aria-busy={loading || undefined}
          onChange={(event) => onValueChange?.(event.target.value)}
          onCompositionStart={(event) => {
            composing.current = true;
            onCompositionStart?.(event);
          }}
          onCompositionEnd={(event) => {
            composing.current = false;
            onCompositionEnd?.(event);
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (event.defaultPrevented || composing.current || event.nativeEvent.isComposing)
              return;
            if (event.key === 'Escape' && canClear) {
              event.preventDefault();
              event.stopPropagation();
              clear();
            }
          }}
        />
        {canClear && (
          <button
            className="search-field__clear"
            type="button"
            onClick={clear}
            aria-label={clearLabel}
            title={clearLabel}
          >
            <X size={17} aria-hidden="true" />
          </button>
        )}
      </div>
      {messageId && (
        <p id={messageId} className="search-field__message" role={error ? 'alert' : undefined}>
          {error || hint}
        </p>
      )}
      {loading && (
        <span className="search-field__sr-only" role="status">
          Đang tìm kiếm…
        </span>
      )}
    </div>
  );
});

export default SearchField;
