// Slide-up navigation menu — dark ink panel with editorial hierarchy
function MenuSheet({ onClose, onNavEvents, onProfile }) {
  const { t } = useT();
  const goEvents  = () => { onNavEvents && onNavEvents(); onClose(); };
  const goProfile = () => { onProfile  && onProfile();   onClose(); };

  // Pull the accent item out as the hero CTA; the rest fall into editorial sections.
  let hero = null;
  const sections = [];
  t.menuSections.forEach((section, si) => {
    const rest = [];
    section.items.forEach((item, i) => {
      const action = si === 0 && i === 0 ? goEvents
                   : si === 1 && i === 0 ? goProfile
                   : onClose;
      if (item.accent && !hero) hero = { ...item, action };
      else rest.push({ ...item, action });
    });
    if (rest.length) sections.push({ title: section.title, items: rest });
  });

  const sectionLabel = label => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <span style={{
        fontFamily: QED.mono, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.42)', fontWeight: 700,
      }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.09)' }} />
    </div>
  );

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(31,26,20,0.6)', backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        }}
      >
        <style>{`
          @keyframes qed-sheet-up { from { transform: translateY(102%); } to { transform: translateY(0); } }
          @keyframes qed-fade-in { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: QED.ink,
            borderRadius: `${QED.rXl}px ${QED.rXl}px 0 0`,
            maxHeight: '92%', display: 'flex', flexDirection: 'column',
            animation: 'qed-sheet-up 320ms cubic-bezier(.16,.84,.24,1)',
            color: '#fff',
            boxShadow: '0 -24px 60px -20px rgba(0,0,0,0.5)',
          }}
        >
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, flexShrink: 0 }}>
            <div style={{ width: 42, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.16)' }} />
          </div>

          {/* Header row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 18px 6px', flexShrink: 0,
          }}>
            <QEDLogo size={42} mono />
            <button onClick={onClose} aria-label="Close" style={{
              width: 36, height: 36, borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 140ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}>
              {Icon.close(14, 'rgba(255,255,255,0.7)')}
            </button>
          </div>

          <div className="ios-scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 0' }}>
            {/* Hero CTA — the accent action gets its own surface */}
            {hero && (
              <button
                onClick={hero.action}
                style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none',
                  background: QED.orange, color: QED.ink,
                  borderRadius: 22, padding: '20px 22px 22px',
                  display: 'block', position: 'relative', overflow: 'hidden',
                  boxShadow: '0 14px 36px -18px rgba(232,99,26,0.75), inset 0 1px 0 rgba(255,255,255,0.18)',
                  transition: 'transform 220ms cubic-bezier(.16,.84,.24,1), box-shadow 220ms ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 22px 44px -16px rgba(232,99,26,0.9), inset 0 1px 0 rgba(255,255,255,0.22)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 14px 36px -18px rgba(232,99,26,0.75), inset 0 1px 0 rgba(255,255,255,0.18)';
                }}
              >
                {/* Oversized off-grid sparkle, half-clipped */}
                <svg width="180" height="180" viewBox="0 0 24 24" style={{
                  position: 'absolute', top: -56, right: -42, fill: QED.ink, opacity: 0.09, pointerEvents: 'none',
                }}>
                  <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/>
                </svg>
                {/* Halftone dots in the corner */}
                <svg width="120" height="60" viewBox="0 0 120 60" style={{
                  position: 'absolute', bottom: -10, left: -10, opacity: 0.18, pointerEvents: 'none',
                }}>
                  <defs>
                    <pattern id="qed-menu-hero-dots" patternUnits="userSpaceOnUse" width="9" height="9">
                      <circle cx="4.5" cy="4.5" r="1.6" fill={QED.ink}/>
                    </pattern>
                  </defs>
                  <rect width="120" height="60" fill="url(#qed-menu-hero-dots)"/>
                </svg>

                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 9px 4px 8px', borderRadius: 999,
                  background: 'rgba(31,26,20,0.14)', color: QED.ink,
                  fontFamily: QED.mono, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase',
                  fontWeight: 700,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: QED.ink, display: 'inline-block' }} />
                  This week
                </div>
                <div style={{
                  fontFamily: QED.sans, fontSize: 40, fontWeight: 900, letterSpacing: '-0.035em',
                  lineHeight: 1, marginTop: 12, color: QED.ink,
                  position: 'relative',
                }}>{hero.label}</div>
                <div style={{
                  fontFamily: QED.sans, fontSize: 14, fontWeight: 600, color: 'rgba(31,26,20,0.72)',
                  marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  position: 'relative',
                }}>
                  <span>{hero.sub}</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 30, height: 30, borderRadius: 999, background: QED.ink, flexShrink: 0,
                  }}>{Icon.chevR(13, QED.orange)}</span>
                </div>
              </button>
            )}

            {/* Editorial sections — no card containers, just typographic rows */}
            {sections.map((section, si) => (
              <div key={si} style={{ marginTop: 28 }}>
                {sectionLabel(section.title)}
                {section.items.map((item, i) => (
                  <button
                    key={i}
                    onClick={item.action}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 12, padding: '14px 2px', background: 'transparent',
                      border: 'none', borderBottom: '1px solid rgba(255,255,255,0.07)',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'transform 220ms cubic-bezier(.16,.84,.24,1)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateX(3px)';
                      const arrow = e.currentTarget.querySelector('[data-arrow]');
                      if (arrow) arrow.style.color = '#fff';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateX(0)';
                      const arrow = e.currentTarget.querySelector('[data-arrow]');
                      if (arrow) arrow.style.color = 'rgba(255,255,255,0.32)';
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontFamily: QED.sans, fontSize: 22, fontWeight: 800,
                        letterSpacing: '-0.022em', lineHeight: 1.1, color: '#fff',
                      }}>{item.label}</div>
                      <div style={{
                        fontFamily: QED.sans, fontSize: 13, color: 'rgba(255,255,255,0.5)',
                        marginTop: 4, fontWeight: 500,
                      }}>{item.sub}</div>
                    </div>
                    <span data-arrow style={{ color: 'rgba(255,255,255,0.32)', display: 'inline-flex', transition: 'color 140ms ease' }}>
                      {Icon.chevR(14, 'currentColor')}
                    </span>
                  </button>
                ))}
              </div>
            ))}

            {/* Find us — editorial colophon block */}
            <div style={{ marginTop: 32 }}>
              {sectionLabel(t.lang === 'ES' ? 'Síguenos' : 'Find us')}
              {t.menuSecondary.map((l, i, arr) => (
                <a
                  key={i}
                  href={l.handle.startsWith('@') ? `https://instagram.com/${l.handle.slice(1)}` : `mailto:${l.handle}`}
                  target={l.handle.startsWith('@') ? '_blank' : undefined}
                  rel={l.handle.startsWith('@') ? 'noopener noreferrer' : undefined}
                  style={{
                    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                    gap: 12, padding: '11px 2px',
                    borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    textDecoration: 'none',
                  }}>
                  <span style={{
                    fontFamily: QED.sans, fontSize: 13, color: 'rgba(255,255,255,0.55)',
                    fontWeight: 700, letterSpacing: '0.02em',
                  }}>{l.label}</span>
                  <span style={{
                    fontFamily: QED.mono, fontSize: 13, color: '#fff', fontWeight: 700, letterSpacing: '0.01em',
                  }}>{l.handle}</span>
                </a>
              ))}
            </div>

            {/* Masthead footer */}
            <div style={{
              marginTop: 36, paddingBottom: 'max(40px, env(safe-area-inset-bottom))',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ display: 'inline-flex' }}>{Icon.sparkle(13, QED.orange)}</span>
              <span style={{
                fontFamily: QED.mono, fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700,
                letterSpacing: '0.22em', textTransform: 'uppercase',
              }}>{t.menuFooter}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// QED app header — logo · [spacer] · lang · profile · menu
