export default function PanIcon({ size = 14, style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={style}>
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="7" cy="7" r="2.2" stroke="currentColor" strokeWidth="0.9"/>
      <circle cx="7" cy="2.3" r="1.1" fill="currentColor" opacity=".7"/>
      <circle cx="10.7" cy="4.7" r="1.1" fill="currentColor" opacity=".7"/>
      <circle cx="10.7" cy="9.3" r="1.1" fill="currentColor" opacity=".7"/>
      <circle cx="7" cy="11.7" r="1.1" fill="currentColor" opacity=".7"/>
      <circle cx="3.3" cy="9.3" r="1.1" fill="currentColor" opacity=".7"/>
      <circle cx="3.3" cy="4.7" r="1.1" fill="currentColor" opacity=".7"/>
    </svg>
  );
}
