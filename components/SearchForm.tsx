"use client";

// 都市名を入力して検索するフォームです。

import { useState } from "react";

type Props = {
  onSearch: (city: string) => void; // 検索ボタンが押されたときに呼ばれる
  loading: boolean; // 読み込み中はボタンを押せないようにする
};

export default function SearchForm({ onSearch, loading }: Props) {
  const [city, setCity] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); // ページの再読み込みを防ぐ
    const trimmed = city.trim();
    if (trimmed === "") return;
    onSearch(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={city}
        onChange={(event) => setCity(event.target.value)}
        placeholder="都市名を入力（例: Osaka, London）"
        aria-label="都市名"
        className="min-w-0 flex-1 rounded-xl border border-sky-200 bg-white px-4 py-3 text-base text-gray-800 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
      />
      <button
        type="submit"
        disabled={loading || city.trim() === ""}
        className="shrink-0 rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
      >
        {loading ? "検索中…" : "検索"}
      </button>
    </form>
  );
}
