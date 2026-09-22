import { SERVICES } from './services';

// A Wall-Street-style crawl of the four service areas, Bruno's ask: the
// hero was a wall of text that didn't fit on one screen, and a ticker
// says "here's everything this studio does" in the space of one line.
//
// How it stays seamless: the track renders the list TWICE and the
// keyframe translates exactly -50%, so at the end of the cycle copy #2
// sits precisely where copy #1 began and the restart is invisible. The
// duplicate is aria-hidden, so a screen reader hears the four services
// once, not eight times.
//
// Motion rules it respects: it pauses on hover (a moving target you
// can't read is hostile), and globals.css drops the animation entirely
// under prefers-reduced-motion — where it degrades to a static row
// rather than disappearing.
export function ServicesTicker({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const items = SERVICES.map((s) => ({ id: s.id, Icon: s.Icon, name: s.name }));

  const Row = ({ ariaHidden }: { ariaHidden?: boolean }) => (
    <ul
      className="flex shrink-0 items-center gap-10 pr-10 sm:gap-14 sm:pr-14"
      aria-hidden={ariaHidden || undefined}
    >
      {items.map(({ id, Icon, name }) => (
        <li key={id} className="flex shrink-0 items-center gap-3">
          <Icon className="h-4 w-4 shrink-0 text-[#A99BFF]" strokeWidth={2.2} aria-hidden="true" />
          <span className="whitespace-nowrap text-sm font-medium text-[#D5DCF2] sm:text-[15px]">
            {name}
          </span>
          <span aria-hidden="true" className="h-1 w-1 shrink-0 rotate-45 bg-[#3B00FF]" />
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className={`ticker-shell relative overflow-hidden border-y border-white/[0.08] bg-white/[0.02] py-4 ${className}`}
      style={{
        // Fades the crawl into the page edges instead of letting words
        // get chopped mid-letter at the boundary.
        maskImage:
          'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        // Caller's style last: the hero passes --rise-delay through here
        // for the entrance stagger.
        ...style,
      }}
    >
      <div className="ticker-track flex w-max">
        <Row />
        <Row ariaHidden />
      </div>
    </div>
  );
}
