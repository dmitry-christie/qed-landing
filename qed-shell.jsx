// Slide-up navigation menu — dark ink panel
function MenuSheet({ onClose, onNavEvents }) {
  const [howOpen, setHowOpen] = React.useState(false);

  const NAV = [
    {
      label: 'Browse events', sub: 'Find a quiz near you', accent: true,
      action: () => { onNavEvents && onNavEvents(); onClose(); },
    },
    {
      label: 'How it works', sub: 'New to QED?',
      action: () => setHowOpen(true),
    },
    {
      label: 'About QED', sub: 'The people behind the mic',
      action: onClose,
    },
  ];

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(31,26,20,0.55)', backdropFilter: 'blur(3px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        }}
      >
        <style>{`@keyframes qed-sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: QED.ink,
            borderRadius: `${QED.rXl}px ${QED.rXl}px 0 0`,
            maxHeight: '88%', display: 'flex', flexDirection: 'column',
            animation: 'qed-sheet-up 240ms cubic-bezier(.2,.8,.2,1)',
          }}
        >
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
          </div>

          {/* Header row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px 16px', flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            <QEDLogo size={42} mono />
            <button onClick={onClose} aria-label="Close" style={{
              width: 32, height: 32, borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {Icon.close(15, 'rgba(255,255,255,0.6)')}
            </button>
          </div>

          {/* Nav items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 0' }}>
            {NAV.map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '17px 0', background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.07)', textAlign: 'left',
                }}
              >
                <div>
                  <div style={{
                    fontFamily: QED.sans, fontSize: 24, fontWeight: 900, letterSpacing: '-0.025em', lineHeight: 1.1,
                    color: item.accent ? QED.orange : '#fff',
                  }}>{item.label}</div>
                  <div style={{ fontFamily: QED.sans, fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>{item.sub}</div>
                </div>
                {Icon.chevR(15, item.accent ? QED.orange : 'rgba(255,255,255,0.2)')}
              </button>
            ))}

            {/* Secondary links */}
            <div style={{ marginTop: 28 }}>
              {[
                { label: 'Instagram', handle: '@qedvalencia' },
                { label: 'Contact', handle: 'hello@qed.es' },
              ].map((l, i, arr) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 0',
                  borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                  <span style={{ fontFamily: QED.sans, fontSize: 14, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>{l.label}</span>
                  <span style={{ fontFamily: QED.mono, fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.03em' }}>{l.handle}</span>
                </div>
              ))}
            </div>

            {/* Footer tag */}
            <div style={{
              padding: '28px 0 48px',
              fontFamily: QED.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.15)',
            }}>
              Pub Quiz · Valencia · Est. 2023
            </div>
          </div>
        </div>
      </div>

      <HowItWorksModal open={howOpen} onClose={() => setHowOpen(false)} />
    </>
  );
}

// QED app header — logo · [spacer] · lang · profile · menu
function QEDHeader({ lang = 'EN', scrolled = false, dark = false, onLogo, onProfile, onNavEvents }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const btnStyle = {
    height: 32, width: 32, borderRadius: 999,
    border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : QED.hairlineStrong}`,
    background: dark ? 'rgba(255,255,255,0.08)' : 'transparent', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };
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
        <button style={{
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

      {menuOpen && <MenuSheet onClose={() => setMenuOpen(false)} onNavEvents={onNavEvents} />}
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
          <span style={{ fontFamily: QED.sans, fontSize: 16, fontWeight: 800, color: QED.ink, letterSpacing: '-0.01em' }}>Choose your city</span>
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
          <span style={{ fontFamily: QED.sans, fontSize: 14, fontWeight: 800, color: QED.ink }}>Spain</span>
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
                    // City with neighbourhoods
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
        {/* 9:16 video poster */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '9 / 16', background: '#000' }}>
          <VenuePlaceholder height="100%" label="QED · 60-second teaser" tone="warm" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.0) 50%, rgba(0,0,0,0.65) 100%)' }} />
          {/* play button */}
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
const HOW_IT_WORKS_POINTS = [
  { kicker: 'WHAT IT IS', title: 'A live pub quiz', body: 'Trivia, tasty food, drinks. 4 rounds, 40 questions, 90 mins.', tone: 'yellow' },
  { kicker: 'HOW IT WORKS', title: 'Bring 2–5 mates', body: 'Reserve a spot. Show up. Pens & answer sheets on us.', tone: 'orange' },
  { kicker: 'WHAT YOU WIN', title: 'Real prizes weekly', body: 'Bar credit, free meals, merch — and city-wide bragging rights.', tone: 'green' }];


