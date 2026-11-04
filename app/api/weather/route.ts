// 天気情報を取得する API Route です。
// ブラウザから「/api/weather?city=Tokyo」のように呼び出されます。
//
// ★ポイント
// このファイルはサーバー側だけで動くため、APIキー（OPENWEATHER_API_KEY）が
// ブラウザに送られることはありません。

import type { NextRequest } from "next/server";
import type {
  CurrentWeather,
  DayForecast,
  HourlyForecast,
  WeatherData,
  WeatherError,
} from "@/lib/types";

const BASE_URL = "https://api.openweathermap.org/data/2.5";

// ---- OpenWeather から返ってくるデータの形（使う項目だけ） ----

type OwmWeather = { description: string; icon: string };

type OwmCurrentResponse = {
  name: string;
  dt: number; // 取得時刻（UNIX時間・秒）
  timezone: number; // UTCからの時差（秒）
  sys: { country: string };
  main: { temp: number; humidity: number };
  weather: OwmWeather[];
};

type OwmForecastItem = {
  dt: number;
  main: { temp: number; temp_min: number; temp_max: number; humidity: number };
  weather: OwmWeather[];
  pop: number; // 降水確率（0〜1）
};

type OwmForecastResponse = {
  list: OwmForecastItem[];
  city: { timezone: number };
};

// ---- メイン処理 ----

export async function GET(request: NextRequest) {
  // 1. URL から都市名を取り出す（例: ?city=Tokyo）
  const city = request.nextUrl.searchParams.get("city")?.trim() ?? "";

  if (city === "") {
    return errorResponse("都市名を入力してください。", 400);
  }
  if (city.length > 100) {
    return errorResponse("都市名が長すぎます。", 400);
  }

  // 2. .env.local から APIキーを読み込む
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return errorResponse(
      "APIキーが設定されていません。.env.local を確認してください。",
      500,
    );
  }

  // 3. OpenWeather に「現在の天気」と「5日間予報」を同時にリクエストする
  //    units=metric → 気温を℃で取得 / lang=ja → 天気の説明を日本語で取得
  const params = new URLSearchParams({
    q: city,
    appid: apiKey,
    units: "metric",
    lang: "ja",
  });

  let currentRes: Response;
  let forecastRes: Response;
  try {
    [currentRes, forecastRes] = await Promise.all([
      fetch(`${BASE_URL}/weather?${params}`),
      fetch(`${BASE_URL}/forecast?${params}`),
    ]);
  } catch {
    // ネットに繋がらないなど（URLにAPIキーが含まれるため、エラー内容はログに出さない）
    console.error("OpenWeather への接続に失敗しました");
    return errorResponse(
      "天気サービスに接続できませんでした。時間をおいて再度お試しください。",
      502,
    );
  }

  // 4. エラーの場合は、わかりやすいメッセージを返す
  if (!currentRes.ok || !forecastRes.ok) {
    const status = !currentRes.ok ? currentRes.status : forecastRes.status;
    console.error(`OpenWeather からエラーが返されました (status: ${status})`);
    return errorFromStatus(status, city);
  }

  // 5. 受け取ったデータを、画面で使いやすい形に変換して返す
  const current: OwmCurrentResponse = await currentRes.json();
  const forecast: OwmForecastResponse = await forecastRes.json();

  const data: WeatherData = buildWeatherData(current, forecast);
  return Response.json(data);
}

// ---- エラー用の関数 ----

function errorResponse(message: string, status: number) {
  const body: WeatherError = { error: message };
  return Response.json(body, { status });
}

/** OpenWeather のステータスコードに応じてメッセージを決める */
function errorFromStatus(status: number, city: string) {
  switch (status) {
    case 404:
      return errorResponse(
        `「${city}」という都市が見つかりませんでした。英語表記（例: Tokyo, Osaka）で入力してみてください。`,
        404,
      );
    case 401:
      return errorResponse(
        "APIキーが正しくないか、まだ有効になっていません。.env.local を確認してください。",
        500,
      );
    case 429:
      return errorResponse(
        "アクセスが集中しています。しばらく待ってから再度お試しください。",
        429,
      );
    default:
      return errorResponse(
        "天気情報の取得に失敗しました。時間をおいて再度お試しください。",
        502,
      );
  }
}

