// Shared QED primitives — logo, buttons, chips, badges, venue placeholder

// Brand logo — uses the official PNG asset
function QEDLogo({ size = 56, mono = false }) {
  if (mono) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 8, background: '#1F1A14',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Plus Jakarta Sans", system-ui', fontWeight: 900, fontSize: size * 0.32,
        color: '#F5C518', letterSpacing: '-0.04em',
      }}>QED</div>
    );
  }
  // Crop: 30% off top+bottom each, 15% off left+right each.
  // Render the image tall enough that the center 40% fills `size` px.
  const fullH = Math.round(size / 0.40);
  const cropV = Math.round(fullH * 0.30);
  const cropH = Math.round(fullH * 0.15);
  return (
    <div style={{ height: size, overflow: 'hidden', display: 'inline-block', lineHeight: 0, flexShrink: 0 }}>
      <img
        src="Logo -Quiz-02.png"
        alt="Quiz Eat Drink"
        style={{
          display: 'block', height: fullH, width: 'auto', maxWidth: 'none',
          marginTop: -cropV, marginLeft: -cropH, marginRight: -cropH,
          userSelect: 'none', pointerEvents: 'none',
        }}
      />
    </div>
  );
}

// Primary button — sticker style: bold fill, thick black outline, offset shadow
function QEDButton({ children, onClick, full = true, size = 'md', variant = 'primary', icon, style = {}, disabled }) {
  const sizes = {
    sm: { h: 38, fs: 14, px: 16 },
    md: { h: 48, fs: 15, px: 20 },
    lg: { h: 56, fs: 17, px: 24 },
  }[size];
  const variants = {
    primary: { bg: QED.red,    fg: '#fff', border: QED.ink },
    cta:     { bg: QED.orange, fg: '#fff', border: QED.ink },
    ghost:   { bg: QED.paper,  fg: QED.ink, border: QED.ink },
    soft:    { bg: QED.yellow, fg: QED.ink, border: QED.ink },
    dark:    { bg: QED.ink,    fg: '#fff', border: QED.ink },
    green:   { bg: QED.green,  fg: '#fff', border: QED.ink },
  }[variant];
  const offset = size === 'lg' ? 4 : size === 'md' ? 3 : 2;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: full ? '100%' : 'auto',
      height: sizes.h, padding: `0 ${sizes.px}px`,
      background: variants.bg, color: variants.fg,
      border: `2px solid ${variants.border}`, borderRadius: 999,
      fontFamily: QED.sans, fontSize: sizes.fs, fontWeight: 800, letterSpacing: '-0.01em',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      cursor: 'pointer', boxShadow: `${offset}px ${offset}px 0 0 ${QED.ink}`,
      opacity: disabled ? 0.5 : 1, transform: 'translate(0,0)',
      transition: 'transform .08s, box-shadow .08s',
      ...style,
    }}>
      {icon}{children}
    </button>
  );
}

