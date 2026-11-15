import { useState } from 'react';
import PropTypes from 'prop-types';

// Holds the values being edited; hands them to the parent on Apply (onApply).
export default function FilterForm({ fields, initialValues, onApply }) {
  const [values, setValues] = useState(initialValues);

  function handleChange(e) {
    setValues({ ...values, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    onApply(values);
  }

  function handleClear() {
    const empty = {};
    fields.forEach((f) => { empty[f.name] = f.clearTo ?? ''; });
    setValues(empty);
    onApply(empty);
  }

  const dirty = fields.some((f) => (values[f.name] || '') !== (f.clearTo ?? ''));

  return (
    <form className="filters" onSubmit={handleSubmit}>
      {fields.map((field) => (
        <label key={field.name} className={`filter ${field.wide ? 'filter-wide' : ''}`}>
          <span>{field.label}</span>
          {field.options ? (
            <select name={field.name} value={values[field.name] || ''} onChange={handleChange}>
              {!field.noAll && <option value="">{field.allLabel || 'All'}</option>}
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <input
              name={field.name}
              type={field.type || 'text'}
              value={values[field.name] || ''}
              onChange={handleChange}
              placeholder={field.placeholder}
            />
          )}
        </label>
      ))}
      <div className="filter-buttons">
        <button type="submit" className="btn btn-dark">Apply</button>
        {dirty && <button type="button" className="btn btn-quiet" onClick={handleClear}>Reset</button>}
      </div>
    </form>
  );
}

FilterForm.propTypes = {
  fields: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      type: PropTypes.string,
      placeholder: PropTypes.string,
      wide: PropTypes.bool,
      noAll: PropTypes.bool,
      allLabel: PropTypes.string,
      clearTo: PropTypes.string,
      options: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.string, label: PropTypes.string })),
    })
  ).isRequired,
  initialValues: PropTypes.object.isRequired,
  onApply: PropTypes.func.isRequired,
};

export function toOptions(list) {
  return list.map((item) => ({ value: item, label: item }));
}

// turn submitted filter values into search params, dropping empty ones
export function cleanParams(values) {
  const out = {};
  Object.entries(values).forEach(([k, v]) => { if (v) out[k] = v; });
  return out;
}
