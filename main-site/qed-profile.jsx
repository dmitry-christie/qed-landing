// Profile / personal area screen

// ── Loyalty card: tiers + free-night goal ────────────────────────────────
const QED_TIERS = [
  { key: 'rookie',  min: 0,  max: 2  },
  { key: 'regular', min: 3,  max: 9  },
  { key: 'local',   min: 10, max: 24 },
  { key: 'legend',  min: 25, max: Infinity },
];
const tierFor = (n) => QED_TIERS.find(t => n >= t.min && n <= t.max) || QED_TIERS[0];

// Round rubber stamp (concentric circles + 3-line text, faded ink, tilted)
function RubberStamp({ lines, size = 62, color = QED.orangeDeep, tilt = -8, opacity = 0.5 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" style={{ transform: `rotate(${tilt}deg)`, opacity, display: 'block' }}>
      <circle cx="40" cy="40" r="36" stroke={color} strokeWidth="2.5" fill="none"/>
      <circle cx="40" cy="40" r="29" stroke={color} strokeWidth="1.1" fill="none"/>
      <text x="40" y="35" textAnchor="middle" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="11" fontWeight="900" fill={color} letterSpacing="0.06em">{lines[0]}</text>
      <text x="40" y="46" textAnchor="middle" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="7"  fontWeight="700" fill={color} letterSpacing="0.16em">{lines[1]}</text>
      <text x="40" y="55" textAnchor="middle" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="6"  fontWeight="700" fill={color} letterSpacing="0.18em">{lines[2]}</text>
    </svg>
  );
}

