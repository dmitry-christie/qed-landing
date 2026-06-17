// Events listing screen — primary, mobile-first

const QED_EVENTS = [
  {
    id: 'a', title: 'El Garaje Foodie', area: 'Mestalla', day: 'Mon', dateLabel: 'Mon, May 4', time: '20:00',
    price: 4.5, full: 6, lang: 'EN', tone: 'warm',
    spots: 8, cap: 125, discount: 25, countdownH: 37, hot: true,
    rating: 4.8, reviews: 124,
    amenities: ['wheelchair', 'veggie', 'gf'],
    paymentRequired: false,
    host: 'Liam',
    special: {
      name: 'Star Wars Special',
      subtitle: 'Los Jedi no buscan la aventura — sino el conocimiento.',
      description: 'One night only. All 4 rounds go full galaxy brain — sci-fi, film lore, Star Wars deep cuts, and a picture round that will make your team question everything. Costumes welcome. Lightsabers at the door.',
    },
  },
  {
    id: 'b', title: 'The Black Sheep', area: 'Ruzafa', day: 'Tue', dateLabel: 'Tue, May 5', time: '20:30',
    price: 5, full: 6, lang: 'EN', tone: 'yellow',
    spots: 22, cap: 80, discount: 25, countdownH: 61, hot: false,
    rating: 4.9, reviews: 312,
    amenities: ['wheelchair', 'pet'],
    paymentRequired: false,
    host: 'Sarah',
  },
  {
    id: 'c', title: 'Casa Lola Tapas', area: 'El Carmen', day: 'Wed', dateLabel: 'Wed, May 6', time: '20:00',
    price: 4.5, full: 6, lang: 'ES', tone: 'green',
    spots: 4, cap: 60, discount: 25, countdownH: 85, hot: true,
    rating: 4.7, reviews: 89,
    amenities: ['veggie'],
    paymentRequired: true,
    host: 'Carlos',
  },
  {
    id: 'd', title: 'Murray’s Irish Pub', area: 'Cabanyal', day: 'Thu', dateLabel: 'Thu, May 7', time: '20:30',
    price: 5, full: 6, lang: 'EN', tone: 'ink',
    spots: 35, cap: 100, discount: 0, countdownH: 109, hot: false,
    rating: 4.6, reviews: 201,
    amenities: ['wheelchair', 'pet'],
    paymentRequired: false,
    host: 'Tom',
  },
];

function CountdownPill({ hours, color = 'red' }) {
  const { t } = useT();
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  const m = 38;
  const s = 12;
  const palette = color === 'red'
    ? { bg: '#FFE5E5', fg: QED.red, border: '#F4B5B5' }
    : { bg: QED.orangeSoft, fg: QED.orangeDeep, border: '#F5C8AC' };
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 999,
      background: palette.bg, color: palette.fg,
      border: `1px solid ${palette.border}`,
      fontFamily: QED.mono, fontSize: 12, fontWeight: 700,
    }}>
      {Icon.flame(11, palette.fg)}
      {d > 0 ? `${d}d ${h}h` : `${h}h ${m}m ${s}s`} {t.countdownLeft}
    </div>
  );
}