function QEDHeader({ scrolled = false, dark = false, onLogo, onProfile, onNavEvents }) {
  const { lang, setLang } = useT();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const btnStyle = {
    height: 32, width: 32, borderRadius: 999,
    border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : QED.hairlineStrong}`,
    background: dark ? 'rgba(255,255,255,0.08)' : 'transparent', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };
  const toggleLang = () => setLang(lang === 'EN' ? 'ES' : 'EN');
  return (
    <>
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: dark ? 'rgba(31,26,20,0.92)' : 'rgba(251,246,234,0.92)',
        backdropFilter: 'saturate(180%) blur(14px)',
        WebkitBackdropFilter: 'saturate(180%) blur(14px)',
        borderBottom: scrolled ? `1px solid ${QED.hairline}` : '1px solid transparent',
        padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {onLogo ? (
          <button onClick={onLogo} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <QEDLogo size={42} />
          </button>
        ) : (
          <QEDLogo size={42} />
        )}
        <div style={{ flex: 1 }} />
        <button onClick={toggleLang} style={{
          height: 32, padding: '0 12px', borderRadius: 999,
          border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : QED.hairlineStrong}`,
          background: dark ? 'rgba(255,255,255,0.08)' : 'transparent',
          display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          color: dark ? '#fff' : QED.ink, fontFamily: QED.sans, fontSize: 12, fontWeight: 800, letterSpacing: '0.04em',
        }}>
          {Icon.globe(12, dark ? '#fff' : QED.ink)} {lang}
        </button>
        <button aria-label="Profile" onClick={onProfile} style={btnStyle}>
          {Icon.person(15, dark ? '#fff' : QED.ink)}
        </button>
        <button onClick={() => setMenuOpen(true)} aria-label="Menu" style={btnStyle}>
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 1h12M1 5h12M1 9h12" stroke={dark ? '#fff' : QED.ink} strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </div>

      {menuOpen && <MenuSheet onClose={() => setMenuOpen(false)} onNavEvents={onNavEvents} onProfile={onProfile} />}
    </>
  );
}