// Pin / icon glyphs (small, simple)
const Icon = {
  pin: (s = 14, c = QED.ink) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z" stroke={c} strokeWidth="2"/><circle cx="12" cy="9" r="2.5" stroke={c} strokeWidth="2"/></svg>
  ),
  clock: (s = 14, c = QED.ink) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2"/><path d="M12 7v5l3 2" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  cal: (s = 14, c = QED.ink) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke={c} strokeWidth="2"/><path d="M3 9h18M8 3v4M16 3v4" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  euro: (s = 14, c = QED.ink) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M18 7a6 6 0 1 0 0 10M4 11h9M4 14h9" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  users: (s = 14, c = QED.ink) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.5" stroke={c} strokeWidth="2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={c} strokeWidth="2" strokeLinecap="round"/><path d="M16 14a4 4 0 0 0 0-8M21 20c0-2.5-1.7-4.7-4-5.5" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  flame: (s = 14, c = QED.red) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1-.5-2-1-2.5.5 2 4 3 4 6.5a6 6 0 0 1-12 0c0-5 4-7 6-13z"/></svg>
  ),
  close: (s = 14, c = QED.ink) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  chevR: (s = 14, c = QED.ink) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  chevD: (s = 14, c = QED.ink) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  filter: (s = 14, c = QED.ink) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M4 6h16M7 12h10M10 18h4" stroke={c} strokeWidth="2.2" strokeLinecap="round"/></svg>
  ),
  search: (s = 14, c = QED.ink) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke={c} strokeWidth="2"/><path d="M20 20l-3.5-3.5" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  globe: (s = 14, c = QED.ink) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" stroke={c} strokeWidth="2"/></svg>
  ),
  trophy: (s = 14, c = QED.ink) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M7 4h10v4a5 5 0 0 1-10 0V4z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><path d="M17 6h3v2a3 3 0 0 1-3 3M7 6H4v2a3 3 0 0 0 3 3M9 14h6M10 14v3h4v-3M8 20h8" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  brain: (s = 14, c = QED.ink) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-2 5 3 3 0 0 0 2 5v1a3 3 0 0 0 6 0V4a3 3 0 0 0-3 0z" stroke={c} strokeWidth="1.8"/><path d="M15 4a3 3 0 0 1 3 3v1a3 3 0 0 1 2 5 3 3 0 0 1-2 5v1a3 3 0 0 1-6 0" stroke={c} strokeWidth="1.8"/></svg>
  ),
  sparkle: (s = 14, c = QED.yellow) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/></svg>
  ),
  check: (s = 14, c = '#fff') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-11" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  heart: (s = 14, c = QED.orange) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12 21s-7-4.4-7-10a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 21 11c0 5.6-9 10-9 10z"/></svg>
  ),
  wheelchair: (s = 14, c = QED.ink) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="4.5" r="2" stroke={c} strokeWidth="2"/>
      <path d="M8.5 9h4v6l3.5 3.5" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.5 9L6 14h5" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="7" cy="19.5" r="2" stroke={c} strokeWidth="2"/>
      <circle cx="16" cy="19.5" r="2" stroke={c} strokeWidth="2"/>
    </svg>
  ),
  leaf: (s = 14, c = '#7FB58A') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M20 4c0 0-9 2-13 9-2 4-1 8 3 8s9-4 10-12c0 0-4 5-8 7" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 20l4-4" stroke={c} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  wheat: (s = 14, c = QED.inkSoft) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 22V8" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 12c-2-2-4-2-5-1" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 12c2-2 4-2 5-1" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 16c-2-2-4-2-5-1" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 16c2-2 4-2 5-1" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 8c0-2 1-4 2-5" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  person: (s = 14, c = QED.ink) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.5" stroke={c} strokeWidth="2"/>
      <path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke={c} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  paw: (s = 14, c = QED.ink) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}>
      <ellipse cx="7" cy="8.5" rx="1.8" ry="2.5"/>
      <ellipse cx="12" cy="6" rx="1.8" ry="2.5"/>
      <ellipse cx="17" cy="8.5" rx="1.8" ry="2.5"/>
      <ellipse cx="4" cy="13" rx="1.5" ry="2"/>
      <ellipse cx="20" cy="13" rx="1.5" ry="2"/>
      <path d="M8 16.5c0-2.5 1.7-4 4-4s4 1.5 4 4c0 2-1.5 3.5-4 3.5S8 18.5 8 16.5z"/>
    </svg>
  ),
  qr: (s = 14, c = QED.ink) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="8" height="8" rx="1" stroke={c} strokeWidth="2"/>
      <rect x="14" y="2" width="8" height="8" rx="1" stroke={c} strokeWidth="2"/>
      <rect x="2" y="14" width="8" height="8" rx="1" stroke={c} strokeWidth="2"/>
      <rect x="5" y="5" width="2" height="2" fill={c}/>
      <rect x="17" y="5" width="2" height="2" fill={c}/>
      <rect x="5" y="17" width="2" height="2" fill={c}/>
      <rect x="14" y="14" width="2" height="2" fill={c}/>
      <rect x="18" y="14" width="2" height="2" fill={c}/>
      <rect x="16" y="16" width="2" height="2" fill={c}/>
      <rect x="20" y="16" width="2" height="2" fill={c}/>
      <rect x="14" y="18" width="2" height="2" fill={c}/>
      <rect x="18" y="18" width="2" height="2" fill={c}/>
    </svg>
  ),
};

