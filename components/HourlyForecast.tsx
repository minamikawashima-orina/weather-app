// 選んだ日の「3時間ごとの予報」を横スクロールで表示します。

import type { HourlyForecast as HourlyForecastType } from "@/lib/types";
import { formatTemp, getWeatherEmoji } from "@/lib/weatherUtils";

type Props = {
  hours: HourlyForecastType[];
};

export default function HourlyForecast({ hours }: Props) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-md sm:p-6">
      <h2 className="mb-3 text-lg font-bold text-gray-800">🕒 3時間ごとの予報</h2>

      {hours.length === 0 ? (
        <p className="text-sm text-gray-500">今日の残りの時間帯の予報はありません。</p>
      ) : (
        // 横にスクロールできるリスト（スマホでも見やすいように）
        <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {hours.map((hour) => (
            <li
              key={hour.time}
              className="flex min-w-20 shrink-0 flex-col items-center rounded-xl bg-sky-50 px-3 py-3 text-center"
            >
              <span className="text-sm font-semibold text-gray-600">{hour.time}</span>
              <span className="my-1 text-2xl" aria-hidden="true">
                {getWeatherEmoji(hour.icon)}
              </span>
              <span className="text-lg font-semibold text-gray-800">
                {formatTemp(hour.temp)}
              </span>
              <span className="text-xs text-gray-500">{hour.description}</span>
              <span className="mt-1 text-xs text-sky-600">☔ {hour.pop}%</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
