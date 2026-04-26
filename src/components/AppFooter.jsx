export default function AppFooter() {
  const ic = (path, label) => (
    <a href="#" title={label} className="hp-footer__icon-link">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d={path}/></svg>
    </a>
  );
  return (
    <footer className="hp-footer">
      <div className="hp-footer__inner">
        <div className="hp-footer__brand">
          <svg width="24" height="24" viewBox="0 0 38 38" fill="none">
            <circle cx="19" cy="19" r="17.5" stroke="#c9a84c" strokeWidth="1.5" strokeOpacity=".6"/>
            <circle cx="19" cy="19" r="5" stroke="#c9a84c" strokeWidth="1.2" strokeOpacity=".5"/>
            <circle cx="19" cy="7.2" r="2.2" fill="#c9a84c" opacity=".7"/>
            <circle cx="27.9" cy="12.5" r="2.2" fill="#c9a84c" opacity=".7"/>
            <circle cx="27.9" cy="25.5" r="2.2" fill="#c9a84c" opacity=".7"/>
            <circle cx="19" cy="30.8" r="2.2" fill="#c9a84c" opacity=".7"/>
            <circle cx="10.1" cy="25.5" r="2.2" fill="#c9a84c" opacity=".7"/>
            <circle cx="10.1" cy="12.5" r="2.2" fill="#c9a84c" opacity=".7"/>
          </svg>
          <span className="hp-footer__brand-name">Handpanist</span>
        </div>

        <div className="hp-footer__icons">
          {ic("M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z","Facebook")}
          {ic("M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z","Instagram placeholder")}
          {ic("M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.73a8.14 8.14 0 004.77 1.53V6.79a4.85 4.85 0 01-1-.1z","TikTok")}
          {ic("M22.54 6.42a2.78 2.78 0 00-1.94-1.96C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.4 19.54C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 001.94-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z","YouTube")}
          {ic("M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3","Buy me a coffee")}
        </div>

        <div className="hp-footer__copy">
          © {new Date().getFullYear()} · Made with ♥ in Bucharest
        </div>
      </div>
    </footer>
  );
}
