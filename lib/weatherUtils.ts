// 画面表示で使う小さな便利関数をまとめたファイルです。

/**
 * OpenWeatherのアイコンコード（例: "01d"）を絵文字に変換します。
 * 先頭2文字が天気の種類、最後の1文字が昼(d)／夜(n)を表します。
 */
export function getWeatherEmoji(icon: string): string {
  const type = icon.slice(0, 2);
  const isNight = icon.endsWith("n");

  switch (type) {
    case "01": // 快晴
      return isNight ? "🌙" : "☀️";
    case "02": // 晴れ時々くもり
      return isNight ? "☁️" : "🌤️";
    case "03": // くもり
    case "04": // 厚いくもり
      return "☁️";
    case "09": // にわか雨
      return "🌧️";
    case "10": // 雨
      return "🌦️";
    case "11": // 雷雨
      return "⛈️";
    case "13": // 雪
      return "❄️";
    case "50": // 霧
      return "🌫️";
    default:
      return "🌡️";
  }
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * "2026-11-04" のような日付文字列を「11月4日(水)」の形に変換します。
 * 時差の影響を受けないように、UTCとして計算しています。
 */
export function formatDateJa(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const weekday = WEEKDAYS[d.getUTCDay()];
  return `${month}月${day}日(${weekday})`;
}

/** 気温を「12°」のように整数で表示します。 */
export function formatTemp(temp: number): string {
  return `${Math.round(temp)}°`;
}
