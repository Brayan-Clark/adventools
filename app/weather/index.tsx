import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  RefreshCw,
  MapPin,
  Sunrise,
  Sunset,
  Wind,
  Droplets,
  Thermometer,
  Calendar,
} from 'lucide-react-native';
import * as LucideIcons from 'lucide-react-native';

import {
  fetchWeather,
  WeatherInfo,
  DayForecast,
  getWeatherDisplay,
  getWeatherSuggestion,
  formatDayLabel,
} from '@/lib/weather';

// ─── Gradient palettes per condition ─────────────────────────────────────────
function getBgGradient(code: number): [string, string, string] {
  if (code === 0) return ['#0f2027', '#203a43', '#2c5364'];          // clear sky / blue-gold
  if (code <= 3)  return ['#0f172a', '#1e293b', '#334155'];          // cloudy / slate
  if (code >= 95) return ['#1a0030', '#2d1b69', '#1e1b4b'];          // stormy / deep purple
  if (code >= 51) return ['#0c1a2e', '#0f3460', '#1a4a6e'];          // rainy / navy
  return ['#0f172a', '#1e293b', '#0f2a1a'];                          // default
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WeatherScreen() {
  const router = useRouter();
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    try {
      const data = await fetchWeather(force);
      if (data) setWeather(data);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(false); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const code = weather?.conditionCode ?? 0;
  const gradient = getBgGradient(code);
  const display = getWeatherDisplay(code);
  const Icon = (LucideIcons as any)[display.name] as React.ComponentType<any>;
  const today = weather?.forecast?.[0];
  const suggestion = today
    ? getWeatherSuggestion(today.conditionCode, today.precipitationProbability, today.windspeed)
    : '';

  const cacheAge = weather
    ? Math.floor((Date.now() - weather.timestamp) / (1000 * 60 * 60))
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Background gradient */}
      <LinearGradient
        colors={gradient}
        style={{ position: 'absolute', inset: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#f97316"
              colors={['#f97316']}
            />
          }
        >
          {/* ── Header ───────────────────────────────────────────────── */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
          }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ChevronLeft size={22} color="#f8fafc" />
            </TouchableOpacity>

            <Text style={{
              color: '#f8fafc', fontSize: 16, fontFamily: 'Lexend_700Bold',
              letterSpacing: 1,
            }}>
              MÉTÉO
            </Text>

            <TouchableOpacity
              onPress={onRefresh}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: 'rgba(249,115,22,0.15)',
                borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {refreshing
                ? <ActivityIndicator size="small" color="#f97316" />
                : <RefreshCw size={18} color="#f97316" />
              }
            </TouchableOpacity>
          </View>

          {/* ── Loading placeholder ───────────────────────────────── */}
          {loading && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 }}>
              <ActivityIndicator size="large" color="#f97316" />
              <Text style={{ color: '#94a3b8', marginTop: 16, fontFamily: 'Lexend_400Regular' }}>
                Chargement de la météo…
              </Text>
            </View>
          )}

          {!loading && weather && (
            <>
              {/* ── Hero Current Weather ──────────────────────────── */}
              <View style={{ alignItems: 'center', paddingTop: 24, paddingBottom: 32, paddingHorizontal: 24 }}>
                {/* City */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                  <MapPin size={14} color="#94a3b8" />
                  <Text style={{ color: '#94a3b8', fontSize: 13, marginLeft: 6, fontFamily: 'Lexend_600SemiBold' }}>
                    {weather.city}
                  </Text>
                </View>

                {/* Big icon */}
                <View style={{
                  width: 120, height: 120, borderRadius: 60,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20,
                  shadowColor: display.color, shadowOpacity: 0.4, shadowRadius: 30, elevation: 12,
                }}>
                  <Icon size={56} color={display.color} />
                </View>

                {/* Temperature */}
                <Text style={{
                  color: '#f8fafc', fontSize: 72, fontFamily: 'Lexend_700Bold',
                  lineHeight: 80, marginBottom: 2,
                }}>
                  {weather.temp}°
                </Text>
                <Text style={{ color: display.color, fontSize: 18, fontFamily: 'Lexend_600SemiBold', marginBottom: 8 }}>
                  {display.label}
                </Text>
                {today && (
                  <Text style={{ color: '#64748b', fontSize: 13, fontFamily: 'Lexend_400Regular' }}>
                    {today.tempMin}° / {today.tempMax}°  •  {today.precipitationProbability}% pluie
                  </Text>
                )}
              </View>

              {/* ── Suggestion du jour ────────────────────────────── */}
              <View style={{
                marginHorizontal: 20, marginBottom: 20,
                padding: 18, borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
              }}>
                <Text style={{
                  color: '#f8fafc', fontSize: 14, lineHeight: 22,
                  fontFamily: 'Lexend_400Regular', textAlign: 'center',
                }}>
                  {suggestion}
                </Text>
              </View>

              {/* ── Quick stats row ───────────────────────────────── */}
              <View style={{
                flexDirection: 'row', marginHorizontal: 20, marginBottom: 24,
                gap: 10,
              }}>
                <StatCard icon={<Sunrise size={18} color="#f59e0b" />} label="Lever" value={weather.sunrise} />
                <StatCard icon={<Sunset size={18} color="#f97316" />} label="Coucher" value={weather.sunset} />
                <StatCard icon={<Wind size={18} color="#38bdf8" />} label="Vent" value={`${today?.windspeed ?? '--'} km/h`} />
                <StatCard icon={<Droplets size={18} color="#3b82f6" />} label="Pluie" value={`${today?.precipitationProbability ?? '--'}%`} />
              </View>

              {/* ── 7-day forecast ────────────────────────────────── */}
              <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                  <Calendar size={16} color="#f97316" />
                  <Text style={{
                    color: '#f8fafc', fontSize: 13, fontFamily: 'Lexend_700Bold',
                    marginLeft: 8, letterSpacing: 1.5, textTransform: 'uppercase',
                  }}>
                    Prévisions 7 jours
                  </Text>
                </View>

                {weather.forecast.map((day, idx) => (
                  <ForecastRow key={day.date} day={day} isToday={idx === 0} />
                ))}
              </View>

              {/* ── Cache info footer ────────────────────────────── */}
              {cacheAge !== null && (() => {
                const nextRefreshH = Math.max(0, 7 * 24 - cacheAge);
                const nextRefreshDays = Math.floor(nextRefreshH / 24);
                const nextLabel = nextRefreshDays > 0
                  ? `dans ${nextRefreshDays}j ${nextRefreshH % 24}h`
                  : nextRefreshH > 0 ? `dans ${nextRefreshH}h` : 'maintenant';
                const ageLabel = cacheAge < 1
                  ? 'Mis à jour il y a moins d\'1h'
                  : cacheAge < 24
                    ? `Mis à jour il y a ${cacheAge}h`
                    : `Mis à jour il y a ${Math.floor(cacheAge / 24)}j`;
                return (
                  <View style={{
                    marginHorizontal: 20, marginBottom: 40, marginTop: 4,
                    padding: 16, borderRadius: 18,
                    backgroundColor: 'rgba(255,255,255,0.07)',
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                  }}>
                    <RefreshCw size={16} color="#f97316" />
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        color: '#cbd5e1', fontSize: 12,
                        fontFamily: 'Lexend_600SemiBold',
                      }}>
                        {ageLabel}
                      </Text>
                      <Text style={{
                        color: '#64748b', fontSize: 11, marginTop: 2,
                        fontFamily: 'Lexend_400Regular',
                      }}>
                        Prochaine mise à jour auto : {nextLabel}
                      </Text>
                    </View>
                    <Text style={{
                      color: '#f97316', fontSize: 10,
                      fontFamily: 'Lexend_700Bold',
                      textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>
                      ↓ Tirer
                    </Text>
                  </View>
                );
              })()}
            </>
          )}

          {!loading && !weather && (
            <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 }}>
              <Thermometer size={48} color="#334155" />
              <Text style={{ color: '#64748b', fontSize: 15, textAlign: 'center', marginTop: 16, fontFamily: 'Lexend_400Regular' }}>
                Impossible de charger la météo.{'\n'}Vérifiez votre connexion et actualisez.
              </Text>
              <TouchableOpacity
                onPress={onRefresh}
                style={{
                  marginTop: 24, paddingHorizontal: 28, paddingVertical: 12,
                  backgroundColor: '#f97316', borderRadius: 50,
                }}
              >
                <Text style={{ color: '#fff', fontFamily: 'Lexend_700Bold', fontSize: 14 }}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={{
      flex: 1, alignItems: 'center', padding: 12,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    }}>
      {icon}
      <Text style={{ color: '#94a3b8', fontSize: 9, fontFamily: 'Lexend_700Bold', marginTop: 6, letterSpacing: 1, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text style={{ color: '#f8fafc', fontSize: 12, fontFamily: 'Lexend_600SemiBold', marginTop: 3 }}>
        {value}
      </Text>
    </View>
  );
}

function ForecastRow({ day, isToday }: { day: DayForecast; isToday: boolean }) {
  const display = getWeatherDisplay(day.conditionCode);
  const DayIcon = (LucideIcons as any)[display.name] as React.ComponentType<any>;
  const suggestion = getWeatherSuggestion(day.conditionCode, day.precipitationProbability, day.windspeed);

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      padding: 14, borderRadius: 16, marginBottom: 10,
      backgroundColor: isToday ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.04)',
      borderWidth: 1,
      borderColor: isToday ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.08)',
    }}>
      {/* Day label */}
      <View style={{ width: 80 }}>
        <Text style={{
          color: isToday ? '#f97316' : '#f8fafc',
          fontSize: 12, fontFamily: 'Lexend_700Bold',
        }}>
          {isToday ? "Aujourd'hui" : formatDayLabel(day.date).split(' ')[0]}
        </Text>
        <Text style={{ color: '#475569', fontSize: 10, fontFamily: 'Lexend_400Regular', marginTop: 2 }}>
          {formatDayLabel(day.date).split(' ').slice(1).join(' ')}
        </Text>
      </View>

      {/* Icon */}
      <DayIcon size={22} color={display.color} style={{ marginHorizontal: 14 }} />

      {/* Rain % */}
      <View style={{ flexDirection: 'row', alignItems: 'center', width: 44 }}>
        <Droplets size={11} color="#3b82f6" />
        <Text style={{ color: '#3b82f6', fontSize: 11, fontFamily: 'Lexend_600SemiBold', marginLeft: 3 }}>
          {day.precipitationProbability}%
        </Text>
      </View>

      {/* Temp range */}
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <Text style={{ color: '#f8fafc', fontSize: 13, fontFamily: 'Lexend_700Bold' }}>
          {day.tempMax}°
          <Text style={{ color: '#475569', fontFamily: 'Lexend_400Regular' }}> / {day.tempMin}°</Text>
        </Text>
        <Text style={{ color: '#475569', fontSize: 9, fontFamily: 'Lexend_400Regular', marginTop: 2 }} numberOfLines={1}>
          {display.label}
        </Text>
      </View>
    </View>
  );
}