// Venue photo placeholder — uses brand palette as comic-poster tones
function VenuePlaceholder({ height = 140, label = 'venue photo', tone = 'warm' }) {
  const tones = {
    warm:   { fg: '#E8631A', bg: '#FFD9B3' },     // orange poster
    yellow: { fg: '#F5C518', bg: '#FFEDA8' },     // mustard
    green:  { fg: '#7FB58A', bg: '#C9E2CD' },     // mint
    red:    { fg: '#D64545', bg: '#FFD0D0' },     // tomato
    ink:    { fg: '#3A3128', bg: '#7D6F5C' },
    cream:  { fg: '#E8E0CC', bg: '#FBF6EA' },
  }[tone];
  const id = 'vp-' + label.replace(/\W+/g, '-') + '-' + tone;
  // Comic-style halftone dots + soft starburst centered
  const burstId = id + '-b';
  return (
    <div style={{
      width: '100%', height, overflow: 'hidden',
      background: tones.bg, position: 'relative',
    }}>
      <svg width="100%" height="100%" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id={id} patternUnits="userSpaceOnUse" width="10" height="10">
            <circle cx="5" cy="5" r="1.6" fill={tones.fg} fillOpacity="0.45"/>
          </pattern>
        </defs>
        <rect width="200" height="120" fill={tones.bg}/>
        <rect width="200" height="120" fill={`url(#${id})`}/>
        {/* Soft burst */}
        <g transform="translate(150 35) rotate(12)" opacity="0.85">
          <polygon points="0,-32 6,-10 28,-12 10,4 18,26 0,14 -18,26 -10,4 -28,-12 -6,-10" fill={tones.fg} stroke="#1F1A14" strokeWidth="1.6" strokeLinejoin="round"/>
        </g>
        {/* Wavy speech-line at bottom */}
        <path d="M-10 100 Q 30 90 60 100 T 130 100 T 210 100" stroke="#1F1A14" strokeWidth="2" fill="none" opacity="0.18"/>
      </svg>
      {label && (
        <div style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
          fontFamily: QED.mono, fontSize: 10.5, color: '#1F1A14', fontWeight: 700,
        }}>
          <span style={{ background: 'rgba(255,255,255,0.92)', padding: '4px 10px', borderRadius: 4, border: '1px solid rgba(31,26,20,0.2)' }}>{label}</span>
        </div>
      )}
    </div>
  );
}

// Chip — bolder black outline, sticker feel
function Chip({ active, children, onClick, icon, dismissable, onDismiss, style = {} }) {
  return (
    <button onClick={onClick} style={{
      height: 36, padding: '0 13px',
      background: active ? QED.ink : QED.paper,
      color: active ? '#fff' : QED.ink,
      border: `2px solid ${QED.ink}`,
      borderRadius: 999,
      fontFamily: QED.sans, fontSize: 13, fontWeight: 700, letterSpacing: '-0.005em',
      display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
      cursor: 'pointer', flexShrink: 0,
      boxShadow: active ? `2px 2px 0 0 ${QED.ink}` : 'none',
      ...style,
    }}>
      {icon}
      {children}
      {dismissable && (
        <span onClick={(e) => { e.stopPropagation(); onDismiss && onDismiss(); }} style={{ display: 'inline-flex', marginLeft: 2, opacity: 0.7 }}>
          {Icon.close(12, active ? '#fff' : QED.ink)}
        </span>
      )}
    </button>
  );
}

