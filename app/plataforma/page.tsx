import { redirect } from 'next/navigation';

// /plataforma is the link the landing advertises; the panel is where a
// visitor should land, because it's the side they can't imagine on
// their own. The booking page is one tab away from there.
export default function PlataformaIndex() {
  redirect('/plataforma/panel');
}
