/**
 * Rule specs for Hindu festival resolution.
 *
 * v1 supports only `tithi`-type rules — i.e. festivals fixed to a
 * (lunar month, paksha, tithi-number) triple. Solar / nakshatra-based
 * festivals (Makar Sankranti, Pongal, Onam, Vishu, etc.) are out of scope
 * for this bundle and will be added in a later phase.
 *
 * All HinduFestival rows in the database persist their rule under
 * `rule_spec` as JSON; this module narrows that JSON into a typed shape.
 */

export type HinduMonth =
  | 'chaitra'
  | 'vaishakha'
  | 'jyeshtha'
  | 'ashadha'
  | 'shravana'
  | 'bhadrapada'
  | 'ashwin'
  | 'kartika'
  | 'margashirsha'
  | 'pausha'
  | 'magha'
  | 'phalguna';

export interface TithiRule {
  type: 'tithi';
  /** Lunar month name (purnimanta convention) — see HinduMonth. */
  month: HinduMonth;
  paksha: 'shukla' | 'krishna';
  /** 1..15 within the paksha; 30 is sentinel for Amavasya (Krishna 15). */
  tithi: number;
}

export type RuleSpec = TithiRule;
