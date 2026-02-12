import { NextResponse } from "next/server";

interface NewsItem {
	title: string;
	description: string;
	url: string;
	source: string;
	publishedAt: string;
	image?: string;
}

const keywordTranslations: { [key: string]: string } = {
	"stock": "股票",
	"share": "股份",
	"market": "市場",
	"trading": "交易",
	"price": "價格",
	"rally": "上漲",
	"surge": "飆升",
	"plunge": "暴跌",
	"decline": "下跌",
	"gain": "漲幅",
	"loss": "虧損",
	"investor": "投資者",
	"wall street": "華爾街",
	"earnings": "收益",
	"profit": "利潤",
	"revenue": "收入",
	"forecast": "預測",
	"outlook": "展望",
	"upgrade": "升級",
	"downgrade": "降級",
	"ipo": "首次公開募股",
	"merger": "合併",
	"acquisition": "收購",
	"bankruptcy": "破產",
	"inflation": "通脹",
	"interest rate": "利率",
	"federal reserve": "美聯儲",
	"bull market": "牛市",
	"bear market": "熊市",
	"volatility": "波動性",
	"dividend": "股息",
	"split": "分拆",
	"sector": "行業",
	"tech": "科技",
	"financial": "金融",
	"healthcare": "醫療",
	"energy": "能源",
	"consumer": "消費",
	"industrial": "工業",
	"bull": "牛",
	"bear": "熊",
	"breakout": "突破",
	"support": "支撐",
	"resistance": "阻力",
	"momentum": "動力",
	"sentiment": "情緒",
};

// Simple in-memory translation cache (process-local). TTL configurable via TRANSLATION_TTL_SECONDS.
const translationCache = new Map<string, { translated: string; ts: number }>();
const TRANSLATION_TTL_SECONDS = Number(process.env.TRANSLATION_TTL_SECONDS || 86400); // default 24 hours

async function translateText(text: string): Promise<string> {
	if (!text) return "";
	// check cache first
	const key = text.trim();
	const cached = translationCache.get(key);
	if (cached && Date.now() - cached.ts < TRANSLATION_TTL_SECONDS * 1000) {
		return cached.translated;
	}

	let translated = text;
	try {
		const response = await fetch(
			`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-TW`,
			{ next: { revalidate: 3600 } }
		);
		const data = await response.json();
		if (data.responseStatus === 200 && data.responseData?.translatedText) {
			translated = data.responseData.translatedText;
		}
	} catch (e) {
		// fallback to keyword replacement
		translated = text;
	}

	// keyword substitution fallback (improve readability)
	Object.entries(keywordTranslations).forEach(([en, zh]) => {
		const regex = new RegExp(`\\b${en}\\b`, "gi");
		translated = translated.replace(regex, zh);
	});

	// store in cache
	try {
		translationCache.set(key, { translated, ts: Date.now() });
	} catch {}

	return translated;
}

function getDateString(daysOffset: number): string {
	const date = new Date();
	date.setDate(date.getDate() + daysOffset);
	return date.toISOString().split("T")[0];
}

async function fetchNewsFromFinnhub(symbol: string): Promise<NewsItem[]> {
	try {
		const token = process.env.FINNHUB_API_KEY || "";
		if (!token) return [];
		const response = await fetch(
			`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${getDateString(-7)}&to=${getDateString(0)}&token=${token}`,
			{ next: { revalidate: 3600 } }
		);
		if (!response.ok) return [];
		const articles = await response.json();
		if (!Array.isArray(articles)) return [];
		return articles
			.map((a: any) => ({
				title: a.headline || "",
				description: a.summary || "",
				url: a.url || "",
				source: a.source || "Finnhub",
				publishedAt: a.datetime ? new Date(a.datetime * 1000).toISOString() : new Date().toISOString(),
				image: a.image,
			}))
			.filter((i) => i.title && i.url);
	} catch (e) {
		return [];
	}
}

async function fetchNewsFallback(symbol: string): Promise<NewsItem[]> {
	try {
		return [
			{
				title: `${symbol} 股票最新動向`,
				description: `了解 ${symbol} 股票的最新市場動向和分析`,
				url: `https://finance.yahoo.com/quote/${symbol}`,
				source: "Yahoo Finance",
				publishedAt: new Date().toISOString(),
			},
		];
	} catch {
		return [];
	}
}

const PAGE_SIZE = 5;

async function fetchNews(symbol: string, page = 1, source?: string): Promise<NewsItem[]> {
	if (!symbol) return [];

	const pageNum = Number.isFinite(Number(page)) && Number(page) > 0 ? Math.max(1, Number(page)) : 1;

	// If source explicitly requested as finnhub, use only Finnhub
	if (!source || source === "all" || source === "finnhub") {
		const finnhubAll = await fetchNewsFromFinnhub(symbol);
		if (finnhubAll.length > 0) {
			const start = (pageNum - 1) * PAGE_SIZE;
			return finnhubAll.slice(start, start + PAGE_SIZE);
		}
		if (source === "finnhub") return [];
	}

	// NewsAPI (supports pagination)
	try {
		const response = await fetch(
			`https://newsapi.org/v2/everything?q=${encodeURIComponent(symbol)}&sortBy=publishedAt&language=en&pageSize=${PAGE_SIZE}&page=${pageNum}&searchIn=title,description`,
			{
				headers: {
					Authorization: process.env.NEWS_API_KEY || "",
				},
				next: { revalidate: 3600 },
			}
		);
		if (!response.ok) return await fetchNewsFallback(symbol);
		const data = await response.json();
		const articles = data.articles || [];
		return articles.map((article: any) => ({
			title: article.title,
			description: article.description || "",
			url: article.url,
			source: article.source?.name || "Unknown",
			publishedAt: article.publishedAt,
			image: article.urlToImage,
		}));
	} catch (e) {
		return await fetchNewsFallback(symbol);
	}
}

export async function GET(req: Request) {
	const symbol = new URL(req.url).searchParams.get("symbol")?.toUpperCase().trim();
	if (!symbol) {
		return NextResponse.json({ error: "請提供股票代號" }, { status: 400 });
	}
	try {
		const params = new URL(req.url).searchParams;
		const pageParam = params.get("page") || "1";
		const sourceParam = params.get("source") || "all";
		const news = await fetchNews(symbol, Number(pageParam), sourceParam);
		const translated = await Promise.all(
			news.map(async (item) => {
				const titleZh = await translateText(item.title || "");
				const descZh = await translateText(item.description || "");
				return { ...item, titleZh, descriptionZh: descZh };
			})
		);
		return NextResponse.json(translated);
	} catch (err) {
		return NextResponse.json({ error: "無法取得新聞資訊" }, { status: 500 });
	}
}

