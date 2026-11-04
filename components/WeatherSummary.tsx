// 選んだ日の天気（気温・天気・湿度・降水確率）を大きく表示するカードです。

import type { CurrentWeather, DayForecast } from "@/lib/types";
import { formatDateJa, formatTemp, getWeatherEmoji } from "@/lib/weatherUtils";

type Props = {
  cityName: string;
  day: DayForecast;
  current: CurrentWeather | null; // 今日を選んでいるときだけ「現在の天気」を渡す
};

export default function WeatherSummary({ cityName, day, current }: Props) {
  const isToday = current !== null;

  // 今日なら現在の値、それ以外の日はその日の予報の値を表示する
  const icon = current?.icon ?? day.icon;
  const description = current?.description ?? day.description;
  const humidity = current?.humidity ?? day.humidity;

  return (
    <section className="rounded-2xl bg-white p-6 shadow-md">
      <p className="text-sm text-gray-500">
        {cityName}・{formatDateJa(day.date)}
        {isToday && "（今日）"}
      </p>

      <div className="mt-2 flex items-center gap-4">
        <span className="text-6xl" aria-hidden="true">
          {getWeatherEmoji(icon)}
        </span>
        <div>
          {current ? (
            <>
              <p className="text-xs text-gray-500">現在の気温</p>
              <p className="text-5xl font-bold text-gray-800">
                {formatTemp(current.temp)}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">この日の予報</p>
          )}
          <p className="mt-1 text-lg text-gray-700">{description}</p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InfoItem label="最高気温" value={formatTemp(day.tempMax)} color="text-red-500" />
        <InfoItem label="最低気温" value={formatTemp(day.tempMin)} color="text-blue-500" />
        <InfoItem label="湿度" value={`${humidity}%`} color="text-teal-600" />
        <InfoItem label="降水確率" value={`${day.pop}%`} color="text-sky-600" />
      </dl>
    </section>
  );
}

/** 「最高気温 18°」のような小さな項目 */
function InfoItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-sky-50 p-3 text-center">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className={`mt-1 text-2xl font-semibold ${color}`}>{value}</dd>
    </div>
  );
}
