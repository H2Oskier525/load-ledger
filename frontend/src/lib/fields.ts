import type { Level } from './settings';
export type Screen = 'build' | 'shoot' | 'analyze';
// Every optional field/section, the lowest view level that shows it, and its label for the field manager.
export const FIELDS: Record<Screen, [key: string, label: string, min: Level][]> = {
  build: [
    ['bullet', 'Bullet', 'essential'], ['powder', 'Powder', 'essential'], ['primer', 'Primer', 'essential'], ['case', 'Brass / case', 'essential'],
    ['powder_charge_grains', 'Powder charge', 'essential'], ['cartridge_overall_length_inches', 'COAL', 'essential'], ['notes', 'Prep notes', 'essential'],
    ['lots', 'Component lots', 'expanded'], ['base_to_ogive_inches', 'CBTO', 'expanded'], ['bullet_jump_inches', 'Jump to lands', 'expanded'],
    ['case_firing_count', 'Case firings', 'expanded'], ['intended_use', 'Intended use', 'expanded'], ['ladder', 'Test ladder builder', 'expanded'],
    ['neck_tension_inches', 'Neck tension', 'full'], ['trim_length_inches', 'Trim length', 'full'],
  ],
  shoot: [
    ['group', 'Group size', 'essential'], ['target_photo', 'Target photo measuring', 'essential'], ['distance', 'Distance', 'essential'], ['string_notes', 'String notes', 'essential'],
    ['chrono_import', 'Chronograph import', 'expanded'], ['conditions', 'Conditions', 'expanded'], ['temperature_f', 'Temperature', 'expanded'], ['relative_humidity_percent', 'Humidity', 'expanded'], ['wind_speed_mph', 'Wind speed', 'expanded'],
    ['station_pressure_inhg', 'Station pressure', 'full'], ['density_altitude_ft', 'Density altitude', 'full'], ['wind_direction_degrees', 'Wind direction', 'full'], ['env_notes', 'Conditions notes', 'full'],
    ['shot_notes', 'Per-shot notes', 'full'], ['exclusion_reason', 'Exclusion reasons', 'full'],
  ],
  analyze: [
    ['leaderboard', 'Best-load leaderboard', 'essential'], ['col_avg', 'Avg velocity', 'essential'], ['col_sd', 'SD', 'essential'], ['col_es', 'ES', 'essential'], ['col_group', 'Group size', 'essential'],
    ['trends', 'Trend chart', 'expanded'], ['table', 'Per-string table', 'expanded'],
    ['filters', 'Extra filters', 'full'], ['export', 'CSV export', 'full'],
  ],
};
