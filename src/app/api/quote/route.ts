import { NextRequest, NextResponse } from "next/server";

const SYMBOLS = ["NVDA", "AMD", "TSLA", "INTC"];

async function fetchQuote(symbol: string) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
    {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StockApp/1.0)" },
      next: { revalidate: 0 },
    }
  );
  const data = await res.json();
  const chart = data?.chart?.result?.[0];
  if (!chart) return null;

  const meta = chart.meta || {};
  const quote = chart.indicators?.quote?.[0] || {};
  const closes = quote.close || [];
  const prevClose = meta.previousClose ?? closes[closes.length - 1];
  const current = meta.regularMarketPrice ?? closes[closes.length - 1] ?? prevClose;
  const change = current - prevClose;
  const changePercent = prevClose ? (change / prevClose) * 100 : 0;

  return {
    symbol,
    name: meta.shortName || symbol,
    price: Math.round(current * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    previousClose: prevClose,
  };
}

export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get("symbol")?.toUpperCase().trim();
  const list = param
    ? param.split(",").map((s) => s.trim()).filter((s) => s.length <= 6)
    : SYMBOLS;
  const symbols = list.length > 0 ? list : SYMBOLS;

  try {
    const results = await Promise.all(
      symbols.map(async (s) => {
        try {
          return await fetchQuote(s);
        } catch {
          return null;
        }
      })
    );
    return NextResponse.json(results.filter(Boolean));
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "無法取得股價" },
      { status: 500 }
    );
  }
}
