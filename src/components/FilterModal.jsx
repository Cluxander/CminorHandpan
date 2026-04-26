import { useState, useRef, useEffect } from "react";
import { NOTE_COLOR } from "../constants/colors.js";
import { CAT_ORDER, CAT_STYLE } from "../constants/chords.js";
import { ALL_CHORD_NAMES } from "../utils/chordDetection.js";
import { HANDPAN } from "../constants/handpan.js";

const NOTE_LIST = HANDPAN.notes.map(n => n.name);

export default function FilterModal({ open, onClose, filters, onChange, availableCats, availableChordNames, noteList }) {
  const [dragY,   setDragY]   = useState(0);
  const [visible, setVisible] = useState(false);
  const [animIn,  setAnimIn]  = useState(false);
  const dragging  = useRef(false);
  const dragStart = useRef(null);
  const panelRef  = useRef(null);

  useEffect(() => {
    if (open) {
      setDragY(0); setVisible(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimIn(true)));
    } else {
      setAnimIn(false);
      const t = setTimeout(() => setVisible(false), 320);
      return () => clearTimeout(t);
    }
  }, [open]);
  if (!visible) return null;

  const DISMISS_THRESHOLD = 90;

  const startDrag = y => {
    if (panelRef.current && panelRef.current.scrollTop > 2) return;
    dragStart.current = y; dragging.current = true;
  };
  const moveDrag = y => {
    if (!dragging.current || dragStart.current === null) return;
    setDragY(Math.max(0, y - dragStart.current));
  };
  const endDrag = y => {
    if (!dragging.current) return;
    dragging.current = false;
    const dy = Math.max(0, y - (dragStart.current ?? y));
    dragStart.current = null;
    if (dy >= DISMISS_THRESHOLD) { setDragY(0); onClose(); }
    else setDragY(0);
  };

  const { noteCounts, cats, notes, chordNames } = filters;

  const toggle = (key, val) => {
    const arr = filters[key];
    const next = arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
    onChange({ ...filters, [key]: next });
  };

  const Chip = ({ active, color, onClick, children }) => {
    const chipClass = `hp-chip ${active ? "hp-chip--active" : "hp-chip--inactive"}`;
    const chipStyle = active && color ? { "--chip-color": color } : undefined;
    return (
      <button onClick={onClick} className={chipClass} style={chipStyle}>{children}</button>
    );
  };

  const Label = ({ children }) => (
    <div className="hp-filter-label">{children}</div>
  );

  const panelTransform = dragY > 0
    ? `translateY(${dragY}px)`
    : animIn ? "translateY(0)" : "translateY(100%)";

  return (
    <>
      <div onClick={onClose}
        className="hp-filter-modal-backdrop"
        style={{ opacity: animIn ? 1 : 0 }}/>
      <div
        ref={panelRef}
        onMouseDown={e => startDrag(e.clientY)}
        onMouseMove={e => moveDrag(e.clientY)}
        onMouseUp={e => endDrag(e.clientY)}
        onMouseLeave={e => endDrag(e.clientY)}
        onTouchStart={e => startDrag(e.touches[0].clientY)}
        onTouchMove={e => {
          if (panelRef.current && panelRef.current.scrollTop > 2) { dragging.current=false; dragStart.current=null; setDragY(0); return; }
          if (dragging.current) {
            const dy = e.touches[0].clientY - (dragStart.current||0);
            if (dy > 0) { e.preventDefault(); moveDrag(e.touches[0].clientY); }
            else { dragging.current=false; dragStart.current=null; setDragY(0); }
          }
        }}
        onTouchEnd={e => endDrag(e.changedTouches[0].clientY)}
        className="hp-filter-modal-panel"
        style={{
          transform: panelTransform,
          transition: dragY > 0 ? "none" : "transform .32s cubic-bezier(.32,.72,.00,1.00)",
        }}>
        <div className="hp-filter-modal__content">
          <div className="hp-filter-modal__drag-handle"/>
          <div className="hp-filter-modal__header">
            <div className="hp-filter-modal__title">Filters</div>
            <button onClick={onClose} className="hp-filter-modal__close">✕</button>
          </div>

          <Label>Note count</Label>
          <div className="hp-filter-chips-row">
            {["all","2","3","4","5"].map(n => (
              <Chip key={n}
                active={n==="all" ? noteCounts.length===0 : noteCounts.includes(parseInt(n))}
                onClick={() => n==="all" ? onChange({...filters,noteCounts:[]}) : toggle("noteCounts",parseInt(n))}>
                {n==="all"?"All":`${n} notes`}
              </Chip>
            ))}
          </div>

          <Label>Category</Label>
          <div className="hp-filter-chips-row">
            {["all",...(availableCats||CAT_ORDER)].map(c => (
              <Chip key={c}
                active={c==="all" ? cats.length===0 : cats.includes(c)}
                color={c!=="all" ? CAT_STYLE[c]?.accent : undefined}
                onClick={() => c==="all" ? onChange({...filters,cats:[]}) : toggle("cats",c)}>
                {c==="all"?"All":CAT_STYLE[c]?.label??c}
              </Chip>
            ))}
          </div>

          <Label>Chord type</Label>
          <div className="hp-filter-chips-row hp-filter-chips-row--sm">
            <Chip active={chordNames.length===0} onClick={() => onChange({...filters,chordNames:[]})}>All</Chip>
            {(availableChordNames||ALL_CHORD_NAMES).map(nm => (
              <Chip key={nm} active={chordNames.includes(nm)} onClick={() => toggle("chordNames",nm)}>{nm}</Chip>
            ))}
          </div>

          <Label>Contains note</Label>
          <div className="hp-filter-chips-row hp-filter-chips-row--note">
            <Chip active={notes.length===0} onClick={() => onChange({...filters,notes:[]})}>All</Chip>
            {(noteList||NOTE_LIST).map(n => (
              <Chip key={n} active={notes.includes(n)} color={NOTE_COLOR(n)}
                onClick={() => toggle("notes",n)}>
                {n.replace("b","♭")}
              </Chip>
            ))}
          </div>

          <Label>Display</Label>
          <div className="hp-filter-toggle-row"
            onClick={() => onChange({...filters,hideDuplicates:!filters.hideDuplicates})}>
            <div>
              <div className="hp-filter-toggle__label">Hide duplicates</div>
              <div className="hp-filter-toggle__desc">Show only the lowest-pitch voicing per chord</div>
            </div>
            <div className={`hp-toggle-track ${filters.hideDuplicates ? "hp-toggle-track--on" : "hp-toggle-track--off"}`}>
              <div className={`hp-toggle-thumb ${filters.hideDuplicates ? "hp-toggle-thumb--on" : "hp-toggle-thumb--off"}`}/>
            </div>
          </div>

          <button onClick={() => onChange({noteCounts:[],cats:[],notes:[],chordNames:[],hideDuplicates:false})}
            className="hp-btn-clear-all-filters">
            Clear all filters
          </button>
        </div>
      </div>
    </>
  );
}
