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

const DEFAULT_SYMBOLS = ["NVDA", "AMD", "TSLA", "INTC"];

export default function Home() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);

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
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
          >
            查詢
          </button>
          <button
            type="button"
            onClick={resetToDefault}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          >
            預設
          </button>
        </form>

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

        <p className="mt-8 text-slate-500 text-xs text-center">
          資料來源：Yahoo Finance · 每分鐘更新 · 僅供參考
        </p>
      </div>
    </main>
  );
}