// City picker — regional breakdown
const QED_CITIES = [
  { region: 'Valencia Community', cities: ['Valencia', 'La Cañada'],                          defaultOpen: true  },
  { region: 'Catalonia',          cities: ['Barcelona'],                                       defaultOpen: false },
  { region: 'Galicia',            cities: ['Padrón', 'Santiago'],                             defaultOpen: false },
  { region: 'Murcia',             cities: ['Murcia'],                                         defaultOpen: false },
  { region: 'Madrid',             cities: ['Madrid'],                                          defaultOpen: false },
];

function CitySheet({ city, onSelect, onClose }) {
  const { t } = useT();
  const cityInRegion = (r) => r.cities.some(c =>
    typeof c === 'string' ? c === city : c.name === city || (c.areas && c.areas.includes(city))
  );
  const [openRegions, setOpenRegions] = React.useState(() => {
    const s = {};
    QED_CITIES.forEach(r => { s[r.region] = r.defaultOpen || cityInRegion(r); });
    return s;
  });

  const toggle = (region) => setOpenRegions(s => ({ ...s, [region]: !s[region] }));

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(31,26,20,0.5)', backdropFilter: 'blur(3px)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
    >
      <style>{`@keyframes qed-sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: QED.cream,
          borderRadius: `${QED.rXl}px ${QED.rXl}px 0 0`,
          border: `1.5px solid ${QED.ink}`, borderBottom: 'none',
          maxHeight: '78%', display: 'flex', flexDirection: 'column',
          animation: 'qed-sheet-up 230ms cubic-bezier(.2,.8,.2,1)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: QED.hairlineStrong }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px 12px', flexShrink: 0,
          borderBottom: `1px solid ${QED.hairline}`,
        }}>
          <span style={{ fontFamily: QED.sans, fontSize: 16, fontWeight: 800, color: QED.ink, letterSpacing: '-0.01em' }}>{t.chooseCity}</span>
          <button onClick={onClose} aria-label="Close" style={{
            width: 30, height: 30, borderRadius: 999, border: 'none', background: 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {Icon.close(16, QED.inkSoft)}
          </button>
        </div>

        {/* Spain */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', flexShrink: 0,
          borderBottom: `1.5px solid ${QED.hairlineStrong}`,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>🇪🇸</span>
          <span style={{ fontFamily: QED.sans, fontSize: 14, fontWeight: 800, color: QED.ink }}>{t.spain}</span>
        </div>

        {/* Region list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 16px 40px' }}>
          {QED_CITIES.map(r => (
            <div key={r.region}>
              <button
                onClick={() => toggle(r.region)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '13px 0', background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: `1px solid ${QED.hairline}`,
                }}
              >
                <span style={{ fontFamily: QED.sans, fontSize: 14, fontWeight: 700, color: QED.ink }}>{r.region}</span>
                <span style={{
                  display: 'flex', transition: 'transform 0.15s',
                  transform: openRegions[r.region] ? 'rotate(0deg)' : 'rotate(-90deg)',
                }}>
                  {Icon.chevD(13, QED.inkSoft)}
                </span>
              </button>

              {openRegions[r.region] && (
                <div style={{ paddingBottom: 6 }}>
                  {r.cities.map(c => {
                    if (typeof c === 'string') {
                      const active = c === city;
                      return (
                        <button
                          key={c}
                          onClick={() => { onSelect(c); onClose(); }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '9px 10px', marginTop: 3,
                            background: active ? QED.orangeSoft : 'transparent',
                            border: active ? `1px solid rgba(232,99,26,0.35)` : '1px solid transparent',
                            borderRadius: QED.rSm, cursor: 'pointer',
                          }}
                        >
                          <span style={{ fontFamily: QED.sans, fontSize: 14, color: active ? QED.orangeDeep : QED.ink, fontWeight: active ? 700 : 500 }}>{c}</span>
                          {active && Icon.check(14, QED.orangeDeep)}
                        </button>
                      );
                    }
                    return (
                      <div key={c.name}>
                        <div style={{
                          fontFamily: QED.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
                          textTransform: 'uppercase', color: QED.inkMute,
                          padding: '10px 10px 4px',
                        }}>{c.name}</div>
                        {c.areas && c.areas.map(area => {
                          const active = area === city;
                          return (
                            <button
                              key={area}
                              onClick={() => { onSelect(area); onClose(); }}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '9px 10px 9px 18px', marginTop: 2,
                                background: active ? QED.orangeSoft : 'transparent',
                                border: active ? `1px solid rgba(232,99,26,0.35)` : '1px solid transparent',
                                borderRadius: QED.rSm, cursor: 'pointer',
                              }}
                            >
                              <span style={{ fontFamily: QED.sans, fontSize: 14, color: active ? QED.orangeDeep : QED.ink, fontWeight: active ? 700 : 500 }}>{area}</span>
                              {active && Icon.check(14, QED.orangeDeep)}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CitySelector({ city = 'Valencia', onCityChange, dark = false }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        height: 36, padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: 8,
        background: dark ? 'rgba(255,255,255,0.08)' : QED.paper, color: dark ? '#fff' : QED.ink,
        border: `1.5px solid ${dark ? 'rgba(255,255,255,0.2)' : QED.ink}`, borderRadius: 999,
        fontFamily: QED.sans, fontSize: 13, fontWeight: 700, cursor: 'pointer',
        boxShadow: dark ? 'none' : `2px 2px 0 0 ${QED.ink}`,
      }}>
        {Icon.pin(13, dark ? '#fff' : QED.ink)}
        <span>{city}</span>
        {Icon.chevD(12, dark ? '#fff' : QED.ink)}
      </button>
      {open && (
        <CitySheet
          city={city}
          onSelect={c => onCityChange && onCityChange(c)}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// Video popup modal
function VideoModal({ open, onClose }) {
  const { t } = useT();
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(31,26,20,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 360,
        background: QED.ink, borderRadius: QED.rLg, overflow: 'hidden',
        border: `1.5px solid ${QED.ink}`, boxShadow: `4px 4px 0 0 ${QED.yellow}`,
        position: 'relative'
      }}>
        <button onClick={onClose} aria-label="Close" style={{
          position: 'absolute', top: 10, right: 10, zIndex: 2,
          width: 32, height: 32, borderRadius: 999, border: 'none',
          background: 'rgba(255,255,255,0.95)', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
        }}>{Icon.close(16, QED.ink)}</button>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '9 / 16', background: '#000' }}>
          <VenuePlaceholder height="100%" label="QED · 60-second teaser" tone="warm" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.0) 50%, rgba(0,0,0,0.65) 100%)' }} />
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 72, height: 72, borderRadius: 999, background: '#fff',
            border: `2px solid ${QED.ink}`, boxShadow: `3px 3px 0 0 ${QED.ink}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}>
            <svg width="26" height="28" viewBox="0 0 26 28"><path d="M3 2v24l22-12L3 2z" fill={QED.ink} /></svg>
          </div>
          <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, color: '#fff' }}>
            <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.8 }}>
              60 seconds
            </div>
            <div style={{ fontFamily: QED.sans, fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em', marginTop: 2, lineHeight: 1.15 }}>
              See a QED quiz night
            </div>
          </div>
        </div>
      </div>
    </div>);
}

