import { useEffect, useRef } from "react";
import { FONT } from "../constants/colors.js";

export default function StickyHeader({ onHeight }) {
  const ref    = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const FULL_PAD_V = 24;
    const MIN_PAD_V  = 6;

    function update() {
      const el = ref.current; if (!el) return;
      const sy = window.scrollY;
      const fullH = el.scrollHeight;
      const progress = Math.min(sy / Math.max(fullH, 1), 1);

      const padV = FULL_PAD_V - (FULL_PAD_V - MIN_PAD_V) * progress;
      el.style.padding = `${padV}px 16px`;

      const logo = el.querySelector(".hp-logo");
      if (logo) { const s = 38 - 16*progress; logo.style.width=s+"px"; logo.style.height=s+"px"; }

      const title = el.querySelector(".hp-title");
      if (title) { title.style.fontSize = (44 - 20*progress)+"px"; }

      const tag = el.querySelector(".hp-tagline");
      if (tag) { tag.style.opacity = Math.max(0, 1-progress*2); tag.style.maxHeight = (1-progress)*24+"px"; }

      onHeight && onHeight(el.getBoundingClientRect().height);
    }

    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive:true });
    update();
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(rafRef.current); };
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(() => onHeight && onHeight(ref.current.getBoundingClientRect().height));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} style={{
      position:"sticky", top:0, zIndex:100,
      background:"linear-gradient(180deg,#1a1508 0%,#0e0c07 100%)",
      borderBottom:"1px solid rgba(205,163,83,0.13)",
      backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
      textAlign:"center", padding:"24px 16px 18px", willChange:"padding", overflow:"hidden",
    }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:0 }}>
        <svg className="hp-logo" width="38" height="38" viewBox="0 0 38 38" fill="none"
          style={{ flexShrink:0, willChange:"width,height" }}>
          <circle cx="19" cy="19" r="17.5" stroke="#c9a84c" strokeWidth="1.5" strokeOpacity=".7"/>
          <circle cx="19" cy="19" r="12"   stroke="#c9a84c" strokeWidth="1"   strokeOpacity=".3"/>
          <circle cx="19" cy="19" r="5"    stroke="#c9a84c" strokeWidth="1.2" strokeOpacity=".6"/>
          <circle cx="19" cy="7.2"  r="2.5" fill="#c9a84c" opacity=".8"/>
          <circle cx="27.9" cy="12.5" r="2.5" fill="#c9a84c" opacity=".8"/>
          <circle cx="27.9" cy="25.5" r="2.5" fill="#c9a84c" opacity=".8"/>
          <circle cx="19" cy="30.8"  r="2.5" fill="#c9a84c" opacity=".8"/>
          <circle cx="10.1" cy="25.5" r="2.5" fill="#c9a84c" opacity=".8"/>
          <circle cx="10.1" cy="12.5" r="2.5" fill="#c9a84c" opacity=".8"/>
        </svg>
        <h1 className="hp-title" style={{
          fontSize:"44px", fontWeight:700, color:"#e8d4a0", margin:0, letterSpacing:-1,
          fontFamily:FONT, lineHeight:1.0, willChange:"font-size",
          textShadow:"0 0 30px rgba(205,163,83,0.25)",
        }}>Handpanist</h1>
      </div>
      <div className="hp-tagline" style={{
        fontSize:12, color:"#6a5a30", fontFamily:FONT, fontStyle:"italic", letterSpacing:.5,
        maxHeight:24, overflow:"hidden", willChange:"opacity,max-height", marginTop:6,
      }}>
        find the harmony hiding in your hands
      </div>
    </div>
  );
}
