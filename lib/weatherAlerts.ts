// 天気に合わせた「注意メッセージ」を決めるルールをまとめたファイルです。
// 画面の表示は components/WeatherAlerts.tsx が担当し、
// このファイルは「どのメッセージを出すか」だけを決めます。

import type { DayForecast } from "@/lib/types";

/** 注意の強さ。danger（危険）は赤、warning（注意）は黄色で表示します */
export type AlertLevel = "danger" | "warning";

/** 注意メッセージ 1件分 */
export type WeatherAlert = {
  id: string; // 画面でリストを表示するときに使う、メッセージごとの名前
  level: AlertLevel;
  emoji: string;
  message: string;
};

// ---- しきい値（ここの数字を変えると、メッセージが出る条件を調整できます） ----
const HEAVY_RAIN_POP = 70; // 降水確率がこの値（%）以上なら「雨の可能性が高い」
const RAIN_POP = 50; // 降水確率がこの値（%）以上なら「雨が降るかも」
const EXTREME_HEAT_TEMP = 35; // 最高気温がこの値（℃）以上なら「猛暑日」
const HEAT_TEMP = 30; // 最高気温がこの値（℃）以上なら「熱中症に注意」
const FREEZING_TEMP = 0; // 最低気温がこの値（℃）以下なら「凍結に注意」
const COLD_TEMP = 5; // 最低気温がこの値（℃）以下なら「冷え込みに注意」
const TEMP_GAP = 10; // 最高と最低の差がこの値（℃）以上なら「寒暖差に注意」

/**
 * 選んだ日の予報から、表示する注意メッセージの一覧を作ります。
 * 当てはまる条件がなければ、空の配列 [] を返します。
 */
export function getWeatherAlerts(day: DayForecast): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  // その日の天気の種類（アイコンコードの先頭2文字）を集める
  // 例: "11d" → "11"（雷雨）。代表の天気だけでなく、3時間ごとの予報も確認します。
  const weatherTypes = new Set(
    [day.icon, ...day.hours.map((hour) => hour.icon)].map((icon) => icon.slice(0, 2)),
  );

  // ☔ 雨（強いほうの条件から順に調べ、どちらか1つだけ出す）
  if (day.pop >= HEAVY_RAIN_POP) {
    alerts.push({
      id: "rain",
      level: "danger",
      emoji: "☔",
      message: `降水確率${day.pop}%。雨の可能性が高いです。傘を忘れずに持っていきましょう。`,
    });
  } else if (day.pop >= RAIN_POP) {
    alerts.push({
      id: "rain",
      level: "warning",
      emoji: "🌂",
      message: `降水確率${day.pop}%。雨が降るかもしれません。折りたたみ傘があると安心です。`,
    });
  }

  // ⛈️ 雷雨（アイコンコード "11"）
  if (weatherTypes.has("11")) {
    alerts.push({
      id: "thunder",
      level: "danger",
      emoji: "⛈️",
      message: "雷雨の予報です。雷が鳴ったら建物の中に避難しましょう。",
    });
  }

  // ❄️ 雪（アイコンコード "13"）
  if (weatherTypes.has("13")) {
    alerts.push({
      id: "snow",
      level: "warning",
      emoji: "❄️",
      message: "雪の予報です。足元が滑りやすくなるので注意しましょう。",
    });
  }

  // 🥵 高温（強いほうの条件から順に調べる）
  if (day.tempMax >= EXTREME_HEAT_TEMP) {
    alerts.push({
      id: "heat",
      level: "danger",
      emoji: "🔥",
      message: `最高気温${Math.round(day.tempMax)}℃の猛暑日です。不要な外出は控え、こまめに水分補給をしましょう。`,
    });
  } else if (day.tempMax >= HEAT_TEMP) {
    alerts.push({
      id: "heat",
      level: "warning",
      emoji: "🥵",
      message: `最高気温${Math.round(day.tempMax)}℃。熱中症に注意して、こまめに水分補給をしましょう。`,
    });
  }

  // 🥶 低温（強いほうの条件から順に調べる）
  if (day.tempMin <= FREEZING_TEMP) {
    alerts.push({
      id: "cold",
      level: "danger",
      emoji: "🧊",
      message: `最低気温${Math.round(day.tempMin)}℃。氷点下になります。路面の凍結に注意しましょう。`,
    });
  } else if (day.tempMin <= COLD_TEMP) {
    alerts.push({
      id: "cold",
      level: "warning",
      emoji: "🥶",
      message: `最低気温${Math.round(day.tempMin)}℃。冷え込むので、暖かい服装で出かけましょう。`,
    });
  }

  // 🌡️ 寒暖差
  const tempGap = day.tempMax - day.tempMin;
  if (tempGap >= TEMP_GAP) {
    alerts.push({
      id: "temp-gap",
      level: "warning",
      emoji: "🌡️",
      message: `最高と最低の気温差が${Math.round(tempGap)}℃あります。体調を崩さないよう気をつけましょう。`,
    });
  }

  return alerts;
}
