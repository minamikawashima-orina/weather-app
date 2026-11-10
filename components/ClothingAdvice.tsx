// 選んだ日の気温や天気に合わせて「おすすめの服装」を表示するカードです。
// どの服装をすすめるかは lib/clothingAdvice.ts で決めています。

import type { CurrentWeather, DayForecast } from "@/lib/types";
import { getClothingAdvice } from "@/lib/clothingAdvice";
import { formatTemp } from "@/lib/weatherUtils";

type Props = {
  day: DayForecast; // 選択中の日の予報
  current: CurrentWeather | null; // 今日を選んでいるときだけ「現在の天気」を渡す
};

export default function ClothingAdvice({ day, current }: Props) {
  const advice = getClothingAdvice(day, current);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-md sm:p-6">
      <h2 className="mb-3 text-lg font-bold text-gray-800">👗 服装アドバイス</h2>

      <div className="flex items-center gap-4 rounded-xl bg-sky-50 p-4">
        <span className="text-5xl" aria-hidden="true">
          {advice.emoji}
        </span>
        <div>
          <p className="text-xs text-gray-500">
            {advice.baseLabel} {formatTemp(advice.baseTemp)} のおすすめ
          </p>
          <p className="text-xl font-bold text-gray-800">{advice.title}</p>
          <p className="mt-1 text-sm text-gray-700">{advice.description}</p>
        </div>
      </div>

      {/* 傘・脱ぎ着しやすい服などの追加アドバイス（当てはまるときだけ表示） */}
      {advice.tips.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {advice.tips.map((tip) => (
            <li key={tip} className="rounded-xl bg-sky-50 px-4 py-2 text-sm text-gray-700">
              {tip}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
