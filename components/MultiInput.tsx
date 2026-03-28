"use client";

interface Props {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}

export default function MultiInput({
  values,
  onChange,
  placeholder,
}: Props) {
  const update = (i: number, value: string) => {
    const updated = [...values];
    updated[i] = value;
    onChange(updated);
  };

  const add = () => {
    onChange([...values, ""]);
  };

  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <input
          key={i}
          className="input"
          placeholder={placeholder}
          value={v}
          onChange={(e) => update(i, e.target.value)}
        />
      ))}

      <button onClick={add} className="btn btn-secondary">
        + Add
      </button>
    </div>
  );
}
