// Event detail / booking screen — mobile, conversion-focused

function DetailRow({ icon, label, value, accent, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${QED.hairline}`, cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', opacity: 0.45 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 700, color: QED.inkSoft, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontFamily: QED.sans, fontSize: 14, fontWeight: 600, color: QED.ink, marginTop: 1 }}>{value}</div>
      </div>
      {accent}
    </div>
  );
}

function MapPlaceholder() {
  return (
    <div style={{ width: '100%', height: 140, borderRadius: QED.rMd, overflow: 'hidden', position: 'relative', border: `1.5px solid ${QED.ink}` }}>
      <svg width="100%" height="100%" viewBox="0 0 320 140" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
        <rect width="320" height="140" fill="#EFE7D5"/>
        {/* streets */}
        <g stroke="#D9CDB1" strokeWidth="14" strokeLinecap="round">
          <path d="M-10 40 L 340 60"/>
          <path d="M-10 100 L 340 80"/>
          <path d="M60 -10 L 90 150"/>
          <path d="M200 -10 L 230 150"/>
        </g>
        <g stroke="#fff" strokeWidth="2" strokeLinecap="round">
          <path d="M-10 40 L 340 60"/>
          <path d="M-10 100 L 340 80"/>
          <path d="M60 -10 L 90 150"/>
          <path d="M200 -10 L 230 150"/>
        </g>
        {/* blocks */}
        <g fill="#E5DAC0">
          <rect x="100" y="20" width="90" height="32" rx="3"/>
          <rect x="100" y="86" width="90" height="36" rx="3"/>
          <rect x="240" y="20" width="70" height="32" rx="3"/>
          <rect x="240" y="86" width="70" height="36" rx="3"/>
        </g>
      </svg>
      {/* pin */}
      <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-100%)' }}>
        <svg width="34" height="42" viewBox="0 0 34 42">
          <path d="M17 41s14-15 14-25a14 14 0 1 0-28 0c0 10 14 25 14 25z" fill={QED.orange} stroke={QED.ink} strokeWidth="2.5"/>
          <circle cx="17" cy="16" r="5" fill="#fff"/>
        </svg>
      </div>
    </div>
  );
}

function DetailScreen({ tweaks, onBack, onReserve, event, scrollToForm, onProfile }) {
  const baseEvent = event || QED_EVENTS[0];
  const [demoPayment, setDemoPayment] = React.useState(null); // 'optional' | 'required' | null
  const e = demoPayment === 'required'
    ? (QED_EVENTS.find(ev => ev.paymentRequired) || baseEvent)
    : demoPayment === 'optional'
    ? (QED_EVENTS.find(ev => !ev.paymentRequired) || baseEvent)
    : baseEvent;

  const [showSpecial, setShowSpecial] = React.useState(!!e.special);
  const [guests, setGuests] = React.useState(4);
  const [agreed, setAgreed] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [showMore, setShowMore] = React.useState(false);
  const [showStickyBar, setShowStickyBar] = React.useState(true);
  const [inlineCTAEntered, setInlineCTAEntered] = React.useState(false);
  const formRef = React.useRef(null);
  const inlineCTARef = React.useRef(null);
  const scrollContainerRef = React.useRef(null);
  const address = 'Carrer del Dr. Ferran 10, 46021 València';

  React.useEffect(() => {
    if (scrollToForm && formRef.current) {
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }
  }, []);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const onScroll = (e_) => {
    if (!scrollContainerRef.current) return;
    const containerRect = scrollContainerRef.current.getBoundingClientRect();
    // Hide sticky bar as soon as the form section enters view
    if (formRef.current) {
      const formRect = formRef.current.getBoundingClientRect();
      setShowStickyBar(formRect.top >= containerRect.bottom - 40);
    }
    // Fire the inline CTA entrance animation once it's actually visible
    if (inlineCTARef.current) {
      const btnRect = inlineCTARef.current.getBoundingClientRect();
      if (btnRect.top < containerRect.bottom - 40 && btnRect.bottom > containerRect.top + 40) {
        setInlineCTAEntered(true);
      }
    }
  };

  return (
    <div ref={scrollContainerRef} onScroll={onScroll} style={{ height: '100%', overflow: 'auto', background: QED.cream, position: 'relative' }}>
      {/* Hero */}
      <div style={{ position: 'relative' }}>
        <VenuePlaceholder height={240} label={e.title} tone={e.tone} />
        {/* back button */}
        <button onClick={onBack} style={{
          position: 'absolute', top: 56, left: 14, width: 40, height: 40, borderRadius: 999,
          background: 'rgba(255,255,255,0.95)', border: `1.5px solid ${QED.ink}`, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke={QED.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        {onProfile && (
          <button onClick={onProfile} aria-label="Profile" style={{
            position: 'absolute', top: 56, right: 14, width: 40, height: 40, borderRadius: 999,
            background: 'rgba(255,255,255,0.95)', border: `1.5px solid ${QED.ink}`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {Icon.person(15, QED.ink)}
          </button>
        )}

        {/* badge stack — bottom of hero */}
        <div style={{ position: 'absolute', bottom: 12, left: 14, display: 'flex', gap: 6, flexWrap: 'wrap', zIndex: 3 }}>
          {e.discount > 0 && <Badge color="orange">{e.discount}% off · book now</Badge>}
          {e.hot && !showSpecial && <Badge color="red"><span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>{Icon.flame(10, '#fff')} Almost full</span></Badge>}
          {showSpecial && e.special && <Badge color="ink">⭐ Special event</Badge>}
        </div>
      </div>

      {/* Title block — overlaps hero */}
      <div style={{
        margin: '-22px 14px 0', background: QED.paper,
        border: `1.5px solid ${QED.ink}`, borderRadius: QED.rLg,
        boxShadow: `3px 3px 0 0 ${showSpecial && e.special ? QED.yellow : QED.ink}`, padding: 16, position: 'relative', zIndex: 2,
      }}>
        <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.inkSoft }}>
          {showSpecial && e.special ? `Special Event · ${e.area}` : `Pub Quiz · ${e.area}`}
        </div>
        <div style={{ fontFamily: QED.sans, fontSize: 24, fontWeight: 900, color: QED.ink, letterSpacing: '-0.025em', marginTop: 2, lineHeight: 1.1 }}>
          {showSpecial && e.special ? `${e.special.name} at ${e.title}` : e.title}
        </div>
        {showSpecial && e.special && (
          <div style={{ fontFamily: QED.sans, fontSize: 13, color: QED.inkSoft, fontStyle: 'italic', marginTop: 4, lineHeight: 1.4 }}>
            {e.special.subtitle}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: QED.sans, fontSize: 13, color: QED.ink, fontWeight: 700 }}>
            <span style={{ color: QED.yellow }}>★</span> {e.rating}
            <span style={{ color: QED.inkMute, fontWeight: 500 }}>({e.reviews} teams)</span>
          </div>
          <div style={{ width: 3, height: 3, borderRadius: 3, background: QED.inkMute }}/>
          <div style={{ fontFamily: QED.sans, fontSize: 13, color: QED.inkSoft, fontWeight: 600 }}>
            {e.spots} of {e.cap} spots left
          </div>
        </div>

        {/* About this quiz — event description */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${QED.hairlineStrong}` }}>
          <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.inkSoft }}>
            {showSpecial && e.special ? 'About this special' : 'About this quiz'}
          </div>
          <p style={{ fontFamily: QED.sans, fontSize: 14, color: QED.ink, lineHeight: 1.5, margin: '6px 0 0', textWrap: 'pretty' }}>
            {showSpecial && e.special
              ? 'One night only. All 4 rounds go full galaxy brain — sci-fi, film lore, Star Wars deep cuts, and a picture round that will make your team question everything. Costumes welcome. Lightsabers at the door.'
              : 'A live trivia night is an evening at a pub where teams of friends answer questions across themed rounds — hosted live, no screens allowed. Think pop culture, history, sport, and music. Whoever scores most wins a bar tab.'}
          </p>
          {!showSpecial && showMore && (
            <p style={{ fontFamily: QED.sans, fontSize: 14, color: QED.ink, lineHeight: 1.5, margin: '6px 0 0', textWrap: 'pretty' }}>
              <strong>El Garaje</strong> is a buzzy gastrobar tucked behind the stadium — wood-fired pizza, sharing plates, and a long taplist. Quiz kicks off at 20:30 sharp with our host <strong>Liam</strong>: 4 themed rounds, 40 questions, plus a picture round and a music finale. Winners take home a €60 bar tab, runners-up get free dessert, and last place gets a hug.
            </p>
          )}
          {!showSpecial && (
            <button onClick={() => setShowMore(m => !m)} style={{
              marginTop: 8, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
              fontFamily: QED.sans, fontSize: 13, fontWeight: 700, color: QED.orangeDeep,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>{showMore ? 'Show less' : 'Read more'} {Icon.chevR(11, QED.orangeDeep)}</button>
          )}
        </div>

        {/* Quick details */}
        <div style={{ marginTop: 10 }}>
          <DetailRow icon={Icon.cal(16, QED.ink)} label="When" value={`${e.dateLabel} · ${e.time}`} accent={<CountdownPill hours={e.countdownH} />} />
          <DetailRow
            icon={Icon.pin(16, QED.ink)}
            label="Where"
            value={address}
            onClick={handleCopyAddress}
            accent={
              <div style={{ flexShrink: 0, fontFamily: QED.sans, fontSize: 11, fontWeight: 700, color: copied ? QED.greenInk : QED.inkSoft, display: 'flex', alignItems: 'center', gap: 3 }}>
                {copied ? <>{Icon.check(11, QED.greenInk)} Copied!</> : <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke={QED.inkSoft} strokeWidth="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke={QED.inkSoft} strokeWidth="2"/></svg>
                  Copy</>}
              </div>
            }
          />
          <DetailRow icon={Icon.users(16, QED.ink)} label="Format" value="Teams of 2–5 · 4 rounds, 40 questions" />
          <DetailRow icon={Icon.globe(16, QED.ink)} label="Language" value={e.lang === 'EN' ? 'English' : 'Español'} />
          {e.host && <DetailRow icon={Icon.sparkle(16, QED.orange)} label="Your host" value={e.host} />}
        </div>

        {/* Venue amenities — below host */}
        {e.amenities && e.amenities.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {e.amenities.map(a => (
              <div key={a} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 999,
                background: QED.creamSoft, border: `1px solid ${QED.hairlineStrong}`,
                fontFamily: QED.sans, fontSize: 11, color: QED.inkSoft, fontWeight: 600
              }}>
                {a === 'wheelchair' && Icon.wheelchair(11, QED.inkSoft)}
                {a === 'veggie' && Icon.leaf(11)}
                {a === 'gf' && Icon.wheat(11, QED.inkSoft)}
                {a === 'pet' && Icon.paw(11, QED.inkSoft)}
                <span>{a === 'wheelchair' ? 'Accessible' : a === 'veggie' ? 'Veggie options' : a === 'gf' ? 'Gluten-free' : 'Pet friendly'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* What you get */}
      <div style={{ padding: '20px 16px 8px' }}>
        <div style={{ fontFamily: QED.sans, fontSize: 15, fontWeight: 800, color: QED.ink, letterSpacing: '-0.01em' }}>What's included</div>
        <div style={{ marginTop: 8 }}>
          {[
            ['40 questions', '4 themed rounds'],
            ['Real prizes', 'Bar credit + merch'],
            ['Pens & sheets', 'On the house'],
            ['Pay at venue', 'Cash or card'],
          ].map(([t, s], i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8,
              padding: '9px 0',
              borderBottom: i < 3 ? `1px solid ${QED.hairline}` : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 16, height: 16, borderRadius: 999, background: QED.green, border: `1.5px solid ${QED.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {Icon.check(9, '#fff')}
                </div>
                <span style={{ fontFamily: QED.sans, fontSize: 14, fontWeight: 700, color: QED.ink }}>{t}</span>
              </div>
              <span style={{ fontFamily: QED.sans, fontSize: 12, color: QED.inkSoft, whiteSpace: 'nowrap' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div style={{ padding: '12px 16px 8px' }}>
        <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.inkSoft, marginBottom: 8 }}>Getting there</div>
        <MapPlaceholder />
      </div>

      {/* Reserve form */}
      <div ref={formRef} style={{ padding: '20px 16px 8px' }}>
        <div style={{ fontFamily: QED.sans, fontSize: 18, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em' }}>Reserve your spot</div>
        <div style={{ fontFamily: QED.sans, fontSize: 13, color: QED.inkSoft, marginTop: 2 }}>
          {e.paymentRequired ? 'Pay online to lock in your early-bird rate.' : 'Takes 30 seconds. Pay at the venue.'}
        </div>

        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Guest stepper */}
          <div style={{
            background: QED.paper, border: `1.5px solid ${QED.ink}`, borderRadius: QED.rMd,
            padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontFamily: QED.sans, fontSize: 13, fontWeight: 700, color: QED.ink }}>How many people?</div>
              <div style={{ fontFamily: QED.sans, fontSize: 12, color: QED.inkSoft, marginTop: 1 }}>Including yourself</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setGuests(Math.max(1, guests - 1))} style={stepperBtn}>−</button>
              <span style={{ fontFamily: QED.sans, fontSize: 18, fontWeight: 800, color: QED.ink, minWidth: 18, textAlign: 'center' }}>{guests}</span>
              <button onClick={() => setGuests(Math.min(20, guests + 1))} style={stepperBtn}>+</button>
            </div>
          </div>

          {/* Teams notice — only when > 5 */}
          {guests > 5 && (
            <div style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '12px 14px', borderRadius: QED.rMd,
              background: QED.creamSoft, border: `1px solid ${QED.hairlineStrong}`,
            }}>
              <div style={{ flexShrink: 0, marginTop: 1 }}>{Icon.users(16, QED.inkSoft)}</div>
              <div style={{ fontFamily: QED.sans, fontSize: 12.5, color: QED.inkSoft, lineHeight: 1.45 }}>
                Teams are <strong style={{ color: QED.ink }}>max 5 players</strong>. Bigger group? No problem — we'll split you into teams at the venue and you can pick your own team names there.
              </div>
            </div>
          )}

          {/* Name: first + last */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="First name" placeholder="Dmitry" required />
            <Field label="Last name" placeholder="Christie" required />
          </div>
          <Field label="Email" placeholder="dmitry@example.com" type="email" required />
          <Field label="Phone" placeholder="+34 653 51 80 36" type="tel" />
          <Field label="Note (optional)" placeholder="Anything we should know? e.g. birthday, allergy, accessibility needs…" multiline />
        </div>

        {/* Total */}
        <div style={{
          marginTop: 14, padding: 14, borderRadius: QED.rMd,
          background: QED.yellowSoft, border: `1.5px solid ${QED.ink}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: QED.sans, fontSize: 13, fontWeight: 700, color: QED.ink }}>
              {e.discount > 0 ? 'Early-bird total' : 'Total'} ({guests} × €{e.price.toFixed(2)})
            </span>
            <span style={{ fontFamily: QED.sans, fontSize: 22, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em' }}>€{(guests * e.price).toFixed(2)}</span>
          </div>
          {e.discount > 0 && (
            <div style={{ fontFamily: QED.sans, fontSize: 12, color: QED.orangeDeep, fontWeight: 700, marginTop: 4 }}>
              {e.paymentRequired
                ? '⚡ Early-bird rate — online payment required to secure this price'
                : '⚡ Early-bird rate — only applies if you pay online now (otherwise full price at venue)'}
            </div>
          )}
          {!e.paymentRequired && (
            <div style={{ fontFamily: QED.sans, fontSize: 11, color: QED.inkSoft, marginTop: 2 }}>
              Or pay full price (€{(guests * e.full).toFixed(2)}) at the venue if you prefer
            </div>
          )}
        </div>

        {/* Privacy policy checkbox */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 14, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={e_ => setAgreed(e_.target.checked)}
            style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, accentColor: QED.ink, cursor: 'pointer' }}
          />
          <span style={{ fontFamily: QED.sans, fontSize: 12, color: QED.inkSoft, lineHeight: 1.45 }}>
            I agree to the <span style={{ color: QED.ink, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>Privacy Policy</span> and <span style={{ color: QED.ink, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>Terms of Service</span>. QED may contact me about this booking.
          </span>
        </label>

        {/* Sticky-ish CTA + fine print — entrance animation fires once when scrolled into view */}
        <div ref={inlineCTARef} style={{
          marginTop: 10,
          transform: inlineCTAEntered ? 'translateY(0)' : 'translateY(20px)',
          opacity: inlineCTAEntered ? 1 : 0,
          transition: 'transform 0.42s cubic-bezier(0.22,1,0.36,1) 0.08s, opacity 0.38s ease 0.08s',
        }}>
          <div style={{ opacity: agreed ? 1 : 0.45, transition: 'opacity 0.15s' }}>
            <QEDButton size="lg" icon={e.paymentRequired ? Icon.euro(15, '#fff') : Icon.check(15)}
              onClick={() => agreed && onReserve && onReserve({ event: e, guests })}
              style={{ pointerEvents: agreed ? 'auto' : 'none' }}>
              {e.paymentRequired ? `Pay €${(guests * e.price).toFixed(2)} & Reserve` : `Reserve ${guests} ${guests === 1 ? 'spot' : 'spots'}`}
            </QEDButton>
            <div style={{ fontFamily: QED.sans, fontSize: 11, color: QED.inkMute, textAlign: 'center', marginTop: 8 }}>
              {e.paymentRequired
                ? 'Early-bird price secured instantly · Free cancellation 24h before'
                : 'Free cancellation up to 24 hours before · No card needed today'}
            </div>
          </div>
        </div>

        {/* Demo toggles */}
        <div style={{ textAlign: 'center', marginTop: 14, paddingBottom: 4, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          <button
            onClick={() => setDemoPayment(e.paymentRequired ? 'optional' : 'required')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: QED.mono, fontSize: 10, color: QED.inkMute, letterSpacing: '0.05em' }}>
            [demo: {e.paymentRequired ? 'payment required' : 'pay at venue'} · tap to switch]
          </button>
          {e.special && (
            <button
              onClick={() => setShowSpecial(s => !s)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: QED.mono, fontSize: 10, color: QED.inkMute, letterSpacing: '0.05em' }}>
              [demo: {showSpecial ? '⭐ special event' : 'regular night'} · tap to switch]
            </button>
          )}
        </div>
      </div>

      {/* Spacer so content doesn't hide behind sticky bar */}
      <div style={{ height: 96 }}/>

      {/* Sticky outer — positioning only, no transform (transforms break sticky in some engines) */}
      <div style={{ position: 'sticky', bottom: 0, left: 0, right: 0, zIndex: 30 }}>
        {/* Animated inner — slide + fade without touching the sticky element itself */}
      <div style={{
        padding: '10px 14px 28px',
        background: 'linear-gradient(180deg, rgba(251,246,234,0) 0%, rgba(251,246,234,0.98) 30%)',
        transform: showStickyBar ? 'translateY(0)' : 'translateY(110%)',
        opacity: showStickyBar ? 1 : 0,
        pointerEvents: showStickyBar ? 'auto' : 'none',
        transition: showStickyBar
          ? 'transform 0.38s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease'
          : 'transform 0.28s cubic-bezier(0.4,0,1,1), opacity 0.2s ease-in',
      }}>
        <div style={{
          background: QED.paper, border: `1.5px solid ${QED.ink}`, borderRadius: QED.rXl,
          boxShadow: `2px 3px 0 0 ${QED.ink}`,
          padding: '8px 8px 8px 14px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: QED.sans, fontSize: 12, color: QED.inkSoft, fontWeight: 700 }}>From <span style={{ textDecoration: 'line-through', color: QED.inkMute }}>€{e.full.toFixed(2)}</span></div>
            <div style={{ fontFamily: QED.sans, fontSize: 18, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em' }}>€{e.price.toFixed(2)} <span style={{ fontSize: 12, color: QED.inkSoft, fontWeight: 600 }}>/ person</span></div>
          </div>
          <QEDButton full={false} size="md" icon={Icon.chevR(13, '#fff')}
            onClick={() => {
              if (agreed) { onReserve && onReserve({ event: e, guests }); }
              else { formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
            }}>
            Reserve now
          </QEDButton>
        </div>
      </div>
      </div>
    </div>
  );
}

const stepperBtn = {
  width: 32, height: 32, borderRadius: 999, border: `1.5px solid ${QED.ink}`,
  background: QED.paper, fontFamily: QED.sans, fontSize: 18, fontWeight: 700, color: QED.ink,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};

function Field({ label, placeholder, type = 'text', multiline, required }) {
  const base = {
    width: '100%', boxSizing: 'border-box',
    background: QED.paper, border: `1.5px solid ${QED.ink}`, borderRadius: QED.rMd,
    fontFamily: QED.sans, fontSize: 15, color: QED.ink, outline: 'none',
  };
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontFamily: QED.sans, fontSize: 12, fontWeight: 700, color: QED.inkSoft, marginBottom: 4 }}>
        {label}{required && <span style={{ color: QED.red, marginLeft: 2 }}>*</span>}
      </div>
      {multiline
        ? <textarea placeholder={placeholder} rows={3} style={{ ...base, padding: '12px 14px', resize: 'none', lineHeight: 1.45 }}/>
        : <input type={type} placeholder={placeholder} style={{ ...base, height: 48, padding: '0 14px' }}/>
      }
    </label>
  );
}

Object.assign(window, { DetailScreen });
