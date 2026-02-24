/**
 * Weather API Integration
 * Supports multiple weather providers (OpenWeatherMap, WeatherAPI, etc.)
 */

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const WEATHER_API_PROVIDER = process.env.WEATHER_API_PROVIDER || 'openweathermap'; // 'openweathermap' | 'weatherapi'
const OPENWEATHER_API_URL = 'https://api.openweathermap.org/data/2.5';
const WEATHERAPI_URL = 'https://api.weatherapi.com/v1';

export interface WeatherParams {
  destination: string; // City name or coordinates
  date?: string; // YYYY-MM-DD (optional, defaults to current)
  days?: number; // Number of forecast days (1-10)
}

export interface WeatherData {
  location: {
    name: string;
    country: string;
    coordinates?: {
      lat: number;
      lon: number;
    };
  };
  current: {
    temperature: number; // Celsius
    condition: string; // e.g., "Clear", "Rain", "Cloudy"
    humidity: number; // 0-100
    windSpeed: number; // km/h
    uvIndex?: number;
    feelsLike: number; // Celsius
  };
  forecast?: Array<{
    date: string;
    high: number;
    low: number;
    condition: string;
    chanceOfRain?: number;
  }>;
  alerts?: Array<{
    type: 'warning' | 'advisory' | 'watch';
    title: string;
    description: string;
    expiresAt?: string;
  }>;
}

/**
 * Get weather data for a destination
 */
export async function getWeather(params: WeatherParams): Promise<WeatherData> {
  if (!WEATHER_API_KEY) {
    console.warn('[Weather] API key not configured');
    return getMockWeather(params);
  }

  try {
    if (WEATHER_API_PROVIDER === 'openweathermap') {
      return await getWeatherFromOpenWeatherMap(params);
    } else if (WEATHER_API_PROVIDER === 'weatherapi') {
      return await getWeatherFromWeatherAPI(params);
    } else {
      throw new Error(`Unknown weather provider: ${WEATHER_API_PROVIDER}`);
    }
  } catch (error) {
    console.error('[Weather] Error fetching weather:', error);
    return getMockWeather(params);
  }
}

/**
 * Get weather alerts for a destination
 */
export async function getWeatherAlerts(destination: string): Promise<WeatherData['alerts']> {
  try {
    const weather = await getWeather({ destination, days: 1 });
    return weather.alerts || [];
  } catch (error) {
    console.error('[Weather] Error fetching alerts:', error);
    return [];
  }
}

// OpenWeatherMap implementation
async function getWeatherFromOpenWeatherMap(params: WeatherParams): Promise<WeatherData> {
  // First, get coordinates from city name
  const geoResponse = await fetch(
    `${OPENWEATHER_API_URL}/geo/1.0/direct?q=${encodeURIComponent(params.destination)}&limit=1&appid=${WEATHER_API_KEY}`
  );

  if (!geoResponse.ok) {
    throw new Error(`OpenWeatherMap geo API error: ${geoResponse.status}`);
  }

  const geoData: any = await geoResponse.json();
  if (!geoData || geoData.length === 0) {
    throw new Error(`Location not found: ${params.destination}`);
  }

  const { lat, lon, name, country } = geoData[0];

  // Get current weather
  const weatherResponse = await fetch(
    `${OPENWEATHER_API_URL}/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`
  );

  if (!weatherResponse.ok) {
    throw new Error(`OpenWeatherMap weather API error: ${weatherResponse.status}`);
  }

  const weatherData: any = await weatherResponse.json();

  // Get forecast if requested
  let forecast;
  if (params.days && params.days > 1) {
    const forecastResponse = await fetch(
      `${OPENWEATHER_API_URL}/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric&cnt=${Math.min(params.days * 8, 40)}`
    );

    if (forecastResponse.ok) {
      const forecastData: any = await forecastResponse.json();
      forecast = transformForecast(forecastData.list);
    }
  }

  return {
    location: {
      name: name || params.destination,
      country,
      coordinates: { lat, lon },
    },
    current: {
      temperature: Math.round(weatherData.main.temp),
      condition: weatherData.weather[0].main,
      humidity: weatherData.main.humidity,
      windSpeed: Math.round(weatherData.wind.speed * 3.6), // Convert m/s to km/h
      feelsLike: Math.round(weatherData.main.feels_like),
    },
    forecast,
  };
}

// WeatherAPI.com implementation
async function getWeatherFromWeatherAPI(params: WeatherParams): Promise<WeatherData> {
  const days = params.days || 1;
  const url = params.date
    ? `${WEATHERAPI_URL}/forecast.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(params.destination)}&dt=${params.date}`
    : `${WEATHERAPI_URL}/forecast.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(params.destination)}&days=${days}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`WeatherAPI error: ${response.status}`);
  }

  const data: any = await response.json();

  return {
    location: {
      name: data.location.name,
      country: data.location.country,
      coordinates: {
        lat: data.location.lat,
        lon: data.location.lon,
      },
    },
    current: {
      temperature: Math.round(data.current.temp_c),
      condition: data.current.condition.text,
      humidity: data.current.humidity,
      windSpeed: Math.round(data.current.wind_kph),
      uvIndex: data.current.uv,
      feelsLike: Math.round(data.current.feelslike_c),
    },
    forecast: data.forecast?.forecastday?.map((day: any) => ({
      date: day.date,
      high: Math.round(day.day.maxtemp_c),
      low: Math.round(day.day.mintemp_c),
      condition: day.day.condition.text,
      chanceOfRain: day.day.daily_chance_of_rain,
    })),
    alerts: data.alerts?.alert?.map((alert: any) => ({
      type: alert.severity === 'Extreme' ? 'warning' : 'advisory',
      title: alert.headline,
      description: alert.desc,
      expiresAt: alert.expires,
    })),
  };
}

// Helper functions
function transformForecast(list: any[]): WeatherData['forecast'] {
  // Group by date and get high/low
  const dailyData = new Map<string, { temps: number[]; condition: string }>();

  for (const item of list) {
    const date = item.dt_txt.split(' ')[0];
    if (!dailyData.has(date)) {
      dailyData.set(date, { temps: [], condition: item.weather[0].main });
    }
    dailyData.get(date)!.temps.push(item.main.temp);
  }

  return Array.from(dailyData.entries()).map(([date, data]) => ({
    date,
    high: Math.round(Math.max(...data.temps)),
    low: Math.round(Math.min(...data.temps)),
    condition: data.condition,
  }));
}

function getMockWeather(params: WeatherParams): WeatherData {
  return {
    location: {
      name: params.destination,
      country: 'Unknown',
    },
    current: {
      temperature: 22,
      condition: 'Clear',
      humidity: 65,
      windSpeed: 15,
      uvIndex: 5,
      feelsLike: 24,
    },
    forecast: [
      {
        date: new Date().toISOString().split('T')[0],
        high: 25,
        low: 18,
        condition: 'Clear',
        chanceOfRain: 10,
      },
      {
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        high: 27,
        low: 20,
        condition: 'Partly Cloudy',
        chanceOfRain: 20,
      },
    ],
  };
}

