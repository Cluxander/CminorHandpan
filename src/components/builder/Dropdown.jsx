import { useState, useEffect, useRef } from "react";

export default function Dropdown({ value, onChange, options, placeholder = "Select…", className: extraClass = "", style: extraStyle = {} }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const sel = options.find(o => (o.value ?? o) === value);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className={`hp-dropdown${extraClass ? " " + extraClass : ""}`} style={extraStyle}>
      <button onClick={() => setOpen(o => !o)} className="hp-dropdown__trigger">
        <span>{sel ? (sel.label ?? sel) : placeholder}</span>
        <span className="hp-dropdown__arrow">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="hp-dropdown__menu">
          {options.map(o => {
            const v = o.value ?? o; const l = o.label ?? o;
            const active = v === value;
            return (
              <button key={v} onClick={() => { onChange(v); setOpen(false); }}
                className={`hp-dropdown__option ${active ? "hp-dropdown__option--active" : "hp-dropdown__option--default"}`}>
                {l}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
