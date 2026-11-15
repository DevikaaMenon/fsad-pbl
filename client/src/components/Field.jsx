import PropTypes from 'prop-types';

// Label + input (passed as children) + error / hint text.
export default function Field({ label, error, hint, children }) {
  return (
    <label className={`field${error ? ' field-error' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {error ? <small className="field-msg">{error}</small> : hint && <small className="field-hint">{hint}</small>}
    </label>
  );
}

Field.propTypes = {
  label: PropTypes.string.isRequired,
  error: PropTypes.string,
  hint: PropTypes.node,
  children: PropTypes.node.isRequired,
};
