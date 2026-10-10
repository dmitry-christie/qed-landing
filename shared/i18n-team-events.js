/* Spanish: Team events page (/team-events/). English is baked into team-events/index.html. Loaded together with i18n-common.js and i18n-corporate.js: the c.* keys it reuses live there. Head keys (te.title, te.metadesc) MUST stay in THIS file: build.mjs localizeHead reads only i18n-common.js plus the page's own file. */
Object.assign(window.QED_ES = window.QED_ES || {}, {
  // head (see the note above: these two cannot move to i18n-corporate.js)
  "te.title": "Trivia para la cena de tu equipo · Tardeo de Trivia",
  "te.metadesc": "¿Te ha tocado organizar la cena de equipo? Trivia con anfitrión y nada que preparar. Desde 181,50 € el grupo, IVA incluido, en nuestros locales.",

  // 1. hero
  // SEASONAL (Sep-Dec 2026): revert te.hero.tag to "Presencial en <ciudades>" after mid-December.
  // ES city lists name only TDT's 4 host cities (Valencia, Madrid, Murcia, Santiago); the baked EN is QED's longer list.
  "te.hero.tag": "Cenas de equipo y Navidad 2026 · Valencia, Madrid*, Murcia* y Santiago*",
  "te.hero.h1a": "¿Te ha tocado organizarlo? ",
  "te.hero.h1b": "Te lo ponemos fácil.",
  "te.hero.sub": "Una trivia por equipos con anfitrión en directo. Dinos la fecha, el sitio y cuántos sois; nosotros montamos, presentamos y recogemos.",
  // ?v=cena variant (Christmas ad group), swapped in by shared/cena-variant.js from window.QED_CENA in team-events/index.html
  "te.hero.h1cenaa": "La cena de tu equipo, ",
  "te.hero.subcena": "Trivia por equipos antes o después de la cena o la comida. Dinos la fecha y cuántos sois; nosotros ponemos el anfitrión, las preguntas y la técnica.",
  "te.hero.f4": "Precio cerrado",
  // the hook is the GROUP price with IVA included; per head is a worked example, exact only for 25 at a venue
  // (150 x 1,21 = 181,50; 181,50 / 25 = 7,26; 181,50 / 12 = 15,125; 200 x 1,21 = 242)
  "te.hero.price": "181,50 € el grupo, IVA incluido",
  "te.hero.pricecond": "Hasta 25 personas en uno de nuestros locales: 7,26 € por persona si sois 25, unos 15 € si sois 12. En vuestro sitio, 242 €.",

  // 2. easy: the old #organiser card of the company page, same strings (except te.easy.2), new H2. Per person for 25, IVA incl.: 242 / 25 and 181,50 / 25.
  "te.easy.eyebrow": "Para quien lo organiza",
  "te.easy.h2": "Más fácil de lo que parece.",
  "te.easy.1": "No hace falta que lo pida la empresa: puedes escribirnos tú.",
  // not "one payment": on Fri 11 / Sat 12 Dec the 30% deposit (c.book.3a/b) makes it two, so this wording stays true all year
  "te.easy.2": "Pagas con enlace de tarjeta o por transferencia. Luego lo repartís como queráis.",
  "te.easy.3": "Pregunta aunque la fecha esté cerca.",
  "te.easy.4": "Puedes cambiar el número de personas hasta 3 días laborables antes.",
  "te.easy.pph": "Por persona, para 25, IVA incluido",
  "te.easy.pp1v": "9,68 €",
  "te.easy.pp1l": "en vuestro restaurante",
  "te.easy.pp2v": "7,26 €",
  "te.easy.pp2l": "en uno de nuestros locales",
  "te.easy.cta": "Cuéntanos tu cena",

  // 3. why, extras, price lead (te.price.lead replaces c.price.lead: a price per group, per head as a worked example)
  "te.why.eyebrow": "Por qué funciona con equipos",
  "te.ex.1": "Rondas sobre vuestro equipo",
  "te.price.lead": "Va según cuántos sois, no por persona: hasta 25 personas son 181,50 € con IVA en uno de nuestros locales, o 242 € en vuestro sitio. Si sois 25, salen 7,26 € o 9,68 € por persona.",

  // 4. FAQ: the other six items reuse c.faq.* (the invoice item is held back until a person with no company can be promised one)
  "te.faq.q7": "¿Cuánto cuesta por persona?",
  "te.faq.a7": "Es un precio por grupo, no por persona: 150 € + IVA hasta 25 personas en uno de nuestros locales (181,50 € con IVA, o sea 7,26 € por persona si sois 25), o 200 € + IVA en vuestro restaurante u oficina (242 €, o sea 9,68 € por persona). Cuantos menos seáis, más sale por cabeza: 10 personas en uno de nuestros locales son 18,15 € cada una (24,20 € en vuestro sitio). De 26 a 75 personas son de 200 a 300 € + IVA; más de 75, te lo presupuestamos. Incluye anfitrión, la trivia, puntuación en directo, sonido y pantalla. Las rondas sobre vuestro equipo, los premios, los trofeos, las rondas en directo y el fotógrafo son extras que te presupuestamos en la llamada.",
  "te.faq.q12": "¿Organizáis también la cena?",
  "te.faq.a12": "No, lo nuestro es la trivia. La cena, el catering y el transporte los organizáis vosotros. ¿Aún no tenéis sitio? Os recomendamos uno, mejor si es uno de nuestros locales: sale 50 € más barato porque allí ya está todo montado para la trivia.",

  // 5. the form: card text is the team wording; the posted value is the label the portal decodes (c.form.et0-2 on the
  // radios, te.form.et3 on the fourth: "Otra cosa" must stay exact, the portal reads it as "other")
  "te.form.et0": "Cena de equipo / Navidad",
  "te.form.et1": "Team building / jornada de equipo",
  "te.form.et2": "Offsite de equipo",
  "te.form.et3": "Otra cosa",
  "te.form.company": "Empresa o equipo",
  "te.ph.email": "nombre@email.com"
});
