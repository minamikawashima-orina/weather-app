// トップページ（http://localhost:3000 を開いたときに表示される画面）
// 天気アプリの本体は components/WeatherApp.tsx にあります。

import WeatherApp from "@/components/WeatherApp";

export default function Home() {
  return (
    <main className="min-h-screen bg-linear-to-b from-sky-100 to-sky-50">
      <WeatherApp />
    </main>
  );
}
