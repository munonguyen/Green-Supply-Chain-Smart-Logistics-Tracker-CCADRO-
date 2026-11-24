import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export default function ContainerEditorDialog({ title, code, busy, onClose, children }) {
  const dialog = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    if (typeof element.showModal === 'function') element.showModal();
    else element.setAttribute('open', '');
    return () => {
      if (element.open && typeof element.close === 'function') element.close();
      if (opener instanceof HTMLElement && opener.isConnected)
        opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className="container-editor-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') event.stopPropagation();
      }}
    >
      <header className="container-editor-header">
        <div>
          <span>{code}</span>
          <h3 id={titleId}>{title}</h3>
        </div>
        <button
          type="button"
          className="container-icon-button"
          aria-label={'Đóng ' + title.toLocaleLowerCase('vi')}
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
