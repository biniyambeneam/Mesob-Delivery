export default function Field({
  label,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  children,
  ...props
}) {
  return (
    <label className="block space-y-2" htmlFor={id}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children ?? (
        <input
          id={id}
          type={type}
          className="input"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          {...props}
        />
      )}
    </label>
  );
}
