// Home / location landing screen
function HomeScreen({ tweaks, onSeeEvents, explainerSeen, city = 'Valencia', onCityChange, onProfile, onShowNotFound, onShowError }) {
  const { t } = useT();
  const [howOpen, setHowOpen] = React.useState(false);
  const [videoOpen, setVideoOpen] = React.useState(false);
  return (
    <div style={{ height: '100%', overflow: 'auto', background: QED.cream }}>
      <QEDHeader onProfile={onProfile} onNavEvents={onSeeEvents} />

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
            <Badge color="yellow">{t.heroBadge}</Badge>
            <div style={{ fontFamily: QED.sans, fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.0, marginTop: 8 }}>
              {t.heroTitle.split('\n').map((line, i) => <React.Fragment key={i}>{line}{i === 0 && <br/>}</React.Fragment>)}
            </div>
            <div style={{ fontFamily: QED.sans, fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 6, fontWeight: 500 }}>
              {t.heroSub}
            </div>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <QEDButton size="lg" onClick={onSeeEvents} icon={Icon.chevR(15, '#fff')}>{t.seeSchedule}</QEDButton>
        <button onClick={() => setHowOpen(true)} style={{
          height: 48, background: 'transparent', color: QED.ink,
          border: `1.5px solid ${QED.ink}`, borderRadius: 999,
          fontFamily: QED.sans, fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }}>{t.howItWorksBtn}</button>
      </div>

      {/* Stats strip */}
      <div style={{ margin: '20px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0,
        background: QED.paper, border: `1.5px solid ${QED.ink}`, borderRadius: QED.rLg, overflow: 'hidden',
      }}>
        {[['4', 0], ['40', 1], ['2-5', 2], ['€4.50', 3]].map(([val, li], i) => (
          <div key={i} style={{
            padding: '12px 6px', textAlign: 'center',
            borderRight: i < 3 ? `1px solid ${QED.hairline}` : 'none',
          }}>
            <div style={{ fontFamily: QED.sans, fontSize: 18, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em' }}>{val}</div>
            <div style={{ fontFamily: QED.sans, fontSize: 11, color: QED.inkSoft, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 1 }}>{t.statsLabels[li]}</div>
          </div>
        ))}
      </div>

      {/* New here */}
      {!explainerSeen && <div style={{ padding: '24px 16px 8px' }}>
        <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.inkSoft }}>{t.newHereSection}</div>
        <div style={{ fontFamily: QED.sans, fontSize: 22, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em', marginTop: 2, lineHeight: 1.1 }}>
          {t.newHereHero.split('\n').map((line, i) => <React.Fragment key={i}>{line}{i === 0 && <br/>}</React.Fragment>)}
        </div>
        <p style={{ fontFamily: QED.sans, fontSize: 14, color: QED.inkSoft, lineHeight: 1.55, margin: '10px 0 14px', textWrap: 'pretty' }}>
          {t.newHereBody}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {t.howItWorksSteps.map((x, i) => (
            <div key={i} style={{
              display: 'flex', gap: 16, alignItems: 'flex-start',
              padding: '14px 0',
              borderBottom: i < t.howItWorksSteps.length - 1 ? `1px solid ${QED.hairline}` : 'none',
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
        <button onClick={() => setVideoOpen(true)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14,
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        }}>
          <span style={{
            width: 22, height: 22, borderRadius: 999,
            background: QED.orange, border: `1.5px solid ${QED.ink}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="8" height="10" viewBox="0 0 8 10"><path d="M1 1v8l7-4-7-4z" fill="#fff"/></svg>
          </span>
          <span style={{ fontFamily: QED.sans, fontSize: 13, fontWeight: 700, color: QED.ink, textDecoration: 'underline', textUnderlineOffset: 2 }}>
            Watch a 30-sec clip
          </span>
        </button>
      </div>}

      {/* Social proof */}
      <div style={{ padding: '20px 16px 8px' }}>
        <div style={{
          background: QED.ink, color: '#fff', borderRadius: QED.rLg, padding: 18,
          border: `1.5px solid ${QED.ink}`, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ fontFamily: QED.sans, fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
            <span style={{ color: QED.yellow }}>★★★★★</span> · {t.reviewCount}
          </div>
          <div style={{ fontFamily: QED.sans, fontSize: 18, fontWeight: 700, marginTop: 8, lineHeight: 1.35, letterSpacing: '-0.01em' }}>
            {t.reviewQuote}
          </div>
          <div style={{ fontFamily: QED.sans, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 10, fontWeight: 500 }}>
            {t.reviewAuthor}
          </div>
        </div>
      </div>

      {/* Our story */}
      <div style={{ padding: '20px 16px 8px' }}>
        <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.inkSoft }}>{t.ourStory}</div>
        <div style={{ fontFamily: QED.sans, fontSize: 22, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em', marginTop: 2, lineHeight: 1.1 }}>
          {t.ourStoryHero.split('\n').map((line, i) => <React.Fragment key={i}>{line}{i === 0 && <br/>}</React.Fragment>)}
        </div>
        <div style={{
          marginTop: 14, background: QED.paper, border: `1.5px solid ${QED.ink}`,
          borderRadius: QED.rLg, padding: 16, boxShadow: `3px 3px 0 0 ${QED.ink}`,
        }}>
          <p style={{ fontFamily: QED.sans, fontSize: 14, color: QED.ink, lineHeight: 1.6, margin: '0 0 12px', textWrap: 'pretty' }}>
            {t.ourStoryP1}
          </p>
          <p style={{ fontFamily: QED.sans, fontSize: 14, color: QED.ink, lineHeight: 1.6, margin: '0 0 12px', textWrap: 'pretty' }}>
            {t.ourStoryP2}
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
            <span style={{ fontFamily: QED.sans, fontSize: 13, color: QED.inkSoft, fontWeight: 600 }}>{t.ourStoryCredit}</span>
          </div>
        </div>
      </div>

      {/* Closing CTA */}
      <div style={{ padding: '20px 16px 16px' }}>
        <QEDButton size="lg" onClick={onSeeEvents}>{t.reserveThisWeek}</QEDButton>
      </div>

      {/* Demo nav */}
      {(onShowNotFound || onShowError) && (
        <div style={{ padding: '4px 16px 32px', textAlign: 'center' }}>
          <div style={{ fontFamily: QED.mono, fontSize: 10, color: QED.inkMute, letterSpacing: '0.05em' }}>
            [demo states]{' '}
            {onShowNotFound && (
              <button onClick={onShowNotFound} style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontFamily: QED.mono, fontSize: 10, color: QED.ink, letterSpacing: '0.05em',
                textDecoration: 'underline',
              }}>404</button>
            )}
            {onShowNotFound && onShowError && ' · '}
            {onShowError && (
              <button onClick={onShowError} style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontFamily: QED.mono, fontSize: 10, color: QED.ink, letterSpacing: '0.05em',
                textDecoration: 'underline',
              }}>error</button>
            )}
          </div>
        </div>
      )}

      <QEDFooter />

      <HowItWorksModal open={howOpen} onClose={() => setHowOpen(false)} onSeeEvents={onSeeEvents} />
      <VideoModal open={videoOpen} onClose={() => setVideoOpen(false)} />
    </div>
  );
}

// Booking success screen
function SuccessScreen({ tweaks, event, guests = 4, onSelectEvent, onHome, onProfile }) {
  const { t } = useT();
  const e = event || QED_EVENTS[0];
  const total = (guests * e.price).toFixed(2);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [email, setEmail] = React.useState('dmitry@example.com');
  const [editingEmail, setEditingEmail] = React.useState(false);
  const [emailDraft, setEmailDraft] = React.useState(email);

  const dayLabel = t.dayNames[e.day] || e.day;

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
              {t.reservationRef}
            </div>
            <div style={{ fontFamily: QED.sans, fontSize: 26, fontWeight: 900, color: QED.ink, letterSpacing: '-0.025em', marginTop: 4, lineHeight: 1.1 }}>
              {t.youreIn(dayLabel).split('\n').map((line, i) => <React.Fragment key={i}>{line}{i === 0 && <br/>}</React.Fragment>)}
            </div>
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
                    {t.saveBtn}
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span style={{ fontFamily: QED.sans, fontSize: 13, color: QED.inkSoft }}>{t.confirmationSentTo} <strong style={{ color: QED.ink }}>{email}</strong></span>
                  <button
                    onClick={() => { setEmailDraft(email); setEditingEmail(true); }}
                    style={{ background: 'none', border: `1px solid ${QED.hairlineStrong}`, borderRadius: 6, padding: '2px 7px', fontFamily: QED.sans, fontSize: 11, fontWeight: 700, color: QED.inkSoft, cursor: 'pointer' }}>
                    {t.editBtn}
                  </button>
                </div>
              )
            )}
            {isLoggedIn && (
              <div style={{ fontFamily: QED.sans, fontSize: 13, color: QED.inkSoft, marginTop: 6 }}>
                {t.confirmationSentTo} <strong style={{ color: QED.ink }}>{email}</strong>
              </div>
            )}
          </div>

          {/* Details */}
          <div style={{ padding: '4px 16px 14px' }}>
            <DetailRow icon={Icon.cal(16, QED.ink)} label={t.successWhen} value={`${e.dateLabel} · ${e.time}`} />
            <DetailRow icon={Icon.pin(16, QED.ink)} label={t.successWhere} value={`${e.title} · Carrer del Dr. Ferran 10`} />
            <DetailRow icon={Icon.users(16, QED.ink)} label={t.successPartySize} value={t.spotReserved(guests)} />
            <DetailRow
              icon={Icon.euro(16, QED.ink)}
              label={e.paymentRequired ? t.successPaidOnline : t.successPayAtVenue}
              value={e.paymentRequired ? t.paymentConfirmed(total) : t.cashOrCard(total)}
            />
          </div>

          {/* QR entry code */}
          <div style={{ padding: '14px 18px 16px', borderTop: `1.5px dashed ${QED.ink}`, display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ padding: 6, background: '#fff', border: `1.5px solid ${QED.ink}`, borderRadius: QED.rSm, boxShadow: `2px 2px 0 0 ${QED.ink}`, flexShrink: 0 }}>
              <QRCodePlaceholder size={90} value="QED-4421" />
            </div>
            <div>
              <div style={{ fontFamily: QED.mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: QED.ink }}>QED-4421</div>
              <div style={{ fontFamily: QED.sans, fontSize: 12, color: QED.inkSoft, marginTop: 4, lineHeight: 1.45 }}>{t.showAtVenue}</div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <button style={{ ...btnSecondary, width: '100%', marginTop: 12 }}>
          {Icon.cal(14, QED.ink)} <span style={{ marginLeft: 6 }}>{t.addToCalendar}</span>
        </button>

        {/* Invite friends */}
        <div style={{ marginTop: 10, background: QED.paper, border: `1.5px solid ${QED.hairlineStrong}`, borderRadius: QED.rMd, padding: '12px 14px' }}>
          <div style={{ fontFamily: QED.sans, fontSize: 12, fontWeight: 700, color: QED.inkSoft, marginBottom: 10 }}>{t.inviteFriends}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button style={{
              width: '100%', height: 40, background: '#25D366', color: '#fff',
              border: `1.5px solid ${QED.ink}`, borderRadius: 999,
              fontFamily: QED.sans, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: `2px 2px 0 0 ${QED.ink}`,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#fff" d="M17.47 14.38c-.3-.15-1.66-.82-1.92-.92-.26-.09-.44-.14-.63.15-.18.28-.72.91-.9 1.09-.17.19-.34.21-.62.07-1.67-.83-2.76-1.48-3.86-3.36-.29-.5.3-.47.83-1.55.09-.18.05-.35-.03-.49-.07-.14-.63-1.51-.86-2.07-.23-.54-.47-.46-.63-.47-.17 0-.35-.01-.54-.01s-.49.07-.74.35c-.26.28-.98.96-.98 2.33s1 2.7 1.14 2.9c.14.18 1.97 2.98 4.75 4.19 1.76.76 2.45.82 3.33.69.54-.08 1.66-.68 1.89-1.33.24-.65.24-1.21.17-1.33-.07-.13-.26-.2-.54-.34z M12 2A10 10 0 0 0 2 12c0 1.76.46 3.41 1.26 4.85L2 22l5.27-1.22A10 10 0 1 0 12 2z"/></svg>
              {t.shareWhatsApp}
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{
                flex: 1, height: 36, background: '#229ED9', color: '#fff',
                border: `1.5px solid ${QED.ink}`, borderRadius: 999,
                fontFamily: QED.sans, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#fff" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.69 7.94c-.12.57-.46.71-.93.44l-2.58-1.9-1.24 1.2c-.14.14-.26.26-.51.26l.18-2.62 4.72-4.27c.2-.18-.05-.28-.32-.1L7.38 14.4l-2.54-.8c-.55-.17-.56-.55.12-.81l9.91-3.82c.46-.17.86.11.77.82z"/></svg>
                {t.telegram}
              </button>
              <button style={{
                flex: 1, height: 36, background: QED.paper, color: QED.inkSoft,
                border: `1px solid ${QED.hairlineStrong}`, borderRadius: 999,
                fontFamily: QED.sans, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke={QED.inkSoft} strokeWidth="2" strokeLinecap="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke={QED.inkSoft} strokeWidth="2" strokeLinecap="round"/></svg>
                {t.copyLink}
              </button>
            </div>
          </div>
        </div>

        {/* Pre-game tips */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontFamily: QED.sans, fontSize: 14, fontWeight: 800, color: QED.ink, letterSpacing: '-0.01em', marginBottom: 4 }}>{t.beforeQuiz}</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {t.pregameTips.map((x, i) => (
              <div key={i} style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                padding: '10px 0',
                borderBottom: i < t.pregameTips.length - 1 ? `1px solid ${QED.hairline}` : 'none',
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

        {/* Account / Achievements */}
        {!isLoggedIn ? (
          <div style={{ marginTop: 22 }}>
            <div style={{
              background: QED.paper, border: `1.5px solid ${QED.ink}`, borderRadius: QED.rLg,
              padding: 16, boxShadow: `3px 3px 0 0 ${QED.yellow}`,
            }}>
              <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.inkSoft }}>{t.firstTimeHere}</div>
              <div style={{ fontFamily: QED.sans, fontSize: 20, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em', marginTop: 2, lineHeight: 1.1 }}>
                {t.saveYourStreak.split('\n').map((line, i) => <React.Fragment key={i}>{line}{i === 0 && <br/>}</React.Fragment>)}
              </div>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  [Icon.trophy(13, QED.orange), t.accountBenefits[0]],
                  [Icon.sparkle(13, QED.yellow), t.accountBenefits[1]],
                  [Icon.users(13, QED.orange), t.accountBenefits[2]],
                ].map(([ico, text], i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: QED.sans, fontSize: 13, color: QED.inkSoft }}>
                    {ico} {text}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <QEDButton size="sm" full={false} variant="cta">{t.createFreeAccount}</QEDButton>
                <button style={{ ...btnSecondary, height: 38, fontSize: 12, padding: '0 14px' }} onClick={() => setIsLoggedIn(true)}>{t.signIn}</button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.inkSoft }}>{t.yourStats}</div>
              <div style={{ marginTop: 8 }}>
                <LoyaltyCard />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: t.statsCardLabels ? t.statsCardLabels[0] : 'Average score', value: '10.16', bg: QED.yellowSoft },
                  { label: t.statsCardLabels ? t.statsCardLabels[1] : 'Attended events', value: '6', bg: QED.greenSoft },
                  { label: t.statsCardLabels ? t.statsCardLabels[2] : 'Total score', value: '61', bg: '#DDEEF8' },
                  { label: t.statsCardLabels ? t.statsCardLabels[3] : 'Season score', value: '0', bg: '#FAE0D8' },
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

            <div>
              <div style={{ fontFamily: QED.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: QED.inkSoft }}>{t.newAchievements}</div>
              <div style={{ fontFamily: QED.sans, fontSize: 20, fontWeight: 900, color: QED.ink, letterSpacing: '-0.02em', marginTop: 2, lineHeight: 1.1 }}>
                {t.youEarned(2)}
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
                {t.seeAllAchievements}
              </button>
            </div>
          </div>
        )}

        {/* Other quizzes */}
        <div style={{ marginTop: 18, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontFamily: QED.sans, fontSize: 16, fontWeight: 800, color: QED.ink, letterSpacing: '-0.01em' }}>
              {isLoggedIn ? t.hookedBookAnother : t.alsoThisWeek}
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
          }}>{t.backToAllEvents}</button>
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