// Quick host signature — single-stroke cursive scribble
function HostSignature({ color = QED.orangeDeep, height = 24 }) {
  return (
    <svg height={height} viewBox="0 0 120 32" style={{ display: 'block', overflow: 'visible' }}>
      <path
        d="M3 24 c4 -16 11 -16 13 -8 c1 4 -2 8 -5 8 c-1 0 1 2 4 1 c5 -2 8 -14 12 -8 c2 3 -2 7 -5 6 c-1 0 0 2 2 1 c5 -2 10 -13 14 -7 c2 3 -3 7 -6 6 c-1 0 0 2 3 1 c6 -3 11 -14 17 -7 c2 3 -3 7 -6 6 c-1 0 0 2 3 1 c7 -3 13 -12 19 -5 c2 3 -3 6 -7 4 c-1 1 4 2 9 -2 c4 -3 8 -3 11 -1"
        stroke={color} strokeWidth="1.7" fill="none"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

// One stamp slot — earned (yellow burst with edition #) or empty (dashed)
function StampCell({ edition, earned, size = 48 }) {
  if (earned) {
    return (
      <ComicBurst size={size} color={QED.yellow}>
        <span style={{ fontFamily: QED.mono, fontSize: 9, fontWeight: 800, color: QED.ink, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
          {edition}
        </span>
      </ComicBurst>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 999,
      border: `2px dashed ${QED.hairlineStrong}`, background: 'transparent',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontFamily: QED.mono, fontSize: 13, color: QED.hairlineStrong, fontWeight: 800 }}>?</span>
    </div>
  );
}

// QED loyalty card — flips between identity (front) and stamps + QR (back)
function QEDLoyaltyCard({ memberName, joinEdition, editions, totalStamps = 10, memberCode }) {
  const { t } = useT();
  const [flipped, setFlipped] = React.useState(false);
  const nights = editions.length;
  const tier = tierFor(nights);
  const tierLabel = t.qedCard.tier[tier.key];
  const tierColor = tier.key === 'legend' ? QED.orange : tier.key === 'local' ? QED.green : QED.yellow;
  const stampsToGo = Math.max(0, totalStamps - nights);
  const freeNightUnlocked = stampsToGo === 0;

  const stamps = Array.from({ length: totalStamps }, (_, i) => ({
    earned: i < editions.length,
    edition: editions[i] || null,
  }));

  const face = (back) => ({
    position: 'absolute', inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    transform: back ? 'rotateY(180deg)' : 'rotateY(0deg)',
    background: QED.creamSoft,
    border: `1.5px solid ${QED.ink}`,
    borderRadius: QED.rLg,
    boxShadow: `3px 3px 0 0 ${QED.ink}`,
    padding: 14,
    overflow: 'hidden',
  });

  return (
    <div onClick={() => setFlipped(f => !f)} style={{
      perspective: 1400, width: '100%', cursor: 'pointer', userSelect: 'none',
    }}>
      <div style={{
        position: 'relative', width: '100%', aspectRatio: '1.586 / 1',
        transformStyle: 'preserve-3d',
        transition: 'transform 620ms cubic-bezier(.2,.7,.1,1)',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}>

        {/* ── FRONT ─────────────────────────────────────────────────── */}
        <div style={face(false)}>
          {/* Soft yellow halo behind the name */}
          <div style={{
            position: 'absolute', left: -50, top: '50%', transform: 'translateY(-50%)',
            width: 220, height: 180, borderRadius: 999,
            background: `radial-gradient(circle, ${QED.yellowSoft} 0%, transparent 65%)`,
            pointerEvents: 'none',
          }}/>

          {/* Top-left rubber stamp */}
          <div style={{ position: 'absolute', top: 10, left: 10 }}>
            <RubberStamp lines={['QED', 'VALENCIA', 'EST 2022']} size={48} />
          </div>

          {/* Top-right kicker + flip cue */}
          <div style={{ position: 'absolute', top: 12, right: 12, textAlign: 'right' }}>
            <div style={{ fontFamily: QED.mono, fontSize: 8, fontWeight: 800, letterSpacing: '0.12em', color: QED.inkSoft }}>
              {t.qedCard.kicker}
            </div>
            <div style={{ fontFamily: QED.mono, fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', color: QED.inkMute, marginTop: 3 }}>
              {memberCode}
            </div>
            <div style={{
              marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '2px 6px', borderRadius: 999,
              border: `1px dashed ${QED.hairlineStrong}`,
              fontFamily: QED.mono, fontSize: 7, fontWeight: 700,
              letterSpacing: '0.14em', textTransform: 'uppercase', color: QED.inkMute,
            }}>
              ↻ {t.qedCard.flipHintFront}
            </div>
          </div>

          {/* Big name + meta */}
          <div style={{ position: 'absolute', left: 14, right: 14, top: '50%', transform: 'translateY(-50%)' }}>
            <div style={{
              fontFamily: QED.sans, fontWeight: 900, fontSize: 22, lineHeight: 1.0,
              color: QED.ink, letterSpacing: '-0.025em', textTransform: 'uppercase',
            }}>
              {memberName}
            </div>
            <div style={{ height: 1.2, background: QED.ink, opacity: 0.55, marginTop: 7 }}/>
            <div style={{
              marginTop: 5, fontFamily: QED.mono, fontSize: 9, fontWeight: 800,
              letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.inkSoft,
            }}>
              {t.qedCard.memberSince(joinEdition)}  ·  {t.qedCard.nights(nights)}
            </div>
          </div>

          {/* Bottom-left signature */}
          <div style={{ position: 'absolute', bottom: 10, left: 12 }}>
            <HostSignature height={18} />
            <div style={{
              fontFamily: QED.mono, fontSize: 7, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: QED.inkMute, marginTop: 1,
            }}>
              {t.qedCard.hostSig} · {t.qedCard.hostName}
            </div>
          </div>

          {/* Bottom-right tier badge */}
          <div style={{ position: 'absolute', bottom: 10, right: 10 }}>
            <ComicBurst size={44} color={tierColor}>
              <span style={{ fontFamily: QED.sans, fontSize: 8, fontWeight: 900, color: QED.ink, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                {tierLabel}
              </span>
            </ComicBurst>
          </div>

        </div>

        {/* ── BACK ──────────────────────────────────────────────────── */}
        <div style={face(true)}>
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: QED.mono, fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: QED.inkSoft }}>
              {t.qedCard.stampsTitle(nights, totalStamps)}
            </div>
            <div style={{ fontFamily: QED.mono, fontSize: 7, fontWeight: 700, letterSpacing: '0.12em', color: QED.inkMute, textTransform: 'uppercase' }}>
              ↻ {t.qedCard.flipHintBack}
            </div>
          </div>

          {/* Stamps grid: 5x2 */}
          <div style={{
            marginTop: 8,
            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4,
            justifyItems: 'center',
          }}>
            {stamps.map((s, i) => (
              <StampCell key={i} edition={s.edition} earned={s.earned} size={32} />
            ))}
          </div>

          {/* Free-night goal — single line inside the stamps section */}
          <div style={{
            marginTop: 8,
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 8px',
            background: freeNightUnlocked ? QED.greenSoft : QED.orangeSoft,
            border: `1px solid ${QED.ink}`, borderRadius: 999,
          }}>
            {Icon.sparkle(11, freeNightUnlocked ? QED.greenInk : QED.orange)}
            <span style={{
              fontFamily: QED.sans, fontSize: 11, fontWeight: 800,
              color: freeNightUnlocked ? QED.greenInk : QED.ink, letterSpacing: '-0.01em',
            }}>
              {t.qedCard.freeNightTitle}
            </span>
            <span style={{
              marginLeft: 'auto',
              fontFamily: QED.mono, fontSize: 8, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: freeNightUnlocked ? QED.greenInk : QED.inkSoft,
            }}>
              {freeNightUnlocked ? t.qedCard.freeNightUnlocked : t.qedCard.freeNightProgress(stampsToGo)}
            </span>
          </div>

          {/* Bottom: QR + label */}
          <div style={{
            position: 'absolute', left: 14, right: 14, bottom: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ background: '#fff', padding: 2, border: `1.5px solid ${QED.ink}`, borderRadius: 4 }}>
              <QRCodePlaceholder size={36} value={memberCode} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontFamily: QED.mono, fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                color: QED.ink, textTransform: 'uppercase', lineHeight: 1.1,
              }}>
                {t.qedCard.memberQRTitle}
              </div>
              <div style={{
                fontFamily: QED.sans, fontSize: 9, fontWeight: 600,
                color: QED.inkSoft, marginTop: 1, lineHeight: 1.2,
              }}>
                {t.qedCard.memberQRSub}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

const PROFILE_RESERVATIONS = [
  { id: 'r1', eventIdx: 1, edition: 199, date: 'Tue, May 5',  time: '20:30', status: 'active'    },
  { id: 'r2', eventIdx: 0, edition: 195, date: 'Mon, Apr 14', time: '20:00', status: 'completed' },
  { id: 'r3', eventIdx: 2, edition: 192, date: 'Wed, Apr 2',  time: '20:00', status: 'cancelled' },
  { id: 'r4', eventIdx: 3, edition: 188, date: 'Thu, Mar 20', time: '20:30', status: 'completed' },
  { id: 'r5', eventIdx: 1, edition: 184, date: 'Tue, Mar 4',  time: '20:30', status: 'cancelled' },
];

// ── My Info ───────────────────────────────────────────────────────────────
function ProfileInfoSection({ form, setForm }) {
  const { t } = useT();
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
        {[['firstName', t.fieldFirstNameLabel], ['lastName', t.fieldLastNameLabel]].map(([k, l]) => (
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
        <label style={mono11}>{t.fieldUsernameLabel}</label>
        <input style={inp('username')} value={form.username}
          onChange={e => setForm(f => ({ ...f, username: e.target.value }))} {...bind('username')} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={mono11}>{t.fieldInstagramLabel}</label>
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
        <label style={mono11}>{t.fieldPhoneLabel}</label>
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
        <label style={mono11}>{t.fieldEmailLabel}</label>
        <input
          style={{ ...inp('email'), background: QED.creamSoft, color: QED.inkMute, cursor: 'not-allowed', boxShadow: 'none' }}
          value="dmitry.christie@gmail.com" disabled />
        <span style={{ fontFamily: QED.sans, fontSize: 11, color: QED.inkMute, marginTop: 5, display: 'block', paddingLeft: 2 }}>
          {t.contactSupport}
        </span>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={mono11}>{t.fieldCityLabel}</label>
        <input style={inp('city')} value={form.city}
          onChange={e => setForm(f => ({ ...f, city: e.target.value }))} {...bind('city')} />
      </div>

      <div style={{ marginTop: 8 }}>
        <QEDButton variant="cta">{t.updateProfile}</QEDButton>
      </div>
    </div>
  );
}

// ── Communication preferences ─────────────────────────────────────────────
function ProfileCommsSection({ comms, setComms }) {
  const { t } = useT();

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
        {t.commsTitle}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {t.commsPref.map((p, i) => (
          <div key={p.key} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 0',
            borderBottom: i < t.commsPref.length - 1 ? `1px solid ${QED.hairline}` : 'none',
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
            {p.mandatory && <Badge color="soft">{t.required}</Badge>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Next Event hero ───────────────────────────────────────────────────────
function NextEventHero({ reservation, onShowQR, onMore }) {
  const { t } = useT();
  const ev = QED_EVENTS[reservation.eventIdx];
  return (
    <div style={{
      background: QED.orangeSoft, border: `1.5px solid ${QED.ink}`,
      borderRadius: QED.rLg, boxShadow: `3px 3px 0 0 ${QED.ink}`,
      padding: '14px 14px 16px', marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: QED.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: QED.orangeDeep, marginBottom: 4 }}>
            {t.yourNextEvent}
          </div>
          <div style={{ fontFamily: QED.sans, fontSize: 18, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            {ev.title}
          </div>
          <div style={{ fontFamily: QED.mono, fontSize: 11, color: QED.ink, fontWeight: 700, marginTop: 5, letterSpacing: '0.04em' }}>
            {reservation.date} · {reservation.time} · #{reservation.edition}
          </div>
        </div>
        <button onClick={onMore} aria-label="More options" style={{
          width: 32, height: 32, borderRadius: 999, flexShrink: 0,
          border: `1.5px solid ${QED.ink}`, background: QED.paper, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: QED.mono, fontSize: 15, fontWeight: 700, color: QED.inkSoft,
        }}>···</button>
      </div>
      <QEDButton variant="cta" icon={Icon.qr(16, '#fff')} onClick={onShowQR}>
        {t.showQR}
      </QEDButton>
    </div>
  );
}

// ── My Reservations ───────────────────────────────────────────────────────
function ProfileReservationsSection({ onSheet }) {
  const { t } = useT();
  const statusBadge = (s) =>
    s === 'active'    ? <Badge color="green">{t.commsPref ? 'Active' : 'Active'}</Badge>   :
    s === 'completed' ? <Badge color="soft">Completed</Badge> :
                        <Badge color="red">Cancelled</Badge>;

  const nextActive = PROFILE_RESERVATIONS.find(r => r.status === 'active');

  return (
    <div style={{ paddingTop: 12 }}>
      {nextActive && (
        <NextEventHero
          reservation={nextActive}
          onShowQR={() => onSheet(nextActive, 'qr')}
          onMore={() => onSheet(nextActive, 'actions')}
        />
      )}
      <div style={{
        fontFamily: QED.mono, fontSize: 10, fontWeight: 700, color: QED.inkMute,
        letterSpacing: '0.08em', textTransform: 'uppercase', margin: '6px 2px 8px',
      }}>
        {t.allReservations}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
            <button onClick={() => onSheet(r, 'actions')} style={{
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
    </div>
  );
}

function ReservationActionSheet({ res, initialView = 'actions', onClose }) {
  const { t } = useT();
  const [view, setView] = React.useState(initialView);
  const ev = QED_EVENTS[res.eventIdx];
  const ACTIONS = [
    ...(res.status === 'active' ? [{ label: t.showQR, icon: Icon.qr(16, QED.ink), onAction: () => setView('qr') }] : []),
    { label: t.modifyReservation, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 20h4l10.5-10.5a2.83 2.83 0 0 0-4-4L4 16v4z" stroke={QED.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.5 6.5l4 4" stroke={QED.ink} strokeWidth="2" strokeLinecap="round"/></svg> },
    { label: t.addToCalendar,     icon: Icon.cal(16, QED.ink)   },
    { label: t.shareReservation,  icon: Icon.globe(16, QED.ink) },
    { label: t.cancelReservation, icon: Icon.close(16, QED.red), danger: true },
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
          {view === 'qr' ? (
            <button onClick={() => setView('actions')} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: QED.sans, fontSize: 14, fontWeight: 700, color: QED.ink,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke={QED.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {t.backBtn}
            </button>
          ) : (
            <div>
              <div style={{ fontFamily: QED.sans, fontSize: 15, fontWeight: 800, color: QED.ink }}>{ev.title}</div>
              <div style={{ fontFamily: QED.mono, fontSize: 10, color: QED.inkMute, fontWeight: 700, marginTop: 2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Edition #{res.edition} · {res.date}
              </div>
            </div>
          )}
          <button onClick={onClose} aria-label="Close" style={{
            width: 30, height: 30, borderRadius: 999, border: 'none', background: 'transparent',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>{Icon.close(16, QED.inkSoft)}</button>
        </div>

        {view === 'actions' ? (
          <div style={{ padding: '6px 16px 44px', display: 'flex', flexDirection: 'column' }}>
            {ACTIONS.map((a, i) => (
              <button key={i} onClick={() => a.onAction ? a.onAction() : onClose()} style={{
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
        ) : (
          <div style={{ padding: '24px 16px 44px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ padding: 8, background: '#fff', border: `1.5px solid ${QED.ink}`, borderRadius: QED.rMd, boxShadow: `3px 3px 0 0 ${QED.ink}` }}>
              <QRCodePlaceholder size={180} value={`QED-${res.edition}`} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: QED.mono, fontSize: 14, fontWeight: 700, color: QED.ink, letterSpacing: '0.06em' }}>QED-{res.edition}</div>
              <div style={{ fontFamily: QED.sans, fontSize: 13, color: QED.inkSoft, marginTop: 4 }}>{ev.title} · {res.date}</div>
              <div style={{ fontFamily: QED.sans, fontSize: 11, color: QED.inkMute, marginTop: 3 }}>{t.showAtVenueQR}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Achievements ──────────────────────────────────────────────────────────
function ProfileAchievementsSection() {
  const { t } = useT();
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
        <span style={{ fontFamily: QED.sans, fontSize: 18, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em' }}>{t.achievementsTitle}</span>
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
const EDITION_HISTORY = [
  { edition: 195, eventIdx: 0, date: 'Apr 14', score: 11, rank: 2 },
  { edition: 191, eventIdx: 1, date: 'Mar 31', score: 9,  rank: 4 },
  { edition: 188, eventIdx: 3, date: 'Mar 20', score: 13, rank: 1 },
  { edition: 183, eventIdx: 0, date: 'Mar 3',  score: 8,  rank: 3 },
  { edition: 179, eventIdx: 2, date: 'Feb 19', score: 12, rank: 2 },
  { edition: 175, eventIdx: 1, date: 'Feb 3',  score: 8,  rank: 5 },
];

function ProfileStatsSection() {
  const { t } = useT();
  const CARDS = [
    { label: t.statsCardLabels[0], value: '10.16', bg: QED.yellowSoft },
    { label: t.statsCardLabels[1], value: '6',     bg: QED.greenSoft  },
    { label: t.statsCardLabels[2], value: '61',    bg: '#DDEEF8'       },
    { label: t.statsCardLabels[3], value: '0',     bg: '#FAE0D8'       },
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
          <div style={{ fontFamily: QED.sans, fontSize: 14, fontWeight: 800, color: QED.ink }}>{t.scoreTrend}</div>
          <QEDButton size="sm" full={false} variant="ghost" icon={Icon.cal(12, QED.ink)}
            style={{ height: 30, fontSize: 11, padding: '0 10px', boxShadow: `1px 1px 0 0 ${QED.ink}` }}>
            {t.allTime}
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

      {/* Edition history */}
      <div style={{
        marginTop: 12, background: QED.paper, border: `1.5px solid ${QED.ink}`,
        borderRadius: QED.rMd, boxShadow: `2px 2px 0 0 ${QED.ink}`, overflow: 'hidden',
      }}>
        <div style={{
          padding: '10px 14px', borderBottom: `1px solid ${QED.hairline}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: QED.sans, fontSize: 13, fontWeight: 800, color: QED.ink }}>{t.editionHistory}</span>
          <span style={{ fontFamily: QED.mono, fontSize: 10, fontWeight: 700, color: QED.inkMute, letterSpacing: '0.05em' }}>
            {EDITION_HISTORY.length} {t.attended}
          </span>
        </div>
        {EDITION_HISTORY.map((e, i) => {
          const ev = QED_EVENTS[e.eventIdx];
          const best = e.score === Math.max(...EDITION_HISTORY.map(x => x.score));
          const rankLabel = t.rankLabels[e.rank] !== undefined ? t.rankLabels[e.rank] : t.rankOther(e.rank);
          return (
            <div key={e.edition} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              borderBottom: i < EDITION_HISTORY.length - 1 ? `1px solid ${QED.hairline}` : 'none',
              background: best ? QED.yellowSoft : 'transparent',
            }}>
              <span style={{
                fontFamily: QED.mono, fontSize: 11, fontWeight: 700, color: QED.orange,
                letterSpacing: '0.02em', flexShrink: 0, width: 32,
              }}>#{e.edition}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: QED.sans, fontSize: 13, fontWeight: 700, color: QED.ink, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ev.title}
                </div>
                <div style={{ fontFamily: QED.mono, fontSize: 10, color: QED.inkMute, fontWeight: 700, marginTop: 2, letterSpacing: '0.03em' }}>
                  {e.date} · {ev.area}
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontFamily: QED.sans, fontSize: 18, fontWeight: 900, color: QED.ink, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {e.score}
                </div>
                <div style={{ fontFamily: QED.mono, fontSize: 9, fontWeight: 700, color: QED.inkMute, marginTop: 2, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {rankLabel}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Add to Apple Wallet / Google Wallet ──────────────────────────────────
const AppleLogo = ({ s = 16 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="#fff" style={{ display: 'block' }}>
    <path d="M16.7 1.6c0 1.2-.5 2.3-1.3 3.2-.9.9-2.1 1.5-3.2 1.4-.1-1.1.5-2.3 1.3-3.1.9-.9 2.2-1.5 3.2-1.5zm4.4 16.5c-.6 1.4-1 2.1-1.8 3.3-1.2 1.7-2.9 3.8-5 3.8-1.8 0-2.3-1.2-4.8-1.2-2.5 0-3.1 1.2-4.8 1.2-2 0-3.7-1.9-4.9-3.6-3.3-4.7-3.7-10.3-1.6-13.3 1.4-2.1 3.7-3.4 5.9-3.4 2.2 0 3.6 1.2 5.4 1.2 1.8 0 2.9-1.2 5.4-1.2 1.9 0 4 1.1 5.5 2.9-4.8 2.6-4 9.5.7 11.3z"/>
  </svg>
);
const GoogleG = ({ s = 16 }) => (
  <svg width={s} height={s} viewBox="0 0 48 48" style={{ display: 'block' }}>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.5 29.3 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5 44.5 36.3 44.5 25c0-1.5-.2-3-.9-4.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 12.5 24 12.5c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.5 29.3 4.5 24 4.5 16.3 4.5 9.7 8.6 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 45.5c5.2 0 10-2 13.5-5.3l-6.2-5.3c-2 1.5-4.6 2.4-7.3 2.4-5.3 0-9.7-3.3-11.3-8L6 33c3.5 6.4 10.5 12.5 18 12.5z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.3C40.4 35.6 44.5 30.8 44.5 25c0-1.5-.2-3-.9-4.5z"/>
  </svg>
);

function WalletButton({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, minWidth: 0, height: 44, padding: '0 12px',
      background: QED.ink, color: '#fff',
      border: `1.5px solid ${QED.ink}`, borderRadius: 999,
      fontFamily: QED.sans, fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      cursor: 'pointer', boxShadow: `2px 2px 0 0 ${QED.ink}`,
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    }}>
      {icon}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </button>
  );
}

function AddToWallet() {
  const { t } = useT();
  return (
    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <WalletButton
        icon={<AppleLogo s={18} />}
        label={t.qedCard.addAppleWallet}
        onClick={() => alert('Apple Wallet: pass download (prototype)')}
      />
      <WalletButton
        icon={<GoogleG s={18} />}
        label={t.qedCard.addGoogleWallet}
        onClick={() => alert('Google Wallet: pass download (prototype)')}
      />
    </div>
  );
}

// ── Membership: subscription plans ───────────────────────────────────────
function PlanCard({ kicker, name, price, period, sub, perks, ctaLabel, ctaVariant = 'primary', current, featured, flag, onClick }) {
  const { t } = useT();
  return (
    <div style={{
      position: 'relative',
      background: featured ? QED.creamSoft : QED.paper,
      border: `1.5px solid ${QED.ink}`,
      borderRadius: QED.rLg,
      boxShadow: featured ? `3px 3px 0 0 ${QED.ink}` : `2px 2px 0 0 ${QED.ink}`,
      padding: 16,
      marginTop: 12,
    }}>
      {flag && !current && (
        <div style={{
          position: 'absolute', top: -12, right: 14,
          background: QED.yellow, color: QED.ink,
          border: `1.5px solid ${QED.ink}`, borderRadius: 999,
          padding: '4px 10px',
          fontFamily: QED.mono, fontSize: 9, fontWeight: 800, letterSpacing: '0.10em',
          boxShadow: `2px 2px 0 0 ${QED.ink}`,
        }}>
          {flag}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          {kicker && (
            <div style={{
              fontFamily: QED.mono, fontSize: 10, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.inkMute,
            }}>
              {kicker}
            </div>
          )}
          <div style={{
            fontFamily: QED.sans, fontSize: 18, fontWeight: 900, color: QED.ink,
            letterSpacing: '-0.02em', marginTop: 2,
          }}>
            {name}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span style={{
            fontFamily: QED.sans, fontSize: 26, fontWeight: 900, color: QED.ink,
            letterSpacing: '-0.03em',
          }}>{price}</span>
          {period && (
            <span style={{
              fontFamily: QED.mono, fontSize: 11, fontWeight: 700,
              color: QED.inkMute, marginLeft: 4,
            }}>{period}</span>
          )}
        </div>
      </div>
      {sub && (
        <div style={{
          fontFamily: QED.sans, fontSize: 14, fontWeight: 500, color: QED.inkSoft,
          marginTop: 8, lineHeight: 1.35,
        }}>
          {sub}
        </div>
      )}
      {perks && perks.length > 0 && (
        <ul style={{
          listStyle: 'none', padding: 0, margin: '12px 0 0',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {perks.map((p, i) => (
            <li key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              fontFamily: QED.sans, fontSize: 14, fontWeight: 600, color: QED.ink,
              letterSpacing: '-0.01em', lineHeight: 1.35,
            }}>
              <span style={{
                flexShrink: 0, marginTop: 6,
                width: 6, height: 6, borderRadius: 999, background: QED.orange,
              }} />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      )}
      <div style={{ marginTop: 14 }}>
        {current ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Badge color="green">{t.qedMembership.currentBadge}</Badge>
            <button
              onClick={(e) => {
                e.stopPropagation();
                alert('Manage subscription (prototype): billing portal, invoices, payment method');
              }}
              style={{
                background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                fontFamily: QED.mono, fontSize: 10, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.orangeDeep,
                textDecoration: 'underline', textUnderlineOffset: 3,
              }}
            >
              {t.qedMembership.manage}
            </button>
          </div>
        ) : (
          <QEDButton size="md" variant={ctaVariant} onClick={onClick}>{ctaLabel}</QEDButton>
        )}
      </div>
    </div>
  );
}

function MembershipPlans() {
  const { t } = useT();
  const [plan, setPlan] = React.useState('free');
  return (
    <div style={{ paddingTop: 22, marginTop: 22, borderTop: `1px solid ${QED.hairlineStrong}` }}>
      <div style={{
        fontFamily: QED.sans, fontSize: 18, fontWeight: 900, color: QED.ink,
        letterSpacing: '-0.02em',
      }}>
        {t.qedMembership.title}
      </div>
      <div style={{
        fontFamily: QED.mono, fontSize: 10, fontWeight: 700,
        letterSpacing: '0.06em', textTransform: 'uppercase', color: QED.inkMute, marginTop: 4,
      }}>
        {t.qedMembership.caption}
      </div>

      {/* Shared perks — what every member gets */}
      <ul style={{
        listStyle: 'none', padding: 0, margin: '14px 0 4px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {t.qedMembership.perks.map((p, i) => (
          <li key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            fontFamily: QED.sans, fontSize: 14, fontWeight: 600, color: QED.ink,
            letterSpacing: '-0.01em', lineHeight: 1.35,
          }}>
            <span style={{
              flexShrink: 0, marginTop: 6,
              width: 6, height: 6, borderRadius: 999, background: QED.orange,
            }} />
            <span>{p}</span>
          </li>
        ))}
      </ul>

      <PlanCard
        name={t.qedMembership.monthlyName}
        price={t.qedMembership.monthlyPrice}
        period={t.qedMembership.monthlyPeriod}
        sub={t.qedMembership.monthlySub}
        ctaLabel={t.qedMembership.cta}
        ctaVariant="primary"
        current={plan === 'monthly'}
        onClick={() => setPlan('monthly')}
      />

      <PlanCard
        name={t.qedMembership.annualName}
        price={t.qedMembership.annualPrice}
        period={t.qedMembership.annualPeriod}
        sub={t.qedMembership.annualSub}
        flag={t.qedMembership.annualFlag}
        featured
        ctaLabel={t.qedMembership.ctaAnnual}
        ctaVariant="cta"
        current={plan === 'annual'}
        onClick={() => setPlan('annual')}
      />

      {/* Footer: pay-per-night status or switch-back link */}
      <div style={{
        marginTop: 14, paddingTop: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        {plan === 'free' ? (
          <div style={{
            fontFamily: QED.sans, fontSize: 13, fontWeight: 600, color: QED.inkSoft,
            letterSpacing: '-0.01em',
          }}>
            {t.qedMembership.perNightSub}
          </div>
        ) : (
          <button
            onClick={() => setPlan('free')}
            style={{
              background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
              fontFamily: QED.mono, fontSize: 10, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.orangeDeep,
              textDecoration: 'underline', textUnderlineOffset: 3,
              marginLeft: 'auto',
            }}
          >
            {t.qedMembership.perNight}
          </button>
        )}
      </div>

      <div style={{
        fontFamily: QED.mono, fontSize: 10, fontWeight: 700,
        letterSpacing: '0.06em', textTransform: 'uppercase', color: QED.inkMute,
        marginTop: 10, textAlign: 'center',
      }}>
        {t.qedMembership.legal}
      </div>
    </div>
  );
}

// ── Membership tab: loyalty card + add-to-wallet + subscription plans ────
function ProfileMembershipSection({ memberName, joinEdition, editions, memberCode }) {
  return (
    <div style={{ paddingTop: 12 }}>
      <QEDLoyaltyCard
        memberName={memberName}
        joinEdition={joinEdition}
        editions={editions}
        memberCode={memberCode}
      />
      <AddToWallet />
      <MembershipPlans />
    </div>
  );
}

// ── Settings: Account (info) + Comms + Log out, in one tab ────────────────
function ProfileSettingsSection({ form, setForm, comms, setComms }) {
  const { t } = useT();
  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{
        fontFamily: QED.sans, fontSize: 18, fontWeight: 900, color: QED.ink,
        letterSpacing: '-0.02em',
      }}>
        {t.settingsAccount}
      </div>
      <ProfileInfoSection form={form} setForm={setForm} />
      <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${QED.hairlineStrong}` }}>
        <ProfileCommsSection comms={comms} setComms={setComms} />
      </div>
      <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${QED.hairlineStrong}`, display: 'flex' }}>
        <QEDButton size="md" full={false} variant="ghost">{t.logOut}</QEDButton>
      </div>
    </div>
  );
}

// ── Main ProfileScreen ────────────────────────────────────────────────────
function ProfileScreen({ onHome }) {
  const { t } = useT();
  const [section, setSection] = React.useState('membership');
  const [resSheet, setResSheet] = React.useState(null);
  const openSheet = (res, view = 'actions') => setResSheet({ res, view });

  const [form, setForm] = React.useState({
    firstName: 'Dmitry', lastName: 'Christie',
    username: 'dionysus7777', instagram: 'dreamitry',
    phoneNumber: '653 51 80 36', city: 'Valencia',
  });
  const [comms, setComms] = React.useState({
    newEvents: true, reminders: true, results: false, offers: true,
  });

  const SECS = ['membership', 'reservations', 'stats', 'settings'];

  // Loyalty card data — derived from edition history (oldest first)
  const editions = EDITION_HISTORY.map(e => e.edition).slice().reverse();
  const joinEdition = editions[0];
  const initials = `${form.firstName[0] || ''}${form.lastName[0] || ''}`.toUpperCase();
  const memberCode = `MEM-${initials}-${joinEdition}`;
  const memberName = `${form.firstName} ${form.lastName}`;

  return (
    <div style={{ height: '100%', overflow: 'auto', background: QED.cream }}>
      <QEDHeader onLogo={onHome} onProfile={() => setSection('membership')} />

      {/* Sticky pill nav — directly under the QEDHeader, no above-nav card */}
      <div style={{ position: 'sticky', top: 52, zIndex: 25, background: QED.cream, padding: '12px 0 10px' }}>
        <style>{`.qp-pills::-webkit-scrollbar{display:none}`}</style>
        <div className="qp-pills" style={{
          display: 'flex', gap: 8, overflowX: 'auto',
          padding: '0 16px', scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          {SECS.map(s => (
            <Chip key={s} active={section === s} onClick={() => setSection(s)}>{t.profileSections[s]}</Chip>
          ))}
        </div>
      </div>

      {/* Section body */}
      <div style={{ padding: '0 16px 48px' }}>
        {section === 'membership' && (
          <ProfileMembershipSection
            memberName={memberName}
            joinEdition={joinEdition}
            editions={editions}
            memberCode={memberCode}
          />
        )}
        {section === 'reservations' && <ProfileReservationsSection onSheet={openSheet} />}
        {section === 'stats' && (
          <>
            <ProfileStatsSection />
            <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${QED.hairlineStrong}` }}>
              <ProfileAchievementsSection />
            </div>
          </>
        )}
        {section === 'settings' && <ProfileSettingsSection form={form} setForm={setForm} comms={comms} setComms={setComms} />}
      </div>

      {resSheet && <ReservationActionSheet res={resSheet.res} initialView={resSheet.view} onClose={() => setResSheet(null)} />}
    </div>
  );
}

Object.assign(window, { ProfileScreen });