// Reusable "How it works" content (3 points)
function HowItWorksPoints() {
  const { t } = useT();
  const iconFor = (i) => [Icon.brain(17, QED.ink), Icon.users(17, QED.ink), Icon.trophy(17, QED.ink)][i];
  const kickerColor = (tone) => tone === 'yellow' ? QED.orange : tone === 'orange' ? QED.orangeDeep : QED.greenInk;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {t.howPoints.map((p, i) =>
        <div key={i} style={{
          display: 'flex', gap: 14, alignItems: 'flex-start',
          padding: '12px 0',
          borderBottom: i < t.howPoints.length - 1 ? `1px solid ${QED.hairline}` : 'none',
        }}>
          <div style={{ width: 20, flexShrink: 0, paddingTop: 3, opacity: 0.5 }}>{iconFor(i)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: QED.sans, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', color: kickerColor(p.tone) }}>{p.kicker}</div>
            <div style={{ fontFamily: QED.sans, fontSize: 15, fontWeight: 700, color: QED.ink, letterSpacing: '-0.01em', marginTop: 1 }}>{p.title}</div>
            <div style={{ fontFamily: QED.sans, fontSize: 13, color: QED.inkSoft, lineHeight: 1.4, marginTop: 2 }}>{p.body}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable "How it works" modal
function HowItWorksModal({ open, onClose, onSeeEvents }) {
  const { t } = useT();
  if (!open) return null;
  const [videoOpen, setVideoOpen] = React.useState(false);
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(31,26,20,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 370,
        background: QED.paper, borderRadius: QED.rLg,
        border: `1.5px solid ${QED.ink}`, boxShadow: `4px 4px 0 0 ${QED.ink}`,
        position: 'relative', paddingBottom: 24,
        animation: 'qed-modal-in 220ms cubic-bezier(.2,.8,.2,1)'
      }}>
        <style>{`@keyframes qed-modal-in { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: QED.hairlineStrong }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 4px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {Icon.sparkle(16, QED.yellow)}
            <span style={{ fontFamily: QED.sans, fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: QED.ink }}>{t.howItWorksHeader}</span>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            width: 32, height: 32, borderRadius: 999, border: 'none', background: 'transparent', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
          }}>{Icon.close(16, QED.inkSoft)}</button>
        </div>
        <div style={{ padding: '8px 16px 4px' }}>
          <div style={{ fontFamily: QED.sans, fontSize: 22, fontWeight: 900, color: QED.ink, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            {t.howItWorksHero.split('\n').map((line, i) => <React.Fragment key={i}>{line}{i === 0 && <br/>}</React.Fragment>)}
          </div>
          <p style={{ fontFamily: QED.sans, fontSize: 13, color: QED.inkSoft, lineHeight: 1.55, margin: '10px 0 0', textWrap: 'pretty' }}>
            {t.howItWorksIntro}
          </p>
        </div>
        <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column' }}>
          {t.howItWorksSteps.map((x, i) => (
            <div key={i} style={{
              display: 'flex', gap: 14, alignItems: 'flex-start',
              padding: '10px 0',
              borderBottom: i < t.howItWorksSteps.length - 1 ? `1px solid ${QED.hairline}` : 'none',
            }}>
              <span style={{ fontFamily: QED.mono, fontSize: 18, fontWeight: 700, color: QED.orange, lineHeight: 1, width: 30, flexShrink: 0, paddingTop: 1 }}>{x.n}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: QED.sans, fontSize: 14, fontWeight: 800, color: QED.ink, letterSpacing: '-0.01em', lineHeight: 1.2 }}>{x.t}</div>
                <div style={{ fontFamily: QED.sans, fontSize: 12, color: QED.inkSoft, marginTop: 3, lineHeight: 1.4 }}>{x.s}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '14px 16px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setVideoOpen(true)} style={{
            height: 40, padding: '0 16px',
            background: QED.ink, color: '#fff', border: 'none', borderRadius: 999,
            fontFamily: QED.sans, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 7
          }}>
            <svg width="11" height="12" viewBox="0 0 11 12"><path d="M1 1v10l9-5L1 1z" fill="#fff" /></svg>
            {t.watchVideo}
          </button>
          <button onClick={() => { onSeeEvents && onSeeEvents(); onClose(); }} style={{
            flex: 1, height: 40, padding: '0 16px',
            background: QED.red, color: '#fff', border: 'none', borderRadius: 999,
            fontFamily: QED.sans, fontSize: 14, fontWeight: 800, cursor: 'pointer'
          }}>{t.gotItSeeEvents}</button>
        </div>
        <VideoModal open={videoOpen} onClose={() => setVideoOpen(false)} />
      </div>
    </div>
  );
}

// 3-pointer explainer card — dismissable inline card on listing
function ExplainerCard({ onDismiss, onLearnMore }) {
  const { t } = useT();
  return (
    <div style={{
      margin: '12px 16px 4px', borderRadius: QED.rLg,
      background: QED.paper, border: `1.5px solid ${QED.ink}`,
      boxShadow: `4px 4px 0 0 ${QED.yellow}`,
      overflow: 'hidden', position: 'relative'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 8px' }}>
        <span style={{ fontFamily: QED.sans, fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: QED.ink }}>
          {t.newHereLabel}
        </span>
        <button onClick={onDismiss} aria-label="Dismiss" style={{
          width: 28, height: 28, borderRadius: 999, border: 'none', background: 'transparent', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
        }}>{Icon.close(16, QED.inkSoft)}</button>
      </div>
      <div style={{ padding: '0 14px 14px' }}>
        <HowItWorksPoints />
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={onLearnMore} style={{
            height: 36, padding: '0 14px',
            background: QED.ink, color: '#fff', border: 'none', borderRadius: 999,
            fontFamily: QED.sans, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 7
          }}>
            <svg width="11" height="12" viewBox="0 0 11 12"><path d="M1 1v10l9-5L1 1z" fill="#fff" /></svg>
            {t.watchVideo}
          </button>
          <button onClick={onDismiss} style={{
            height: 36, padding: '0 14px',
            background: 'transparent', color: QED.ink, border: `1.5px solid ${QED.ink}`, borderRadius: 999,
            fontFamily: QED.sans, fontSize: 13, fontWeight: 700, cursor: 'pointer'
          }}>{t.gotIt}</button>
        </div>
      </div>
    </div>
  );
}

// Filter pill bar — sticky horizontal scrolling chips
function FilterBar({ filters, onChange, onMore }) {
  const { t } = useT();
  const ref = React.useRef(null);
  return (
    <div style={{
      position: 'sticky', top: 52, zIndex: 25, background: QED.cream,
      padding: '8px 0 10px'
    }}>
      <div ref={ref} style={{
        display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px',
        scrollbarWidth: 'none', msOverflowStyle: 'none'
      }}>
        <style>{`.fbar::-webkit-scrollbar{display:none}`}</style>
        <Chip onClick={onMore} icon={Icon.filter(13, QED.ink)}>{t.filters}</Chip>
        <Chip active={filters.day !== 'Any'} onClick={() => onChange('day')}>
          {filters.day === 'Any' ? t.anyDay : filters.day}
          {Icon.chevD(11, filters.day !== 'Any' ? '#fff' : QED.ink)}
        </Chip>
        <Chip active={filters.area !== 'Any'} onClick={() => onChange('area')}>
          {filters.area === 'Any' ? t.anyArea : filters.area}
          {Icon.chevD(11, filters.area !== 'Any' ? '#fff' : QED.ink)}
        </Chip>
        <Chip active={filters.lang !== 'Any'} onClick={() => onChange('lang')}>
          {filters.lang === 'Any' ? t.language : filters.lang}
          {Icon.chevD(11, filters.lang !== 'Any' ? '#fff' : QED.ink)}
        </Chip>
        <Chip active={filters.discount} onClick={() => onChange('discount')} icon={Icon.flame(12)}>
          {t.discountPill}
        </Chip>
      </div>
    </div>);
}

// Site-wide footer — legal links, social, copyright
function QEDFooter() {
  const { t } = useT();
  const linkStyle = {
    fontFamily: QED.mono, fontSize: 11, color: 'rgba(255,255,255,0.4)',
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    letterSpacing: '0.03em', textDecoration: 'none', display: 'inline',
  };
  const colHead = {
    fontFamily: QED.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.25)', marginBottom: 10,
  };
  const navLink = {
    fontFamily: QED.sans, fontSize: 13, fontWeight: 600,
    color: 'rgba(255,255,255,0.55)', background: 'none', border: 'none',
    padding: 0, cursor: 'pointer', textAlign: 'left', display: 'block', marginBottom: 8,
  };

  return (
    <div style={{ background: QED.ink, padding: '28px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <QEDLogo size={42} mono />
        <span style={{ fontFamily: QED.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>
          Est. 2022 · Valencia
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <div style={colHead}>{t.footerPlay}</div>
          {t.footerLinks.map(l => (
            <button key={l} style={navLink}>{l}</button>
          ))}
        </div>
        <div>
          <div style={colHead}>{t.footerInfo}</div>
          {t.footerInfoLinks.map(l => (
            <button key={l} style={navLink}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
            <circle cx="12" cy="12" r="4" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
            <circle cx="17.5" cy="6.5" r="1" fill="rgba(255,255,255,0.4)"/>
          </svg>
          <span style={{ fontFamily: QED.mono, fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.03em' }}>@qedvalencia</span>
        </span>
        <span style={{ fontFamily: QED.mono, fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.03em' }}>
          hello@qed.es
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', padding: '16px 0 12px' }}>
        {t.footerLegal.map((l, i) => (
          <button key={i} style={linkStyle}>{l}</button>
        ))}
      </div>

      <div style={{
        paddingBottom: 32,
        fontFamily: QED.mono, fontSize: 10, letterSpacing: '0.06em',
        color: 'rgba(255,255,255,0.18)',
      }}>
        {t.footerCopyright(new Date().getFullYear())}
      </div>
    </div>
  );
}

Object.assign(window, { QEDHeader, MenuSheet, CitySelector, CitySheet, QED_CITIES, ExplainerCard, HowItWorksModal, VideoModal, FilterBar, QEDFooter });
