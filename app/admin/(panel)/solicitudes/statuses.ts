// Lives outside actions.ts on purpose: every export of a 'use server'
// module has to be an async function, so a plain const or a type there
// fails at module evaluation — which is exactly how this file came to
// exist, after the list blew up with "module evaluation" on first render.
export const DEMO_STATUSES = ['new', 'contacted', 'won', 'lost'] as const;
export type DemoStatus = (typeof DEMO_STATUSES)[number];
