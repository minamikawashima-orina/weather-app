"use client";

// お気に入り都市の「☆登録ボタン」と「お気に入り一覧」を表示します。
// 保存や読み込みの処理は lib/favorites.ts にまとめています。

import {
  MAX_FAVORITES,
  addFavorite,
  isSameCity,
  removeFavorite,
  useFavorites,
  type FavoriteCity,
} from "@/lib/favorites";

type Props = {
  currentCity: FavoriteCity | null; // 今表示している都市（まだ表示していなければ null）
  onSelect: (query: string) => void; // 一覧の都市が押されたときに呼ばれる（その都市を検索する）
};

export default function FavoriteCities({ currentCity, onSelect }: Props) {
  const favorites = useFavorites();

  // 今表示している都市が、すでに登録済みかどうか
  const isRegistered =
    currentCity !== null && favorites.some((city) => isSameCity(city, currentCity));
  const isFull = favorites.length >= MAX_FAVORITES;

  /** ☆ / ★ ボタンが押されたとき：未登録なら登録、登録済みなら解除 */
  function handleToggle() {
    if (!currentCity) return;
    if (isRegistered) {
      removeFavorite(currentCity);
    } else {
      addFavorite(currentCity);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-md sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-gray-800">
          ⭐ お気に入り都市
          <span className="ml-2 text-sm font-normal text-gray-500">
            {favorites.length}/{MAX_FAVORITES}
          </span>
        </h2>

        {/* 今表示している都市の登録・解除ボタン */}
        {currentCity && (
          <button
            type="button"
            onClick={handleToggle}
            disabled={!isRegistered && isFull}
            aria-pressed={isRegistered}
            title={isRegistered ? "もう一度押すと登録を解除します" : undefined}
            className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 ${
              isRegistered
                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                : "bg-sky-600 text-white hover:bg-sky-700"
            }`}
          >
            {isRegistered ? "★ 登録済み" : `☆ ${currentCity.name}を登録`}
          </button>
        )}
      </div>

      {/* 上限に達しているときの案内 */}
      {currentCity && !isRegistered && isFull && (
        <p className="mb-3 text-xs text-amber-700">
          お気に入りは{MAX_FAVORITES}都市まで登録できます。追加するには、一覧から都市を削除してください。
        </p>
      )}

      {favorites.length === 0 ? (
        <p className="text-sm text-gray-500">
          ☆ボタンを押すと、今表示している都市をお気に入りに登録できます。
        </p>
      ) : (
        // お気に入り一覧（スマホでは折り返して並ぶ）
        <ul className="flex flex-wrap gap-2">
          {favorites.map((city) => {
            const isCurrent = currentCity !== null && isSameCity(city, currentCity);
            return (
              <li
                key={`${city.name}-${city.country}`}
                className={`flex items-center overflow-hidden rounded-full text-sm shadow-sm ${
                  isCurrent ? "bg-sky-600 text-white" : "bg-sky-50 text-gray-700"
                }`}
              >
                {/* 都市名ボタン：押すとその都市の天気に切り替わる */}
                <button
                  type="button"
                  onClick={() => onSelect(city.query)}
                  aria-current={isCurrent ? "true" : undefined}
                  className={`py-2 pl-4 pr-2 font-semibold transition-colors ${
                    isCurrent ? "" : "hover:bg-sky-100"
                  }`}
                >
                  {city.name}
                </button>
                {/* 削除ボタン */}
                <button
                  type="button"
                  onClick={() => removeFavorite(city)}
                  aria-label={`${city.name}をお気に入りから削除`}
                  className={`px-3 py-2 transition-colors ${
                    isCurrent ? "hover:bg-sky-700" : "text-gray-400 hover:bg-sky-100 hover:text-red-500"
                  }`}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
