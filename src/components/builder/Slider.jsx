export default function Slider({ min, max, step = 1, value, onChange, label }) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <div className="hp-slider">
      <div className="hp-slider__track-wrap">
        <div className="hp-slider__track-bg"/>
        <div className="hp-slider__track-fill" style={{ width: `${pct}%` }}/>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseInt(e.target.value))}
          className="hp-slider__input"/>
        <div className="hp-slider__thumb" style={{ left: `calc(${pct}% - 7px)` }}/>
      </div>
      {label !== undefined && (
        <span className="hp-slider__label">{label}</span>
      )}
    </div>
  );
}
