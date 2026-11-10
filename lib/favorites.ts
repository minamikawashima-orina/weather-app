// お気に入り都市を、ブラウザの localStorage に保存・読み込みするためのファイルです。
//
// ★ポイント（Next.js の SSR 対策）
// Next.js は、ページをまずサーバー側で作ります。サーバーには localStorage がないため、
// 直接読もうとするとエラーや「サーバーとブラウザで表示が違う」問題（hydration エラー）が起きます。
// そこで React の useSyncExternalStore を使い、
//   ・サーバー側 → 「お気に入りは空」として表示
//   ・ブラウザ側 → 表示が準備できたあとに localStorage を読んで表示
// という形にしています。

import { useSyncExternalStore } from "react";

/** お気に入り都市 1件分 */
export type FavoriteCity = {
  name: string; // 画面に表示する都市名（例: "大阪市"）
  country: string; // 国コード（例: "JP"）
  query: string; // その都市を表示したときに検索した文字（例: "大阪"）。クリック時にこれで再検索する
};

export const MAX_FAVORITES = 5; // 登録できる都市の最大数

const STORAGE_KEY = "weather-app:favorites"; // localStorage に保存するときの名前
const EMPTY: FavoriteCity[] = []; // 「お気に入りなし」を表す空の配列（毎回同じものを使う）

// ---- 保存データの読み書き ----

// localStorage が使えない環境（プライベートブラウズなど）のための予備の保存場所
let memoryRaw: string | null = null;

/** localStorage から保存データ（文字列）を読む */
function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return memoryRaw;
  }
}

/** 保存データ（文字列）を、お気に入りの配列に変換する。壊れたデータは無視する */
function parse(raw: string | null): FavoriteCity[] {
  if (!raw) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return EMPTY;
    return data
      .filter(
        (item): item is FavoriteCity =>
          typeof item?.name === "string" &&
          typeof item?.country === "string" &&
          typeof item?.query === "string",
      )
      .slice(0, MAX_FAVORITES);
  } catch {
    return EMPTY;
  }
}

// 前回読んだデータを覚えておく（中身が変わっていなければ同じ配列を返すため）
let cachedRaw: string | null = null;
let cachedList: FavoriteCity[] = EMPTY;

/** 今のお気に入り一覧を返す（ブラウザ用） */
function getSnapshot(): FavoriteCity[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = parse(raw);
  }
  return cachedList;
}

/** サーバー側で表示するときのお気に入り一覧（いつも空） */
function getServerSnapshot(): FavoriteCity[] {
  return EMPTY;
}

// ---- 変更の通知 ----

// お気に入りが変わったときに知らせる相手（画面）の一覧
const listeners = new Set<() => void>();

/** お気に入りの変更を見張る。別のタブで変更された場合（storage イベント）にも反応する */
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** お気に入りを保存して、画面に「変わったよ」と知らせる */
function save(list: FavoriteCity[]) {
  const raw = JSON.stringify(list);
  memoryRaw = raw;
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // 保存できない環境では、ページを開いている間だけ覚えておく
  }
  listeners.forEach((listener) => listener());
}

// ---- 画面から使う関数 ----

/** 同じ都市かどうか（都市名と国コードで比べる） */
export function isSameCity(a: { name: string; country: string }, b: { name: string; country: string }) {
  return a.name === b.name && a.country === b.country;
}

/** お気に入りに追加する（すでに登録済み・上限に達している場合は何もしない） */
export function addFavorite(city: FavoriteCity) {
  const current = getSnapshot();
  if (current.some((item) => isSameCity(item, city))) return;
  if (current.length >= MAX_FAVORITES) return;
  save([...current, city]);
}

/** お気に入りから削除する */
export function removeFavorite(city: { name: string; country: string }) {
  save(getSnapshot().filter((item) => !isSameCity(item, city)));
}

/**
 * お気に入り一覧を使うための React のフック。
 * お気に入りが変わると、これを使っている画面が自動で再表示されます。
 */
export function useFavorites(): FavoriteCity[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
