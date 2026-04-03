import AsyncStorage from '@react-native-async-storage/async-storage';

const WEATHER_CACHE_KEY = 'app_weather_info';
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

export interface WeatherInfo {
  temp: number;
  conditionCode: number;
  sunrise: string;
  sunset: string;
  city: string;
  timestamp: number;
}

export async function getCachedWeather(): Promise<WeatherInfo | null> {
  try {
    const cached = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    return null;
  }
  return null;
}

export async function fetchWeather(): Promise<WeatherInfo | null> {
  try {
    const lastWeather = await getCachedWeather();
    const now = Date.now();

    let latitude: number | null = null;
    let longitude: number | null = null;
    let city: string | null = null;

    try {
      const storedSettings = await AsyncStorage.getItem('app_global_settings');
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        const manualCity = settings.locationCity?.trim() || '';
        
        // Only skip if we have same city and valid cache
        if (!manualCity || (lastWeather && lastWeather.city === manualCity)) {
           if (lastWeather && now - lastWeather.timestamp < CACHE_DURATION && lastWeather.temp) {
             return lastWeather;
           }
        }

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
    } catch (e) {}

    // 1. Get location via IP (Safe fallback chain) if no manual location yet
    if (!latitude) {
      let locData: any = null;
      const sources = [
        'https://ipapi.co/json/',
        'http://ip-api.com/json/',
        'https://freeipapi.com/api/json'
      ];

      for (const source of sources) {
        try {
          const resp = await fetch(source);
          if (resp.ok) {
            const d = await resp.json();
            locData = { 
              latitude: d.latitude || d.lat, 
              longitude: d.longitude || d.lon, 
              city: d.city || d.cityName 
            };
            if (locData.latitude) break;
          }
        } catch (e) {}
      }

      if (locData && locData.latitude) {
        latitude = locData.latitude;
        longitude = locData.longitude;
        city = locData.city;
      }
    }

    if (!latitude || !longitude) {
       return lastWeather; 
    }

    // 2. Get Weather & Sunrise
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=sunrise,sunset&current_weather=true&timezone=auto`;
    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) throw new Error();
    const weatherData = await weatherResponse.json();

    const result: WeatherInfo = {
      temp: Math.round(weatherData.current_weather.temperature),
      conditionCode: weatherData.current_weather.weathercode,
      sunrise: weatherData.daily.sunrise?.[0] ? weatherData.daily.sunrise[0].split('T')[1] : '--:--',
      sunset: weatherData.daily.sunset?.[0] ? weatherData.daily.sunset[0].split('T')[1] : '--:--',
      city: city || 'Localisation',
      timestamp: now,
    };

    // 3. Cache the result
    await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(result));
    return result;
  } catch (error) {
    return getCachedWeather();
  }
}

/**
 * Returns weather icon name and color based on WMO code
 */
export function getWeatherDisplay(code: number) {
  if (code === 0) return { name: 'Sun', color: '#f59e0b' }; 
  if (code <= 3) return { name: 'Cloud', color: '#94a3b8' };
  if (code >= 51 && code <= 67) return { name: 'CloudRain', color: '#3b82f6' };
  if (code >= 80 && code <= 82) return { name: 'CloudRain', color: '#3b82f6' };
  if (code >= 95) return { name: 'CloudLightning', color: '#8b5cf6' };
  return { name: 'Cloud', color: '#94a3b8' };
}
