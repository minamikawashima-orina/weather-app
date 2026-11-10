"use client";

// 天気予報アプリの本体です。
// 「検索フォーム」「選んだ日の天気」「カレンダー」「3時間ごとの予報」を組み合わせて表示します。
// ※ "use client" は、ボタン操作などブラウザ側で動く機能を使うための宣言です。

import { useEffect, useRef, useState } from "react";
import type { WeatherData, WeatherError } from "@/lib/types";
import SearchForm from "./SearchForm";
import WeatherSummary from "./WeatherSummary";
import ForecastCalendar from "./ForecastCalendar";
import HourlyForecast from "./HourlyForecast";
import WeatherAlerts from "./WeatherAlerts";
import ClothingAdvice from "./ClothingAdvice";
import FavoriteCities from "./FavoriteCities";

const DEFAULT_CITY = "Tokyo"; // 最初に表示する都市

/** 結果は「成功（data）」か「失敗（error）」のどちらか */
type FetchResult = { data: WeatherData } | { error: string };

/**
 * 自分のアプリの API Route（/api/weather）から天気を取得します。
 * ※ OpenWeather に直接アクセスしないので、APIキーはブラウザに出ません。
 */
async function fetchWeather(city: string): Promise<FetchResult> {
  try {
    const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
    const json: WeatherData | WeatherError = await res.json();

    if ("error" in json) {
      return { error: json.error };
    }
    return { data: json };
  } catch {
    return { error: "通信に失敗しました。インターネット接続を確認してください。" };
  }
}

export default function WeatherApp() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  // 今表示している天気を検索したときの文字（お気に入り登録で使う。例: "大阪"）
  const [searchedQuery, setSearchedQuery] = useState("");

  // 何回目のリクエストかを覚えておき、古い結果で画面が上書きされないようにする
  const requestId = useRef(0);

  /** 取得結果を画面の状態に反映する */
  function applyResult(result: FetchResult, id: number, query: string) {
    if (id !== requestId.current) return; // 新しい検索が始まっていたら無視
    if ("error" in result) {
      setError(result.error);
    } else {
      setWeather(result.data);
      setSearchedQuery(query);
      setSelectedDate(result.data.today); // 検索したら「今日」を選んだ状態にする
      setError("");
    }
    setLoading(false);
  }

  // 最初に画面が表示されたときに、東京の天気を取得する
  useEffect(() => {
    const id = ++requestId.current;
    fetchWeather(DEFAULT_CITY).then((result) => applyResult(result, id, DEFAULT_CITY));
  }, []);

  // 検索ボタン、またはお気に入りの都市が押されたとき
  function handleSearch(city: string) {
    const id = ++requestId.current;
    setLoading(true);
    fetchWeather(city).then((result) => applyResult(result, id, city));
  }

  const selectedDay = weather?.days.find((day) => day.date === selectedDate);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:py-10">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-sky-800">🌤️ 天気予報アプリ</h1>
        <p className="mt-1 text-sm text-gray-600">都市名を入力して天気を調べよう</p>
      </header>

      <SearchForm onSearch={handleSearch} loading={loading} />

      {/* お気に入り都市（☆登録ボタンと一覧） */}
      <FavoriteCities
        currentCity={
          weather
            ? { name: weather.city.name, country: weather.city.country, query: searchedQuery }
            : null
        }
        onSelect={handleSearch}
      />

      {/* エラーメッセージ */}
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          ⚠️ {error}
        </p>
      )}

      {/* 初回の読み込み中 */}
      {loading && !weather && (
        <p className="py-10 text-center text-gray-500">天気情報を読み込み中…</p>
      )}

      {/* 天気の表示（検索中は少し薄くする） */}
      {weather && selectedDay && (
        <div className={`flex flex-col gap-4 transition-opacity ${loading ? "opacity-50" : ""}`}>
          {/* 天気に合わせた注意メッセージ（選んだ日に連動して切り替わる） */}
          <WeatherAlerts day={selectedDay} />
          <WeatherSummary
            cityName={`${weather.city.name}（${weather.city.country}）`}
            day={selectedDay}
            current={selectedDay.date === weather.today ? weather.current : null}
          />
          {/* 選んだ日の気温に合わせた服装アドバイス（選んだ日に連動して切り替わる） */}
          <ClothingAdvice
            day={selectedDay}
            current={selectedDay.date === weather.today ? weather.current : null}
          />
          <ForecastCalendar
            days={weather.days}
            selectedDate={selectedDate}
            today={weather.today}
            onSelect={setSelectedDate}
          />
          <HourlyForecast hours={selectedDay.hours} />
        </div>
      )}

      <footer className="pt-2 text-center text-xs text-gray-400">
        天気データ提供: OpenWeather
      </footer>
    </div>
  );
}