// Discount/urgency badge
function Badge({ children, color = 'orange', style = {} }) {
  const palette = {
    orange: { bg: QED.orange, fg: '#fff' },
    yellow: { bg: QED.yellow, fg: QED.ink },
    red: { bg: QED.red, fg: '#fff' },
    green: { bg: QED.greenSoft, fg: '#2C5F37' },
    soft:  { bg: QED.creamSoft, fg: QED.ink },
    ink:   { bg: QED.ink, fg: '#fff' },
  }[color];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 8px', borderRadius: 6,
      background: palette.bg, color: palette.fg,
      fontFamily: QED.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase',
      ...style,
    }}>{children}</span>
  );
}

Object.assign(window, { QEDLogo, QEDButton, Icon, VenuePlaceholder, Chip, Badge, ComicBurst });

// Comic burst SVG — decorative, used as accent shape in cards/badges
function ComicBurst({ size = 48, color = '#F5C518', stroke = '#1F1A14', children, style = {} }) {
  const pts = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 === 0 ? 50 : 28;
    const x = 50 + Math.cos(a) * r;
    const y = 50 + Math.sin(a) * r;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <polygon points={pts} fill={color} stroke={stroke} strokeWidth="3" strokeLinejoin="round"/>
      </svg>
      <div style={{ position: 'relative', zIndex: 1, fontFamily: QED.sans, fontWeight: 900, color: '#1F1A14' }}>{children}</div>
    </div>
  );
}
window.ComicBurst = ComicBurst;

// Fake-but-convincing QR code placeholder — proper finder patterns + timing + hashed data cells
function QRCodePlaceholder({ size = 120, value = 'QED' }) {
  const N = 21; // QR v1 grid
  const cs = size / N;

  const finderAt = (r0, c0, r, c) => {
    const lr = r - r0, lc = c - c0;
    if (lr < 0 || lr > 6 || lc < 0 || lc > 6) return null;
    if (lr === 0 || lr === 6 || lc === 0 || lc === 6) return true;
    if (lr === 1 || lr === 5 || lc === 1 || lc === 5) return false;
    return true;
  };

  const isSep = (r, c) =>
    (r === 7 && c <= 7) || (r === 7 && c >= N - 8) ||
    (r === N - 8 && c <= 7) ||
    (c === 7 && r <= 7) || (c === N - 8 && r <= 7) ||
    (c === 7 && r >= N - 8);

  const timingAt = (r, c) => {
    if (r === 6 && c > 7 && c < N - 8) return c % 2 === 0;
    if (c === 6 && r > 7 && r < N - 8) return r % 2 === 0;
    return null;
  };

  const dataAt = (r, c) => {
    let h = 5381;
    const key = `${value}|${r}|${c}`;
    for (let i = 0; i < key.length; i++) h = (((h << 5) + h) ^ key.charCodeAt(i)) >>> 0;
    return h % 3 !== 0;
  };

  const darks = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const tl = finderAt(0, 0, r, c);
      const tr = finderAt(0, N - 7, r, c);
      const bl = finderAt(N - 7, 0, r, c);
      let dark;
      if (tl !== null) dark = tl;
      else if (tr !== null) dark = tr;
      else if (bl !== null) dark = bl;
      else if (isSep(r, c)) dark = false;
      else { const t = timingAt(r, c); dark = t !== null ? t : dataAt(r, c); }
      if (dark) darks.push(r * N + c);
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <rect width={size} height={size} fill="#fff"/>
      {darks.map(idx => {
        const r = Math.floor(idx / N), c = idx % N;
        return <rect key={idx} x={c * cs} y={r * cs} width={cs} height={cs} fill="#1F1A14"/>;
      })}
    </svg>
  );
}
window.QRCodePlaceholder = QRCodePlaceholder;
