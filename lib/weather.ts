import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { getSetting } from './user-storage';

const WEATHER_CACHE_KEY = 'app_weather_info_v2';
// 7-day cache: we store a week of data to minimize requests.
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

// ── Types ────────────────────────────────────────────────────────────────────

export interface DayForecast {
  date: string;                      // YYYY-MM-DD
  tempMax: number;
  tempMin: number;
  conditionCode: number;
  sunrise: string;                   // HH:MM
  sunset: string;                    // HH:MM
  precipitationProbability: number;  // 0–100 %
  windspeed: number;                 // km/h
}

export interface WeatherInfo {
  temp: number;
  conditionCode: number;
  sunrise: string;
  sunset: string;
  city: string;
  cityConfig?: string;
  timestamp: number;
  forecast: DayForecast[];
}

// ── Cache helpers ────────────────────────────────────────────────────────────

export async function getCachedWeather(): Promise<WeatherInfo | null> {
  try {
    const cached = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (_) { }
  return null;
}

async function saveWeatherCache(data: WeatherInfo) {
  try {
    await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(data));
  } catch (_) { }
}

// ── Main fetch ───────────────────────────────────────────────────────────────

/**
 * Fetches weather (current + 7-day forecast) from Open-Meteo.
 *
 * Cache logic:
 *  - Returns cache immediately if fresh (< 7 days) AND city hasn't changed.
 *  - Dynamically shifts the forecast so it always starts at the CURRENT date.
 *  - If force=true → always fetches fresh data (pull-to-refresh).
 */
