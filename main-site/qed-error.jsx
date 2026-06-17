// 404 / not-found and generic error screens.
// Design intent: a wrong URL or a backend hiccup never dead-ends the user.
// Every error surfaces this week's real quizzes inline so the path back to
// the booking flow is one tap away. Voice stays warm and irreverent —
// the quizmaster is in on the joke, not apologising in beige.

// Stacked sticker burst — the visual anchor for both error screens.
// Two overlapping ComicBursts at staggered angles give a layered, handmade
// feel rather than a single perfectly centered shape (anti-AI-template).
function ErrorBurst({ code = '404', tone = 'yellow' }) {
  const palettes = {
    yellow: { main: QED.yellow, accent: QED.orange, fg: QED.ink },
    red:    { main: QED.red,    accent: QED.yellow, fg: '#fff' },
  }[tone] || { main: QED.yellow, accent: QED.orange, fg: QED.ink };
  // Scale the inline number so 3 chars vs 4 chars both fit nicely.
  const codeFs = code.length <= 3 ? 56 : code.length === 4 ? 44 : 36;
  return (
    <div style={{ position: 'relative', width: 220, height: 200, margin: '0 auto' }}>
      {/* Accent burst — peeks behind, slightly larger angle */}
      <div style={{ position: 'absolute', top: 4, left: 110, transform: 'rotate(14deg)', opacity: 0.95 }}>
        <ComicBurst size={108} color={palettes.accent} />
      </div>
      {/* Tiny third burst for handmade rhythm */}
      <div style={{ position: 'absolute', top: 138, left: 0, transform: 'rotate(-22deg)', opacity: 0.9 }}>
        <ComicBurst size={56} color={QED.green} />
      </div>
      {/* Main burst — sits in front with the code */}
      <div style={{ position: 'absolute', top: 14, left: 16, transform: 'rotate(-5deg)' }}>
        <ComicBurst size={172} color={palettes.main}>
          <span style={{
            fontFamily: QED.sans, fontSize: codeFs, fontWeight: 900,
            letterSpacing: '-0.045em', color: palettes.fg, lineHeight: 1,
          }}>{code}</span>
        </ComicBurst>
      </div>
    </div>
  );
}