// ---- データ変換用の関数 ----

/**
 * UNIX時間（秒）と時差（秒）から、その都市での日付と時刻を求めます。
 * 例: { date: "2026-11-04", time: "15:00" }
 */
function toLocalDateTime(unixSeconds: number, timezoneOffset: number) {
  // 時差を足してから UTC として読むと、その都市の現地時刻になる
  const iso = new Date((unixSeconds + timezoneOffset) * 1000).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/** 小数の降水確率（0〜1）を % の整数に変換 */
function toPercent(pop: number) {
  return Math.round(pop * 100);
}

function buildWeatherData(
  current: OwmCurrentResponse,
  forecast: OwmForecastResponse,
): WeatherData {
  const timezone = forecast.city.timezone;
  const today = toLocalDateTime(current.dt, current.timezone).date;

  // 3時間ごとの予報を、日付ごとのグループに分ける
  const itemsByDate = new Map<string, OwmForecastItem[]>();
  for (const item of forecast.list) {
    const { date } = toLocalDateTime(item.dt, timezone);
    const items = itemsByDate.get(date) ?? [];
    items.push(item);
    itemsByDate.set(date, items);
  }

  // 現在の天気
  const currentWeather: CurrentWeather = {
    temp: current.main.temp,
    description: current.weather[0]?.description ?? "",
    icon: current.weather[0]?.icon ?? "",
    humidity: current.main.humidity,
    // 現在の天気APIには降水確率がないため、一番近い予報の値を使う
    pop: toPercent(forecast.list[0]?.pop ?? 0),
  };

  // 日ごとの予報を作る
  const days: DayForecast[] = [];
  for (const [date, items] of itemsByDate) {
    days.push(buildDayForecast(date, items, timezone));
  }

  // 「今日」の予報を、現在の天気で補正する
  const todayForecast = days.find((day) => day.date === today);
  if (todayForecast) {
    todayForecast.tempMax = Math.max(todayForecast.tempMax, currentWeather.temp);
    todayForecast.tempMin = Math.min(todayForecast.tempMin, currentWeather.temp);
    todayForecast.description = currentWeather.description;
    todayForecast.icon = currentWeather.icon;
  } else {
    // 深夜などで今日の予報が残っていない場合は、現在の天気から作る
    days.unshift({
      date: today,
      tempMax: currentWeather.temp,
      tempMin: currentWeather.temp,
      description: currentWeather.description,
      icon: currentWeather.icon,
      humidity: currentWeather.humidity,
      pop: currentWeather.pop,
      hours: [],
    });
  }

  return {
    city: { name: current.name, country: current.sys.country },
    today,
    current: currentWeather,
    days,
  };
}

/** 1日分の3時間ごとの予報から、その日のまとめを作る */
function buildDayForecast(
  date: string,
  items: OwmForecastItem[],
  timezone: number,
): DayForecast {
  const hours: HourlyForecast[] = items.map((item) => ({
    time: toLocalDateTime(item.dt, timezone).time,
    temp: item.main.temp,
    description: item.weather[0]?.description ?? "",
    icon: item.weather[0]?.icon ?? "",
    pop: toPercent(item.pop),
    humidity: item.main.humidity,
  }));

  // 代表の天気は、お昼の12時に一番近い時間帯のものを使う
  const noon = hours.reduce((closest, hour) =>
    Math.abs(hourOf(hour.time) - 12) < Math.abs(hourOf(closest.time) - 12)
      ? hour
      : closest,
  );

  const totalHumidity = items.reduce((sum, item) => sum + item.main.humidity, 0);

  return {
    date,
    tempMax: Math.max(...items.map((item) => item.main.temp_max)),
    tempMin: Math.min(...items.map((item) => item.main.temp_min)),
    description: noon.description,
    icon: noon.icon,
    humidity: Math.round(totalHumidity / items.length),
    pop: Math.max(...hours.map((hour) => hour.pop)),
    hours,
  };
}

/** "15:00" → 15 */
function hourOf(time: string) {
  return Number(time.slice(0, 2));
}
