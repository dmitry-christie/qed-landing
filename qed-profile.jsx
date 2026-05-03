// Profile / personal area screen

const PROFILE_RESERVATIONS = [
  { id: 'r1', eventIdx: 1, edition: 199, date: 'Tue, May 5',  time: '20:30', status: 'active'    },
  { id: 'r2', eventIdx: 0, edition: 195, date: 'Mon, Apr 14', time: '20:00', status: 'completed' },
  { id: 'r3', eventIdx: 2, edition: 192, date: 'Wed, Apr 2',  time: '20:00', status: 'cancelled' },
  { id: 'r4', eventIdx: 3, edition: 188, date: 'Thu, Mar 20', time: '20:30', status: 'completed' },
  { id: 'r5', eventIdx: 1, edition: 184, date: 'Tue, Mar 4',  time: '20:30', status: 'cancelled' },
];

// ── My Info ───────────────────────────────────────────────────────────────
function ProfileInfoSection({ form, setForm }) {
  const [focused, setFocused] = React.useState(null);

  const mono11 = {
    display: 'block', marginBottom: 5,
    fontFamily: QED.mono, fontSize: 11, fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase', color: QED.inkMute,
  };

  const inp = (name) => ({
    width: '100%', height: 44, padding: '0 12px',
    border: `1.5px solid ${QED.ink}`, borderRadius: QED.rSm,
    background: QED.paper, outline: 'none',
    fontFamily: QED.sans, fontSize: 15, fontWeight: 600, color: QED.ink,
    boxShadow: focused === name ? `2px 2px 0 0 ${QED.ink}` : 'none',
    transition: 'box-shadow 0.1s',
  });

  const bind = (name) => ({
    onFocus: () => setFocused(name),
    onBlur:  () => setFocused(null),
  });

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[['firstName', 'First name'], ['lastName', 'Last name']].map(([k, l]) => (
          <div key={k}>
            <label style={mono11}>{l}</label>
            <input
              style={inp(k)}
              value={form[k]}
              onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
              {...bind(k)}
            />
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={mono11}>Username</label>
        <input style={inp('username')} value={form.username}
          onChange={e => setForm(f => ({ ...f, username: e.target.value }))} {...bind('username')} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={mono11}>Instagram</label>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            fontFamily: QED.sans, fontSize: 15, color: QED.inkMute, pointerEvents: 'none',
          }}>@</span>
          <input style={{ ...inp('instagram'), paddingLeft: 28 }} value={form.instagram}
            onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} {...bind('instagram')} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={mono11}>Phone</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{
            height: 44, padding: '0 10px', flexShrink: 0,
            border: `1.5px solid ${QED.ink}`, borderRadius: QED.rSm, background: QED.paper,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontFamily: QED.sans, fontSize: 14, fontWeight: 600, color: QED.ink,
          }}>
            <span style={{ fontSize: 17 }}>🇪🇸</span>
            <span>+34</span>
            {Icon.chevD(11, QED.inkMute)}
          </div>
          <input style={{ ...inp('phone'), flex: 1 }} value={form.phoneNumber}
            onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} {...bind('phone')} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={mono11}>Email</label>
        <input
          style={{ ...inp('email'), background: QED.creamSoft, color: QED.inkMute, cursor: 'not-allowed', boxShadow: 'none' }}
          value="dmitry.christie@gmail.com" disabled />
        <span style={{ fontFamily: QED.sans, fontSize: 11, color: QED.inkMute, marginTop: 5, display: 'block', paddingLeft: 2 }}>
          Contact support to change
        </span>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={mono11}>City</label>
        <input style={inp('city')} value={form.city}
          onChange={e => setForm(f => ({ ...f, city: e.target.value }))} {...bind('city')} />
      </div>

      <div style={{ marginTop: 8 }}>
        <QEDButton variant="cta">Update profile</QEDButton>
      </div>
    </div>
  );
}