// Compact event row — slim version of EventCard for inline embedding inside
// the "still on this week" panel. Same sticker borders, smaller footprint.
function MiniEventRow({ event, onClick }) {
  const { t } = useT();
  const lowSpots = event.spots <= 10;
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: QED.paper, border: `1.5px solid ${QED.ink}`,
      borderRadius: QED.rMd, boxShadow: `2px 2px 0 0 ${QED.ink}`,
      padding: 10, cursor: 'pointer',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 10, overflow: 'hidden',
        flexShrink: 0, border: `1px solid ${QED.ink}`,
      }}>
        <VenuePlaceholder height={56} label="" tone={event.tone} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{
            fontFamily: QED.mono, fontSize: 10, fontWeight: 700, color: QED.orangeDeep,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            {event.dateLabel}
          </span>
          {lowSpots && (
            <span style={{
              padding: '2px 6px', borderRadius: 4,
              background: QED.redSoft, color: QED.redDeep,
              fontFamily: QED.sans, fontSize: 9, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>{t.spotsLeft(event.spots)}</span>
          )}
        </div>
        <div style={{
          fontFamily: QED.sans, fontSize: 14, fontWeight: 800, color: QED.ink,
          letterSpacing: '-0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {event.title}
        </div>
        <div style={{ fontFamily: QED.sans, fontSize: 12, color: QED.inkSoft, marginTop: 1 }}>
          {event.area} · {event.time} · €{event.price.toFixed(2)}
        </div>
      </div>
      {Icon.chevR(15, QED.ink)}
    </div>
  );
}

// Reusable inline "this week" panel — the keep-in-flow magic.
// Two real events from QED_EVENTS shown as tappable rows so the user
// rolls straight from the error into a booking decision.
function StillOnPanel({ events, kicker, kickerColor, title, onSeeEvents, onSelectEvent, shadowColor }) {
  const { t } = useT();
  return (
    <div style={{
      background: QED.paper, border: `1.5px solid ${QED.ink}`,
      borderRadius: QED.rLg, boxShadow: `4px 4px 0 0 ${shadowColor}`,
      padding: '14px 14px 12px',
    }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{
          fontFamily: QED.sans, fontSize: 11, fontWeight: 800,
          letterSpacing: '0.08em', textTransform: 'uppercase', color: kickerColor,
        }}>{kicker}</div>
        <div style={{
          fontFamily: QED.sans, fontSize: 18, fontWeight: 900, color: QED.ink,
          letterSpacing: '-0.02em', lineHeight: 1.15, marginTop: 2,
        }}>{title}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {events.slice(0, 2).map(ev => (
          <MiniEventRow key={ev.id} event={ev} onClick={() => onSelectEvent && onSelectEvent(ev)} />
        ))}
      </div>
      <button onClick={onSeeEvents} style={{
        width: '100%', height: 38, marginTop: 10,
        background: 'transparent', color: QED.ink,
        border: `1.5px solid ${QED.ink}`, borderRadius: 999,
        fontFamily: QED.sans, fontSize: 13, fontWeight: 800, cursor: 'pointer',
      }}>{t.seeAllEvents(events.length)}</button>
    </div>
  );
}

// 404 — "Question not found"
function NotFoundScreen({ onHome, onSeeEvents, onSelectEvent, onProfile, onShowError, path = '/quiz/missing' }) {
  const { t } = useT();
  const events = (typeof QED_EVENTS !== 'undefined') ? QED_EVENTS : [];
  return (
    <div style={{ height: '100%', overflow: 'auto', background: QED.cream }}>
      <QEDHeader onLogo={onHome} onProfile={onProfile} onNavEvents={onSeeEvents} />

      {/* Hero */}
      <div style={{ padding: '18px 16px 0', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 11px', borderRadius: 999,
          background: QED.creamSoft, border: `1px solid ${QED.hairlineStrong}`,
          fontFamily: QED.mono, fontSize: 10.5, fontWeight: 700, color: QED.inkSoft,
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          {t.notFoundPill}
        </div>
        <div style={{ marginTop: 10 }}>
          <ErrorBurst code="404" tone="yellow" />
        </div>
        <div style={{
          fontFamily: QED.sans, fontSize: 36, fontWeight: 900, color: QED.ink,
          letterSpacing: '-0.035em', lineHeight: 0.98, marginTop: 0,
        }}>
          {t.notFoundTitle.split('\n').map((line, i) => (
            <React.Fragment key={i}>{line}{i < t.notFoundTitle.split('\n').length - 1 && <br/>}</React.Fragment>
          ))}
        </div>
        <p style={{
          fontFamily: QED.sans, fontSize: 14, color: QED.inkSoft, lineHeight: 1.55,
          margin: '12px auto 0', maxWidth: 320, textWrap: 'pretty',
        }}>
          {t.notFoundBody}
        </p>
      </div>

      {/* Inline "what's on this week" — keeps the booking intent alive */}
      <div style={{ padding: '22px 16px 0' }}>
        <StillOnPanel
          events={events}
          kicker={t.bonusRound}
          kickerColor={QED.orangeDeep}
          title={t.whatsOnThisWeek}
          shadowColor={QED.yellow}
          onSeeEvents={onSeeEvents}
          onSelectEvent={onSelectEvent}
        />
      </div>

      {/* Primary action */}
      <div style={{ padding: '18px 16px 0' }}>
        <QEDButton size="lg" variant="cta" onClick={onSeeEvents} icon={Icon.chevR(15, '#fff')}>
          {t.takeToSchedule}
        </QEDButton>
        <button onClick={onHome} style={{
          width: '100%', height: 44, marginTop: 8,
          background: 'transparent', color: QED.ink,
          border: `1.5px solid ${QED.ink}`, borderRadius: 999,
          fontFamily: QED.sans, fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>{t.backToHome}</button>
      </div>

      {/* Tell us what broke */}
      <div style={{ padding: '20px 16px 0', textAlign: 'center' }}>
        <div style={{ fontFamily: QED.sans, fontSize: 12, color: QED.inkSoft, lineHeight: 1.5 }}>
          {t.brokenLink}{' '}
          <a href="mailto:hello@qed.es?subject=Broken%20link"
             style={{ color: QED.ink, textDecoration: 'underline', fontWeight: 700 }}>
            {t.tellUsWhatBroke}
          </a>.
        </div>
      </div>

      {/* Footer error code */}
      <div style={{
        margin: '20px 16px 24px', padding: '10px 0 0',
        borderTop: `1px dashed ${QED.hairlineStrong}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{
          fontFamily: QED.mono, fontSize: 10, color: QED.inkMute,
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>404 · {path}</span>
        <span style={{
          fontFamily: QED.mono, fontSize: 10, color: QED.inkMute,
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>QED-WEB</span>
      </div>

      {/* Demo nav (prototype only) */}
      {onShowError && (
        <div style={{ textAlign: 'center', paddingBottom: 28 }}>
          <button onClick={onShowError} style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontFamily: QED.mono, fontSize: 10, color: QED.inkMute, letterSpacing: '0.05em',
          }}>
            [demo: see generic error state →]
          </button>
        </div>
      )}
    </div>
  );
}

// Generic / 500 — "We blanked"
function ErrorScreen({ onHome, onSeeEvents, onSelectEvent, onProfile, onRetry, onShowNotFound, errorCode = 'ERR-7C12' }) {
  const { t } = useT();
  const events = (typeof QED_EVENTS !== 'undefined') ? QED_EVENTS : [];
  const [retrying, setRetrying] = React.useState(false);
  const handleRetry = () => {
    if (retrying) return;
    setRetrying(true);
    setTimeout(() => { setRetrying(false); onRetry && onRetry(); }, 900);
  };
  const ts = new Date().toISOString().slice(0, 16).replace('T', ' ');

  return (
    <div style={{ height: '100%', overflow: 'auto', background: QED.cream }}>
      <QEDHeader onLogo={onHome} onProfile={onProfile} onNavEvents={onSeeEvents} />

      {/* Hero */}
      <div style={{ padding: '18px 16px 0', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 11px', borderRadius: 999,
          background: QED.redSoft, border: `1px solid rgba(214,69,69,0.3)`,
          fontFamily: QED.mono, fontSize: 10.5, fontWeight: 700, color: QED.redDeep,
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          {t.errorPill}
        </div>
        <div style={{ marginTop: 10 }}>
          <ErrorBurst code="500" tone="red" />
        </div>
        <div style={{
          fontFamily: QED.sans, fontSize: 36, fontWeight: 900, color: QED.ink,
          letterSpacing: '-0.035em', lineHeight: 0.98,
        }}>
          {t.errorTitle.split('\n').map((line, i, arr) => (
            <React.Fragment key={i}>{line}{i < arr.length - 1 && <br/>}</React.Fragment>
          ))}
        </div>
        <p style={{
          fontFamily: QED.sans, fontSize: 14, color: QED.inkSoft, lineHeight: 1.55,
          margin: '12px auto 0', maxWidth: 320, textWrap: 'pretty',
        }}>
          {t.errorBody}
        </p>
      </div>

      {/* Primary: try again */}
      <div style={{ padding: '18px 16px 0' }}>
        <QEDButton size="lg" variant="cta" onClick={handleRetry} disabled={retrying}>
          {retrying ? (
            <>
              <span style={{
                width: 14, height: 14, borderRadius: 999,
                border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
                display: 'inline-block', animation: 'qed-spin 0.7s linear infinite', marginRight: 4,
              }}/>
              <style>{`@keyframes qed-spin { to { transform: rotate(360deg); } }`}</style>
              {t.retrying}
            </>
          ) : t.tryAgain}
        </QEDButton>
      </div>

      {/* Reassurance row — three small chips */}
      <div style={{ padding: '12px 16px 0', display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          [Icon.check(11, QED.greenInk), t.bookingSaved],
          [Icon.check(11, QED.greenInk), t.noDoubleCharge],
          [Icon.check(11, QED.greenInk), t.emailStillSends],
        ].map(([ico, label], i) => (
          <span key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 999,
            background: QED.greenSoft, border: `1px solid rgba(127,181,138,0.4)`,
            fontFamily: QED.sans, fontSize: 11, fontWeight: 700, color: QED.greenInk,
          }}>{ico} {label}</span>
        ))}
      </div>

      {/* Inline events — same idea, different framing: "running anyway" */}
      <div style={{ padding: '20px 16px 0' }}>
        <StillOnPanel
          events={events}
          kicker={t.stillOn}
          kickerColor={QED.greenInk}
          title={t.theseQuizzesRunning}
          shadowColor={QED.ink}
          onSeeEvents={onSeeEvents}
          onSelectEvent={onSelectEvent}
        />
      </div>

      {/* Support */}
      <div style={{ padding: '20px 16px 0', textAlign: 'center' }}>
        <div style={{ fontFamily: QED.sans, fontSize: 12, color: QED.inkSoft, lineHeight: 1.55 }}>
          {t.stillSeeing}{' '}
          <a href={`mailto:hello@qed.es?subject=Error%20${errorCode}`}
             style={{ color: QED.ink, textDecoration: 'underline', fontWeight: 700 }}>
            {t.tellUsWhatBroke}
          </a>{' '}
          — mention the code below and we'll dig in.
        </div>
      </div>

      {/* Footer error code + timestamp */}
      <div style={{
        margin: '20px 16px 24px', padding: '10px 0 0',
        borderTop: `1px dashed ${QED.hairlineStrong}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{
          fontFamily: QED.mono, fontSize: 10, color: QED.inkMute,
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>{errorCode}</span>
        <span style={{
          fontFamily: QED.mono, fontSize: 10, color: QED.inkMute,
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>{ts} UTC</span>
      </div>

      {/* Demo nav (prototype only) */}
      {onShowNotFound && (
        <div style={{ textAlign: 'center', paddingBottom: 28 }}>
          <button onClick={onShowNotFound} style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontFamily: QED.mono, fontSize: 10, color: QED.inkMute, letterSpacing: '0.05em',
          }}>
            [demo: see 404 state →]
          </button>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { NotFoundScreen, ErrorScreen, ErrorBurst, MiniEventRow, StillOnPanel });
