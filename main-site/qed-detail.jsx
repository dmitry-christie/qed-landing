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
        <g fill="#E5DAC0">
          <rect x="100" y="20" width="90" height="32" rx="3"/>
          <rect x="100" y="86" width="90" height="36" rx="3"/>
          <rect x="240" y="20" width="70" height="32" rx="3"/>
          <rect x="240" y="86" width="70" height="36" rx="3"/>
        </g>
      </svg>
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
  const { t } = useT();
  const baseEvent = event || QED_EVENTS[0];
  const [demoPayment, setDemoPayment] = React.useState(null);
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
    if (formRef.current) {
      const formRect = formRef.current.getBoundingClientRect();
      setShowStickyBar(formRect.top >= containerRect.bottom - 40);
    }
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
        <div style={{ position: 'absolute', bottom: 12, left: 14, display: 'flex', gap: 6, flexWrap: 'wrap', zIndex: 3 }}>
          {e.discount > 0 && <Badge color="orange">{e.discount}% off · book now</Badge>}
          {e.hot && !showSpecial && <Badge color="red"><span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>{Icon.flame(10, '#fff')} {t.almostFull}</span></Badge>}
          {showSpecial && e.special && <Badge color="ink">⭐ {t.specialEvent}</Badge>}
        </div>
      </div>

      {/* Title block */}
      <div style={{
        margin: '-22px 14px 0', background: QED.paper,
        border: `1.5px solid ${QED.ink}`, borderRadius: QED.rLg,
        boxShadow: `3px 3px 0 0 ${showSpecial && e.special ? QED.yellow : QED.ink}`, padding: 16, position: 'relative', zIndex: 2,
      }}>
        <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.inkSoft }}>
          {showSpecial && e.special ? `${t.specialEvent} · ${e.area}` : `${t.pubQuiz} · ${e.area}`}
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
            <span style={{ color: QED.inkMute, fontWeight: 500 }}>{t.teamsLabel(e.reviews)}</span>
          </div>
          <div style={{ width: 3, height: 3, borderRadius: 3, background: QED.inkMute }}/>
          <div style={{ fontFamily: QED.sans, fontSize: 13, color: QED.inkSoft, fontWeight: 600 }}>
            {t.ofSpotsLeft(e.spots, e.cap)}
          </div>
        </div>

        {/* About */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${QED.hairlineStrong}` }}>
          <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.inkSoft }}>
            {showSpecial && e.special ? t.aboutThisSpecial : t.aboutThisQuiz}
          </div>
          <p style={{ fontFamily: QED.sans, fontSize: 14, color: QED.ink, lineHeight: 1.5, margin: '6px 0 0', textWrap: 'pretty' }}>
            {showSpecial && e.special ? t.specialDesc : t.quizDesc}
          </p>
          {!showSpecial && showMore && (
            <p style={{ fontFamily: QED.sans, fontSize: 14, color: QED.ink, lineHeight: 1.5, margin: '6px 0 0', textWrap: 'pretty' }}>
              {t.quizDescMore(e.host || 'Liam')}
            </p>
          )}
          {!showSpecial && (
            <button onClick={() => setShowMore(m => !m)} style={{
              marginTop: 8, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
              fontFamily: QED.sans, fontSize: 13, fontWeight: 700, color: QED.orangeDeep,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>{showMore ? t.showLess : t.readMore} {Icon.chevR(11, QED.orangeDeep)}</button>
          )}
        </div>

        {/* Quick details */}
        <div style={{ marginTop: 10 }}>
          <DetailRow icon={Icon.cal(16, QED.ink)} label={t.detailWhen} value={`${e.dateLabel} · ${e.time}`} accent={<CountdownPill hours={e.countdownH} />} />
          <DetailRow
            icon={Icon.pin(16, QED.ink)}
            label={t.detailWhere}
            value={address}
            onClick={handleCopyAddress}
            accent={
              <div style={{ flexShrink: 0, fontFamily: QED.sans, fontSize: 11, fontWeight: 700, color: copied ? QED.greenInk : QED.inkSoft, display: 'flex', alignItems: 'center', gap: 3 }}>
                {copied ? <>{Icon.check(11, QED.greenInk)} {t.copied}</> : <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke={QED.inkSoft} strokeWidth="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke={QED.inkSoft} strokeWidth="2"/></svg>
                  {t.copyLabel}</>}
              </div>
            }
          />
          <DetailRow icon={Icon.users(16, QED.ink)} label={t.detailFormat} value={t.formatValue} />
          <DetailRow icon={Icon.globe(16, QED.ink)} label={t.detailLanguage} value={e.lang === 'EN' ? t.langEN : t.langES} />
          {e.host && <DetailRow icon={Icon.sparkle(16, QED.orange)} label={t.detailHost} value={e.host} />}
        </div>

        {/* Amenities */}
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
                <span>{t.amenities[a]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* What's included */}
      <div style={{ padding: '20px 16px 8px' }}>
        <div style={{ fontFamily: QED.sans, fontSize: 15, fontWeight: 800, color: QED.ink, letterSpacing: '-0.01em' }}>{t.whatsIncluded}</div>
        <div style={{ marginTop: 8 }}>
          {t.included.map(([title, sub], i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8,
              padding: '9px 0',
              borderBottom: i < t.included.length - 1 ? `1px solid ${QED.hairline}` : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 16, height: 16, borderRadius: 999, background: QED.green, border: `1.5px solid ${QED.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {Icon.check(9, '#fff')}
                </div>
                <span style={{ fontFamily: QED.sans, fontSize: 14, fontWeight: 700, color: QED.ink }}>{title}</span>
              </div>
              <span style={{ fontFamily: QED.sans, fontSize: 12, color: QED.inkSoft, whiteSpace: 'nowrap' }}>{sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div style={{ padding: '12px 16px 8px' }}>
        <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.inkSoft, marginBottom: 8 }}>{t.gettingThere}</div>
        <MapPlaceholder />
      </div>

      {/* Reserve form */}
      <div ref={formRef} style={{ padding: '20px 16px 8px' }}>
        <div style={{ fontFamily: QED.sans, fontSize: 18, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em' }}>{t.reserveYourSpot}</div>
        <div style={{ fontFamily: QED.sans, fontSize: 13, color: QED.inkSoft, marginTop: 2 }}>
          {e.paymentRequired ? t.payOnlineLock : t.pay30sec}
        </div>

        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Guest stepper */}
          <div style={{
            background: QED.paper, border: `1.5px solid ${QED.ink}`, borderRadius: QED.rMd,
            padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontFamily: QED.sans, fontSize: 13, fontWeight: 700, color: QED.ink }}>{t.howManyPeople}</div>
              <div style={{ fontFamily: QED.sans, fontSize: 12, color: QED.inkSoft, marginTop: 1 }}>{t.includingYourself}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setGuests(Math.max(1, guests - 1))} style={stepperBtn}>−</button>
              <span style={{ fontFamily: QED.sans, fontSize: 18, fontWeight: 800, color: QED.ink, minWidth: 18, textAlign: 'center' }}>{guests}</span>
              <button onClick={() => setGuests(Math.min(20, guests + 1))} style={stepperBtn}>+</button>
            </div>
          </div>

          {guests > 5 && (
            <div style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '12px 14px', borderRadius: QED.rMd,
              background: QED.creamSoft, border: `1px solid ${QED.hairlineStrong}`,
            }}>
              <div style={{ flexShrink: 0, marginTop: 1 }}>{Icon.users(16, QED.inkSoft)}</div>
              <div style={{ fontFamily: QED.sans, fontSize: 12.5, color: QED.inkSoft, lineHeight: 1.45 }}>
                {t.teamsMax(5)}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label={t.fieldFirstName} placeholder="Dmitry" required />
            <Field label={t.fieldLastName} placeholder="Christie" required />
          </div>
          <Field label={t.fieldEmail} placeholder="dmitry@example.com" type="email" required />
          <Field label={t.fieldPhone} placeholder="+34 653 51 80 36" type="tel" />
          <Field label={t.fieldNote} placeholder={t.fieldNotePlaceholder} multiline />
        </div>

        {/* Total */}
        <div style={{
          marginTop: 14, padding: 14, borderRadius: QED.rMd,
          background: QED.yellowSoft, border: `1.5px solid ${QED.ink}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: QED.sans, fontSize: 13, fontWeight: 700, color: QED.ink }}>
              {e.discount > 0 ? t.earlyBirdTotal : t.total} ({guests} × €{e.price.toFixed(2)})
            </span>
            <span style={{ fontFamily: QED.sans, fontSize: 22, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em' }}>€{(guests * e.price).toFixed(2)}</span>
          </div>
          {e.discount > 0 && (
            <div style={{ fontFamily: QED.sans, fontSize: 12, color: QED.orangeDeep, fontWeight: 700, marginTop: 4 }}>
              {e.paymentRequired ? t.earlyBirdRateRequired : t.earlyBirdRateOptional}
            </div>
          )}
          {!e.paymentRequired && (
            <div style={{ fontFamily: QED.sans, fontSize: 11, color: QED.inkSoft, marginTop: 2 }}>
              {t.payFullAtVenue((guests * e.full).toFixed(2))}
            </div>
          )}
        </div>

        {/* Privacy checkbox */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 14, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={e_ => setAgreed(e_.target.checked)}
            style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, accentColor: QED.ink, cursor: 'pointer' }}
          />
          <span style={{ fontFamily: QED.sans, fontSize: 12, color: QED.inkSoft, lineHeight: 1.45 }}>
            {t.privacyAgree} <span style={{ color: QED.ink, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>{t.privacyPolicy}</span> {t.privacyAnd} <span style={{ color: QED.ink, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>{t.termsOfService}</span>. {t.privacyContact}
          </span>
        </label>

        {/* CTA */}
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
              {e.paymentRequired ? t.payAndReserve((guests * e.price).toFixed(2)) : t.reserveSpots(guests)}
            </QEDButton>
            <div style={{ fontFamily: QED.sans, fontSize: 11, color: QED.inkMute, textAlign: 'center', marginTop: 8 }}>
              {e.paymentRequired ? t.finePrintRequired : t.finePrintOptional}
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

      <div style={{ height: 96 }}/>

      {/* Sticky bar */}
      <div style={{ position: 'sticky', bottom: 0, left: 0, right: 0, zIndex: 30 }}>
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
              <div style={{ fontFamily: QED.sans, fontSize: 12, color: QED.inkSoft, fontWeight: 700 }}>{t.fromPrice} <span style={{ textDecoration: 'line-through', color: QED.inkMute }}>€{e.full.toFixed(2)}</span></div>
              <div style={{ fontFamily: QED.sans, fontSize: 18, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em' }}>€{e.price.toFixed(2)} <span style={{ fontSize: 12, color: QED.inkSoft, fontWeight: 600 }}>{t.perPerson}</span></div>
            </div>
            <QEDButton full={false} size="md" icon={Icon.chevR(13, '#fff')}
              onClick={() => {
                if (agreed) { onReserve && onReserve({ event: e, guests }); }
                else { formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
              }}>
              {t.reserveNow}
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
