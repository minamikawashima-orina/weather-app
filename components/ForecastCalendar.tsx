// 5日間の予報をカレンダー形式で表示します。
// 予報がある日付をタップすると、その日の予報に切り替わります。

import type { DayForecast } from "@/lib/types";
import { formatTemp, getWeatherEmoji } from "@/lib/weatherUtils";

type Props = {
  days: DayForecast[];
  selectedDate: string;
  today: string;
  onSelect: (date: string) => void;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function ForecastCalendar({
  days,
  selectedDate,
  today,
  onSelect,
}: Props) {
  const dates = buildCalendarDates(days[0].date, days[days.length - 1].date);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-md sm:p-6">
      <h2 className="mb-3 text-lg font-bold text-gray-800">📅 5日間の予報</h2>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {/* 曜日の見出し */}
        {WEEKDAYS.map((weekday, index) => (
          <div
            key={weekday}
            className={`pb-1 text-center text-xs font-semibold ${
              index === 0 ? "text-red-500" : index === 6 ? "text-blue-500" : "text-gray-500"
            }`}
          >
            {weekday}
          </div>
        ))}

        {/* 日付のマス */}
        {dates.map((date) => {
          const day = days.find((d) => d.date === date);
          const dayNumber = Number(date.slice(8, 10));
          const month = Number(date.slice(5, 7));
          // 月の最初の日と、カレンダーの最初のマスには「11/1」のように月も表示する
          const label = dayNumber === 1 || date === dates[0] ? `${month}/${dayNumber}` : `${dayNumber}`;

          // 予報がない日は、押せないグレーのマスにする
          if (!day) {
            return (
              <div
                key={date}
                className="flex aspect-square flex-col items-center justify-start rounded-lg p-1 text-xs text-gray-300 sm:aspect-auto sm:min-h-24"
              >
                {label}
              </div>
            );
          }

          const isSelected = date === selectedDate;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-pressed={isSelected}
              className={`flex aspect-square flex-col items-center justify-start rounded-lg p-1 text-xs transition-colors sm:aspect-auto sm:min-h-24 sm:p-2 ${
                isSelected
                  ? "bg-sky-600 text-white shadow"
                  : "bg-sky-50 text-gray-700 hover:bg-sky-100"
              }`}
            >
              <span className="font-semibold">
                {label}
                {date === today && <span className="hidden sm:inline">（今日）</span>}
              </span>
              <span className="text-xl sm:text-2xl" aria-hidden="true">
                {getWeatherEmoji(day.icon)}
              </span>
              {/* スマホでは場所が狭いので、気温は少し大きい画面でだけ表示 */}
              <span className="hidden sm:block">
                <span className={isSelected ? "text-white" : "text-red-500"}>
                  {formatTemp(day.tempMax)}
                </span>
                {" / "}
                <span className={isSelected ? "text-white" : "text-blue-500"}>
                  {formatTemp(day.tempMin)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-gray-500">
        日付をタップすると、その日の予報に切り替わります。
      </p>
    </section>
  );
}

/**
 * 予報の最初の日〜最後の日を含む「週」を、日曜〜土曜で埋めた日付の一覧を作ります。
 * 例: 水曜〜月曜の予報 → その週の日曜から、次の週の土曜までの14日分
 */
function buildCalendarDates(firstDate: string, lastDate: string): string[] {
  const start = new Date(`${firstDate}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay()); // その週の日曜日に戻す

  const end = new Date(`${lastDate}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay())); // その週の土曜日まで進める

  const dates: string[] = [];
  for (const d = start; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}
