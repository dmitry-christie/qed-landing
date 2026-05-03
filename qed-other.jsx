// Home / location landing screen — the page ad traffic hits first sometimes
function HomeScreen({ tweaks, onSeeEvents, explainerSeen, city = 'Valencia', onCityChange, onProfile }) {
  const [howOpen, setHowOpen] = React.useState(false);
  return (
    <div style={{ height: '100%', overflow: 'auto', background: QED.cream }}>
      <QEDHeader onProfile={onProfile} onNavEvents={onSeeEvents} />

      {/* City selector + Hero */}
      <div style={{ padding: '12px 16px 0' }}>
        <CitySelector city={city} onCityChange={onCityChange} />
      </div>

      {/* Hero */}
      <div style={{ padding: '12px 16px 0', position: 'relative' }}>
        <div style={{
          position: 'relative', borderRadius: QED.rXl, overflow: 'hidden',
          border: `1.5px solid ${QED.ink}`, boxShadow: `4px 4px 0 0 ${QED.ink}`,
        }}>
          <VenuePlaceholder height={280} label="" tone="warm" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.0) 30%, rgba(31,26,20,0.55) 100%)' }}/>
          <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14, color: '#fff' }}>
            <Badge color="yellow">★ Valencia's #1 pub quiz · 4.8 rating</Badge>
            <div style={{ fontFamily: QED.sans, fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.0, marginTop: 8 }}>
              Pub Quiz<br/>in Valencia.
            </div>
            <div style={{ fontFamily: QED.sans, fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 6, fontWeight: 500 }}>
              Where fun, food & facts meet.
            </div>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <QEDButton size="lg" onClick={onSeeEvents} icon={Icon.chevR(15, '#fff')}>See schedule</QEDButton>
        <button onClick={() => setHowOpen(true)} style={{
          height: 48, background: 'transparent', color: QED.ink,
          border: `1.5px solid ${QED.ink}`, borderRadius: 999,
          fontFamily: QED.sans, fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }}>How it works</button>
      </div>

      {/* Stats strip */}
      <div style={{ margin: '20px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0,
        background: QED.paper, border: `1.5px solid ${QED.ink}`, borderRadius: QED.rLg, overflow: 'hidden',
      }}>
        {[['4', 'rounds'], ['40', 'questions'], ['2-5', 'per team'], ['€4.50', 'per person']].map((x, i) => (
          <div key={i} style={{
            padding: '12px 6px', textAlign: 'center',
            borderRight: i < 3 ? `1px solid ${QED.hairline}` : 'none',
          }}>
            <div style={{ fontFamily: QED.sans, fontSize: 18, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em' }}>{x[0]}</div>
            <div style={{ fontFamily: QED.sans, fontSize: 11, color: QED.inkSoft, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 1 }}>{x[1]}</div>
          </div>
        ))}
      </div>

      {/* New here — only show if explainer hasn't been seen yet */}
      {!explainerSeen && <div style={{ padding: '24px 16px 8px' }}>
        <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.inkSoft }}>New here?</div>
        <div style={{ fontFamily: QED.sans, fontSize: 22, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em', marginTop: 2, lineHeight: 1.1 }}>
          A night out where<br/>knowing stuff pays off.
        </div>
        <p style={{ fontFamily: QED.sans, fontSize: 14, color: QED.inkSoft, lineHeight: 1.55, margin: '10px 0 14px', textWrap: 'pretty' }}>
          A live trivia night is an evening at a pub where teams of friends answer questions across themed rounds — hosted live, no screens allowed. Think pop culture, history, sport, and music. Whoever scores most wins a bar tab. It's a proper night out, not just a quiz.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            { n: '01', t: 'Pick a night & bring your crew', s: 'Find a venue near you and reserve in 30 seconds. No card needed.' },
            { n: '02', t: 'Play, eat, win', s: '4 rounds, 40 questions, 90 minutes. Bar credit and bragging rights every week.' },
            { n: '03', t: 'Come back next week', s: 'Regulars get priority booking and climb the city-wide leaderboard.' },
          ].map((x, i) => (
            <div key={i} style={{
              display: 'flex', gap: 16, alignItems: 'flex-start',
              padding: '14px 0',
              borderBottom: i < 2 ? `1px solid ${QED.hairline}` : 'none',
            }}>
              <div style={{
                fontFamily: QED.mono, fontSize: 22, fontWeight: 700, color: QED.orange,
                lineHeight: 1, width: 34, flexShrink: 0, paddingTop: 2,
              }}>{x.n}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: QED.sans, fontSize: 16, fontWeight: 800, color: QED.ink, letterSpacing: '-0.01em', lineHeight: 1.2 }}>{x.t}</div>
                <div style={{ fontFamily: QED.sans, fontSize: 13, color: QED.inkSoft, marginTop: 4, lineHeight: 1.45 }}>{x.s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>}

      {/* Social proof */}
      <div style={{ padding: '20px 16px 8px' }}>
        <div style={{
          background: QED.ink, color: '#fff', borderRadius: QED.rLg, padding: 18,
          border: `1.5px solid ${QED.ink}`, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ fontFamily: QED.sans, fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
            <span style={{ color: QED.yellow }}>★★★★★</span> · 626 reviews
          </div>
          <div style={{ fontFamily: QED.sans, fontSize: 18, fontWeight: 700, marginTop: 8, lineHeight: 1.35, letterSpacing: '-0.01em' }}>
            "We came for the food and stayed because we won. Best Tuesday in Valencia."
          </div>
          <div style={{ fontFamily: QED.sans, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 10, fontWeight: 500 }}>
            — Marina & The Quizlamic State, regulars at Black Sheep
          </div>
        </div>
      </div>

      {/* Our story */}
      <div style={{ padding: '20px 16px 8px' }}>
        <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.inkSoft }}>Our story</div>
        <div style={{ fontFamily: QED.sans, fontSize: 22, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em', marginTop: 2, lineHeight: 1.1 }}>
          Started by three friends<br/>who missed a proper quiz.
        </div>
        <div style={{
          marginTop: 14, background: QED.paper, border: `1.5px solid ${QED.ink}`,
          borderRadius: QED.rLg, padding: 16, boxShadow: `3px 3px 0 0 ${QED.ink}`,
        }}>
          <p style={{ fontFamily: QED.sans, fontSize: 14, color: QED.ink, lineHeight: 1.6, margin: '0 0 12px', textWrap: 'pretty' }}>
            QED started as one night at The Black Sheep in Ruzafa, 2022. Tom, Sarah and Liam — three expats who couldn't find a decent pub quiz in Valencia — decided to run one themselves. That first night, four teams showed up.
          </p>
          <p style={{ fontFamily: QED.sans, fontSize: 14, color: QED.ink, lineHeight: 1.6, margin: '0 0 12px', textWrap: 'pretty' }}>
            Now we run five nights a week across Valencia, with 600+ regular players. We still write every question ourselves and still host every night live. No screens, no gimmicks — just a proper night out.
          </p>
          <div style={{ borderTop: `1px dashed ${QED.hairlineStrong}`, paddingTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: -6 }}>
              {['T', 'S', 'L'].map((init, i) => (
                <div key={i} style={{
                  width: 32, height: 32, borderRadius: 999, background: [QED.orange, QED.yellow, QED.green][i],
                  border: `2px solid ${QED.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: QED.sans, fontSize: 13, fontWeight: 800, color: QED.ink,
                  marginLeft: i > 0 ? -8 : 0, position: 'relative', zIndex: 3 - i,
                }}>{init}</div>
              ))}
            </div>
            <span style={{ fontFamily: QED.sans, fontSize: 13, color: QED.inkSoft, fontWeight: 600 }}>Tom, Sarah & Liam · Valencia, 2022</span>
          </div>
        </div>
      </div>

      {/* Closing CTA */}
      <div style={{ padding: '20px 16px 40px' }}>
        <QEDButton size="lg" onClick={onSeeEvents}>Reserve this week →</QEDButton>
      </div>

      <HowItWorksModal open={howOpen} onClose={() => setHowOpen(false)} onSeeEvents={onSeeEvents} header="How QED works" />
    </div>
  );
}

// Booking success screen
function SuccessScreen({ tweaks, event, guests = 4, onSelectEvent, onHome, onProfile }) {
  const e = event || QED_EVENTS[0];
  const total = (guests * e.price).toFixed(2);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [email, setEmail] = React.useState('dmitry@example.com');
  const [editingEmail, setEditingEmail] = React.useState(false);
  const [emailDraft, setEmailDraft] = React.useState(email);
  return (
    <div style={{ height: '100%', overflow: 'auto', background: QED.cream }}>
      <QEDHeader onLogo={onHome} onProfile={onProfile} onNavEvents={onHome} />
      <div style={{ padding: '20px 16px 0' }}>
        {/* Receipt-like card */}
        <div style={{
          background: QED.paper, borderRadius: QED.rLg,
          border: `1.5px solid ${QED.ink}`, boxShadow: `3px 3px 0 0 ${QED.ink}`,
          overflow: 'hidden',
        }}>
          {/* Hero */}
          <div style={{ padding: '24px 18px 18px', textAlign: 'center', background: QED.yellowSoft, borderBottom: `1.5px dashed ${QED.ink}` }}>
            <div style={{
              width: 56, height: 56, borderRadius: 999, background: QED.green,
              border: `2px solid ${QED.ink}`, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{Icon.check(28, '#fff')}</div>
            <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.inkSoft, marginTop: 12 }}>
              Reservation #QED-4421
            </div>
            <div style={{ fontFamily: QED.sans, fontSize: 26, fontWeight: 900, color: QED.ink, letterSpacing: '-0.025em', marginTop: 4, lineHeight: 1.1 }}>
              You're in.<br/>See you {e.day === 'Mon' ? 'Monday' : e.day === 'Tue' ? 'Tuesday' : e.day === 'Wed' ? 'Wednesday' : e.day === 'Thu' ? 'Thursday' : 'soon'}.
            </div>
            {/* Email confirmation — editable for non-logged-in */}
            {!isLoggedIn && (
              editingEmail ? (
                <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                  <input
                    type="email"
                    value={emailDraft}
                    onChange={e_ => setEmailDraft(e_.target.value)}
                    autoFocus
                    style={{
                      fontFamily: QED.sans, fontSize: 13, color: QED.ink, fontWeight: 600,
                      border: `1.5px solid ${QED.ink}`, borderRadius: 8, padding: '4px 10px',
                      background: QED.paper, outline: 'none', minWidth: 0, flex: 1, maxWidth: 200,
                    }}
                  />
                  <button
                    onClick={() => { setEmail(emailDraft); setEditingEmail(false); }}
                    style={{ background: QED.ink, color: '#fff', border: 'none', borderRadius: 8, padding: '5px 10px', fontFamily: QED.sans, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Save
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span style={{ fontFamily: QED.sans, fontSize: 13, color: QED.inkSoft }}>Confirmation sent to <strong style={{ color: QED.ink }}>{email}</strong></span>
                  <button
                    onClick={() => { setEmailDraft(email); setEditingEmail(true); }}
                    style={{ background: 'none', border: `1px solid ${QED.hairlineStrong}`, borderRadius: 6, padding: '2px 7px', fontFamily: QED.sans, fontSize: 11, fontWeight: 700, color: QED.inkSoft, cursor: 'pointer' }}>
                    Edit
                  </button>
                </div>
              )
            )}
            {isLoggedIn && (
              <div style={{ fontFamily: QED.sans, fontSize: 13, color: QED.inkSoft, marginTop: 6 }}>
                Confirmation sent to <strong style={{ color: QED.ink }}>{email}</strong>
              </div>
            )}
          </div>

          {/* Details */}
          <div style={{ padding: '4px 16px 14px' }}>
            <DetailRow icon={Icon.cal(16, QED.ink)} label="When" value={`${e.dateLabel} · ${e.time}`} />
            <DetailRow icon={Icon.pin(16, QED.ink)} label="Where" value={`${e.title} · Carrer del Dr. Ferran 10`} />
            <DetailRow icon={Icon.users(16, QED.ink)} label="Party size" value={`${guests} ${guests === 1 ? 'spot' : 'spots'} reserved · pick team names at the venue`} />
            <DetailRow
              icon={Icon.euro(16, QED.ink)}
              label={e.paymentRequired ? 'Paid online' : 'Pay at venue'}
              value={e.paymentRequired ? `€${total} · payment confirmed ✓` : `€${total} · cash or card`}
            />
          </div>

          {/* QR entry code */}
          <div style={{ padding: '14px 18px 16px', borderTop: `1.5px dashed ${QED.ink}`, display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ padding: 6, background: '#fff', border: `1.5px solid ${QED.ink}`, borderRadius: QED.rSm, boxShadow: `2px 2px 0 0 ${QED.ink}`, flexShrink: 0 }}>
              <QRCodePlaceholder size={90} value="QED-4421" />
            </div>
            <div>
              <div style={{ fontFamily: QED.mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: QED.ink }}>QED-4421</div>
              <div style={{ fontFamily: QED.sans, fontSize: 12, color: QED.inkSoft, marginTop: 4, lineHeight: 1.45 }}>Show this at the venue — also sent to your email.</div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <button style={{ ...btnSecondary, width: '100%', marginTop: 12 }}>
          {Icon.cal(14, QED.ink)} <span style={{ marginLeft: 6 }}>Add to calendar</span>
        </button>

        {/* Invite friends */}
        <div style={{ marginTop: 10, background: QED.paper, border: `1.5px solid ${QED.hairlineStrong}`, borderRadius: QED.rMd, padding: '12px 14px' }}>
          <div style={{ fontFamily: QED.sans, fontSize: 12, fontWeight: 700, color: QED.inkSoft, marginBottom: 10 }}>Invite friends</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button style={{
              width: '100%', height: 40, background: '#25D366', color: '#fff',
              border: `1.5px solid ${QED.ink}`, borderRadius: 999,
              fontFamily: QED.sans, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: `2px 2px 0 0 ${QED.ink}`,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#fff" d="M17.47 14.38c-.3-.15-1.66-.82-1.92-.92-.26-.09-.44-.14-.63.15-.18.28-.72.91-.9 1.09-.17.19-.34.21-.62.07-1.67-.83-2.76-1.48-3.86-3.36-.29-.5.3-.47.83-1.55.09-.18.05-.35-.03-.49-.07-.14-.63-1.51-.86-2.07-.23-.54-.47-.46-.63-.47-.17 0-.35-.01-.54-.01s-.49.07-.74.35c-.26.28-.98.96-.98 2.33s1 2.7 1.14 2.9c.14.18 1.97 2.98 4.75 4.19 1.76.76 2.45.82 3.33.69.54-.08 1.66-.68 1.89-1.33.24-.65.24-1.21.17-1.33-.07-.13-.26-.2-.54-.34z M12 2A10 10 0 0 0 2 12c0 1.76.46 3.41 1.26 4.85L2 22l5.27-1.22A10 10 0 1 0 12 2z"/></svg>
              Share on WhatsApp
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{
                flex: 1, height: 36, background: '#229ED9', color: '#fff',
                border: `1.5px solid ${QED.ink}`, borderRadius: 999,
                fontFamily: QED.sans, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#fff" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.69 7.94c-.12.57-.46.71-.93.44l-2.58-1.9-1.24 1.2c-.14.14-.26.26-.51.26l.18-2.62 4.72-4.27c.2-.18-.05-.28-.32-.1L7.38 14.4l-2.54-.8c-.55-.17-.56-.55.12-.81l9.91-3.82c.46-.17.86.11.77.82z"/></svg>
                Telegram
              </button>
              <button style={{
                flex: 1, height: 36, background: QED.paper, color: QED.inkSoft,
                border: `1px solid ${QED.hairlineStrong}`, borderRadius: 999,
                fontFamily: QED.sans, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke={QED.inkSoft} strokeWidth="2" strokeLinecap="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke={QED.inkSoft} strokeWidth="2" strokeLinecap="round"/></svg>
                Copy link
              </button>
            </div>
          </div>
        </div>

        {/* Pre-game tips */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontFamily: QED.sans, fontSize: 14, fontWeight: 800, color: QED.ink, letterSpacing: '-0.01em', marginBottom: 4 }}>Before the quiz</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              ['Show up by 7:50', 'Doors open 8:00, kick-off 8:30 sharp'],
              ['Sharpen your pop culture', 'Round 3 has been brutal lately'],
              ['No phones at the table', 'Ironclad. We will boo.'],
            ].map((x, i) => (
              <div key={i} style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                padding: '10px 0',
                borderBottom: i < 2 ? `1px solid ${QED.hairline}` : 'none',
              }}>
                <span style={{ fontFamily: QED.mono, fontSize: 13, color: QED.orange, fontWeight: 700, lineHeight: 1, paddingTop: 2, width: 20, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: QED.sans, fontSize: 14, fontWeight: 700, color: QED.ink }}>{x[0]}</div>
                  <div style={{ fontFamily: QED.sans, fontSize: 12, color: QED.inkSoft, marginTop: 2 }}>{x[1]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Account / Achievements section */}
        {!isLoggedIn ? (
          <div style={{ marginTop: 22 }}>
            <div style={{
              background: QED.paper, border: `1.5px solid ${QED.ink}`, borderRadius: QED.rLg,
              padding: 16, boxShadow: `3px 3px 0 0 ${QED.yellow}`,
            }}>
              <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.inkSoft }}>First time here?</div>
              <div style={{ fontFamily: QED.sans, fontSize: 20, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em', marginTop: 2, lineHeight: 1.1 }}>
                Save your streak.<br/>Create an account.
              </div>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  [Icon.trophy(13, QED.orange), 'Track your wins, badges & streaks'],
                  [Icon.sparkle(13, QED.yellow), 'Get personalised quiz picks'],
                  [Icon.users(13, QED.orange), 'Climb the Valencia leaderboard'],
                ].map(([ico, text], i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: QED.sans, fontSize: 13, color: QED.inkSoft }}>
                    {ico} {text}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <QEDButton size="sm" full={false} variant="cta">Create free account →</QEDButton>
                <button style={{ ...btnSecondary, height: 38, fontSize: 12, padding: '0 14px' }} onClick={() => setIsLoggedIn(true)}>Sign in</button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Stats grid */}
            <div>
              <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.inkSoft }}>Your stats</div>
              <div style={{ marginTop: 8 }}>
                <LoyaltyCard />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Average score', value: '10.16', bg: QED.yellowSoft },
                  { label: 'Attended events', value: '6', bg: QED.greenSoft },
                  { label: 'Total score', value: '61', bg: '#DDEEF8' },
                  { label: 'Season score', value: '0', bg: '#FAE0D8' },
                ].map(({ label, value, bg }) => (
                  <div key={label} style={{
                    background: bg, border: `1.5px solid ${QED.ink}`, borderRadius: QED.rMd,
                    padding: '12px 14px', boxShadow: `2px 2px 0 0 ${QED.ink}`,
                  }}>
                    <div style={{ fontFamily: QED.sans, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: QED.inkSoft }}>{label}</div>
                    <div style={{ fontFamily: QED.sans, fontSize: 28, fontWeight: 900, color: QED.ink, letterSpacing: '-0.03em', marginTop: 4, lineHeight: 1 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div>
              <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.inkSoft }}>New achievements</div>
              <div style={{ fontFamily: QED.sans, fontSize: 20, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em', marginTop: 2, lineHeight: 1.1 }}>
                You just earned 2 badges!
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                {[
                  { emoji: '🎯', title: 'First Quiz', sub: 'You showed up!', bg: QED.yellowSoft },
                  { emoji: '👥', title: 'Team Player', sub: `${guests}-person crew`, bg: QED.greenSoft },
                  { emoji: '🔥', title: 'On a Streak', sub: '3 quizzes in a row', bg: QED.orangeSoft },
                ].map(({ emoji, title, sub, bg }) => (
                  <div key={title} style={{ flex: 1, background: bg, border: `1.5px solid ${QED.ink}`, borderRadius: QED.rMd, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22 }}>{emoji}</div>
                    <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 800, color: QED.ink, marginTop: 4 }}>{title}</div>
                    <div style={{ fontFamily: QED.sans, fontSize: 10, color: QED.inkSoft, marginTop: 1 }}>{sub}</div>
                  </div>
                ))}
              </div>
              <button style={{ ...btnSecondary, width: '100%', marginTop: 8, height: 40 }}>
                See all my achievements →
              </button>
            </div>

          </div>
        )}

        {/* Other quizzes */}
        <div style={{ marginTop: 18, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontFamily: QED.sans, fontSize: 16, fontWeight: 800, color: QED.ink, letterSpacing: '-0.01em' }}>
              {isLoggedIn ? 'Hooked? Book another →' : 'Also this week →'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {QED_EVENTS.filter(ev => ev.id !== e.id).slice(0, 2).map(ev => (
              <div key={ev.id} onClick={() => onSelectEvent && onSelectEvent(ev)} style={{
                background: QED.paper, border: `1.5px solid ${QED.ink}`, borderRadius: QED.rMd,
                padding: 10, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              }}>
                <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                  <VenuePlaceholder height={56} label={ev.area} tone={ev.tone}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: QED.sans, fontSize: 14, fontWeight: 800, color: QED.ink, letterSpacing: '-0.01em' }}>{ev.title}</div>
                  <div style={{ fontFamily: QED.sans, fontSize: 12, color: QED.inkSoft, marginTop: 1 }}>{ev.dateLabel} · {ev.area} · €{ev.price.toFixed(2)}</div>
                </div>
                {Icon.chevR(14, QED.ink)}
              </div>
            ))}
          </div>
        </div>

        {/* Demo toggle */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <button onClick={() => setIsLoggedIn(!isLoggedIn)} style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontFamily: QED.mono, fontSize: 10, color: QED.inkMute, letterSpacing: '0.05em'
          }}>
            [demo: {isLoggedIn ? 'logged in' : 'logged out'} · tap to toggle]
          </button>
        </div>

        {/* Back to all events */}
        <div style={{ paddingBottom: 32 }}>
          <button onClick={onHome} style={{
            width: '100%', height: 48, background: 'transparent', color: QED.ink,
            border: `1.5px solid ${QED.ink}`, borderRadius: 999,
            fontFamily: QED.sans, fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>← Back to all events</button>
        </div>
      </div>
    </div>
  );
}

const btnSecondary = {
  height: 44, padding: '0 14px', background: QED.paper, color: QED.ink,
  border: `1.5px solid ${QED.ink}`, borderRadius: 999,
  fontFamily: QED.sans, fontSize: 13, fontWeight: 700,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

Object.assign(window, { HomeScreen, SuccessScreen });
