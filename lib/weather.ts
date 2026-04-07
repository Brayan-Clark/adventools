import AsyncStorage from '@react-native-async-storage/async-storage';

const WEATHER_CACHE_KEY = 'app_weather_info_v2';
// 7-day cache: only one network call per week unless forced refresh
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

// ── Types ────────────────────────────────────────────────────────────────────

export interface DayForecast {
  date: string;          // YYYY-MM-DD
  tempMax: number;
  tempMin: number;
  conditionCode: number;
  sunrise: string;       // HH:MM
  sunset: string;        // HH:MM
  precipitationProbability: number; // 0‒100 %
  windspeed: number;     // km/h
}

export interface WeatherInfo {
  // Current conditions
  temp: number;
  conditionCode: number;
  sunrise: string;
  sunset: string;
  city: string;
  timestamp: number;
  // 7-day forecast
  forecast: DayForecast[];
}

// ── Cache helpers ────────────────────────────────────────────────────────────

export async function getCachedWeather(): Promise<WeatherInfo | null> {
  try {
    const cached = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (_) {}
  return null;
}

async function saveWeatherCache(data: WeatherInfo) {
  try {
    await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(data));
  } catch (_) {}
}

// ── Main fetch ───────────────────────────────────────────────────────────────

/**
 * Fetches weather (current + 7-day forecast) from Open-Meteo.
 * Uses the cache for CACHE_DURATION (7 days) unless `force` is true.
 */
export async function fetchWeather(force = false): Promise<WeatherInfo | null> {
  try {
    const lastWeather = await getCachedWeather();
    const now = Date.now();

    // Return cache if still fresh and not forced
    if (!force && lastWeather && now - lastWeather.timestamp < CACHE_DURATION && lastWeather.temp) {
      return lastWeather;
    }

    let latitude: number | null = null;
    let longitude: number | null = null;
    let city: string | null = null;

    // 1. Read manual city from settings
    try {
      const storedSettings = await AsyncStorage.getItem('app_global_settings');
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        const manualCity = settings.locationCity?.trim() || '';
        if (manualCity.length > 0) {
          const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(manualCity)}&count=1&language=fr`;
          const geoResp = await fetch(geoUrl);
          if (geoResp.ok) {
            const geoData = await geoResp.json();
            if (geoData.results && geoData.results[0]) {
              latitude = geoData.results[0].latitude;
              longitude = geoData.results[0].longitude;
              city = geoData.results[0].name;
            }
          }
        }
      }
    } catch (_) {}

    // 2. Fallback: IP-based location
    if (!latitude) {
      const sources = [
        'https://ipapi.co/json/',
        'http://ip-api.com/json/',
        'https://freeipapi.com/api/json',
      ];
      for (const source of sources) {
        try {
          const resp = await fetch(source);
          if (resp.ok) {
            const d = await resp.json();
            const lat = d.latitude ?? d.lat;
            const lon = d.longitude ?? d.lon;
            if (lat) { latitude = lat; longitude = lon; city = d.city || d.cityName; break; }
          }
        } catch (_) {}
      }
    }

    if (!latitude || !longitude) return lastWeather;

    // 3. Fetch current + 7-day forecast from Open-Meteo
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}&longitude=${longitude}` +
      `&current_weather=true` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset,precipitation_probability_max,windspeed_10m_max` +
      `&timezone=auto` +
      `&forecast_days=7`;

    const resp = await fetch(url);
    if (!resp.ok) throw new Error('weather api error');
    const data = await resp.json();

    const daily = data.daily;
    const forecast: DayForecast[] = (daily.time as string[]).map((date, i) => ({
      date,
      tempMax: Math.round(daily.temperature_2m_max[i]),
      tempMin: Math.round(daily.temperature_2m_min[i]),
      conditionCode: daily.weathercode[i],
      sunrise: daily.sunrise[i] ? daily.sunrise[i].split('T')[1] : '--:--',
      sunset: daily.sunset[i] ? daily.sunset[i].split('T')[1] : '--:--',
      precipitationProbability: daily.precipitation_probability_max[i] ?? 0,
      windspeed: Math.round(daily.windspeed_10m_max[i] ?? 0),
    }));

    const result: WeatherInfo = {
      temp: Math.round(data.current_weather.temperature),
      conditionCode: data.current_weather.weathercode,
      sunrise: forecast[0]?.sunrise ?? '--:--',
      sunset: forecast[0]?.sunset ?? '--:--',
      city: city || 'Localisation',
      timestamp: now,
      forecast,
    };

    await saveWeatherCache(result);
    return result;
  } catch (_) {
    return getCachedWeather();
  }
}

// ── Display helpers ──────────────────────────────────────────────────────────

export function getWeatherDisplay(code: number): { name: string; color: string; label: string } {
  if (code === 0)               return { name: 'Sun',            color: '#f59e0b', label: 'Soleil' };
  if (code <= 3)                return { name: 'Cloud',          color: '#94a3b8', label: 'Nuageux' };
  if (code >= 45 && code <= 48) return { name: 'CloudFog',       color: '#94a3b8', label: 'Brouillard' };
  if (code >= 51 && code <= 67) return { name: 'CloudRain',      color: '#3b82f6', label: 'Pluie' };
  if (code >= 71 && code <= 77) return { name: 'Snowflake',      color: '#bae6fd', label: 'Neige' };
  if (code >= 80 && code <= 82) return { name: 'CloudRain',      color: '#3b82f6', label: 'Averses' };
  if (code >= 95)               return { name: 'CloudLightning', color: '#8b5cf6', label: 'Orage' };
  return { name: 'Cloud', color: '#94a3b8', label: 'Couvert' };
}

/** Returns user-friendly tips/suggestions based on weather */
export function getWeatherSuggestion(code: number, rain: number, wind: number): string {
  if (code >= 95) return '⚡ Orage prévu — restez à l\'abri et évitez les sorties.';
  if (code >= 80 && code <= 82) return '🌧️ Averses probables — prenez votre parapluie.';
  if (code >= 51 && code <= 67) return rain > 70
    ? '☂️ Forte pluie — reportez vos sorties si possible.'
    : '🌦️ Pluie légère — prenez un imperméable.';
  if (code >= 71 && code <= 77) return '❄️ Possibilité de neige — habillez-vous chaudement.';
  if (code >= 45 && code <= 48) return '🌫️ Brouillard — conduisez prudemment.';
  if (wind > 40) return '💨 Vent fort — attention aux objets en hauteur.';
  if (code === 0) return '☀️ Belle journée — profitez du soleil !';
  return '🌤️ Temps nuageux — agréable pour une promenade.';
}

/** Formats a date string YYYY-MM-DD to a short localized day label */
export function formatDayLabel(dateStr: string): string {
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  } catch (_) {
    return dateStr;
  }
}
