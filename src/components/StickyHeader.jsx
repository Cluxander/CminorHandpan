import { useEffect, useRef } from "react";

export default function StickyHeader({ onHeight }) {
  const ref    = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const el = ref.current; if (!el) return;

    // Measure scroll range once — never read layout in the hot scroll path
    const SCROLL_RANGE = el.getBoundingClientRect().height;

    // Cache child refs once
    const logo  = el.querySelector(".hp-logo");
    const title = el.querySelector(".hp-title");
    const tag   = el.querySelector(".hp-tagline");

    function update() {
      // In landscape (short viewport) force fully-collapsed state — no scroll happens there
      const isLandscape = window.innerHeight <= 600 && window.innerWidth > window.innerHeight;
      const t = isLandscape ? 1 : Math.min(window.scrollY / SCROLL_RANGE, 1);

      // Padding: top 24→6, bottom 18→6
      el.style.paddingTop    = `${12 - 18 * t}px`;
      el.style.paddingBottom = `${12 - 12 * t}px`;

      // Logo: scale 38→22 via transform (GPU-composited, no layout)
      if (logo) logo.style.transform = `scale(${(38 - 16 * t) / 38})`;

      // Title: 44→24px — layout but unavoidable for text sharpness
      if (title) title.style.fontSize = `${44 - 20 * t}px`;

      // Tagline: fade + slide up — no maxHeight (causes layout on Safari)
      if (tag) {
        tag.style.opacity   = `${Math.max(0, 1 - t * 2)}`;
        tag.style.transform = `translateY(${-t * 10}px)`;
        tag.style.marginTop = 6-(t*6)+"px";
        tag.style.paddingBottom = 10-(t*10)+"px";
      }

      // Report height in the same rAF so the sticky panel below updates this frame,
      // not in a delayed ResizeObserver callback
      onHeight && onHeight(el.getBoundingClientRect().height);
    }

    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Also report on resize (font scaling etc.) via ResizeObserver
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => onHeight && onHeight(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="hp-sticky-header">
      <div className="hp-sticky-header__inner">
        <svg className="hp-logo" width="38" height="38" viewBox="0 0 38 38" fill="none">
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
        <h1 className="hp-title">Handpanist</h1>
      </div>
      <div className="hp-tagline">
        know your handpan
      </div>
    </div>
  );
}
