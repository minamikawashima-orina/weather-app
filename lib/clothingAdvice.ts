// 気温や天気から「おすすめの服装」を決めるルールをまとめたファイルです。
// 画面の表示は components/ClothingAdvice.tsx が担当し、
// このファイルは「どんな服装をすすめるか」だけを決めます。

import type { CurrentWeather, DayForecast } from "@/lib/types";

/** 服装アドバイスの結果 */
export type ClothingAdvice = {
  baseTemp: number; // 判断に使った気温（℃）
  baseLabel: string; // その気温が何か（例: "現在の気温", "最高気温"）
  emoji: string; // 服装の絵文字
  title: string; // 服装の名前（例: "長袖シャツ"）
  description: string; // 服装の説明
  tips: string[]; // 追加のアドバイス（傘・脱ぎ着しやすい服など）
};

/** 気温ごとの服装（上から順に調べ、最初に当てはまったものを使う） */
const CLOTHING_LEVELS = [
  {
    minTemp: 25, // 25℃以上
    emoji: "👕",
    title: "半袖",
    description: "半袖Tシャツなど、通気性のよい涼しい服装がおすすめです。",
  },
  {
    minTemp: 20, // 20〜24℃
    emoji: "👔",
    title: "長袖シャツ",
    description: "長袖シャツ1枚で過ごしやすい気温です。薄手の羽織りがあると安心です。",
  },
  {
    minTemp: 16, // 16〜19℃
    emoji: "🧶",
    title: "カーディガン",
    description: "長袖の上に、カーディガンや薄手のジャケットを羽織りましょう。",
  },
  {
    minTemp: 12, // 12〜15℃
    emoji: "🧥",
    title: "ジャケット・セーター",
    description: "セーターやトレンチコートなど、少し厚手の服装がおすすめです。",
  },
  {
    minTemp: 8, // 8〜11℃
    emoji: "🧥",
    title: "コート",
    description: "コートが必要な寒さです。ニットなど暖かい服を合わせましょう。",
  },
  {
    minTemp: -Infinity, // 7℃以下（どんなに低い気温でもここに当てはまる）
    emoji: "🧣",
    title: "ダウンコート",
    description: "ダウンコートにマフラーや手袋など、しっかり防寒しましょう。",
  },
];

const UMBRELLA_POP = 50; // 降水確率がこの値（%）以上なら傘をすすめる
const LAYERING_TEMP_GAP = 10; // 最高と最低の差がこの値（℃）以上なら脱ぎ着しやすい服をすすめる

/**
 * 選んだ日の予報から、服装アドバイスを作ります。
 * @param day 選んだ日の予報
 * @param current 今日を選んでいるときだけ「現在の天気」、それ以外は null
 */
export function getClothingAdvice(
  day: DayForecast,
  current: CurrentWeather | null,
): ClothingAdvice {
  // 今日なら「現在の気温」、ほかの日は日中の目安として「最高気温」で判断する
  const baseTemp = current ? current.temp : day.tempMax;
  const baseLabel = current ? "現在の気温" : "最高気温";

  // 気温に合う服装を探す（四捨五入した気温で比べ、画面の表示とずれないようにする）
  const roundedTemp = Math.round(baseTemp);
  const level =
    CLOTHING_LEVELS.find((item) => roundedTemp >= item.minTemp) ??
    CLOTHING_LEVELS[CLOTHING_LEVELS.length - 1];

  // 追加のアドバイス
  const tips: string[] = [];

  if (day.pop >= UMBRELLA_POP) {
    tips.push(`☂️ 降水確率${day.pop}%。傘を持って出かけましょう。`);
  }

  const tempGap = day.tempMax - day.tempMin;
  if (tempGap >= LAYERING_TEMP_GAP) {
    tips.push(
      `🔄 気温差が${Math.round(tempGap)}℃あります。脱ぎ着しやすい服で調節しましょう。`,
    );
  }

  return {
    baseTemp,
    baseLabel,
    emoji: level.emoji,
    title: level.title,
    description: level.description,
    tips,
  };
}
