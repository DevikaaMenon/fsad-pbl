import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  async function handleConfirm() {
    setBusy(true);
    await onConfirm();
  }

  return (
    <div className="dialog-backdrop" onMouseDown={onCancel}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={(e) => e.stopPropagation()}>
        <h2 id="dialog-title">{title}</h2>
        {message && <p>{message}</p>}
        <div className="dialog-actions">
          <button type="button" className="btn btn-quiet" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" ref={confirmRef} className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={handleConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

ConfirmDialog.propTypes = {
  title: PropTypes.string.isRequired,
  message: PropTypes.node,
  confirmLabel: PropTypes.string.isRequired,
  danger: PropTypes.bool,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

// const [confirm, dialog] = useConfirm();
// confirm({ title, message, confirmLabel, danger, onConfirm }) then render {dialog}
export default function useConfirm() {
  const [options, setOptions] = useState(null);

  const dialog = options ? (
    <ConfirmDialog
      confirmLabel="Confirm"
      {...options}
      onCancel={() => setOptions(null)}
      onConfirm={async () => {
        try {
          await options.onConfirm();
        } finally {
          setOptions(null);
        }
      }}
    />
  ) : null;

  return [setOptions, dialog];
}
