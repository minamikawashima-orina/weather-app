// アプリ内で使う「データの形（型）」をまとめたファイルです。
// API Route（サーバー側）と画面（ブラウザ側）の両方で同じ型を使います。

/** 3時間ごとの予報 1件分 */
export type HourlyForecast = {
  time: string; // 時刻（例: "15:00"）
  temp: number; // 気温（℃）
  description: string; // 天気の説明（例: "晴天"）
  icon: string; // OpenWeatherの天気アイコンコード（例: "01d"）
  pop: number; // 降水確率（%）
  humidity: number; // 湿度（%）
};

/** 1日分の予報 */
export type DayForecast = {
  date: string; // 日付（例: "2026-11-04"）
  tempMax: number; // 最高気温（℃）
  tempMin: number; // 最低気温（℃）
  description: string; // その日の代表的な天気
  icon: string; // その日の代表的な天気アイコンコード
  humidity: number; // 平均湿度（%）
  pop: number; // 降水確率（その日の最大値, %）
  hours: HourlyForecast[]; // 3時間ごとの予報
};

/** 現在の天気 */
export type CurrentWeather = {
  temp: number; // 現在の気温（℃）
  description: string;
  icon: string;
  humidity: number; // 湿度（%）
  pop: number; // 降水確率（直近3時間, %）
};

/** API Route（/api/weather）が返すデータ全体 */
export type WeatherData = {
  city: {
    name: string; // 都市名
    country: string; // 国コード（例: "JP"）
  };
  today: string; // その都市での「今日」の日付（例: "2026-11-04"）
  current: CurrentWeather;
  days: DayForecast[]; // 日ごとの予報（今日〜5日後）
};

/** エラー時に API Route が返すデータ */
export type WeatherError = {
  error: string; // 画面に表示するメッセージ
};
