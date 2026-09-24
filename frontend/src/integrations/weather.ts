import type { EnvSnapshot } from '../data/db';
// Provider boundary: screens call a WeatherSource. Kestrel Bluetooth plugs in here later
// (native Capacitor BLE plugin for iPhone + Android) once Kestrel protocol access is authorized.
export type Conditions = Pick<EnvSnapshot, 'temperature_f' | 'relative_humidity_percent' | 'station_pressure_inhg' | 'density_altitude_ft' | 'wind_speed_mph' | 'wind_direction_degrees'>;
export interface WeatherSource { id: EnvSnapshot['source']; label: string; available(): Promise<boolean>; getCurrentConditions(): Promise<Conditions> }
export const manualWeather: WeatherSource = { id: 'manual', label: 'Manual entry', available: async () => true, getCurrentConditions: async () => ({}) };
export const weatherSources: WeatherSource[] = [manualWeather];
