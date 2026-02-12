"use client";

import { useState, useEffect, useCallback } from "react";

type Quote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
};

type NewsItem = {
  title: string;
  titleZh?: string;
  description?: string;
  descriptionZh?: string;
  url: string;
  source: string;
  publishedAt: string;
  image?: string;
};

const DEFAULT_SYMBOLS = ["NVDA", "AMD", "TSLA", "INTC"];

export default function Home() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [showNews, setShowNews] = useState(true);
    const [monitored, setMonitored] = useState<string[]>(() => {
      try {
        const raw = localStorage.getItem("monitoredSymbols");
        return raw ? JSON.parse(raw) : DEFAULT_SYMBOLS;
      } catch {
        return DEFAULT_SYMBOLS;
      }
    });
    const [marketOpen, setMarketOpen] = useState(false);
    const addMonitored = (s: string) => {
      const sym = s.trim().toUpperCase();
      if (!sym) return;
      setMonitored((prev) => {
        if (prev.includes(sym)) return prev;
        const next = [sym, ...prev].slice(0, 20);
        try { localStorage.setItem("monitoredSymbols", JSON.stringify(next)); } catch {}
        return next;
      });
    };
    const removeMonitored = (s: string) => {
      setMonitored((prev) => {
        const next = prev.filter((p) => p !== s);
        try { localStorage.setItem("monitoredSymbols", JSON.stringify(next)); } catch {}
        return next;
      });
    };

  const [newsSource, setNewsSource] = useState<"all" | "finnhub" | "newsapi">("all");
  const [newsPage, setNewsPage] = useState(1);
  const PAGE_SIZE = 5;
  const [selectedSymbol, setSelectedSymbol] = useState(DEFAULT_SYMBOLS[0] || "");

  const fetchNews = useCallback(async (symbol: string, page = 1, source: string = "all") => {
    setNewsLoading(true);
    setSelectedSymbol(symbol);
    setNewsPage(page);
    try {
      const res = await fetch(`/api/news?symbol=${encodeURIComponent(symbol)}&page=${page}&source=${source}`);
      const data = await res.json();
      setNews(Array.isArray(data) ? data : []);
      setShowNews(true);
    } catch (err) {
      console.error(err);
      setNews([]);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  const fetchQuotes = useCallback(async (symbolList: string[]) => {
    if (symbolList.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/quote?symbol=${encodeURIComponent(symbolList.join(","))}`
      );
      const data = await res.json();
      setQuotes(Array.isArray(data) ? data : []);
    } catch {
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function isUsMarketOpenNow() {
    try {
      const str = new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false });
      const d = new Date(str);
      const day = d.getDay(); // 0 Sun - 6 Sat
      const hh = d.getHours();
      const mm = d.getMinutes();
      // Market hours 9:30 - 16:00 ET, Mon-Fri
      if (day === 0 || day === 6) return false;
      if (hh < 9) return false;
      if (hh === 9 && mm < 30) return false;
      if (hh > 16) return false;
      if (hh === 16 && mm > 0) return false;
      return true;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    fetchQuotes(symbols);
    const t = setInterval(() => fetchQuotes(symbols), 60000);
    return () => clearInterval(t);
  }, [symbols, fetchQuotes]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const s = input.trim().toUpperCase();
    if (s) {
      setSymbols([s]);
      setInput("");
    } else {
      setSymbols(DEFAULT_SYMBOLS);
    }
  };

  const resetToDefault = () => {
    setSymbols(DEFAULT_SYMBOLS);
    setInput("");
  };

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">股票儀表板</h1>
        <p className="text-slate-400 text-sm mb-6">即時美股報價</p>

        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="輸入股票代號 (例: AAPL)"
            className="flex-1 px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
          >
            查詢
          </button>
          <button
            type="button"
            onClick={resetToDefault}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-slate-300 transition-colors"
          >
            預設
          </button>
        </form>

        {/* Monitored panel */}
        <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-slate-800 to-slate-700 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-200">監控股票</h3>
            <div className="text-xs text-slate-400">市場狀態: {marketOpen ? "營業中 (實時)" : "非營業時間"}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {monitored.map((m) => (
              <div key={m} className="flex items-center gap-2 bg-gray-800/60 px-3 py-1 rounded-full">
                <button onClick={() => { setSymbols([m]); fetchQuotes([m]); fetchNews(m,1,newsSource); setSelectedSymbol(m); }} className="text-sm font-medium text-slate-100 hover:underline">{m}</button>
                <button onClick={() => removeMonitored(m)} className="text-xs text-red-400 px-2">移除</button>
              </div>
            ))}
            <button onClick={() => { addMonitored(selectedSymbol || DEFAULT_SYMBOLS[0]); }} className="ml-auto px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm">將目前股票加入監控</button>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-400">載入中...</p>
        ) : quotes.length === 0 ? (
          <p className="text-slate-400">查無資料，請檢查股票代號</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {quotes.map((q) => (
              <div
                key={q.symbol}
                className="p-5 rounded-xl bg-slate-800/80 border border-slate-700"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="font-bold text-lg">{q.name || q.symbol}</h2>
                    <p className="text-slate-400 text-sm">{q.symbol}</p>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      q.change > 0
                        ? "text-green-400"
                        : q.change < 0
                        ? "text-red-400"
                        : "text-slate-400"
                    }`}
                  >
                    {q.change > 0 ? "+" : ""}
                    {q.changePercent}%
                  </span>
                </div>
                <p className="text-2xl font-bold mt-2">
                  ${q.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p
                  className={`text-sm ${
                    q.change > 0 ? "text-green-400" : q.change < 0 ? "text-red-400" : "text-slate-400"
                  }`}
                >
                  {q.change > 0 ? "+" : ""}
                  {q.change.toFixed(2)} ({q.changePercent > 0 ? "+" : ""}
                  {q.changePercent.toFixed(2)}%)
                </p>
              </div>
            ))}
          </div>
        )}

        {showNews && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedSymbol} 股票新聞 (近7天)</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setNewsSource("all"); fetchNews(selectedSymbol || DEFAULT_SYMBOLS[0], 1, "all"); }}
                  className={`px-3 py-1 rounded-lg text-sm ${newsSource === "all" ? "bg-indigo-600 text-white" : "bg-gray-700 text-slate-300"}`}
                >全部</button>
                <button
                  onClick={() => { setNewsSource("finnhub"); fetchNews(selectedSymbol || DEFAULT_SYMBOLS[0], 1, "finnhub"); }}
                  className={`px-3 py-1 rounded-lg text-sm ${newsSource === "finnhub" ? "bg-indigo-600 text-white" : "bg-gray-700 text-slate-300"}`}
                >Finnhub</button>
                <button
                  onClick={() => { setNewsSource("newsapi"); fetchNews(selectedSymbol || DEFAULT_SYMBOLS[0], 1, "newsapi"); }}
                  className={`px-3 py-1 rounded-lg text-sm ${newsSource === "newsapi" ? "bg-indigo-600 text-white" : "bg-gray-700 text-slate-300"}`}
                >NewsAPI</button>
                <button onClick={() => setShowNews(false)} className="px-3 py-1 text-sm rounded-lg bg-gray-700 text-slate-300">關閉</button>
              </div>
            </div>

            {newsLoading ? (
              <p className="text-slate-400">載入新聞中...</p>
            ) : news.length === 0 ? (
              <p className="text-slate-400">暫無新聞資訊</p>
            ) : (
              <div className="space-y-4">
                {news.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-gray-800/60 border border-gray-700">
                    {item.image && <img src={item.image} alt={item.title} className="w-full h-40 object-cover rounded mb-3" />}
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-base text-white">{item.title}</h3>
                      <span className="text-xs bg-gray-700 px-2 py-1 rounded text-slate-300">{item.source}</span>
                    </div>
                    <p className="text-slate-300 text-sm mb-2">{item.description}</p>
                    <details className="mb-2">
                      <summary className="cursor-pointer text-indigo-400 text-sm">查看中文翻譯</summary>
                      <div className="mt-2 p-3 bg-gray-700 rounded">
                        <p className="text-slate-100 text-sm font-semibold">標題</p>
                        <p className="text-slate-200 text-sm mb-2">{item.titleZh || "-"}</p>
                        <p className="text-slate-100 text-sm font-semibold">摘要</p>
                        <p className="text-slate-200 text-sm">{item.descriptionZh || "-"}</p>
                      </div>
                    </details>
                    <p className="text-xs text-slate-500 mb-2">{new Date(item.publishedAt).toLocaleString("zh-TW")}</p>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-block px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm">閱讀全文 →</a>
                  </div>
                ))}

                <div className="flex justify-between items-center mt-3">
                  <button disabled={newsPage <= 1} onClick={() => { if (newsPage > 1) fetchNews(selectedSymbol, newsPage - 1, newsSource); }} className="px-3 py-2 rounded bg-gray-700 text-slate-300 disabled:opacity-50">上一頁</button>
                  <div className="text-sm text-slate-400">第 {newsPage} 頁</div>
                  <button disabled={news.length < PAGE_SIZE} onClick={() => { if (news.length >= PAGE_SIZE) fetchNews(selectedSymbol, newsPage + 1, newsSource); }} className="px-3 py-2 rounded bg-gray-700 text-slate-300 disabled:opacity-50">下一頁</button>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="mt-8 text-slate-500 text-xs text-center">
          資料來源：Yahoo Finance · Finnhub · NewsAPI · 僅供參考
        </p>
      </div>
    </main>
  );
}