function EventCard({ event, onClick, onReserve, layout = 'rich' }) {
  const { t } = useT();
  const heroH = event.special ? 168 : 140;
  return (
    <div onClick={onClick} style={{
      background: QED.paper, borderRadius: QED.rLg,
      border: `1.5px solid ${QED.ink}`,
      boxShadow: `3px 3px 0 0 ${QED.ink}`,
      overflow: 'hidden', cursor: 'pointer',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Photo */}
      <div style={{ position: 'relative' }}>
        <VenuePlaceholder height={heroH} label={event.title} tone={event.tone} />
        <div style={{ position: 'absolute', top: 10, left: 10 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.95)', padding: '5px 10px', borderRadius: 999, border: `1px solid ${QED.ink}` }}>
            {Icon.pin(11, QED.ink)}
            <span style={{ fontFamily: QED.sans, fontSize: 12, fontWeight: 700, color: QED.ink }}>{event.area}</span>
          </div>
        </div>
      </div>
      {/* Body */}
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(event.discount > 0 || event.special || event.hot) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {event.discount > 0 && <Badge color="orange">{event.discount}% off</Badge>}
            {event.special && <Badge color="ink"><span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>⭐ {event.special.name}</span></Badge>}
            {event.hot && <Badge color="red"><span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>{Icon.flame(10, '#fff')} {t.almostFull}</span></Badge>}
          </div>
        )}
        <div>
          <div style={{ fontFamily: QED.mono, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: QED.inkMute }}>
            {event.dateLabel} · {event.time}
          </div>
          <div style={{ fontFamily: QED.sans, fontSize: 19, fontWeight: 800, color: QED.ink, letterSpacing: '-0.02em', marginTop: 3, lineHeight: 1.15 }}>
            {event.title}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: QED.sans, fontSize: 13, color: QED.ink, fontWeight: 600 }}>
            {Icon.users(13, QED.inkSoft)} {t.spotsLeft(event.spots)}
          </span>
          <Badge color="ink">{event.lang}</Badge>
          {event.host && <span style={{ fontFamily: QED.sans, fontSize: 12, color: QED.inkSoft }}>{t.hostLabel} {event.host}</span>}
        </div>

        {event.amenities && event.amenities.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {event.amenities.map(a => (
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

        <CountdownPill hours={event.countdownH} color={event.countdownH < 48 ? 'red' : 'orange'} />

        <div style={{ paddingTop: 10, borderTop: `1px dashed ${QED.hairlineStrong}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: QED.sans, fontSize: 22, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em' }}>€{event.price.toFixed(2)}</span>
                <span style={{ fontFamily: QED.sans, fontSize: 13, color: QED.inkMute, textDecoration: 'line-through' }}>€{event.full.toFixed(2)}</span>
                <span style={{ fontFamily: QED.sans, fontSize: 11, color: QED.inkSoft, fontWeight: 600, marginLeft: 2 }}>{t.perPerson}</span>
              </div>
              {event.discount > 0 && (
                <div style={{ fontFamily: QED.sans, fontSize: 10.5, color: QED.orangeDeep, fontWeight: 700, marginTop: 2 }}>
                  {event.paymentRequired ? t.earlyBirdPayNow : t.earlyBirdOnline}
                </div>
              )}
            </div>
            <QEDButton size="sm" full={false} icon={Icon.chevR(13, '#fff')} style={{ paddingRight: 14, flexShrink: 0 }}
              onClick={(e) => { e.stopPropagation(); onReserve && onReserve(); }}>
              {t.reserve}
            </QEDButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function ListingScreen({ tweaks, onSelectEvent, onReserve, onHome, onExplainerDismiss, city = 'Valencia', onCityChange, onProfile }) {
  const { t } = useT();
  const [explainerOpen, setExplainerOpen] = React.useState(true);
  const [explainerExpanded, setExplainerExpanded] = React.useState(false);
  const [videoOpen, setVideoOpen] = React.useState(false);
  const [filters, setFilters] = React.useState({ day: 'Any', area: 'Any', lang: 'Any', discount: false });
  const [scrolled, setScrolled] = React.useState(false);

  const onScroll = (e) => setScrolled(e.target.scrollTop > 4);

  const onChangeFilter = (k) => {
    if (k === 'discount') setFilters(f => ({ ...f, discount: !f.discount }));
    else if (k === 'day') setFilters(f => ({ ...f, day: f.day === 'Any' ? 'Mon' : f.day === 'Mon' ? 'Tue' : 'Any' }));
    else if (k === 'area') setFilters(f => ({ ...f, area: f.area === 'Any' ? 'Ruzafa' : 'Any' }));
    else if (k === 'lang') setFilters(f => ({ ...f, lang: f.lang === 'Any' ? 'EN' : f.lang === 'EN' ? 'ES' : 'Any' }));
  };

  const events = QED_EVENTS;

  return (
    <div onScroll={onScroll} style={{ height: '100%', overflow: 'auto', background: QED.cream }}>
      <QEDHeader scrolled={scrolled} onLogo={onHome} onProfile={onProfile} />

      <div style={{ padding: '14px 16px 4px' }}>
        <CitySelector city={city} onCityChange={onCityChange} />
        <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.inkSoft, marginTop: 14 }}>
          {t.listingKicker}
        </div>
        <div style={{ fontFamily: QED.sans, fontSize: 28, fontWeight: 900, color: QED.ink, letterSpacing: '-0.03em', marginTop: 2, lineHeight: 1.05 }}>
          {t.listingHero.split('\n').map((line, i) => <React.Fragment key={i}>{line}{i === 0 && <br/>}</React.Fragment>)}
        </div>
      </div>

      <FilterBar filters={filters} onChange={onChangeFilter} onMore={() => {}} />

      {tweaks.showExplainer && explainerOpen && (
        <div style={{ margin: '10px 16px 4px', borderRadius: QED.rLg, background: QED.paper, border: `1.5px solid ${QED.ink}`, boxShadow: `4px 4px 0 0 ${QED.yellow}`, overflow: 'hidden' }}>
          <div style={{ padding: '11px 14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: QED.sans, fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: QED.ink }}>
              {t.newHereLabel}
            </span>
            <button onClick={() => { setExplainerOpen(false); onExplainerDismiss && onExplainerDismiss(); }} aria-label="Dismiss" style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex', lineHeight: 0 }}>
              {Icon.close(15, QED.inkSoft)}
            </button>
          </div>
          <div style={{ padding: '8px 14px 14px' }}>
            <div style={{ fontFamily: QED.sans, fontSize: 18, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 8 }}>
              {t.explainerHero.split('\n').map((line, i) => <React.Fragment key={i}>{line}{i === 0 && <br/>}</React.Fragment>)}
            </div>
            <p style={{ fontFamily: QED.sans, fontSize: 13, color: QED.inkSoft, lineHeight: 1.55, margin: 0, textWrap: 'pretty' }}>
              {t.explainerIntro}
            </p>
            <button
              onClick={() => setExplainerExpanded(e => !e)}
              style={{ background: 'none', border: 'none', padding: '10px 0 0', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <span style={{ fontFamily: QED.sans, fontSize: 12, fontWeight: 700, color: QED.inkSoft }}>
                {explainerExpanded ? t.readLess : t.howDoesItWork}
              </span>
              <span style={{ display: 'flex', transition: 'transform 0.15s', transform: explainerExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                {Icon.chevD(12, QED.inkSoft)}
              </span>
            </button>
            {explainerExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4, borderTop: `1px solid ${QED.hairline}` }}>
                {t.howItWorksSteps.map((x, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    padding: '8px 0',
                    borderBottom: i < t.howItWorksSteps.length - 1 ? `1px solid ${QED.hairline}` : 'none',
                  }}>
                    <span style={{ fontFamily: QED.mono, fontSize: 15, fontWeight: 700, color: QED.orange, lineHeight: 1, width: 26, flexShrink: 0, paddingTop: 1 }}>{x.n}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: QED.sans, fontSize: 13, fontWeight: 700, color: QED.ink, lineHeight: 1.3 }}>{x.t}</div>
                      <div style={{ fontFamily: QED.sans, fontSize: 12, color: QED.inkSoft, marginTop: 2, lineHeight: 1.4 }}>{x.s}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <button onClick={() => setVideoOpen(true)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              }}>
                <span style={{
                  width: 20, height: 20, borderRadius: 999,
                  background: QED.orange, border: `1.5px solid ${QED.ink}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="7" height="9" viewBox="0 0 7 9"><path d="M1 1v7l6-3.5-6-3.5z" fill="#fff"/></svg>
                </span>
                <span style={{ fontFamily: QED.sans, fontSize: 12, fontWeight: 700, color: QED.ink, textDecoration: 'underline', textUnderlineOffset: 2 }}>
                  Watch a 30-sec clip
                </span>
              </button>
              <QEDButton size="sm" variant="ghost" full={false} onClick={() => { setExplainerOpen(false); onExplainerDismiss && onExplainerDismiss(); }} style={{ height: 32 }}>{t.gotIt}</QEDButton>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 6px' }}>
        <span style={{ fontFamily: QED.sans, fontSize: 13, fontWeight: 700, color: QED.ink }}>
          {t.quizzesThisWeek(events.length)}
        </span>
        <span style={{ fontFamily: QED.sans, fontSize: 12, color: QED.inkSoft, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {t.soonestFirst} {Icon.chevD(11, QED.inkSoft)}
        </span>
      </div>

      <div style={{ padding: '6px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {events.map(e => <EventCard key={e.id} event={e} onClick={() => onSelectEvent && onSelectEvent(e)} onReserve={() => onReserve && onReserve(e)} />)}
      </div>

      <div style={{ padding: '8px 16px 60px', textAlign: 'center', fontFamily: QED.sans, fontSize: 12, color: QED.inkMute }}>
        {t.limitedTables}
      </div>
      <VideoModal open={videoOpen} onClose={() => setVideoOpen(false)} />
    </div>
  );
}

Object.assign(window, { ListingScreen, EventCard, CountdownPill, QED_EVENTS });
