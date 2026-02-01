# 股票儀表板（簡易版）

即時查詢美股報價，預設顯示 NVDA、AMD、TSLA、INTC。

## 功能

- 預設顯示 4 支科技股
- 可輸入股票代號查詢單一股票
- 每分鐘自動更新
- 無需 API Key

## 本地執行

```bash
npm install
npm run dev
```

開啟 http://localhost:3000

## 部署至 Vercel

1. 將專案推送到 GitHub
2. 至 [vercel.com](https://vercel.com) 登入
3. Import 此專案 → Deploy

或使用 CLI：`npx vercel`

## 技術

- Next.js 14
- Tailwind CSS
- Yahoo Finance（公開 API）
