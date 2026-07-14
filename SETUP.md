# Atlas 部署教學（廣東話 Step-by-Step SOP）

> 💡 **懶人玩法**：直接將成份 SETUP.md 掉俾你部機嘅 Claude Code，話俾佢聽「跟住呢份 SOP 幫我部署 Atlas」，佢就會一步步同你行。中途要你自己做嘅嘢（開帳號、copy key）佢會停低等你。

Atlas 係一個「內容靈感雷達」dashboard：抓 X / Threads / IG 啲爆 post 入自己個資料庫，慢慢揀邊條值得拍。全部用免費 tier 都起到。

---

## Step 0：裝好工具（一次過）

需要：[Node.js](https://nodejs.org) v20+ 同 pnpm。

```bash
node -v          # 冇就去 nodejs.org 裝 LTS
npm install -g pnpm
```

## Step 1：攞 code + 試行 mock mode

```bash
git clone https://github.com/edwardaitechhk-lang/atlas-template.git
cd atlas-template
pnpm install
pnpm dev
```

開 `http://localhost:3000` — 冇 set 任何嘢都會見到個 dashboard（mock 數據）。見到就代表 code 冇問題，可以繼續。

## Step 2：開 Supabase（免費資料庫）

1. 去 [supabase.com](https://supabase.com) 用 GitHub 登入，撳 **New project**（免費 plan 夠用）
2. 起好之後，左邊揀 **SQL Editor** → **New query**
3. 開你 local 個 `supabase/cloud-setup.sql`，成份 copy 晒貼入去 → 撳 **Run**
4. 見到 success 就起晒所有 table + 預設分類

## Step 3：填 env

```bash
cp env.example .env.local
```

去 Supabase → **Settings → API**，copy 三個值填入 `.env.local`：

| env var | 喺邊度搵 |
|---------|---------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | `anon` `public` key |
| `SUPABASE_SERVICE_ROLE` | `service_role` key（⚠️ 呢條係 admin key，唔好俾人、唔好 commit） |

驗證 + 重開：

```bash
pnpm check:env
pnpm dev
```

而家個 app 已經係真資料庫 — 去 Settings 頁加減分類、喺 Library 貼 link 試 capture。

## Step 4（可選）：開 scraping

想自動抓 X / Threads / IG post：

1. 去 [apify.com](https://apify.com) 開免費帳號 → **Settings → API tokens** copy 條 token
2. `.env.local` 填 `APIFY_TOKEN=`
3. 喺 app 撳 refresh 就會開始抓（Apify 免費 tier 每月有 quota，抓得密會用完）

## Step 5（可選）：開 AI 功能

想要逐字稿 / 自動分類 / 生成腳本大綱：

1. 去 [aistudio.google.com](https://aistudio.google.com) 撳 **Get API key**（免費）
2. `.env.local` 填 `GEMINI_API_KEY=`

冇呢條 key app 照行，只係 AI 功能會禮貌噉話你知未開。

## Step 6（可選）：上線 Vercel

1. 將你個 folder push 上自己 GitHub（**唔好 commit `.env.local`** — 已經喺 .gitignore）
2. 去 [vercel.com](https://vercel.com) 用 GitHub 登入 → **Add New → Project** → 揀你個 repo → Deploy
3. Vercel → **Settings → Environment Variables**，將 `.env.local` 啲值逐條加入去
4. **必須加 `ATLAS_PASSWORD=`（自己作個密碼）** — 唔係全世界都入到你個 dashboard
5. `NEXT_PUBLIC_APP_URL` 改做你個 Vercel 網址
6. 如果想 radar 定時自動抓：加 `CRON_SECRET=`（求其一串長 random 字），再喺 `vercel.json` 加 cron 指向 `/api/cron/radar`

## 搞掂 ✅

| 你想… | 去邊 |
|-------|------|
| 睇靈感 feed | `/inspiration` |
| AI 新聞雷達 | `/radar` |
| 貼 link 收藏 | `/library` |
| 改分類 / 追蹤帳號 | `/settings` |
| Mark 咗嘅 idea | `/marked` |

## 常見問題

- **個 app 得 mock 數據？** → `.env.local` 三條 Supabase 冇填齊，行 `pnpm check:env` 睇下缺邊條
- **Scrape 冇反應？** → 睇下 `APIFY_TOKEN` 有冇填、Apify quota 用晒未
- **Vercel deploy 完入唔到？** → 記得 Vercel env 加咗 `ATLAS_PASSWORD`，用嗰個密碼 login
- **想 reset 資料庫？** → Supabase SQL Editor 再行一次 `cloud-setup.sql`（idempotent，唔會爆錯）
