'use client';

import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { withAlpha } from '@/lib/branding/colors';
import 'react-day-picker/style.css';

export function AvailabilityCalendar({
  selected,
  onSelect,
  availableDateKeys,
  accentColor,
}: {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  availableDateKeys: Set<string>;
  accentColor: string;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <DayPicker
      mode="single"
      locale={es}
      selected={selected}
      onSelect={onSelect}
      disabled={(date) => date < today || !availableDateKeys.has(format(date, 'yyyy-MM-dd'))}
      modifiers={{ available: (date) => availableDateKeys.has(format(date, 'yyyy-MM-dd')) }}
      modifiersClassNames={{ available: 'rdp-day-available' }}
      style={
        {
          // Setting these on a wrapper div doesn't work: react-day-picker's
          // own stylesheet declares --rdp-accent-color directly on the
          // .rdp-root element it renders, which wins over an inherited
          // value from an ancestor regardless of where that ancestor set
          // it. The `style` prop is the one DayPicker actually forwards
          // onto .rdp-root itself, so it's the only way to override it.
          '--rdp-accent-color': accentColor,
          '--rdp-accent-background-color': withAlpha(accentColor, 0.13),
        } as React.CSSProperties
      }
    />
  );
}
