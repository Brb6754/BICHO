import { PillLink } from './Primitives';
import { ConfirmedCard, AgendaCard, MiniCalendar } from './HeroCards';
import {
  AsteriskMark,
  BichoBug,
  CircleStamp,
  GridField,
  LimeArrow,
  Sparkle,
} from './Flourishes';
import { MarketingNav } from './MarketingNav';

// Rebuilt a second time, against the reference Bruno picked after the
// page went white (a bold editorial site: one saturated colour field,
// headline set enormous and centred, small cards and lime arrows
// breaking its edges, a rotating stamp in a corner).
//
// The page's rule is still "white is the primary colour" — this is the
// one violet field on it, and the section right below overlaps it with a
// rounded white sheet, which is what makes the white read as the page
// and the violet as its opening rather than as a theme.
//
// What the previous hero did and this one doesn't: fill the right half
// with a full product mock. At hero scale that pane read as an
// unparseable purple calendar (Bruno's words, and he was right), and it
// pinned the layout to the standard "copy left, screenshot right" split.
// The product is still here, reduced to two cards a person can read at a
// glance while scrolling.
//
// The nav renders INSIDE this section so it sits on the violet field
// rather than above it as a separate bar.
export function Hero() {
  return (
    <section id="top" className="relative isolate overflow-hidden bg-[#5B34E8]">
      <GridField />

      <MarketingNav tone="onViolet" />

      <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-6 sm:pb-24 lg:pb-28">
        {/* The type block. `text-[clamp()]` rather than a step per
            breakpoint: this headline's whole job is to be as large as
            the viewport allows, and three fixed sizes leave it looking
            timid at every width in between. */}
        <div className="relative">
          <h1 className="text-center font-[family-name:var(--font-display)] text-[clamp(2.6rem,11.5vw,8.5rem)] font-extrabold uppercase leading-[0.88] tracking-[-0.03em] text-white">
            Deja de
            <br />
            agendar por
            <br />
            {/* Lime works here and only here: on this violet it is 5.3:1,
                while the same word on the white sections would be 1.4:1.
                That asymmetry is why the accent word moved to violet when
                the hero was white, and can move back now that it isn't. */}
            <span className="text-[#D4F23A]">WhatsApp</span>
          </h1>

          {/* Cards and annotations overlap the type from lg up only:
              below that they'd cover the headline, so the hero carries
              the type alone and the cards return further down the page.
              Placement rule: a card may break the headline's edge, never
              cover a letter. The first pass put this one over the A of
              AGENDAR and the line read "GENDAR POR". The type is centred,
              so the free space is at the outer margins beside the SHORT
              lines — line 1 up top, line 3 at the bottom — which is
              where these two sit. Each arrow points at its own card.
              The pair hangs BELOW the type block (-bottom-6) rather than
              flush with it, and at lg the right card is pushed past the
              container edge (-right-10) so the section clips it: at
              exactly 1024px both were needed to keep the card off the
              final P of WHATSAPP. The tightest breakpoint decides this,
              not the roomiest — at xl there is room to bring it back
              inside. */}
          <ConfirmedCard className="absolute left-0 top-0 hidden lg:block xl:left-4" />
          <LimeArrow
            flip
            className="absolute left-[13.5rem] top-[1.25rem] hidden h-20 w-20 text-[#D4F23A] lg:block xl:left-[17rem]"
          />
          <AgendaCard className="absolute -bottom-6 -right-10 hidden lg:block xl:right-2" />
          {/* This one only exists from xl. It has to clear the end of
              line 2 AND still reach the card, and between 1024 and 1279
              there is no band that does both — it ended up sitting on
              the letters of POR. An annotation that lands on the word it
              is meant to sit beside is worse than no annotation. */}
          <LimeArrow className="absolute right-[6rem] top-[9rem] hidden h-20 w-20 text-[#D4F23A] xl:block" />

          {/* The two glyphs sit in the corners the cards DON'T use: the
              type is centred, so the space beside the short first and
              last lines is free at both scales. These are the only
              decoration that survives on a phone, where the cards and
              arrows drop out — without them the mobile hero is a block
              of type on a flat field. */}
          <AsteriskMark className="absolute right-1 top-0 hidden h-7 w-7 sm:block text-[#D4F23A] sm:h-9 sm:w-9 lg:right-[7%] lg:top-2 lg:h-12 lg:w-12" />
          {/* Three bugs, three angles. The first rides beside the
              asterisk at every size; the other two only exist from xl,
              where the margins beside the type are wide enough to hold
              them — at 1024 the left one would land on the A of AGENDAR
              and the right one on POR. `top-[0.75rem]` and not 1.5: at
              exactly 1024 the lower edge of the first one grazed the top
              of POR. */}
          <BichoBug className="absolute right-10 top-0 hidden h-8 w-8 -rotate-12 sm:block sm:h-10 sm:w-10 lg:right-[14%] lg:top-[0.75rem] lg:h-20 lg:w-20" />
          <BichoBug className="absolute right-[0.5%] top-[5.5rem] hidden h-14 w-14 rotate-[18deg] xl:block" />
          <BichoBug className="absolute left-[9%] top-[10rem] hidden h-14 w-14 -rotate-[24deg] xl:block" />
          {/* The sparkle holds the bottom-left corner only below lg; from
              lg the calendar takes that corner and two lime glyphs
              stacked there would just be clutter. */}
          <Sparkle className="absolute bottom-1 left-0 h-6 w-6 text-[#D4F23A] sm:h-8 sm:w-8 lg:hidden" />
          <MiniCalendar className="absolute -bottom-6 left-0 hidden lg:block xl:left-2" />
        </div>

        {/* The promise the campaign is built on. It lives in the hero
            and not in a section further down because it is what makes
            someone click the post in the first place: a visitor who
            arrives looking for "en menos de 24 horas" and doesn't find
            it reads the page as the wrong one.

            One line, not the paragraph that used to live here — the
            reason that paragraph was cut (it pushed the buttons off a
            wide screen) still holds, so the CTA row gives back the
            space this takes. */}
        <p className="mt-8 text-center text-[16px] leading-snug text-[#E3DEFA] sm:text-lg">
          Tu página de reservas, lista en{' '}
          <span className="font-semibold text-[#D4F23A]">menos de 24 horas</span>.
        </p>

        {/* The ask, straight under the type — no supporting paragraph.
            It used to carry one, and it pushed the buttons a screen and a
            half down on a wide monitor: the headline already says what
            this is, and the section right below exists to explain it.
            The stamp anchors the right end of the same line so the row
            reads as one bar rather than buttons with a sticker floating
            near them. */}
        <div className="mt-8 flex flex-col items-stretch gap-6 sm:mt-10 sm:items-start sm:gap-8 lg:mt-12 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
            {/* En telefono los dos botones ocupan el ancho completo y
                quedan del mismo tamano: dos pastillas de anchos
                distintos, centradas bajo un titular centrado, es lo que
                hacia ver desalineada la portada. */}
            <PillLink
              href="/registro"
              tone="lime"
              className="w-full justify-between sm:w-auto sm:justify-start"
            >
              Crea tu página gratis
            </PillLink>

            {/* The other kind of demo: not "déjanos tus datos y te
                llamamos", but the software itself, open right now. It
                sits second because the form is the one that produces a
                lead — but a visitor who isn't ready to hand over a
                phone number can still see the product instead of
                bouncing. */}
            <PillLink href="/demo" tone="outlineOnDark" className="w-full justify-center sm:w-auto">
              Agenda una demo
            </PillLink>
          </div>

          <CircleStamp className="hidden shrink-0 sm:inline-flex" />
        </div>

        {/* El sello solo existe desde sm, y con el se iba la unica
            mencion de la prueba gratis en la pantalla donde mas se
            decide. Esta linea lo dice en telefono. */}
        <p className="mt-5 text-center text-[14px] text-[#E3DEFA] sm:hidden">
          Prueba <span className="font-semibold text-[#D4F23A]">15 días</span>, sin tarjeta.
        </p>

        {/* Phone gets the cards too, just in the flow instead of floating
            over the type — the product should appear above the fold on
            the device most of these visitors are actually holding. */}
        <div className="mt-10 flex items-start justify-center gap-4 sm:mt-14 lg:hidden">
          <ConfirmedCard className="w-[13rem]" />
          <AgendaCard className="mt-8 hidden w-[12rem] sm:block" />
        </div>
      </div>
    </section>
  );
}