export async function fetchWeather(force = false): Promise<WeatherInfo | null> {
  let cityChanged = false;
  try {
    const lastWeather = await getCachedWeather();
    const now = Date.now();

    // 1. Read manual city from settings FIRST
    let manualCity = '';
    try {
      const settings: any = await getSetting('app_global_settings', null);
      if (settings) {
        manualCity = settings.locationCity?.trim() || '';
      }
    } catch (_) { }

    // 2. Detect city change
    cityChanged =
      lastWeather != null &&
      (lastWeather.cityConfig || '') !== manualCity;

    // 3. Return cache if fresh, city unchanged, AND today is found in forecast
    if (
      !force &&
      !cityChanged &&
      lastWeather != null &&
      now - lastWeather.timestamp < CACHE_DURATION &&
      lastWeather.temp != null
    ) {
      const todayStr = new Date(now).toISOString().split('T')[0];
      const startIndex = lastWeather.forecast.findIndex(d => d.date === todayStr);

      if (startIndex >= 0) {
        console.log("[WEATHER] Returning valid cache (shifted to today) for:", lastWeather.city);
        return {
          ...lastWeather,
          forecast: lastWeather.forecast.slice(startIndex)
        };
      }
    }

    // ── Resolve coordinates ──────────────────────────────────────────────────

    let latitude: number | null = null;
    let longitude: number | null = null;
    let city: string | null = null;
    let resolvedManualCity = false;

    // 4a. Geocode the manual city if provided
    if (manualCity.length > 0) {
      try {
        const searchTerm = manualCity.split(',')[0].trim();
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=1&language=fr`;
        const geoResp = await fetch(geoUrl, {
            headers: { 'User-Agent': 'AdventoolsApp/1.0' }
        });
        if (geoResp.ok) {
          const geoData = await geoResp.json();
          if (geoData.results && geoData.results.length > 0) {
            latitude = geoData.results[0].latitude;
            longitude = geoData.results[0].longitude;
            city = geoData.results[0].name;
            resolvedManualCity = true;
            console.log("[WEATHER] Geocoding API resolved to:", city, "lat:", latitude, "lon:", longitude);
          } else {
            console.log("[WEATHER] Geocoding NO RESULTS for:", searchTerm);
          }
        }
      } catch (e) {
        console.log("[WEATHER] Geocoding error:", e);
      }
    }

    // 4b. Fallback: Device GPS localization
    if (latitude == null) {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          latitude = location.coords.latitude;
          longitude = location.coords.longitude;

          let reverseGeo = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (reverseGeo && reverseGeo.length > 0) {
            city = reverseGeo[0].city || reverseGeo[0].subregion || reverseGeo[0].region || 'Localisation GPS';
          }
        }
      } catch (e) {
        console.log("[WEATHER] Expo Location failed:", e);
      }
    }

    // 5. No location available
    if (latitude == null || longitude == null) {
        // If we absolutely have no coordinates, try to use old cache even if city changed (better than nothing)
        return lastWeather;
    }

    const finalCityConfig = resolvedManualCity ? manualCity : '';

    // ── Fetch weather from Open-Meteo ────────────────────────────────────────

    // Use the newer API parameters: 'current' instead of 'current_weather'
    // Fallback to GMT timezone if auto fails by some weird chance, though auto is best.
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,weather_code` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset,precipitation_probability_max,windspeed_10m_max` +
      `&timezone=auto` +
      `&forecast_days=7`;

    const resp = await fetch(url, {
        headers: { 'User-Agent': 'AdventoolsApp/1.0' }
    });
    
    if (!resp.ok) {
        console.log("[WEATHER] API Error:", resp.status, await resp.text().catch(()=>''));
        throw new Error('weather api error');
    }
    
    const data = await resp.json();

    if (!data.daily || !data.current) {
        throw new Error('weather api invalid data');
    }

    const daily = data.daily;
    const forecast: DayForecast[] = (daily.time as string[]).map((date: string, i: number) => ({
      date,
      tempMax: Math.round(daily.temperature_2m_max[i] ?? 0),
      tempMin: Math.round(daily.temperature_2m_min[i] ?? 0),
      conditionCode: daily.weather_code[i] ?? 0,
      sunrise: daily.sunrise[i] ? daily.sunrise[i].split('T')[1] : '--:--',
      sunset: daily.sunset[i] ? daily.sunset[i].split('T')[1] : '--:--',
      precipitationProbability: daily.precipitation_probability_max[i] ?? 0,
      windspeed: Math.round(daily.windspeed_10m_max[i] ?? 0),
    }));

    const result: WeatherInfo = {
      temp: Math.round(data.current.temperature_2m ?? 0),
      conditionCode: data.current.weather_code ?? 0,
      sunrise: forecast[0]?.sunrise ?? '--:--',
      sunset: forecast[0]?.sunset ?? '--:--',
      city: city || manualCity.split(',')[0].trim() || 'Localisation',
      cityConfig: finalCityConfig,
      timestamp: now,
      forecast,
    };

    await saveWeatherCache(result);
    return result;

  } catch (e) {
    console.log("[WEATHER] Main fetch catch:", e);
    // If the city was newly changed but we failed to fetch, 
    // it's usually better to show the old city's weather than complete failure.
    // We will return the old cache instead of null, so the app doesn't crash visually.
    return getCachedWeather();
  }
}

// ── Display helpers ──────────────────────────────────────────────────────────

export function getWeatherDisplay(code: number): { name: string; color: string; label: string } {
  if (code === 0) return { name: 'Sun', color: '#f59e0b', label: 'Soleil' };
  if (code <= 3) return { name: 'Cloud', color: '#94a3b8', label: 'Nuageux' };
  if (code >= 45 && code <= 48) return { name: 'CloudFog', color: '#94a3b8', label: 'Brouillard' };
  if (code >= 51 && code <= 67) return { name: 'CloudRain', color: '#3b82f6', label: 'Pluie' };
  if (code >= 71 && code <= 77) return { name: 'Snowflake', color: '#bae6fd', label: 'Neige' };
  if (code >= 80 && code <= 82) return { name: 'CloudRain', color: '#3b82f6', label: 'Averses' };
  if (code >= 95) return { name: 'CloudLightning', color: '#8b5cf6', label: 'Orage' };
  return { name: 'Cloud', color: '#94a3b8', label: 'Couvert' };
}

/** Contextual suggestion based on weather conditions */
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

/** Formats YYYY-MM-DD date string to a readable short label */
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
