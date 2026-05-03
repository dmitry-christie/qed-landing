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
    id: 'd', title: 'Murray\u2019s Irish Pub', area: 'Cabanyal', day: 'Thu', dateLabel: 'Thu, May 7', time: '20:30',
    price: 5, full: 6, lang: 'EN', tone: 'ink',
    spots: 35, cap: 100, discount: 0, countdownH: 109, hot: false,
    rating: 4.6, reviews: 201,
    amenities: ['wheelchair', 'pet'],
    paymentRequired: false,
    host: 'Tom',
  },
];

function CountdownPill({ hours, color = 'red' }) {
  // Static-looking countdown; show D H M
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
      {d > 0 ? `${d}d ${h}h` : `${h}h ${m}m ${s}s`} left
    </div>
  );
}

function EventCard({ event, onClick, onReserve, layout = 'rich' }) {
  const lowSpots = event.spots <= 10;
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
        <VenuePlaceholder height={140} label={event.title} tone={event.tone} />
        {/* Top row badges */}
        <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.95)', padding: '5px 10px', borderRadius: 999, border: `1px solid ${QED.ink}` }}>
            {Icon.pin(11, QED.ink)}
            <span style={{ fontFamily: QED.sans, fontSize: 12, fontWeight: 700, color: QED.ink }}>{event.area}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {event.discount > 0 && <Badge color="orange">{event.discount}% off</Badge>}
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', gap: 6 }}>
          {event.special && <Badge color="ink"><span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>⭐ {event.special.name}</span></Badge>}
          {event.hot && !event.special && <Badge color="red"><span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>{Icon.flame(10, '#fff')} Almost full</span></Badge>}
        </div>
      </div>
      {/* Body */}
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.inkSoft }}>
            Pub Quiz · {event.dateLabel}
          </div>
          <div style={{ fontFamily: QED.sans, fontSize: 19, fontWeight: 800, color: QED.ink, letterSpacing: '-0.02em', marginTop: 2, lineHeight: 1.15 }}>
            {event.title}
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: QED.sans, fontSize: 13, color: QED.ink, fontWeight: 600 }}>
            {Icon.clock(13, QED.inkSoft)} {event.time}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: QED.sans, fontSize: 13, color: QED.ink, fontWeight: 600 }}>
            {Icon.users(13, QED.inkSoft)} {event.spots} spots left
          </span>
          <Badge color="ink">{event.lang}</Badge>
        </div>

        {/* Venue amenities */}
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
                <span>{a === 'wheelchair' ? 'Accessible' : a === 'veggie' ? 'Veggie options' : a === 'gf' ? 'Gluten-free' : 'Pet friendly'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Countdown row */}
        <CountdownPill hours={event.countdownH} color={event.countdownH < 48 ? 'red' : 'orange'} />

        {/* Price + CTA */}
        <div style={{ paddingTop: 10, borderTop: `1px dashed ${QED.hairlineStrong}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: QED.sans, fontSize: 22, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em' }}>€{event.price.toFixed(2)}</span>
                <span style={{ fontFamily: QED.sans, fontSize: 13, color: QED.inkMute, textDecoration: 'line-through' }}>€{event.full.toFixed(2)}</span>
                <span style={{ fontFamily: QED.sans, fontSize: 11, color: QED.inkSoft, fontWeight: 600, marginLeft: 2 }}>/ person</span>
              </div>
              {event.discount > 0 && (
                <div style={{ fontFamily: QED.sans, fontSize: 10.5, color: QED.orangeDeep, fontWeight: 700, marginTop: 2 }}>
                  {event.paymentRequired ? '⚡ Pay online now to reserve at this price' : '⚡ Early bird — only if you pay online now'}
                </div>
              )}
            </div>
            <QEDButton size="sm" full={false} icon={Icon.chevR(13, '#fff')} style={{ paddingRight: 14, flexShrink: 0 }}
              onClick={(e) => { e.stopPropagation(); onReserve && onReserve(); }}>
              Reserve
            </QEDButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function ListingScreen({ tweaks, onSelectEvent, onReserve, onHome, onExplainerDismiss }) {
  const [explainerOpen, setExplainerOpen] = React.useState(true);
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
      <QEDHeader scrolled={scrolled} onLogo={onHome} />

      {/* Title row */}
      <div style={{ padding: '14px 16px 4px' }}>
        <CitySelector city="Valencia" />
        <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.inkSoft, marginTop: 14 }}>
          Pub Quiz · This week
        </div>
        <div style={{ fontFamily: QED.sans, fontSize: 28, fontWeight: 900, color: QED.ink, letterSpacing: '-0.03em', marginTop: 2, lineHeight: 1.05 }}>
          Tonight's quizzes,<br/>open for booking.
        </div>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} onChange={onChangeFilter} onMore={() => {}} />

      {/* Explainer */}
      {explainerOpen && tweaks.showExplainer && (
        <ExplainerCard onDismiss={() => { setExplainerOpen(false); onExplainerDismiss && onExplainerDismiss(); }} />
      )}

      {/* Result count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 6px' }}>
        <span style={{ fontFamily: QED.sans, fontSize: 13, fontWeight: 700, color: QED.ink }}>
          {events.length} quizzes this week
        </span>
        <span style={{ fontFamily: QED.sans, fontSize: 12, color: QED.inkSoft, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Soonest first {Icon.chevD(11, QED.inkSoft)}
        </span>
      </div>

      {/* Cards */}
      <div style={{ padding: '6px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {events.map(e => <EventCard key={e.id} event={e} onClick={() => onSelectEvent && onSelectEvent(e)} onReserve={() => onReserve && onReserve(e)} />)}
      </div>

      {/* Footer note */}
      <div style={{ padding: '8px 16px 60px', textAlign: 'center', fontFamily: QED.sans, fontSize: 12, color: QED.inkMute }}>
        Limited tables. Book ahead — pay at the venue or online.
      </div>
    </div>
  );
}

Object.assign(window, { ListingScreen, EventCard, CountdownPill, QED_EVENTS });