// ── Communication preferences ─────────────────────────────────────────────
function ProfileCommsSection({ comms, setComms }) {
  const PREFS = [
    { key: 'newEvents', label: 'New events in my city',          mandatory: false },
    { key: 'reminders', label: 'Event reminders (24h before)',    mandatory: false },
    { key: 'results',   label: 'Results & rankings',              mandatory: false },
    { key: 'offers',    label: 'Special offers and discounts',    mandatory: false },
    { key: 'legal',     label: 'Legal and policy updates',        mandatory: true  },
  ];

  const CB = ({ checked, disabled, onChange }) => (
    <div onClick={!disabled ? onChange : undefined} style={{
      width: 20, height: 20, borderRadius: 4, flexShrink: 0,
      border: `2px solid ${disabled ? QED.hairlineStrong : QED.ink}`,
      background: checked ? (disabled ? QED.hairlineStrong : QED.green) : QED.paper,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background 0.1s',
    }}>
      {checked && Icon.check(13, '#fff')}
    </div>
  );

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ fontFamily: QED.sans, fontSize: 18, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em', marginBottom: 6 }}>
        Communication preferences
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {PREFS.map((p, i) => (
          <div key={p.key} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 0',
            borderBottom: i < PREFS.length - 1 ? `1px solid ${QED.hairline}` : 'none',
          }}>
            <CB
              checked={p.mandatory ? true : !!comms[p.key]}
              disabled={p.mandatory}
              onChange={() => setComms(c => ({ ...c, [p.key]: !c[p.key] }))}
            />
            <span style={{
              flex: 1, fontFamily: QED.sans, fontSize: 14, fontWeight: 600,
              color: p.mandatory ? QED.inkMute : QED.ink,
            }}>{p.label}</span>
            {p.mandatory && <Badge color="soft">required</Badge>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── My Reservations ───────────────────────────────────────────────────────
function ProfileReservationsSection({ onSheet }) {
  const statusBadge = (s) =>
    s === 'active'    ? <Badge color="green">Active</Badge>   :
    s === 'completed' ? <Badge color="soft">Completed</Badge> :
                        <Badge color="red">Cancelled</Badge>;

  return (
    <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {PROFILE_RESERVATIONS.map(r => {
        const ev = QED_EVENTS[r.eventIdx];
        return (
          <div key={r.id} style={{
            background: QED.paper, border: `1.5px solid ${QED.ink}`,
            borderRadius: QED.rMd, padding: 10, boxShadow: `2px 2px 0 0 ${QED.ink}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
              <VenuePlaceholder height={56} label="" tone={ev.tone} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: QED.sans, fontSize: 14, fontWeight: 800, color: QED.ink, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                {ev.title}
              </div>
              <div style={{ fontFamily: QED.mono, fontSize: 10, color: QED.inkMute, fontWeight: 700, marginTop: 2, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Edition #{r.edition}
              </div>
              <div style={{ fontFamily: QED.mono, fontSize: 10, color: QED.inkSoft, fontWeight: 700, marginTop: 3 }}>
                {r.date} · {r.time}
              </div>
              <div style={{ marginTop: 6 }}>{statusBadge(r.status)}</div>
            </div>
            <button onClick={() => onSheet(r)} style={{
              width: 32, height: 32, borderRadius: 999, flexShrink: 0,
              border: `1.5px solid ${QED.hairlineStrong}`, background: 'transparent', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: QED.mono, fontSize: 15, fontWeight: 700, color: QED.inkSoft,
              letterSpacing: '0.05em',
            }}>···</button>
          </div>
        );
      })}
    </div>
  );
}

function ReservationActionSheet({ res, onClose }) {
  const ev = QED_EVENTS[res.eventIdx];
  const ACTIONS = [
    { label: 'Add to calendar',    icon: Icon.cal(16, QED.ink)   },
    { label: 'Share reservation',  icon: Icon.globe(16, QED.ink) },
    { label: 'Cancel reservation', icon: Icon.close(16, QED.red), danger: true },
  ];
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(31,26,20,0.5)', backdropFilter: 'blur(3px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: QED.cream,
        borderRadius: `${QED.rXl}px ${QED.rXl}px 0 0`,
        border: `1.5px solid ${QED.ink}`, borderBottom: 'none',
        animation: 'qed-sheet-up 230ms cubic-bezier(.2,.8,.2,1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: QED.hairlineStrong }} />
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px 12px', borderBottom: `1px solid ${QED.hairline}`,
        }}>
          <div>
            <div style={{ fontFamily: QED.sans, fontSize: 15, fontWeight: 800, color: QED.ink }}>{ev.title}</div>
            <div style={{ fontFamily: QED.mono, fontSize: 10, color: QED.inkMute, fontWeight: 700, marginTop: 2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Edition #{res.edition} · {res.date}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            width: 30, height: 30, borderRadius: 999, border: 'none', background: 'transparent',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>{Icon.close(16, QED.inkSoft)}</button>
        </div>
        <div style={{ padding: '6px 16px 44px', display: 'flex', flexDirection: 'column' }}>
          {ACTIONS.map((a, i) => (
            <button key={i} onClick={onClose} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 14,
              padding: '15px 4px', background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: i < ACTIONS.length - 1 ? `1px solid ${QED.hairline}` : 'none',
              textAlign: 'left',
            }}>
              <div style={{ opacity: a.danger ? 1 : 0.55 }}>{a.icon}</div>
              <span style={{ fontFamily: QED.sans, fontSize: 15, fontWeight: 600, color: a.danger ? QED.red : QED.ink }}>
                {a.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Achievements ──────────────────────────────────────────────────────────
function ProfileAchievementsSection() {
  const ITEMS = [
    { title: 'Trivia Addict', level: 1, cur: 6, total: 20,   caption: 'Play 20 quizzes to reach Level 2'    },
    { title: 'Athenian',      level: 0, cur: 0, total: 1,    caption: 'Win your first quiz night'            },
    { title: 'On the podium', level: 1, cur: 1, total: 10,   caption: 'Finish in top 3 ten times'            },
    { title: 'City Explorer', level: 2, cur: 3, total: null,  caption: 'Play at 3+ different venues'         },
    { title: 'Traveller',     level: 2, cur: 2, total: null,  caption: 'Play in 2+ different cities'         },
  ];
  const burstCol = (l) => l === 0 ? QED.yellow : l === 1 ? QED.green : QED.orange;

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontFamily: QED.sans, fontSize: 18, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em' }}>Achievements</span>
        <Badge color="soft">beta</Badge>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {ITEMS.map((a, i) => {
          const pct = a.total ? Math.min(100, (a.cur / a.total) * 100) : 100;
          return (
            <div key={i} style={{
              display: 'flex', gap: 14, alignItems: 'flex-start',
              padding: '14px 0',
              borderBottom: i < ITEMS.length - 1 ? `1px solid ${QED.hairline}` : 'none',
            }}>
              <ComicBurst size={56} color={burstCol(a.level)} style={{ flexShrink: 0, marginTop: 2 }}>
                <span style={{ fontFamily: QED.sans, fontSize: 18, fontWeight: 900, color: QED.ink }}>{a.level}</span>
              </ComicBurst>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: QED.sans, fontSize: 16, fontWeight: 800, color: QED.ink, letterSpacing: '-0.01em' }}>
                  {a.title}
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                    <span style={{ fontFamily: QED.mono, fontSize: 10, fontWeight: 700, color: QED.inkMute }}>
                      {a.total ? `${a.cur}/${a.total}` : a.cur}
                    </span>
                  </div>
                  <div style={{
                    height: 12, border: `2px solid ${QED.ink}`, borderRadius: 6,
                    background: QED.hairline, overflow: 'hidden',
                  }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: QED.green, borderRadius: 3 }} />
                  </div>
                </div>
                <div style={{ fontFamily: QED.sans, fontSize: 12, color: QED.inkSoft, marginTop: 6 }}>{a.caption}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Personal Stats ────────────────────────────────────────────────────────
function ProfileStatsSection() {
  const CARDS = [
    { label: 'Average score',   value: '10.16', bg: QED.yellowSoft },
    { label: 'Attended events', value: '6',     bg: QED.greenSoft  },
    { label: 'Total score',     value: '61',    bg: '#DDEEF8'       },
    { label: 'Season score',    value: '0',     bg: '#FAE0D8'       },
  ];
  const W = 260; const H = 80;
  const pts = [
    { x: 20,  y: 68, label: 'Feb' },
    { x: 90,  y: 50, label: 'Mar' },
    { x: 170, y: 22, label: 'Apr' },
    { x: 240, y: 6,  label: 'May' },
  ];
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {CARDS.map(({ label, value, bg }) => (
          <div key={label} style={{
            background: bg, border: `1.5px solid ${QED.ink}`,
            borderRadius: QED.rMd, padding: '12px 14px', boxShadow: `2px 2px 0 0 ${QED.ink}`,
          }}>
            <div style={{ fontFamily: QED.sans, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: QED.inkSoft }}>
              {label}
            </div>
            <div style={{ fontFamily: QED.sans, fontSize: 28, fontWeight: 900, color: QED.ink, letterSpacing: '-0.03em', marginTop: 4, lineHeight: 1 }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        background: QED.paper, border: `1.5px solid ${QED.ink}`,
        borderRadius: QED.rMd, boxShadow: `3px 3px 0 0 ${QED.ink}`,
        padding: '14px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontFamily: QED.sans, fontSize: 14, fontWeight: 800, color: QED.ink }}>Total score trend</div>
          <QEDButton size="sm" full={false} variant="ghost" icon={Icon.cal(12, QED.ink)}
            style={{ height: 30, fontSize: 11, padding: '0 10px', boxShadow: `1px 1px 0 0 ${QED.ink}` }}>
            All time
          </QEDButton>
        </div>
        <svg width="100%" viewBox={`0 0 ${W} ${H + 20}`} overflow="visible" style={{ display: 'block' }}>
          <line x1={0} y1={H} x2={W} y2={H}
            stroke={QED.hairlineStrong} strokeWidth="1.5" strokeDasharray="4 3" />
          <path d={pathD} fill="none" stroke={QED.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={5} fill={QED.green} stroke={QED.ink} strokeWidth="2" />
              <text x={p.x} y={H + 16} textAnchor="middle"
                fontFamily="JetBrains Mono, ui-monospace, monospace"
                fontSize="9" fill={QED.inkMute} fontWeight="700">
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ── Main ProfileScreen ────────────────────────────────────────────────────
function ProfileScreen({ onHome }) {
  const [section, setSection] = React.useState('info');
  const [resSheet, setResSheet] = React.useState(null);

  const [form, setForm] = React.useState({
    firstName: 'Dmitry', lastName: 'Christie',
    username: 'dionysus7777', instagram: 'dreamitry',
    phoneNumber: '653 51 80 36', city: 'Valencia',
  });
  const [comms, setComms] = React.useState({
    newEvents: true, reminders: true, results: false, offers: true,
  });

  const SECS = ['info', 'comms', 'reservations', 'achievements', 'stats'];
  const LBLS = { info: 'My info', comms: 'Comms', reservations: 'Bookings', achievements: 'Achievements', stats: 'Stats' };

  return (
    <div style={{ height: '100%', overflow: 'auto', background: QED.cream }}>
      <QEDHeader onLogo={onHome} onProfile={() => setSection('info')} />

      {/* Page header: greeting + logout */}
      <div style={{ padding: '18px 16px 14px', position: 'relative' }}>
        <div style={{ paddingRight: 90 }}>
          <div style={{ fontFamily: QED.sans, fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em', color: QED.ink, lineHeight: 1.15 }}>
            Hey Dmitry 👋
          </div>
          <div style={{
            fontFamily: QED.mono, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase', color: QED.inkMute, marginTop: 5,
          }}>
            6 QUIZZES IN · 1 PODIUM · LEVEL 1 TRIVIA ADDICT
          </div>
        </div>
        <div style={{ position: 'absolute', top: 18, right: 16 }}>
          <QEDButton size="sm" full={false} variant="ghost"
            style={{ height: 34, fontSize: 12, padding: '0 12px', boxShadow: `1px 1px 0 0 ${QED.ink}` }}>
            Log out
          </QEDButton>
        </div>
      </div>

      {/* Sticky pill nav */}
      <div style={{ position: 'sticky', top: 52, zIndex: 25, background: QED.cream, padding: '8px 0 10px' }}>
        <style>{`.qp-pills::-webkit-scrollbar{display:none}`}</style>
        <div className="qp-pills" style={{
          display: 'flex', gap: 8, overflowX: 'auto',
          padding: '0 16px', scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          {SECS.map(s => (
            <Chip key={s} active={section === s} onClick={() => setSection(s)}>{LBLS[s]}</Chip>
          ))}
        </div>
      </div>

      {/* Section body */}
      <div style={{ padding: '0 16px 48px' }}>
        {section === 'info'         && <ProfileInfoSection form={form} setForm={setForm} />}
        {section === 'comms'        && <ProfileCommsSection comms={comms} setComms={setComms} />}
        {section === 'reservations' && <ProfileReservationsSection onSheet={setResSheet} />}
        {section === 'achievements' && <ProfileAchievementsSection />}
        {section === 'stats'        && <ProfileStatsSection />}
      </div>

      {resSheet && <ReservationActionSheet res={resSheet} onClose={() => setResSheet(null)} />}
    </div>
  );
}

Object.assign(window, { ProfileScreen });