function HowItWorksPoints() {
  const iconFor = (i) => [Icon.brain(17, QED.ink), Icon.users(17, QED.ink), Icon.trophy(17, QED.ink)][i];
  const kickerColor = (t) => t === 'yellow' ? QED.orange : t === 'orange' ? QED.orangeDeep : QED.greenInk;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {HOW_IT_WORKS_POINTS.map((p, i) =>
        <div key={i} style={{
          display: 'flex', gap: 14, alignItems: 'flex-start',
          padding: '12px 0',
          borderBottom: i < HOW_IT_WORKS_POINTS.length - 1 ? `1px solid ${QED.hairline}` : 'none',
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

// Reusable "How it works" modal — used by listing dismissable card AND home button
function HowItWorksModal({ open, onClose, header = 'How QED works' }) {
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
        {/* drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: QED.hairlineStrong }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 4px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {Icon.sparkle(16, QED.yellow)}
            <span style={{ fontFamily: QED.sans, fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: QED.ink }}>{header}</span>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            width: 32, height: 32, borderRadius: 999, border: 'none', background: 'transparent', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
          }}>{Icon.close(16, QED.inkSoft)}</button>
        </div>
        <div style={{ padding: '8px 16px 4px' }}>
          <div style={{ fontFamily: QED.sans, fontSize: 22, fontWeight: 900, color: QED.ink, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            A night out where<br/>knowing stuff pays off.
          </div>
          <p style={{ fontFamily: QED.sans, fontSize: 13, color: QED.inkSoft, lineHeight: 1.55, margin: '10px 0 0', textWrap: 'pretty' }}>
            A live trivia night at a pub where teams answer questions across themed rounds, hosted live, no screens allowed. Think pop culture, history, sport, and music. Whoever scores most wins a bar tab. It's a proper night out, not just a quiz.
          </p>
        </div>
        <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column' }}>
          {[
            { n: '01', t: 'Pick a night & bring your crew', s: 'Find a venue near you and reserve in 30 seconds. No card needed.' },
            { n: '02', t: 'Play, eat, win', s: '4 rounds, 40 questions, 90 minutes. Bar credit and bragging rights every week.' },
            { n: '03', t: 'Come back next week', s: 'Regulars get priority booking and climb the city-wide leaderboard.' },
          ].map((x, i) => (
            <div key={i} style={{
              display: 'flex', gap: 14, alignItems: 'flex-start',
              padding: '10px 0',
              borderBottom: i < 2 ? `1px solid ${QED.hairline}` : 'none',
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
            Watch 30s video
          </button>
          <button onClick={onClose} style={{
            flex: 1, height: 40, padding: '0 16px',
            background: QED.orange, color: '#fff', border: 'none', borderRadius: 999,
            fontFamily: QED.sans, fontSize: 14, fontWeight: 800, cursor: 'pointer'
          }}>Got it — see events</button>
        </div>
        <VideoModal open={videoOpen} onClose={() => setVideoOpen(false)} />
      </div>
    </div>
  );
}

// 3-pointer explainer card — dismissable inline card on listing
function ExplainerCard({ onDismiss, onLearnMore }) {
  return (
    <div style={{
      margin: '12px 16px 4px', borderRadius: QED.rLg,
      background: QED.paper, border: `1.5px solid ${QED.ink}`,
      boxShadow: `4px 4px 0 0 ${QED.yellow}`,
      overflow: 'hidden', position: 'relative'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 8px' }}>
        <span style={{ fontFamily: QED.sans, fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: QED.ink }}>
          New here? 30‑second read
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
            Watch 30s video
          </button>
          <button onClick={onDismiss} style={{
            height: 36, padding: '0 14px',
            background: 'transparent', color: QED.ink, border: `1.5px solid ${QED.ink}`, borderRadius: 999,
            fontFamily: QED.sans, fontSize: 13, fontWeight: 700, cursor: 'pointer'
          }}>Got it</button>
        </div>
      </div>
    </div>
  );
}

// Filter pill bar — sticky horizontal scrolling chips
function FilterBar({ filters, onChange, onMore }) {
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
        <Chip onClick={onMore} icon={Icon.filter(13, QED.ink)}>Filters</Chip>
        <Chip active={filters.day !== 'Any'} onClick={() => onChange('day')}>
          {filters.day === 'Any' ? 'Any day' : filters.day}
          {Icon.chevD(11, filters.day !== 'Any' ? '#fff' : QED.ink)}
        </Chip>
        <Chip active={filters.area !== 'Any'} onClick={() => onChange('area')}>
          {filters.area === 'Any' ? 'Any area' : filters.area}
          {Icon.chevD(11, filters.area !== 'Any' ? '#fff' : QED.ink)}
        </Chip>
        <Chip active={filters.lang !== 'Any'} onClick={() => onChange('lang')}>
          {filters.lang === 'Any' ? 'Language' : filters.lang}
          {Icon.chevD(11, filters.lang !== 'Any' ? '#fff' : QED.ink)}
        </Chip>
        <Chip active={filters.discount} onClick={() => onChange('discount')} icon={Icon.flame(12)}>
          25% off
        </Chip>
      </div>
    </div>);

}

Object.assign(window, { QEDHeader, MenuSheet, CitySelector, CitySheet, QED_CITIES, ExplainerCard, HowItWorksModal, VideoModal, FilterBar });