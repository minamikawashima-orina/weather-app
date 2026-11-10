// 天気情報を取得する API Route です。
// ブラウザから「/api/weather?city=Tokyo」や「/api/weather?city=大阪」のように呼び出されます。
//
// ★日本語の都市名について
// OpenWeather の天気APIは「大阪」のような日本語名を直接受け付けません。
// そこで日本語で入力されたときは、先に Geocoding API で緯度・経度を調べてから
// その緯度・経度で天気を取得します。英語名（Tokyo など）は今までどおり直接検索します。
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
const GEO_URL = "https://api.openweathermap.org/geo/1.0";

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

/** Geocoding API の検索結果 1件分 */
type OwmGeoResult = {
  name: string; // 英語名（例: "Osaka"）
  local_names?: Record<string, string>; // 各言語での名前（例: { ja: "大阪市" }）
  lat: number; // 緯度
  lon: number; // 経度
  country: string; // 国コード（例: "JP"）
};

/** 天気を検索するための情報（都市名で探すか、緯度・経度で探すか） */
type SearchTarget = {
  params: Record<string, string>; // 例: { q: "Tokyo" } または { lat: "34.69", lon: "135.5" }
  city?: { name: string; country: string }; // 画面に出す都市名（日本語検索のときだけ）
};

/** OpenWeather からエラーのステータスコードが返ってきたことを表すエラー */
class OwmStatusError extends Error {
  constructor(public status: number) {
    super(`OpenWeather status ${status}`);
  }
}

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

  let target: SearchTarget | null;
  let currentRes: Response;
  let forecastRes: Response;
  try {
    // 3. 検索のしかたを決める
    //    日本語 → Geocoding API で緯度・経度を調べる / 英語 → 都市名でそのまま検索
    target = containsJapanese(city)
      ? await findCityByJapaneseName(city, apiKey)
      : { params: { q: city } };

    if (target === null) {
      return notFoundResponse(city);
    }

    // 4. OpenWeather に「現在の天気」と「5日間予報」を同時にリクエストする
    //    units=metric → 気温を℃で取得 / lang=ja → 天気の説明を日本語で取得
    const params = new URLSearchParams({
      ...target.params,
      appid: apiKey,
      units: "metric",
      lang: "ja",
    });

    [currentRes, forecastRes] = await Promise.all([
      fetch(`${BASE_URL}/weather?${params}`),
      fetch(`${BASE_URL}/forecast?${params}`),
    ]);
  } catch (error) {
    // Geocoding API がエラーを返した場合
    if (error instanceof OwmStatusError) {
      console.error(`OpenWeather Geocoding からエラーが返されました (status: ${error.status})`);
      return errorFromStatus(error.status, city);
    }
    // ネットに繋がらないなど（URLにAPIキーが含まれるため、エラー内容はログに出さない）
    console.error("OpenWeather への接続に失敗しました");
    return errorResponse(
      "天気サービスに接続できませんでした。時間をおいて再度お試しください。",
      502,
    );
  }

  // 5. エラーの場合は、わかりやすいメッセージを返す
  if (!currentRes.ok || !forecastRes.ok) {
    const status = !currentRes.ok ? currentRes.status : forecastRes.status;
    console.error(`OpenWeather からエラーが返されました (status: ${status})`);
    return errorFromStatus(status, city);
  }

  // 6. 受け取ったデータを、画面で使いやすい形に変換して返す
  const current: OwmCurrentResponse = await currentRes.json();
  const forecast: OwmForecastResponse = await forecastRes.json();

  const data: WeatherData = buildWeatherData(current, forecast);
  // 日本語で検索したときは、Geocoding で見つけた日本語の都市名（例: 大阪市）を表示する
  if (target.city) {
    data.city = target.city;
  }
  return Response.json(data);
}

// ---- 日本語の都市名から場所を探す関数 ----

/** ひらがな・カタカナ・漢字・ハングルが含まれているか（＝日本語などで入力されたか） */
function containsJapanese(text: string) {
  return /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uff66-\uff9f\uac00-\ud7af]/.test(text);
}

/**
 * 日本語の都市名から、Geocoding API で場所（緯度・経度）を探します。
 * 見つからなければ null を返します。
 *
 * 例:「名古屋」をそのまま検索すると、同じ名前の小さな地区が先に出てくることがあります。
 * そこで「名古屋」と「名古屋市」の両方で検索し、日本語名が「名古屋市」と一致するものを優先します。
 */
async function findCityByJapaneseName(
  city: string,
  apiKey: string,
): Promise<SearchTarget | null> {
  // すでに「〇〇市」と入力されていれば、「市」を付け足さない
  // ※「京都」のように最後が「都」でも市の名前の場合があるので、判定は「市」だけにしています
  const endsWithCity = city.endsWith("市");

  // 検索する文字列の候補（例: 「大阪」→「大阪」「大阪市」）
  const queries = endsWithCity ? [city] : [city, `${city}市`];
  const resultLists = await Promise.all(queries.map((query) => geocode(query, apiKey)));
  const results = resultLists.flat();

  // 優先したい日本語名の順番（例: 大阪市 → 大阪都 → 大阪府 → 大阪県 → 大阪）
  const preferredNames = endsWithCity
    ? [city]
    : [`${city}市`, `${city}都`, `${city}府`, `${city}県`, city];

  let found: OwmGeoResult | undefined;
  for (const name of preferredNames) {
    found = results.find((place) => place.local_names?.ja === name);
    if (found) break;
  }
  // 名前がぴったり一致しなくても、結果があれば一番最初のものを使う（例: 外国の都市）
  found ??= results[0];

  if (!found) return null;

  return {
    params: { lat: String(found.lat), lon: String(found.lon) },
    city: { name: found.local_names?.ja ?? found.name, country: found.country },
  };
}

/** Geocoding API で、都市名から場所の候補（最大5件）を取得します */
async function geocode(query: string, apiKey: string): Promise<OwmGeoResult[]> {
  const params = new URLSearchParams({ q: query, limit: "5", appid: apiKey });
  const res = await fetch(`${GEO_URL}/direct?${params}`);
  if (!res.ok) {
    throw new OwmStatusError(res.status);
  }
  return res.json();
}

// ---- エラー用の関数 ----

function errorResponse(message: string, status: number) {
  const body: WeatherError = { error: message };
  return Response.json(body, { status });
}

/** 都市が見つからなかったときのエラー */
function notFoundResponse(city: string) {
  return errorResponse(
    `「${city}」という都市が見つかりませんでした。都市名のつづりを確認してください（例: 大阪、東京、Osaka、Tokyo）。`,
    404,
  );
}

/** OpenWeather のステータスコードに応じてメッセージを決める */
function errorFromStatus(status: number, city: string) {
  switch (status) {
    case 404:
      return notFoundResponse(city);
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
