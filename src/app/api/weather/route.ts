import { NextResponse } from 'next/server';

export async function GET() {
  const API_KEY = process.env.OPENWEATHER_API_KEY;
  // Coordinates for The Lodge Maribaya, Lembang
  const LAT = '-6.8294';
  const LON = '107.6636';

  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current_weather=true`
    );

    if (response.ok) {
      const data = await response.json();

      // Map WMO weather code to our app's format (Indonesian)
      const weatherCode = data.current_weather.weathercode;
      let condition = 'Berawan';
      let description = 'Berawan';

      // WMO Weather interpretation codes (WW)
      // 0: Clear sky
      // 1, 2, 3: Mainly clear, partly cloudy, and overcast
      // 45, 48: Fog and depositing rime fog
      // 51, 53, 55: Drizzle: Light, moderate, and dense intensity
      // 56, 57: Freezing Drizzle: Light and dense intensity
      // 61, 63, 65: Rain: Slight, moderate and heavy intensity
      // 66, 67: Freezing Rain: Light and heavy intensity
      // 71, 73, 75: Snow fall: Slight, moderate, and heavy intensity
      // 77: Snow grains
      // 80, 81, 82: Rain showers: Slight, moderate, and violent
      // 85, 86: Snow showers slight and heavy
      // 95: Thunderstorm: Slight or moderate
      // 96, 99: Thunderstorm with slight and heavy hail

      if (weatherCode === 0) {
        condition = 'Cerah';
        description = 'Langit cerah';
      } else if ([1, 2, 3].includes(weatherCode)) {
        condition = 'Berawan';
        description = 'Berawan sebagian';
      } else if ([45, 48].includes(weatherCode)) {
        condition = 'Kabut';
        description = 'Kabut tebal';
      } else if ([51, 53, 55, 56, 57].includes(weatherCode)) {
        condition = 'Gerimis';
        description = 'Gerimis ringan';
      } else if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
        condition = 'Hujan';
        description = 'Hujan turun';
      } else if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
        condition = 'Salju';
        description = 'Salju turun';
      } else if ([95, 96, 99].includes(weatherCode)) {
        condition = 'Badai';
        description = 'Cuaca badai';
      }

      return NextResponse.json({
        temp: Math.round(data.current_weather.temperature),
        condition,
        description,
        city: 'Lembang, Bandung Barat',
        location: 'The Lodge Maribaya',
        isRealData: true
      });
    }

    throw new Error('Failed to fetch weather data');

  } catch (error) {
    console.error('Weather API Error:', error);
    // Fallback/Mock Data if error
    return NextResponse.json({
      temp: 20,
      condition: 'Berawan',
      description: 'Sejuk & Asri',
      city: 'Lembang, Bandung Barat',
      location: 'The Lodge Maribaya',
      isRealData: false
    });
  }
}
