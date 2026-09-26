import type { Temporal as TemporalPolyfill } from '@js-temporal/polyfill';

// Firestore exposes Temporal.Instant in its declarations. TypeScript's ES2022
// library does not define it yet; reuse the installed polyfill's type only.
declare global {
  namespace Temporal {
    type Instant = TemporalPolyfill.Instant;
  }
}
