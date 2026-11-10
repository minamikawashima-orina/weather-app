// 選んだ日の天気に合わせて「注意メッセージ」を表示します。
// どのメッセージを出すかは lib/weatherAlerts.ts で決めています。

import type { DayForecast } from "@/lib/types";
import { getWeatherAlerts, type AlertLevel } from "@/lib/weatherAlerts";

type Props = {
  day: DayForecast; // 選択中の日の予報
};

// 注意の強さごとの色（Tailwind のクラス）
const LEVEL_STYLES: Record<AlertLevel, string> = {
  danger: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
};

export default function WeatherAlerts({ day }: Props) {
  const alerts = getWeatherAlerts(day);

  // 注意することがない日は、何も表示しない
  if (alerts.length === 0) return null;

  return (
    <section aria-label="天気の注意情報">
      <ul className="flex flex-col gap-2">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${LEVEL_STYLES[alert.level]}`}
          >
            <span className="text-lg leading-5" aria-hidden="true">
              {alert.emoji}
            </span>
            <span>{alert.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
