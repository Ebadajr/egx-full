"""
Thndr News Aggregator — multi-source RSS/HTML → Groq analysis → frontend + HTML export
POST /run         kick off pipeline (returns job_id immediately)
GET  /status/{id} poll job progress
GET  /api/articles filtered JSON feed for the frontend
GET  /            SPA frontend
"""
from __future__ import annotations
import os, re, json, html, sqlite3, base64, hashlib, logging, pathlib, datetime as dt, csv, io
from urllib.parse import urlparse, urljoin
import time, threading, uuid
from concurrent.futures import ThreadPoolExecutor

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import feedparser
import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, Page
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ---------- config ----------
WINDOW_HOURS    = int(os.getenv("WINDOW_HOURS", "26"))
GROQ_API_KEY      = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL        = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GEMINI_API_KEY    = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL      = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
CEREBRAS_API_KEY  = os.getenv("CEREBRAS_API_KEY", "csk-kcxfjwjk3w5ec344yr8vf4mkcf2ernw4rjwcpytret255j5x")
CEREBRAS_MODEL    = os.getenv("CEREBRAS_MODEL", "gpt-oss-120b")
DB_PATH         = os.getenv("DB_PATH", "./news.db")
OUT_DIR         = pathlib.Path(os.getenv("OUT_DIR", "./out"));    OUT_DIR.mkdir(exist_ok=True)
IMG_DIR         = pathlib.Path("static/img");                     IMG_DIR.mkdir(parents=True, exist_ok=True)
HTTP_TIMEOUT    = int(os.getenv("HTTP_TIMEOUT", "15"))
ARTICLE_TIMEOUT = 8

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")

FEEDS = [
    {
        "url":   os.getenv("RSS_FEED", "https://news.google.com/rss/search?q=site:asharqbusiness.com&hl=ar&gl=EG&ceid=EG:ar"),
        "label": os.getenv("SOURCE_LABEL", "Asharq Business"),
        "is_gnews": True,
    },
    {"url": "https://www.alborsaanews.com/feed",             "label": "Al Borsa News",   "is_gnews": False},
    {"url": "https://www.arabfinance.com/en/rss/rssbycat/2", "label": "Arab Finance",    "is_gnews": False},
    {"url": "https://aawsat.com/feed/economy",               "label": "Asharq Al-Awsat", "is_gnews": False},
    # Google News RSS for Mubasher (reliable; resolves via browser like Asharq Business)
    {
        "url":   "https://news.google.com/rss/search?q=site:mubasher.info+EGX+مصر&hl=ar&gl=EG&ceid=EG:ar",
        "label": "Mubasher",
        "is_gnews": True,
    },
    # HTML scrapers — no RSS available
    {"url": "https://www.zawya.com/en/mena",  "label": "Zawya",          "is_gnews": False, "scraper": "zawya"},
    {"url": "https://amwalalghad.com/",        "label": "Amwal Al Ghad",  "is_gnews": False, "scraper": "amwal"},
    # Macroeconomic — CBE rate decisions, MPC meetings, Egyptian economy
    {
        "url":   "https://news.google.com/rss/search?q=%22البنك+المركزي+المصري%22+OR+%22لجنة+السياسة+النقدية%22&hl=ar&gl=EG&ceid=EG:ar",
        "label": "CBE Arabic",
        "is_gnews": True,
    },
    {
        "url":   "https://news.google.com/rss/search?q=%22central+bank+of+egypt%22+OR+%22CBE+rate%22+OR+%22MPC+Egypt%22&hl=en&gl=EG&ceid=EG:en",
        "label": "CBE English",
        "is_gnews": True,
    },
    # Egyptian public holidays & macro calendar via Google News
    {
        "url":   "https://news.google.com/rss/search?q=%22Egyptian+holiday%22+OR+%22Egypt+inflation%22+OR+%22Egypt+GDP%22+OR+%22Egypt+IMF%22&hl=en&gl=EG&ceid=EG:en",
        "label": "Egypt Macro",
        "is_gnews": True,
    },
    # EGX Official — corporate disclosures, announcements and press releases from the
    # Egyptian Exchange itself. EGX.com.eg blocks direct crawlers, so we use Google
    # News as a proxy; Google's index picks up egx.com.eg pages and resolves to the
    # real article URL via Playwright. A second Arabic query captures Arabic disclosures.
    {
        "url":   "https://news.google.com/rss/search?q=site:egx.com.eg&hl=en&gl=EG&ceid=EG:en",
        "label": "EGX Official",
        "is_gnews": True,
        "is_egx_official": True,
    },
    {
        "url":   "https://news.google.com/rss/search?q=site:egx.com.eg&hl=ar&gl=EG&ceid=EG:ar",
        "label": "EGX Official AR",
        "is_gnews": True,
        "is_egx_official": True,
    },
    # Mubasher EGX disclosures — Mubasher republishes all official EGX corporate action
    # filings (earnings, dividends, board meetings) in near-real-time in both languages.
    {
        "url":   "https://news.google.com/rss/search?q=site:mubasher.info+%22EGX%22+%22إفصاح%22&hl=ar&gl=EG&ceid=EG:ar",
        "label": "Mubasher Disclosures",
        "is_gnews": True,
        "is_egx_official": True,
    },
]

# Static macroeconomic calendar: CBE MPC meeting dates & Egyptian public holidays
# Updated manually each year; the /api/macro-events endpoint exposes this data.
MACRO_EVENTS: list[dict] = [
    # CBE Monetary Policy Committee meetings 2025
    {"date": "2025-02-20", "type": "CBE Meeting", "title": "CBE MPC Rate Decision", "title_ar": "اجتماع لجنة السياسة النقدية للبنك المركزي المصري", "description": "Monetary Policy Committee interest rate decision"},
    {"date": "2025-04-17", "type": "CBE Meeting", "title": "CBE MPC Rate Decision", "title_ar": "اجتماع لجنة السياسة النقدية للبنك المركزي المصري", "description": "Monetary Policy Committee interest rate decision"},
    {"date": "2025-06-19", "type": "CBE Meeting", "title": "CBE MPC Rate Decision", "title_ar": "اجتماع لجنة السياسة النقدية للبنك المركزي المصري", "description": "Monetary Policy Committee interest rate decision"},
    {"date": "2025-08-21", "type": "CBE Meeting", "title": "CBE MPC Rate Decision", "title_ar": "اجتماع لجنة السياسة النقدية للبنك المركزي المصري", "description": "Monetary Policy Committee interest rate decision"},
    {"date": "2025-10-23", "type": "CBE Meeting", "title": "CBE MPC Rate Decision", "title_ar": "اجتماع لجنة السياسة النقدية للبنك المركزي المصري", "description": "Monetary Policy Committee interest rate decision"},
    {"date": "2025-12-18", "type": "CBE Meeting", "title": "CBE MPC Rate Decision", "title_ar": "اجتماع لجنة السياسة النقدية للبنك المركزي المصري", "description": "Monetary Policy Committee interest rate decision"},
    # CBE MPC meetings 2026
    {"date": "2026-02-19", "type": "CBE Meeting", "title": "CBE MPC Rate Decision", "title_ar": "اجتماع لجنة السياسة النقدية للبنك المركزي المصري", "description": "Monetary Policy Committee interest rate decision"},
    {"date": "2026-04-16", "type": "CBE Meeting", "title": "CBE MPC Rate Decision", "title_ar": "اجتماع لجنة السياسة النقدية للبنك المركزي المصري", "description": "Monetary Policy Committee interest rate decision"},
    {"date": "2026-06-18", "type": "CBE Meeting", "title": "CBE MPC Rate Decision", "title_ar": "اجتماع لجنة السياسة النقدية للبنك المركزي المصري", "description": "Monetary Policy Committee interest rate decision"},
    {"date": "2026-08-20", "type": "CBE Meeting", "title": "CBE MPC Rate Decision", "title_ar": "اجتماع لجنة السياسة النقدية للبنك المركزي المصري", "description": "Monetary Policy Committee interest rate decision"},
    {"date": "2026-10-22", "type": "CBE Meeting", "title": "CBE MPC Rate Decision", "title_ar": "اجتماع لجنة السياسة النقدية للبنك المركزي المصري", "description": "Monetary Policy Committee interest rate decision"},
    {"date": "2026-12-17", "type": "CBE Meeting", "title": "CBE MPC Rate Decision", "title_ar": "اجتماع لجنة السياسة النقدية للبنك المركزي المصري", "description": "Monetary Policy Committee interest rate decision"},
    # Egyptian public holidays 2025
    {"date": "2025-01-07",  "type": "Holiday", "title": "Coptic Christmas",         "title_ar": "عيد الميلاد المجيد (القبطي)",     "description": "Coptic Orthodox Christmas"},
    {"date": "2025-01-25",  "type": "Holiday", "title": "January 25 Revolution Day","title_ar": "عيد ثورة 25 يناير",               "description": "January 25 Revolution anniversary"},
    {"date": "2025-03-31",  "type": "Holiday", "title": "Eid Al-Fitr (start)",       "title_ar": "عيد الفطر المبارك",               "description": "End of Ramadan — 3-day holiday (dates may shift by moon sighting)"},
    {"date": "2025-04-25",  "type": "Holiday", "title": "Sinai Liberation Day",      "title_ar": "عيد تحرير سيناء",                "description": "Liberation of Sinai anniversary"},
    {"date": "2025-05-01",  "type": "Holiday", "title": "Labour Day",                "title_ar": "عيد العمال",                     "description": "International Workers Day"},
    {"date": "2025-06-05",  "type": "Holiday", "title": "Eid Al-Adha (start)",       "title_ar": "عيد الأضحى المبارك",             "description": "Feast of Sacrifice — 3-day holiday"},
    {"date": "2025-06-25",  "type": "Holiday", "title": "Islamic New Year",          "title_ar": "رأس السنة الهجرية",              "description": "Islamic New Year (1 Muharram)"},
    {"date": "2025-07-23",  "type": "Holiday", "title": "Revolution Day",            "title_ar": "عيد ثورة 23 يوليو",              "description": "1952 Revolution anniversary"},
    {"date": "2025-08-02",  "type": "Holiday", "title": "Prophet's Birthday",        "title_ar": "المولد النبوي الشريف",            "description": "Birthday of the Prophet Muhammad"},
    {"date": "2025-10-06",  "type": "Holiday", "title": "Armed Forces Day",          "title_ar": "عيد القوات المسلحة",             "description": "October War anniversary"},
    # Egyptian public holidays 2026 (approximate; Islamic dates shift ~11 days/year)
    {"date": "2026-01-07",  "type": "Holiday", "title": "Coptic Christmas",         "title_ar": "عيد الميلاد المجيد (القبطي)",     "description": "Coptic Orthodox Christmas"},
    {"date": "2026-01-25",  "type": "Holiday", "title": "January 25 Revolution Day","title_ar": "عيد ثورة 25 يناير",               "description": "January 25 Revolution anniversary"},
    {"date": "2026-03-20",  "type": "Holiday", "title": "Eid Al-Fitr (start)",       "title_ar": "عيد الفطر المبارك",               "description": "End of Ramadan — 3-day holiday"},
    {"date": "2026-04-25",  "type": "Holiday", "title": "Sinai Liberation Day",      "title_ar": "عيد تحرير سيناء",                "description": "Liberation of Sinai anniversary"},
    {"date": "2026-05-01",  "type": "Holiday", "title": "Labour Day",                "title_ar": "عيد العمال",                     "description": "International Workers Day"},
    {"date": "2026-05-27",  "type": "Holiday", "title": "Eid Al-Adha (start)",       "title_ar": "عيد الأضحى المبارك",             "description": "Feast of Sacrifice — 3-day holiday"},
    {"date": "2026-07-23",  "type": "Holiday", "title": "Revolution Day",            "title_ar": "عيد ثورة 23 يوليو",              "description": "1952 Revolution anniversary"},
    {"date": "2026-10-06",  "type": "Holiday", "title": "Armed Forces Day",          "title_ar": "عيد القوات المسلحة",             "description": "October War anniversary"},
]

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("news")

# ---------- db ----------
def db():
    c = sqlite3.connect(DB_PATH)
    c.execute("""CREATE TABLE IF NOT EXISTS seen (
        key TEXT PRIMARY KEY,
        link TEXT, guid TEXT, title TEXT, source TEXT,
        image_url TEXT, image_path TEXT,
        summary TEXT, sentiment TEXT, tickers TEXT,
        published_at TEXT, added_at TEXT
    )""")
    cols = {r[1] for r in c.execute("PRAGMA table_info(seen)")}
    for col in ("image_url","image_path","summary","sentiment","tickers","source",
                "published_at","ai_status","category","dup_group","ai_provider",
                "title_en","title_ar","summary_ar","scope","confidence","is_egx_official"):
        if col not in cols:
            c.execute(f"ALTER TABLE seen ADD COLUMN {col} TEXT")
    c.execute("CREATE INDEX IF NOT EXISTS idx_seen_link ON seen(link)")
    # Category migrations
    c.execute("UPDATE seen SET category='Economic' WHERE category='Revenue'")
    c.execute("UPDATE seen SET category='Board Meeting' WHERE category='Meeting'")
    c.execute("UPDATE seen SET category='Cash Dividends' WHERE category='Dividends'")
    c.execute("""CREATE TABLE IF NOT EXISTS companies (
        ticker TEXT PRIMARY KEY,
        name_en TEXT,
        name_ar TEXT,
        sector TEXT
    )""")
    c.commit()
    _seed_companies(c)
    return c

_COMPANIES_SEEDED = False
def _seed_companies(c: sqlite3.Connection):
    global _COMPANIES_SEEDED
    if _COMPANIES_SEEDED: return
    _COMPANIES_SEEDED = True
    if c.execute("SELECT COUNT(*) FROM companies").fetchone()[0] > 0:
        return
    companies = [
        ("COMI",  "Commercial International Bank",      "البنك التجاري الدولي",        "Banking"),
        ("EFIH",  "EFG Hermes",                         "هيرميس",                      "Investment"),
        ("ESRS",  "Ezz Steel",                          "عز للصلب",                    "Steel"),
        ("SWDY",  "Elsewedy Electric",                  "السويدي إلكتريك",             "Utilities"),
        ("FWRY",  "Fawry",                              "فوري",                        "FinTech"),
        ("TMGH",  "Talaat Moustafa Group",              "طلعت مصطفى",                  "Real Estate"),
        ("PHDC",  "Palm Hills Developments",            "بالم هيلز",                   "Real Estate"),
        ("OCDI",  "Orascom Construction",               "أوراسكوم للإنشاء",            "Construction"),
        ("ORWE",  "Orascom Investment Holding",         "أوراسكوم القابضة",            "Investment"),
        ("JUFO",  "Juhayna Food Industries",            "جهينة",                       "Food"),
        ("GTHE",  "Ghabbour Auto",                      "غبور",                        "Automotive"),
        ("ETEL",  "Telecom Egypt",                      "المصرية للاتصالات",           "Telecom"),
        ("ABUK",  "Abou Kir Fertilizers",               "أبو قير للأسمدة",             "Chemicals"),
        ("SKPC",  "Sidi Kerir Petrochemicals",          "سيدي كرير",                   "Petrochemicals"),
        ("MNHD",  "Madinet Nasr Housing",               "مدينة نصر للإسكان",           "Real Estate"),
        ("POUL",  "Cairo Poultry",                      "القاهرة للدواجن",             "Food"),
        ("EMFD",  "Emaar Misr",                         "إعمار مصر",                   "Real Estate"),
        ("SDCO",  "SODIC",                              "سوديك",                       "Real Estate"),
        ("VFCO",  "Vodafone Egypt",                     "فودافون مصر",                 "Telecom"),
        ("MTEL",  "Orange Egypt",                       "أورنج مصر",                   "Telecom"),
        ("ADIB",  "Abu Dhabi Islamic Bank Egypt",       "مصرف أبوظبي الإسلامي",       "Banking"),
        ("SCBA",  "Suez Canal Bank",                    "بنك قناة السويس",             "Banking"),
        ("CEOS",  "City Edge Developments",             "سيتي إيدج",                   "Real Estate"),
        ("HRHO",  "Heliopolis Housing",                 "مساكن هليوبوليس",             "Real Estate"),
        ("OTMT",  "Orascom Telecom Media",              "أوراسكوم للاتصالات",          "Telecom"),
        ("AMOC",  "Alexandria Mineral Oils",            "زيوت المعادن الإسكندرية",    "Oil & Gas"),
        ("CLHO",  "Cairo Livestock",                    "القاهرة للمواشي",             "Food"),
        ("EGCH",  "Egyptian Chemical Industries",       "الصناعات الكيماوية المصرية", "Chemicals"),
        ("AFDI",  "Arabian Food Industries",            "العربية للصناعات الغذائية",  "Food"),
        ("MTIE",  "Medical Union Pharmaceuticals",      "الاتحاد للأدوية",             "Pharma"),
        ("ISPH",  "Integrated Diagnostics Holdings",   "آي دي إتش",                   "Healthcare"),
        ("CLHO",  "Cairo Livestock",                    "القاهرة للمواشي",             "Food"),
        ("ACGC",  "Alexandria Containers",              "الإسكندرية للحاويات",        "Logistics"),
        ("EAST",  "Eastern Company",                    "الشركة الشرقية",              "FMCG"),
        ("SPIN",  "Spinning and Weaving",               "الغزل والنسيج",               "Textiles"),
        ("SUCE",  "Suez Cement",                        "إسمنت السويس",               "Cement"),
        ("SINA",  "Sinai Cement",                       "إسمنت سيناء",                "Cement"),
        ("EGTS",  "Egyptian Tourism Resorts",           "منتجعات السياحة المصرية",    "Tourism"),
        ("ALCN",  "Alexandria Commercial & Maritime",   "الإسكندرية للتجارة والملاحة", "Logistics"),
        ("EKHO",  "Egyptian Kuwaiti Holding",           "المصرية الكويتية",            "Investment"),
    ]
    c.executemany("INSERT OR IGNORE INTO companies VALUES (?,?,?,?)", companies)
    c.commit()

def already_seen(conn, key: str) -> bool:
    return conn.execute("SELECT 1 FROM seen WHERE key=?", (key,)).fetchone() is not None

def mark_seen(conn, key, link, guid, title, source="",
              image_url="", image_path="", summary="",
              sentiment="", tickers=None, published_at="", ai_status="ok",
              category="", ai_provider="",
              title_en="", title_ar="", summary_ar="", scope="local",
              confidence="medium", is_egx_official=False):
    conn.execute(
        """INSERT OR IGNORE INTO seen
           (key,link,guid,title,source,image_url,image_path,summary,sentiment,tickers,
            published_at,added_at,ai_status,category,ai_provider,title_en,title_ar,
            summary_ar,scope,confidence,is_egx_official)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (key, link, guid, title, source, image_url, image_path, summary, sentiment,
         json.dumps(tickers or [], ensure_ascii=False),
         published_at, dt.datetime.now(dt.timezone.utc).isoformat(),
         ai_status, category, ai_provider, title_en, title_ar, summary_ar, scope,
         confidence, "1" if is_egx_official else "0"),
    )
    conn.commit()

# ---------- google news ----------
GNEWS_HOSTS = ("news.google.com", "www.google.com")

def resolve_url_browser(url: str, page: "Page") -> str:
    if not any(h in (urlparse(url).hostname or "") for h in GNEWS_HOSTS):
        return url
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=15000)
        page.wait_for_timeout(3000)
        return page.url
    except Exception as e:
        log.warning("browser url resolve failed: %s", e)
        return url

def scrape_gnews_thumbnails(page: "Page", feed_url: str) -> dict[str, str]:
    try:
        ui_url = feed_url.replace("/rss/search", "/search")
        page.goto(ui_url, wait_until="networkidle", timeout=30000)
        mapping: dict[str, str] = page.evaluate("""
        () => {
            const result = {};
            document.querySelectorAll('img[src^="/api/attachments/"]').forEach(img => {
                const thumb = 'https://news.google.com' + img.getAttribute('src');
                let node = img;
                for (let i = 0; i < 10; i++) {
                    node = node.parentElement;
                    if (!node) break;
                    const links = node.querySelectorAll('a[href*="/read/"]');
                    if (links.length > 0) {
                        const href = links[0].href;
                        const m = href.match(/[/]read[/]([^?#]+)/);
                        if (m) { result[m[1]] = thumb; }
                        break;
                    }
                }
            });
            return result;
        }
        """)
        log.info("gnews thumbnails: %d", len(mapping))
        return mapping
    except Exception as e:
        log.warning("thumbnail scrape failed: %s", e)
        return {}

# ---------- image ----------
def download_image(img_url: str) -> tuple[str, str]:
    """Download → save to static/img/ → return (local_url, data_uri)."""
    if not img_url:
        return "", ""
    try:
        r = requests.get(img_url, headers={"User-Agent": UA},
                         timeout=HTTP_TIMEOUT, allow_redirects=True)
        r.raise_for_status()
        ct = r.headers.get("content-type", "image/jpeg").split(";")[0].strip()
        if not ct.startswith("image/"):
            return "", ""
        ext = {"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"}.get(ct,"jpg")
        h = hashlib.md5(img_url.encode()).hexdigest()[:16]
        fname = f"{h}.{ext}"
        fpath = IMG_DIR / fname
        if not fpath.exists():
            fpath.write_bytes(r.content)
        b64 = base64.b64encode(r.content).decode("ascii")
        return f"/static/img/{fname}", f"data:{ct};base64,{b64}"
    except Exception as e:
        log.warning("image download failed for %s: %s", img_url, e)
    return "", ""

def fetch_og_image(article_url: str) -> str:
    try:
        r = requests.get(article_url,
                         headers={"User-Agent": UA, "Accept-Language": "ar,en;q=0.8"},
                         timeout=HTTP_TIMEOUT, allow_redirects=True)
        soup = BeautifulSoup(r.text, "html.parser")
        for sel, attr in [
            ('meta[property="og:image"]', "content"),
            ('meta[name="og:image"]', "content"),
            ('meta[property="og:image:url"]', "content"),
            ('meta[name="twitter:image"]', "content"),
            ('meta[property="twitter:image"]', "content"),
            ('link[rel="image_src"]', "href"),
        ]:
            tag = soup.select_one(sel)
            if tag and tag.get(attr):
                val = tag[attr].strip()
                if val and "googleusercontent" not in val and len(val) > 10:
                    return val
        for css in ["article img", "figure img", "main img", ".article img"]:
            img = soup.select_one(css)
            if img and img.get("src"):
                src = img["src"]
                if src.startswith("//"): src = "https:" + src
                if src.startswith("http"): return src
    except Exception as e:
        log.warning("og-image fetch failed for %s: %s", article_url, e)
    return ""

# ---------- article body ----------
def fetch_article_text(url: str) -> tuple[str, str]:
    """Returns (text, published_at_iso). published_at_iso is '' if not found."""
    try:
        r = requests.get(url, headers={"User-Agent": UA, "Accept-Language": "ar,en;q=0.8"},
                         timeout=ARTICLE_TIMEOUT, allow_redirects=True)
        if r.status_code >= 400:
            return "", ""
        soup = BeautifulSoup(r.text, "html.parser")

        # Extract published date from JSON-LD or meta tags
        pub_date = ""
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "")
                if isinstance(data, list): data = data[0] if data else {}
                if "datePublished" in data:
                    pub_date = data["datePublished"]
                    break
            except Exception:
                pass
        if not pub_date:
            el = soup.select_one("meta[property='article:published_time']")
            if el:
                pub_date = el.get("content", "")
        if not pub_date:
            el = soup.select_one("time[datetime]")
            if el:
                pub_date = el.get("datetime", "")

        # Extract article text
        for sel in ["article", "[itemprop='articleBody']", ".article-body", ".post-body",
                    ".entry-content", ".post-content", "main"]:
            el = soup.select_one(sel)
            if el:
                text = el.get_text(" ", strip=True)
                if len(text) > 300:
                    return text[:6000], pub_date
        paras = [p.get_text(" ", strip=True) for p in soup.find_all("p")
                 if len(p.get_text(strip=True)) > 60]
        return " ".join(paras)[:6000], pub_date
    except Exception as e:
        log.warning("article text fetch failed for %s: %s", url, e)
    return "", ""

# ---------- duplicate detection ----------

def _normalize_title(title: str) -> set[str]:
    """Tokenize title for Jaccard similarity — strips Arabic diacritics, punctuation, stopwords."""
    # Remove Arabic diacritics (tashkeel)
    title = re.sub(r"[ً-ٰٟ]", "", title)
    # Lowercase, remove punctuation
    title = re.sub(r"[^\w\s؀-ۿ]", " ", title.lower())
    # Strip common Arabic/English stopwords
    stops = {"the","a","an","and","or","in","of","for","to","is","was","are","were","be",
             "at","on","by","with","من","في","على","مع","إلى","عن","هذا","هذه","التي","الذي",
             "و","أو","لا","ما","كان","كانت","كما","لم","لن","هو","هي"}
    tokens = {w for w in title.split() if w and len(w) > 2 and w not in stops}
    return tokens

def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b: return 0.0
    return len(a & b) / len(a | b)

def run_dedup(conn: sqlite3.Connection, new_keys: list[str]) -> None:
    """Find duplicate articles among newly added articles + last 48h.
    Only groups articles from DIFFERENT sources together.
    Updates dup_group for matched pairs."""
    if not new_keys:
        return
    cutoff = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=48)).isoformat()
    rows = conn.execute(
        "SELECT key, title, source, published_at, added_at FROM seen "
        "WHERE added_at >= ? OR key IN ({})".format(",".join("?" * len(new_keys))),
        [cutoff] + new_keys,
    ).fetchall()

    # Build list of (key, title_tokens, source, pub_dt)
    items = []
    for key, title, source, pub_at, added_at in rows:
        tokens = _normalize_title(title or "")
        ts_str = pub_at or added_at or ""
        try:
            ts = dt.datetime.fromisoformat(ts_str.replace("Z", "+00:00")) if ts_str else None
        except Exception:
            ts = None
        items.append((key, tokens, source or "", ts))

    # Pairwise comparison — O(n²) but n is small (articles in last 48h)
    groups: dict[str, str] = {}  # key -> group_id
    for i in range(len(items)):
        ki, ti, si, tsi = items[i]
        for j in range(i + 1, len(items)):
            kj, tj, sj, tsj = items[j]
            # Only group articles from DIFFERENT sources
            if si == sj:
                continue
            # Skip if already in the same group
            if groups.get(ki) and groups.get(ki) == groups.get(kj):
                continue
            # Time gate: within 48h of each other
            if tsi and tsj and abs((tsi - tsj).total_seconds()) > 172800:
                continue
            score = _jaccard(ti, tj)
            if score >= 0.45:
                # Merge into same group (use the lexicographically smaller key as group id)
                existing_i = groups.get(ki)
                existing_j = groups.get(kj)
                if existing_i and existing_j:
                    # Merge two existing groups: reassign all of j's group to i's group
                    old_gid = existing_j
                    new_gid = existing_i
                    for k in list(groups.keys()):
                        if groups[k] == old_gid:
                            groups[k] = new_gid
                elif existing_i:
                    groups[kj] = existing_i
                elif existing_j:
                    groups[ki] = existing_j
                else:
                    gid = min(ki, kj)
                    groups[ki] = gid
                    groups[kj] = gid

    # Persist — only update articles that have a group (i.e. have at least one cross-source duplicate)
    if not groups:
        return
    from collections import Counter
    group_counts = Counter(groups.values())
    # Extra safety: for each group, verify it contains articles from 2+ different sources
    group_sources: dict[str, set] = {}
    for item in items:
        k, _, s, _ = item
        if k in groups:
            gid = groups[k]
            group_sources.setdefault(gid, set()).add(s)
    valid_groups = {gid for gid, srcs in group_sources.items() if len(srcs) >= 2}
    for key, gid in groups.items():
        if gid in valid_groups and group_counts[gid] >= 2:
            conn.execute("UPDATE seen SET dup_group=? WHERE key=?", (gid, key))
    conn.commit()
    dup_count = len(valid_groups)
    log.info("dedup: %d cross-source groups found among %d articles", dup_count, len(items))


# ---------- EGX ticker whitelist (loaded from CSV) ----------
import csv as _csv_mod

_VALID_TICKERS: set[str] = set()
_TICKER_FALLBACK_MAP: list[tuple[re.Pattern, str]] = []

def _load_egx_csv():
    global _VALID_TICKERS, _TICKER_FALLBACK_MAP
    csv_path = pathlib.Path("EGX Corporate Actions - Stock List.csv")
    if not csv_path.exists():
        log.warning("EGX ticker CSV not found — ticker validation disabled")
        return
    rows = []
    with open(csv_path, newline='', encoding='utf-8') as f:
        for row in _csv_mod.DictReader(f):
            ticker = (row.get('reuterscode') or '').strip().upper()
            if not ticker:
                continue
            _VALID_TICKERS.add(ticker)
            rows.append((ticker, row.get('symbolnamee','').strip(), row.get('symbolnamea','').strip()))

    # Build fallback patterns from company names (skip very short/generic names)
    for ticker, name_en, name_ar in rows:
        parts = []
        if len(name_en) >= 5:
            parts.append(re.escape(name_en))
        if len(name_ar) >= 4:
            parts.append(re.escape(name_ar))
        if parts:
            _TICKER_FALLBACK_MAP.append(
                (re.compile('|'.join(parts), re.I | re.UNICODE), ticker)
            )
    log.info("loaded %d valid EGX tickers from CSV", len(_VALID_TICKERS))

_load_egx_csv()


def fallback_tickers(text: str) -> list[str]:
    found = []
    for pattern, ticker in _TICKER_FALLBACK_MAP:
        if pattern.search(text) and ticker not in found:
            found.append(ticker)
    return found

# ---------- ai analysis (Groq) ----------
SYSTEM_PROMPT = (
    "You are a senior financial analyst at Thndr, Egypt's leading securities brokerage app. "
    "Thndr users are retail and professional investors who depend on your analysis to make informed EGX trading decisions.\n\n"
    "Analyze the article below and respond ONLY with this JSON (no markdown, no code fences):\n"
    "{\n"
    "  \"title_en\": \"Article title in English — translate from Arabic if the original is in Arabic\",\n"
    "  \"title_ar\": \"Article title in Arabic — translate from English if the original is in English\",\n"
    "  \"summary\": \"Write 4 detailed paragraphs in English separated by \\n\\n: "
    "Paragraph 1 — What Happened: A thorough account of the core event, every key fact, figure, date, and entity. "
    "Paragraph 2 — Background & Context: Why this matters to investors, sector backdrop, key players, what led to this. "
    "Paragraph 3 — Key Figures & Details: All specific financial numbers, percentages, deal terms, regulatory details, quotes. "
    "Paragraph 4 — If scope is local: EGX Impact — only name EGX-listed companies explicitly mentioned in the article; "
    "if none are mentioned state 'No EGX-listed company is directly mentioned in this article.' Do NOT invent market connections. "
    "If scope is global: Global Market Context — what this means for international markets and investors broadly, no EGX-specific claims.\",\n"
    "  \"summary_ar\": \"Write the same 4 paragraphs in formal Arabic (MSA) separated by \\n\\n. "
    "CRITICAL: if the source article is in Arabic, write summary_ar DIRECTLY from the Arabic source — do NOT translate from the English summary. "
    "Preserve all proper nouns exactly as they appear in the source (project names, company names, district names, institution names). "
    "Use precise financial terminology: مذكرة تفاهم for MOU, عائد للسهم for EPS, أرباح نقدية for cash dividends, etc.\",\n"
    "  \"sentiment\": \"Positive, Negative, or Neutral (based on market impact)\",\n"
    "  \"tickers\": [\"If scope is local: official EGX ticker symbols only, uppercase Latin, e.g. COMI ESRS TMGH — only for companies explicitly named in the article. If scope is global: always an empty array.\"],\n"
    "  \"category\": \"Exactly one of: Economic | Earnings | Cash Dividends | Stock Dividends | IPO | Board Meeting | Tender Offer | Stock Split | Delisting | CBE Decision | CBE Meeting | Holiday. "
    "CBE Decision = the Central Bank of Egypt's Monetary Policy Committee (MPC) announces an interest rate change (cut, hike, or hold) — this is the highest-priority macro event; always use this category when the article is about a CBE rate decision. "
    "CBE Meeting = a scheduled CBE Monetary Policy Committee meeting date announcement or preview article without a decision yet announced; also use for CBE board meetings and regulatory circulars. "
    "Holiday = articles about Egyptian public holidays (Eid, Coptic Christmas, Revolution Day, Sinai Liberation Day, etc.) or EGX market closure announcements. "
    "Economic = all other macroeconomic events: currency moves, inflation data, GDP, trade balance, IMF/World Bank relations, commodity prices, market indices — use only when CBE Decision / CBE Meeting / Holiday do not apply. "
    "Earnings = quarterly or annual financial results: revenue, net profit/loss, EPS, margins. "
    "Cash Dividends = board declaration of a cash payment to shareholders; includes per-share amount, record date, payment date. "
    "Stock Dividends = distribution of additional shares to existing shareholders instead of cash (bonus shares, rights issues); expressed as a percentage or ratio. "
    "IPO = initial public offerings, new listings on EGX, offering prices, book-building, prospectus announcements. "
    "Board Meeting = corporate board of directors or general assembly meetings (AGM/EGM): approval of financials, election of directors, any formal corporate governance resolution. "
    "Tender Offer = a public offer made directly to shareholders to acquire their shares, whether for cash at a set price (usually at a premium), for shares in another company (stock swap / exchange offer), or a combination of both; includes mandatory and voluntary acquisition offers, share buyback tender offers, and exchange offers regulated by the FRA (الرقابة المالية); always use this category when an article mentions عرض استحواذ، عرض شراء، عرض مبادلة، or FRA/EGX approval of such an offer. "
    "Stock Split = a corporate action that divides existing shares into a larger number of lower-priced shares (e.g. 2-for-1), increasing liquidity without changing total market capitalisation. "
    "Delisting = removal of a company's shares from trading on the EGX, whether voluntary (going private, merger absorption) or involuntary (failure to meet listing requirements, regulatory suspension). "
    "Default to Economic if unclear.\",\n"
    "  \"scope\": \"local if the article is primarily about Egypt, the EGX, Egyptian companies, or Egyptian economic policy; "
    "global if it is primarily about international markets, foreign companies, or non-Egyptian events with only indirect EGX relevance\",\n"
    "  \"confidence\": \"high if every key figure and claim in your summary is directly stated in the source article; "
    "medium if some background context was reasonably inferred from general knowledge; "
    "low if the article was truncated, paywalled, or too short to support the full analysis\"\n"
    "}\n\n"
    "RULES:\n"
    "- Proper nouns (people, companies, projects, districts, institutions) must be preserved exactly as they appear in the source. Never translate or creatively render proper nouns.\n"
    "- summary must be in English. summary_ar must be in Arabic.\n"
    "- tickers must be EGX symbols only — never foreign exchange symbols. Only include a ticker if that company is explicitly named in the article. "
    "If an EGX Company Reference block is provided above the article, use ONLY those verified names and tickers — do not use any other company names.\n"
    "- Do not invent details, market impacts, or company connections not present in the source article.\n"
    "- Never state a specific interest rate, index level, stock price, or percentage unless that EXACT figure appears verbatim in the source article. "
    "If a figure is not in the article, omit it or write 'as reported' without specifying a number.\n"
    "- For Earnings, Cash Dividends, and Board Meeting articles: every figure in paragraph 3 must be a direct quote or direct paraphrase from the article — never inferred from industry norms or historical data.\n"
    "- If the article content appears truncated or under 200 words, state in paragraph 3: 'Full article unavailable — analysis based on available excerpt.' Do not pad with invented detail.\n"
    "- Professional tone. Be specific — no vague filler."
)

TRANSLATE_SYSTEM_PROMPT = (
    "You are a professional Arabic translator specializing in Egyptian financial news. "
    "Translate the title and summary to formal Modern Standard Arabic (MSA). "
    "Preserve all financial figures, ticker symbols (keep uppercase Latin), and key proper nouns. "
    "Keep the same 4-paragraph structure in summary_ar (paragraphs separated by \\n\\n). "
    "Respond ONLY with JSON (no markdown, no code fences):\n"
    "{\"title_ar\":\"<Arabic title>\",\"summary_ar\":\"<Arabic summary, paragraphs separated by \\\\n\\\\n>\"}"
)

TICKER_RE = re.compile(r"^[A-Z]{2,6}(?:\.[A-Z]{2})?$")

def parse_ai_json(raw: str) -> dict:
    s = (raw or "").strip()
    s = re.sub(r"^```(?:json)?", "", s, flags=re.I).strip()
    s = re.sub(r"```$", "", s).strip()
    m = re.search(r"\{[\s\S]*\}", s)
    if m:
        try: return json.loads(m.group(0))
        except Exception: pass
    return {"summary": s, "sentiment": "Neutral", "tickers": []}

_VALID_CATS = {"Economic", "Earnings", "Cash Dividends", "Stock Dividends",
               "IPO", "Board Meeting", "Tender Offer", "Stock Split", "Delisting",
               "CBE Decision", "CBE Meeting", "Holiday"}

def build_company_context(text: str, conn: sqlite3.Connection) -> str:
    """Return a verified EGX company reference block for any tickers found in text.

    Injected into the AI prompt so the model uses verified names/sectors instead
    of relying on potentially stale training data.
    """
    candidates = fallback_tickers(text)
    if not candidates:
        return ""
    placeholders = ",".join("?" * len(candidates))
    rows = conn.execute(
        f"SELECT ticker, name_en, name_ar, sector FROM companies WHERE ticker IN ({placeholders})",
        candidates,
    ).fetchall()
    if not rows:
        return ""
    lines = ["--- EGX Company Reference (verified — use ONLY these names) ---"]
    for ticker, name_en, name_ar, sector in rows:
        lines.append(f"{ticker}: {name_en} | {name_ar} | Sector: {sector}")
    lines.append("--- End of Reference ---")
    return "\n".join(lines)


def ai_analyze(title: str, content: str, source: str = "",
               company_context: str = "") -> dict:
    """
    Returns dict with keys: summary, sentiment, tickers, category, title_en, title_ar,
    confidence, _status, _provider.
    Tries providers in order: Groq 70b → Gemini Flash → Groq 8b-instant.
    A provider is skipped for the rest of the session once it hits a daily cap (retry-after > 60s).
    """
    ctx_block = f"\n{company_context}\n" if company_context else ""
    user_msg = f"Source: {source}\nTitle: {title}\n{ctx_block}\nArticle:\n{content or title}"

    for provider in _provider_chain():
        raw = _call_provider(provider, user_msg, title)
        if raw is None:
            continue  # provider exhausted or errored — try next
        ai = parse_ai_json(raw)
        sentiment = str(ai.get("sentiment") or "Neutral").strip()
        sentiment = ("Positive" if re.search(r"pos", sentiment, re.I) else
                     "Negative" if re.search(r"neg", sentiment, re.I) else "Neutral")
        tickers = ai.get("tickers") or []
        if not isinstance(tickers, list): tickers = [tickers]
        tickers = [t for t in (str(t).upper().strip() for t in tickers)
                   if (_VALID_TICKERS and t in _VALID_TICKERS) or
                      (not _VALID_TICKERS and TICKER_RE.match(t))]
        summary = str(ai.get("summary") or "").strip()
        category = str(ai.get("category") or "Economic").strip()
        # Normalize legacy and shorthand values
        if category == "Revenue":         category = "Economic"
        if category == "Meeting":         category = "Board Meeting"
        if category == "Rate Decision":   category = "CBE Decision"
        if category == "MPC":             category = "CBE Meeting"
        if category == "Central Bank":    category = "CBE Decision"
        if category == "Dividends":  category = "Cash Dividends"
        if category not in _VALID_CATS: category = "Economic"
        title_en = str(ai.get("title_en") or "").strip()
        title_ar = str(ai.get("title_ar") or "").strip()
        scope_raw = str(ai.get("scope") or "").strip().lower()
        scope = "global" if "global" in scope_raw else "local"
        if scope == "global":
            tickers = []
        summary_ar = str(ai.get("summary_ar") or "").strip()
        confidence_raw = str(ai.get("confidence") or "").strip().lower()
        confidence = ("high" if "high" in confidence_raw else
                      "low"  if "low"  in confidence_raw else "medium")
        status = "ok" if summary else "empty"
        if status == "empty":
            log.warning("%s returned empty summary for '%s'", provider, title[:60])
        return {"summary": summary, "summary_ar": summary_ar, "sentiment": sentiment,
                "tickers": tickers, "category": category,
                "title_en": title_en, "title_ar": title_ar,
                "scope": scope, "confidence": confidence,
                "_status": status, "_provider": provider}

    log.error("all providers exhausted for '%s'", title[:60])
    return {"summary": "", "summary_ar": "", "sentiment": "Neutral", "tickers": [],
            "category": "Economic", "title_en": "", "title_ar": "",
            "scope": "local", "confidence": "low",
            "_status": "api_error", "_provider": "none"}


def ai_translate_ar(title_en: str, summary: str) -> dict:
    """Translate title and summary to Arabic. Returns {title_ar, summary_ar} or {}."""
    user_msg = f"Title: {title_en}\n\nSummary:\n{summary}"
    for provider in _provider_chain():
        raw = _call_provider(provider, user_msg, title_en, system_prompt=TRANSLATE_SYSTEM_PROMPT)
        if raw is None:
            continue
        parsed = parse_ai_json(raw)
        title_ar = str(parsed.get("title_ar") or "").strip()
        summary_ar = str(parsed.get("summary_ar") or "").strip()
        if title_ar and summary_ar:
            log.info("translate_ar: provider=%s", provider)
            return {"title_ar": title_ar, "summary_ar": summary_ar}
    return {}


# --- provider internals ---

_exhausted: set[str] = set()   # providers that hit their daily cap this session

# Cerebras: 5 req/min hard limit — enforce ≥15s between calls to stay safe
_cerebras_last_call: float = 0.0
_CEREBRAS_MIN_INTERVAL = 15.0  # seconds

def _provider_chain() -> list[str]:
    chain = []
    if CEREBRAS_API_KEY and "cerebras" not in _exhausted:
        chain.append("cerebras")
    if GEMINI_API_KEY and "gemini" not in _exhausted:
        chain.append("gemini")
    if GROQ_API_KEY:
        if "groq-70b" not in _exhausted:
            chain.append("groq-70b")
        if "groq-8b" not in _exhausted:
            chain.append("groq-8b")
    return chain

def _call_provider(provider: str, user_msg: str, title: str,
                   system_prompt: str = SYSTEM_PROMPT) -> str | None:
    """Call one provider. Returns raw text on success, None if should skip."""
    try:
        if provider == "cerebras":
            return _call_cerebras(user_msg, title, system_prompt)
        if provider.startswith("groq"):
            model = GROQ_MODEL if provider == "groq-70b" else "gemma2-9b-it"
            return _call_groq(model, user_msg, title, provider, system_prompt)
        if provider == "gemini":
            return _call_gemini(user_msg, title, system_prompt)
    except Exception as e:
        log.warning("%s unexpected error: %s", provider, e)
    return None

def _call_groq(model: str, user_msg: str, title: str, provider: str,
               system_prompt: str = SYSTEM_PROMPT) -> str | None:
    backoff = 2
    for attempt in range(4):
        r = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            json={"model": model,
                  "messages": [{"role": "system", "content": system_prompt},
                                {"role": "user",   "content": user_msg}],
                  "response_format": {"type": "json_object"},
                  "temperature": 0.3},
            timeout=30,
        )
        if r.status_code == 429:
            retry_after_hdr = r.headers.get("retry-after")
            retry_after = int(retry_after_hdr) if retry_after_hdr else 0
            if retry_after > 60:
                log.warning("%s daily cap hit (retry-after=%ds) — marking exhausted", provider, retry_after)
                _exhausted.add(provider)
                return None
            # Short-lived 429 — exponential backoff
            wait = max(retry_after, backoff)
            log.warning("%s rate-limited, waiting %ds (attempt %d)", provider, wait, attempt + 1)
            time.sleep(wait)
            backoff = min(backoff * 2, 60)
            continue
        if r.status_code >= 500:
            log.warning("%s server error %d, retrying in %ds", provider, r.status_code, backoff)
            time.sleep(backoff)
            backoff = min(backoff * 2, 60)
            continue
        r.raise_for_status()
        text = r.json()["choices"][0]["message"]["content"]
        if provider in _exhausted:
            _exhausted.discard(provider)
        log.info("provider=%s model=%s", provider, model)
        return text
    return None

def _call_cerebras(user_msg: str, title: str,
                   system_prompt: str = SYSTEM_PROMPT) -> str | None:
    global _cerebras_last_call
    backoff = 2
    for attempt in range(4):
        # Enforce minimum interval to stay within 5 req/min limit
        elapsed = time.time() - _cerebras_last_call
        if elapsed < _CEREBRAS_MIN_INTERVAL:
            time.sleep(_CEREBRAS_MIN_INTERVAL - elapsed)
        r = requests.post(
            "https://api.cerebras.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {CEREBRAS_API_KEY}"},
            json={"model": CEREBRAS_MODEL,
                  "messages": [{"role": "system", "content": system_prompt},
                                {"role": "user",   "content": user_msg}],
                  "response_format": {"type": "json_object"},
                  "temperature": 0.3},
            timeout=60,
        )
        _cerebras_last_call = time.time()
        if r.status_code == 429:
            retry_after_hdr = r.headers.get("retry-after")
            retry_after = int(retry_after_hdr) if retry_after_hdr else 0
            if retry_after > 300:
                log.warning("cerebras daily cap hit — marking exhausted")
                _exhausted.add("cerebras")
                return None
            wait = max(retry_after, backoff, _CEREBRAS_MIN_INTERVAL)
            log.warning("cerebras rate-limited, waiting %ds (attempt %d)", wait, attempt + 1)
            time.sleep(wait)
            backoff = min(backoff * 2, 60)
            continue
        if r.status_code >= 500:
            log.warning("cerebras server error %d, retrying in %ds", r.status_code, backoff)
            time.sleep(backoff)
            backoff = min(backoff * 2, 60)
            continue
        r.raise_for_status()
        text = r.json()["choices"][0]["message"]["content"]
        _exhausted.discard("cerebras")
        log.info("provider=cerebras model=%s", CEREBRAS_MODEL)
        return text
    return None

def _call_gemini(user_msg: str, title: str,
                 system_prompt: str = SYSTEM_PROMPT) -> str | None:
    endpoint = (f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}")
    backoff = 2
    for attempt in range(4):
        r = requests.post(endpoint, json={
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_msg}]}],
            "generationConfig": {"temperature": 0.3},
        }, timeout=60)
        if r.status_code == 429:
            retry_after_hdr = r.headers.get("retry-after")
            retry_after = int(retry_after_hdr) if retry_after_hdr else 0
            if retry_after > 60:
                log.warning("gemini daily cap hit — marking exhausted")
                _exhausted.add("gemini")
                return None
            wait = max(retry_after, backoff)
            log.warning("gemini rate-limited, waiting %ds (attempt %d)", wait, attempt + 1)
            time.sleep(wait)
            backoff = min(backoff * 2, 60)
            continue
        if r.status_code >= 500:
            time.sleep(backoff)
            backoff = min(backoff * 2, 60)
            continue
        r.raise_for_status()
        text = r.json()["candidates"][0]["content"]["parts"][0]["text"]
        log.info("provider=gemini model=%s", GEMINI_MODEL)
        return text
    return None

# ---------- rss ----------
def parse_feed(feed_url: str, source_label: str) -> tuple[list[dict], str]:
    """Returns (items, error_message). error_message is '' on success."""
    feed_error = ""
    try:
        r = requests.get(feed_url, headers={"User-Agent": UA}, timeout=HTTP_TIMEOUT)
        r.raise_for_status()
        f = feedparser.parse(r.content)
    except Exception as e:
        feed_error = str(e)
        log.warning("feed fetch failed (%s): %s", source_label, e)
        try:
            f = feedparser.parse(feed_url)
            if f.entries:
                feed_error = ""   # fallback worked
        except Exception as e2:
            log.warning("feed fallback also failed (%s): %s", source_label, e2)
            return [], f"Feed unreachable: {e}"

    if getattr(f, "bozo", False) and not f.entries:
        feed_error = f"Feed parse error: {getattr(f, 'bozo_exception', 'unknown')}"
        log.warning("feed bozo (%s): %s", source_label, feed_error)

    cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=WINDOW_HOURS)
    out = []
    for e in f.entries:
        title = (e.get("title") or "").strip()
        link  = (e.get("link") or "").strip()
        guid  = (e.get("id") or e.get("guid") or link).strip()
        if not title or not link: continue
        published = None
        if getattr(e, "published_parsed", None):
            published = dt.datetime(*e.published_parsed[:6], tzinfo=dt.timezone.utc)
        if published and published < cutoff: continue
        raw_content = ""
        if e.get("content"): raw_content = e["content"][0].get("value", "")
        elif e.get("summary"): raw_content = e["summary"]
        snippet = BeautifulSoup(raw_content, "html.parser").get_text(" ", strip=True)[:1500]
        out.append({
            "title": title, "link": link, "guid": guid,
            "published_at": published.isoformat() if published else "",
            "content": snippet, "source": source_label,
        })
    log.info("feed [%s]: %d in window", source_label, len(out))
    return out, feed_error


# ---------- html scrapers (sources without RSS) ----------

_SCRAPE_HEADERS = {
    "User-Agent": UA,
    "Accept-Language": "ar,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.9",
    "Referer": "https://www.google.com/",
}

def _cutoff_dt() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=WINDOW_HOURS)

def _parse_iso_date(s: str) -> dt.datetime | None:
    if not s: return None
    try:
        s = s.strip().replace("Z", "+00:00")
        return dt.datetime.fromisoformat(s)
    except Exception:
        return None


def scrape_zawya(feed_url: str, source_label: str) -> tuple[list[dict], str]:
    """Scrape Zawya MENA listing page — h2>a article links."""
    cutoff = _cutoff_dt()
    out: list[dict] = []
    try:
        r = requests.get(feed_url, headers=_SCRAPE_HEADERS, timeout=HTTP_TIMEOUT)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        seen_links: set[str] = set()
        for h2 in soup.find_all("h2"):
            a = h2.find("a")
            if not a: continue
            title = a.get_text(strip=True)
            href  = a.get("href", "")
            if not title or not href or len(title) < 15: continue
            link = href if href.startswith("http") else urljoin(feed_url, href)
            if link in seen_links: continue
            seen_links.add(link)
            # Zawya article slugs contain date as part of URL or we set pub_date=now
            # Actual date is fetched from JSON-LD when article text is fetched
            guid = link
            # Try to extract date from URL slug (last 8 chars are often a date token)
            pub_str = ""
            out.append({
                "title": title, "link": link, "guid": guid,
                "published_at": pub_str,
                "content": "",
                "source": source_label,
            })
            if len(out) >= 60:
                break
        log.info("scraper [%s]: %d articles", source_label, len(out))
        return out, ""
    except Exception as e:
        log.warning("zawya scrape failed: %s", e)
        return [], str(e)


def scrape_amwal(feed_url: str, source_label: str) -> tuple[list[dict], str]:
    """Scrape Amwal Al Ghad homepage — h3>a links with date in URL path."""
    cutoff = _cutoff_dt()
    out: list[dict] = []
    try:
        r = requests.get(feed_url, headers=_SCRAPE_HEADERS, timeout=HTTP_TIMEOUT)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        seen_links: set[str] = set()
        for h3 in soup.find_all("h3"):
            a = h3.find("a")
            if not a: continue
            title = a.get_text(strip=True)
            href  = a.get("href", "")
            if not title or not href or len(title) < 15: continue
            link = href if href.startswith("http") else urljoin(feed_url, href)
            if link in seen_links: continue
            seen_links.add(link)
            # Parse date from URL: /YYYY/MM/DD/
            pub_str = ""
            m = re.search(r"/(\d{4})/(\d{2})/(\d{2})/", link)
            if m:
                try:
                    pub_dt = dt.datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)),
                                        tzinfo=dt.timezone.utc)
                    if pub_dt < cutoff:
                        continue
                    pub_str = pub_dt.isoformat()
                except Exception:
                    pass
            guid = link
            out.append({
                "title": title, "link": link, "guid": guid,
                "published_at": pub_str,
                "content": "",
                "source": source_label,
            })
            if len(out) >= 60:
                break
        log.info("scraper [%s]: %d articles", source_label, len(out))
        return out, ""
    except Exception as e:
        log.warning("amwal scrape failed: %s", e)
        return [], str(e)


_SCRAPERS: dict[str, callable] = {
    "zawya": scrape_zawya,
    "amwal": scrape_amwal,
}

def fetch_source(feed: dict) -> tuple[list[dict], str]:
    """Dispatch to RSS parser or HTML scraper based on feed config."""
    scraper_key = feed.get("scraper")
    if scraper_key and scraper_key in _SCRAPERS:
        return _SCRAPERS[scraper_key](feed["url"], feed["label"])
    return parse_feed(feed["url"], feed["label"])


# ---------- html export ----------
HTML_TMPL = """<!doctype html>
<html><head><meta charset="utf-8"><title>{title}</title>
<style>
 body{{font-family:-apple-system,Segoe UI,sans-serif;background:#0a0a0a;color:#e8e8e8;margin:0;padding:24px}}
 .wrap{{max-width:760px;margin:0 auto}}
 h1{{font-size:20px;color:#fff;border-bottom:1px solid #222;padding-bottom:12px;margin-bottom:24px}}
 .card{{background:#111;border:1px solid #1e1e1e;border-radius:16px;padding:20px;margin-bottom:20px}}
 .src{{color:#666;font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}}
 .ttl{{font-size:19px;font-weight:700;color:#fff;line-height:1.4;margin:0 0 8px}}
 .meta{{color:#555;font-size:12px;margin-bottom:12px}}
 .img{{width:100%;border-radius:10px;margin:12px 0;background:#1a1a1a;aspect-ratio:16/9;object-fit:cover;display:block}}
 .summary p{{font-size:14px;line-height:1.75;color:#ccc;margin:0 0 12px}}
 .summary p:last-child{{margin:0}}
 .row{{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 0}}
 .sent{{font-weight:700;font-size:12px;padding:3px 10px;border-radius:20px}}
 .pos{{background:#0d2b1e;color:#00c48c}} .neg{{background:#2b0d0d;color:#ff4d4d}} .neu{{background:#1a1a1a;color:#888}}
 .tk{{background:#1a1a1a;color:#ccc;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:700}}
 a.link{{color:#4f8bff;font-size:12px;text-decoration:none;display:inline-block;margin-top:10px}}
</style></head><body><div class="wrap">
<h1>{title}</h1>{cards}</div></body></html>"""

def render_card(a: dict) -> str:
    sent = a.get("sentiment","Neutral")
    sent_cls = {"Positive":"pos","Negative":"neg"}.get(sent,"neu")
    img_tag = (f'<img class="img" src="{html.escape(a["imageUrl"])}" alt="">'
               if a.get("imageUrl") else "")
    tickers = "".join(f'<span class="tk">{html.escape(t)}</span>' for t in a.get("tickers",[]))
    paras = "".join(f'<p>{html.escape(p.strip())}</p>'
                    for p in (a.get("summary") or "—").split("\n\n") if p.strip())
    when = a.get("published_at","")
    try:
        d = dt.datetime.fromisoformat(when.replace("Z","+00:00"))
        when = d.strftime("%d %b %Y, %I:%M %p")
    except Exception: pass
    return f"""<div class="card">
<div class="src">{html.escape(a.get("source",""))}</div>
<div class="ttl">{html.escape(a["title"])}</div>
<div class="meta">{html.escape(when)}</div>
{img_tag}
<div class="row"><span class="sent {sent_cls}">{html.escape(sent)}</span>{tickers}</div>
<div class="summary">{paras}</div>
<a class="link" href="{html.escape(a['link'])}" target="_blank">Read full article →</a>
</div>"""

def write_html(articles: list[dict]) -> str:
    day = dt.datetime.now().strftime("%Y-%m-%d")
    title = f"Thndr News Digest — {day}"
    cards = "\n".join(render_card(a) for a in articles) or "<p style='color:#555'>No new articles.</p>"
    path = OUT_DIR / f"news-{day}-{int(dt.datetime.now().timestamp())}.html"
    path.write_text(HTML_TMPL.format(title=title, cards=cards), encoding="utf-8")
    return str(path)

# ---------- pipeline ----------
def pipeline(
    dry_run: bool = False,
    max_articles: int = 0,
    sources: list[str] | None = None,
    cancel: threading.Event | None = None,
    progress: dict | None = None,
) -> dict:
    conn = db()
    active_feeds = [f for f in FEEDS if not sources or f["label"] in sources]

    # Phase 1 — browser: thumbnail scraping + Google News URL resolution
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(user_agent=UA, locale="ar-EG")
        page = ctx.new_page()

        gnews_thumb_maps: dict[str, dict[str, str]] = {}
        for feed in active_feeds:
            if feed.get("is_gnews"):
                gnews_thumb_maps[feed["url"]] = scrape_gnews_thumbnails(page, feed["url"])

        feed_errors: dict[str, str] = {}
        all_new: list[tuple[dict, dict]] = []
        for feed in active_feeds:
            raw, ferr = fetch_source(feed)
            if ferr:
                feed_errors[feed["label"]] = ferr
            new = [it for it in raw if not already_seen(conn, it["guid"] or it["link"])]
            log.info("[%s] %d new", feed["label"], len(new))
            all_new.extend((it, feed) for it in new)

        if max_articles > 0:
            all_new = all_new[:max_articles]
        log.info("total to process: %d", len(all_new))
        if progress is not None:
            progress.update({"phase": "resolving", "total": len(all_new), "done": 0,
                             "feed_errors": feed_errors,
                             "gemini_ok": 0, "gemini_failed": 0, "gemini_empty": 0})

        raw_resolved: list[tuple[dict, dict, str]] = []
        for it, feed in all_new:
            real_link = (resolve_url_browser(it["link"], page)
                         if feed.get("is_gnews") else it["link"])
            raw_resolved.append((it, feed, real_link))

        # Deduplicate by real_link — skip articles whose URL is already in DB
        # or appears multiple times in this batch; cross-source = update dup_group
        seen_batch_links: set[str] = set()
        resolved: list[tuple[dict, dict, str]] = []
        for it, feed, real_link in raw_resolved:
            if real_link in seen_batch_links:
                log.info("batch dup link skipped: %s", real_link[:80])
                continue
            existing = conn.execute(
                "SELECT key, source FROM seen WHERE link=?", (real_link,)
            ).fetchone()
            if existing:
                ex_key, ex_src = existing
                log.info("link already in DB (%s): %s", ex_src, real_link[:80])
                if ex_src and ex_src != it["source"]:
                    # Same article from a different source — mark cross-source dup
                    conn.execute(
                        "UPDATE seen SET dup_group=? WHERE key=? AND (dup_group IS NULL OR dup_group='')",
                        (ex_key, ex_key)
                    )
                    conn.commit()
                continue
            seen_batch_links.add(real_link)
            resolved.append((it, feed, real_link))

        log.info("after link dedup: %d articles to process (was %d)", len(resolved), len(raw_resolved))
        browser.close()

    # Phase 2 — parallel I/O: image + article text
    if progress is not None:
        progress["phase"] = "fetching"

    def fetch_data(item: tuple) -> tuple:
        it, feed, real_link = item
        thumb_map = gnews_thumb_maps.get(feed["url"], {}) if feed.get("is_gnews") else {}
        img_url = thumb_map.get(it["guid"], "") or fetch_og_image(real_link)
        img_path, img_data_uri = download_image(img_url)
        full_text, article_pub_date = fetch_article_text(real_link)
        content = full_text if len(full_text) > len(it["content"]) else it["content"]
        # Use article-page date if scraper didn't have one (e.g. Zawya)
        pub_date = it["published_at"] or article_pub_date
        return img_url, img_path, img_data_uri, content, pub_date

    with ThreadPoolExecutor(max_workers=8) as pool:
        fetched = list(pool.map(fetch_data, resolved))

    # Phase 3 — Gemini analysis (sequential; cancellable)
    if progress is not None:
        progress["phase"] = "analyzing"

    articles = []
    new_keys: list[str] = []
    for (it, feed, real_link), (img_url, img_path, img_data_uri, content, pub_date) in zip(resolved, fetched):
        if cancel and cancel.is_set():
            log.info("job cancelled after %d articles", len(articles))
            break

        key = it["guid"] or it["link"]
        company_ctx = build_company_context(it["title"] + " " + content, conn)
        ai = ai_analyze(it["title"], content, it["source"], company_context=company_ctx)
        if not ai["tickers"]:
            ai["tickers"] = fallback_tickers(it["title"] + " " + it["content"])

        ai_status      = ai.get("_status", "ok")
        ai_provider    = ai.get("_provider", "")
        category       = ai.get("category", "Economic")
        title_en       = ai.get("title_en", "")
        title_ar       = ai.get("title_ar", "")
        scope          = ai.get("scope", "local")
        confidence     = ai.get("confidence", "medium")
        is_egx_official = bool(feed.get("is_egx_official"))
        summary        = ai["summary"]
        if progress is not None:
            if ai_status == "ok":        progress["gemini_ok"]     = progress.get("gemini_ok", 0) + 1
            elif ai_status == "empty":   progress["gemini_empty"]  = progress.get("gemini_empty", 0) + 1
            else:                        progress["gemini_failed"] = progress.get("gemini_failed", 0) + 1

        # summary_ar comes from the main analysis call directly.
        # Only fall back to ai_translate_ar if the model didn't return it.
        summary_ar = ai.get("summary_ar", "")
        if not summary_ar and summary:
            ar = ai_translate_ar(title_en or it["title"], summary)
            if ar:
                title_ar   = ar.get("title_ar") or title_ar
                summary_ar = ar.get("summary_ar", "")

        articles.append({
            "source":          it["source"],
            "title":           it["title"],
            "title_en":        title_en,
            "title_ar":        title_ar,
            "link":            real_link,
            "guid":            it["guid"],
            "published_at":    pub_date,
            "imageUrl":        img_data_uri,
            "image_url":       img_url,
            "image_path":      img_path,
            "summary":         summary,
            "summary_ar":      summary_ar,
            "ai_status":       ai_status,
            "sentiment":       ai["sentiment"],
            "tickers":         ai["tickers"],
            "category":        category,
            "scope":           scope,
            "confidence":      confidence,
            "is_egx_official": is_egx_official,
        })
        if not dry_run:
            mark_seen(conn, key, real_link, it["guid"], it["title"],
                      it["source"], img_url, img_path, summary,
                      ai["sentiment"], ai["tickers"], pub_date, ai_status,
                      category, ai_provider, title_en, title_ar, summary_ar, scope,
                      confidence, is_egx_official)
            new_keys.append(key)
        if progress is not None:
            progress["done"] = len(articles)

    # Post-pipeline: find duplicates across sources
    if not dry_run and new_keys:
        try:
            run_dedup(conn, new_keys)
        except Exception as e:
            log.warning("dedup failed: %s", e)

    html_path = write_html(articles)
    cancelled = bool(cancel and cancel.is_set())
    gemini_stats = {k: progress.get(k, 0) for k in ("gemini_ok","gemini_failed","gemini_empty")} \
                   if progress else {}
    return {"ok": True, "count": len(articles), "total": len(resolved),
            "html_path": html_path, "cancelled": cancelled,
            "feed_errors": feed_errors if 'feed_errors' in dir() else {},
            **gemini_stats}

# ---------- api ----------
app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

_jobs: dict[str, dict] = {}
_cancel_events: dict[str, threading.Event] = {}

class RunBody(BaseModel):
    dry_run: bool = False
    max_articles: int = 0
    sources: list[str] = []   # empty = all sources

def _run_bg(job_id: str, dry_run: bool, max_articles: int, sources: list[str]):
    cancel = threading.Event()
    _cancel_events[job_id] = cancel
    progress: dict = {}
    _jobs[job_id] = {"status": "running", "progress": progress}
    try:
        result = pipeline(dry_run=dry_run, max_articles=max_articles,
                          sources=sources or None, cancel=cancel, progress=progress)
        final_status = "stopped" if result["cancelled"] else "done"
        _jobs[job_id] = {"status": final_status, **result}
        log.info("job %s %s: %d articles", job_id, final_status, result.get("count", 0))
    except Exception as e:
        log.exception("job %s failed", job_id)
        _jobs[job_id] = {"status": "error", "error": str(e)}
    finally:
        _cancel_events.pop(job_id, None)

@app.post("/run")
def run(body: RunBody = RunBody()):
    job_id = uuid.uuid4().hex[:8]
    _jobs[job_id] = {"status": "queued"}
    threading.Thread(target=_run_bg,
                     args=(job_id, body.dry_run, body.max_articles, body.sources),
                     daemon=True).start()
    return {"ok": True, "job_id": job_id, "check": f"/status/{job_id}"}

def _reanalyze_bg(job_id: str):
    cancel = _cancel_events[job_id]
    progress = _jobs[job_id]["progress"]
    conn = db()
    rows = conn.execute(
        "SELECT key, title, summary, source FROM seen WHERE ai_status='api_error' OR (ai_status='empty' AND summary='')"
    ).fetchall()
    progress.update({"phase": "analyzing", "total": len(rows), "done": 0,
                     "gemini_ok": 0, "gemini_failed": 0, "gemini_empty": 0})
    log.info("reanalyze: %d articles to retry", len(rows))
    fixed = 0
    for key, title, content, source in rows:
        if cancel.is_set():
            break
        ai = ai_analyze(title, content or title, source or "")
        ai_status = ai.get("_status", "ok")
        if ai_status == "ok":
            summary    = ai["summary"]
            title_en   = ai.get("title_en", "")
            title_ar   = ai.get("title_ar", "")
            scope      = ai.get("scope", "local")
            summary_ar = ai.get("summary_ar", "")
            if not summary_ar and summary:
                ar = ai_translate_ar(title_en or title, summary)
                if ar:
                    title_ar   = ar.get("title_ar") or title_ar
                    summary_ar = ar.get("summary_ar", "")
            conn.execute(
                "UPDATE seen SET summary=?, sentiment=?, tickers=?, ai_status=?, category=?, "
                "ai_provider=?, title_en=?, title_ar=?, summary_ar=?, scope=? WHERE key=?",
                (summary, ai["sentiment"],
                 json.dumps(ai["tickers"], ensure_ascii=False), ai_status,
                 ai.get("category", "Economic"), ai.get("_provider", ""),
                 title_en, title_ar, summary_ar, scope, key)
            )
            conn.commit()
            fixed += 1
            progress["gemini_ok"] = progress.get("gemini_ok", 0) + 1
        elif ai_status == "empty":
            progress["gemini_empty"] = progress.get("gemini_empty", 0) + 1
        else:
            progress["gemini_failed"] = progress.get("gemini_failed", 0) + 1
        progress["done"] = progress.get("done", 0) + 1
    conn.close()
    cancelled = cancel.is_set()
    _jobs[job_id] = {
        "status": "stopped" if cancelled else "done",
        "count": fixed, "total": len(rows),
        "gemini_ok": progress.get("gemini_ok", 0),
        "gemini_failed": progress.get("gemini_failed", 0),
        "gemini_empty": progress.get("gemini_empty", 0),
        "cancelled": cancelled,
    }
    log.info("reanalyze job %s done: %d/%d fixed", job_id, fixed, len(rows))

@app.post("/reanalyze")
def reanalyze():
    job_id = uuid.uuid4().hex[:8]
    cancel = threading.Event()
    _cancel_events[job_id] = cancel
    _jobs[job_id] = {"status": "running", "progress": {}}
    threading.Thread(target=_reanalyze_bg, args=(job_id,), daemon=True).start()
    return {"ok": True, "job_id": job_id, "check": f"/status/{job_id}"}

@app.post("/stop/{job_id}")
def stop_job(job_id: str):
    ev = _cancel_events.get(job_id)
    if not ev:
        raise HTTPException(404, "job not found or already finished")
    ev.set()
    return {"ok": True, "message": "stop signal sent — finishing current article then saving"}

@app.get("/status/{job_id}")
def status(job_id: str):
    if job_id not in _jobs:
        raise HTTPException(404, "job not found")
    return _jobs[job_id]

@app.get("/status")
def status_all():
    return _jobs

@app.get("/api/feeds")
def api_feeds():
    return [{"label": f["label"]} for f in FEEDS]

@app.get("/health")
def health(): return {"ok": True}

@app.get("/api/export/csv")
def export_csv(source: str = "", sentiment: str = "", search: str = "", scope: str = ""):
    conn = db()
    q = ("SELECT title_en, title_ar, link, image_url, source, sentiment, tickers, "
         "summary, summary_ar, published_at, scope "
         "FROM seen WHERE 1=1")
    params: list = []
    if source:
        q += " AND source=?"; params.append(source)
    if sentiment:
        q += " AND sentiment=?"; params.append(sentiment)
    if scope:
        q += " AND scope=?"; params.append(scope)
    if search:
        q += " AND (title LIKE ? OR summary LIKE ?)"; params += [f"%{search}%", f"%{search}%"]
    q += " ORDER BY COALESCE(published_at, added_at) DESC"
    rows = conn.execute(q, params).fetchall()
    conn.close()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["title_en", "title_ar", "url", "image_url", "source", "sentiment",
                     "tickers", "summary", "summary_ar", "date", "scope"])
    for title_en, title_ar, link, img_url, src, sent, tickers_json, summary, summary_ar, pub, sc in rows:
        tickers = ", ".join(json.loads(tickers_json or "[]"))
        writer.writerow([title_en or "", title_ar or "", link or "", img_url or "",
                         src or "", sent or "", tickers, summary or "", summary_ar or "",
                         pub or "", sc or "local"])

    buf.seek(0)
    day = dt.datetime.now().strftime("%Y-%m-%d")
    filename = f"thndr-news-{day}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/api/articles")
def api_articles(
    source: str = "", sentiment: str = "", search: str = "",
    from_date: str = "", to_date: str = "", limit: int = 300,
    category: str = "", ticker: str = "", scope: str = "",
    confidence: str = "", egx_official: str = "",
):
    conn = db()
    q = ("SELECT key,title,link,source,image_path,image_url,summary,sentiment,tickers,published_at,added_at,"
         "ai_status,category,dup_group,title_en,title_ar,summary_ar,scope,confidence,is_egx_official "
         "FROM seen WHERE 1=1")
    params: list = []
    if source:
        q += " AND source=?"; params.append(source)
    if sentiment:
        q += " AND sentiment=?"; params.append(sentiment)
    if category:
        q += " AND category=?"; params.append(category)
    if scope:
        q += " AND scope=?"; params.append(scope)
    if confidence:
        q += " AND confidence=?"; params.append(confidence)
    if egx_official == "1":
        q += " AND is_egx_official='1'"
    if search:
        q += " AND (title LIKE ? OR summary LIKE ?)"; params += [f"%{search}%", f"%{search}%"]
    if from_date:
        q += " AND (COALESCE(published_at,added_at)>=?)"; params.append(from_date)
    if to_date:
        q += " AND (COALESCE(published_at,added_at)<=?)"; params.append(to_date + "T23:59:59")
    if ticker:
        q += " AND tickers LIKE ?"; params.append(f'%"{ticker.upper()}"%')
    q += " ORDER BY COALESCE(published_at,added_at) DESC LIMIT ?"; params.append(limit)
    rows = conn.execute(q, params).fetchall()
    conn.close()
    out = []
    for key, title, link, src, img_path, img_url, summary, sent, tickers_json, pub, added, ai_st, cat, dup_grp, title_en, title_ar, summary_ar, sc, conf, is_egx in rows:
        tickers = []
        try: tickers = json.loads(tickers_json or "[]")
        except Exception: pass
        out.append({"key": key, "title": title, "link": link, "source": src or "",
                    "image_path": img_path or "", "image_url": img_url or "",
                    "summary": summary or "",
                    "title_en": title_en or "", "title_ar": title_ar or "",
                    "summary_ar": summary_ar or "",
                    "sentiment": sent or "Neutral", "tickers": tickers,
                    "published_at": pub or "", "added_at": added or "",
                    "ai_status": ai_st or ("ok" if summary else "empty"),
                    "category": cat or "Economic",
                    "dup_group": dup_grp or "",
                    "scope": sc or "local",
                    "confidence": conf or "medium",
                    "is_egx_official": is_egx == "1"})
    return out

class DeleteBody(BaseModel):
    keys: list[str]

@app.delete("/api/articles")
def delete_articles(body: DeleteBody):
    if not body.keys:
        raise HTTPException(400, "no keys provided")
    conn = db()
    placeholders = ",".join("?" * len(body.keys))
    conn.execute(f"DELETE FROM seen WHERE key IN ({placeholders})", body.keys)
    conn.commit()
    conn.close()
    return {"ok": True, "deleted": len(body.keys)}

@app.get("/api/sources")
def api_sources():
    conn = db()
    rows = conn.execute(
        "SELECT DISTINCT source FROM seen WHERE source IS NOT NULL AND source!='' ORDER BY source"
    ).fetchall()
    conn.close()
    return [r[0] for r in rows]

@app.get("/api/calendar")
def api_calendar(from_date: str = "", to_date: str = ""):
    """Per-day category counts for the calendar strip."""
    conn = db()
    if not from_date:
        from_date = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=7)).strftime("%Y-%m-%d")
    if not to_date:
        to_date = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d")
    rows = conn.execute(
        """SELECT DATE(COALESCE(published_at, added_at)) as day,
                  COALESCE(category,'Economic') as cat, COUNT(*) as cnt
           FROM seen
           WHERE DATE(COALESCE(published_at,added_at)) BETWEEN ? AND ?
           GROUP BY day, cat
           ORDER BY day""",
        (from_date, to_date),
    ).fetchall()
    conn.close()
    _EMPTY_DAY = {"Economic": 0, "Earnings": 0, "Cash Dividends": 0, "Stock Dividends": 0,
                  "IPO": 0, "Board Meeting": 0, "Tender Offer": 0, "Stock Split": 0,
                  "Delisting": 0, "CBE Decision": 0, "CBE Meeting": 0, "Holiday": 0, "total": 0}
    summary: dict[str, dict] = {}
    for day, cat, cnt in rows:
        if day not in summary:
            summary[day] = {"date": day, **_EMPTY_DAY}
        summary[day][cat] = summary[day].get(cat, 0) + cnt
        summary[day]["total"] = summary[day].get("total", 0) + cnt
    return sorted(summary.values(), key=lambda x: x["date"])


@app.get("/api/macro-events")
def api_macro_events(from_date: str = "", to_date: str = "", event_type: str = ""):
    """Return CBE meeting dates, rate decisions, and Egyptian public holidays.

    Query params:
      from_date  – ISO date string (YYYY-MM-DD), default = today
      to_date    – ISO date string (YYYY-MM-DD), default = 1 year from today
      event_type – filter by type: CBE Meeting | CBE Decision | Holiday
    """
    today = dt.date.today()
    fd = dt.date.fromisoformat(from_date) if from_date else today
    td = dt.date.fromisoformat(to_date) if to_date else today.replace(year=today.year + 1)
    result = []
    for ev in MACRO_EVENTS:
        ev_date = dt.date.fromisoformat(ev["date"])
        if not (fd <= ev_date <= td):
            continue
        if event_type and ev["type"] != event_type:
            continue
        result.append(ev)
    result.sort(key=lambda x: x["date"])
    return result


@app.get("/api/duplicates")
def api_duplicates():
    """Return groups of duplicate articles (same story from DIFFERENT sources)."""
    conn = db()
    rows = conn.execute(
        """SELECT dup_group, key, title, link, source, sentiment, tickers, published_at, added_at, category
           FROM seen WHERE dup_group IS NOT NULL AND dup_group != ''
           ORDER BY dup_group, added_at""",
    ).fetchall()
    conn.close()
    groups: dict[str, list] = {}
    for grp, key, title, link, src, sent, tickers_json, pub, added, cat in rows:
        tickers = []
        try: tickers = json.loads(tickers_json or "[]")
        except Exception: pass
        if grp not in groups:
            groups[grp] = []
        groups[grp].append({"key": key, "title": title, "link": link, "source": src or "",
                             "sentiment": sent or "Neutral", "tickers": tickers,
                             "published_at": pub or "", "added_at": added or "",
                             "category": cat or "Economic"})
    # Only return groups with 2+ distinct sources
    result = []
    for gid, arts in groups.items():
        if len(arts) >= 2 and len({a["source"] for a in arts}) >= 2:
            result.append({"group_id": gid, "count": len(arts), "articles": arts})
    return result

@app.get("/api/export/duplicates")
def export_duplicates_csv():
    """CSV export: one row per duplicate group, columns = title, image_url, then one column per source."""
    conn = db()
    rows = conn.execute(
        """SELECT dup_group, source, title, link, image_url, published_at, sentiment, tickers
           FROM seen WHERE dup_group IS NOT NULL AND dup_group != ''
           ORDER BY dup_group, source""",
    ).fetchall()
    conn.close()

    # Build groups dict, collecting per-source data
    groups: dict[str, dict] = {}
    for grp, src, title, link, image_url, pub, sent, tickers_json in rows:
        src = src or "Unknown"
        if grp not in groups:
            groups[grp] = {"title": title or "", "image_url": image_url or "", "sources": {}}
        # First source wins for canonical title/image
        if not groups[grp]["image_url"] and image_url:
            groups[grp]["image_url"] = image_url
        groups[grp]["sources"][src] = link or ""

    # Filter to groups with 2+ different sources
    valid = {gid: g for gid, g in groups.items() if len(g["sources"]) >= 2}

    # Collect all distinct source names across all groups, sorted
    all_sources: list[str] = sorted({src for g in valid.values() for src in g["sources"]})

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["title", "image_url"] + all_sources)
    for g in valid.values():
        row = [g["title"], g["image_url"]] + [g["sources"].get(src, "") for src in all_sources]
        writer.writerow(row)

    buf.seek(0)
    day = dt.datetime.now().strftime("%Y-%m-%d")
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": f"attachment; filename=thndr-duplicates-{day}.csv"})

@app.get("/api/companies")
def api_companies():
    conn = db()
    rows = conn.execute("SELECT ticker, name_en, name_ar, sector FROM companies ORDER BY ticker").fetchall()
    conn.close()
    return [{"ticker": r[0], "name_en": r[1], "name_ar": r[2], "sector": r[3]} for r in rows]

@app.get("/api/companies/{ticker}/news")
def api_company_news(
    ticker: str,
    category: str = "", from_date: str = "", to_date: str = "", limit: int = 200,
):
    ticker = ticker.upper()
    conn = db()
    q = ("SELECT key,title,link,source,image_path,summary,sentiment,tickers,published_at,added_at,"
         "ai_status,category,title_en,title_ar,summary_ar "
         "FROM seen WHERE tickers LIKE ?")
    params: list = [f'%"{ticker}"%']
    if category:
        q += " AND category=?"; params.append(category)
    if from_date:
        q += " AND COALESCE(published_at,added_at)>=?"; params.append(from_date)
    if to_date:
        q += " AND COALESCE(published_at,added_at)<=?"; params.append(to_date + "T23:59:59")
    q += " ORDER BY COALESCE(published_at,added_at) DESC LIMIT ?"; params.append(limit)
    rows = conn.execute(q, params).fetchall()
    conn.close()
    out = []
    for key, title, link, src, img_path, summary, sent, tickers_json, pub, added, ai_st, cat, title_en, title_ar, summary_ar in rows:
        tickers = []
        try: tickers = json.loads(tickers_json or "[]")
        except Exception: pass
        out.append({"key": key, "title": title, "link": link, "source": src or "",
                    "image_path": img_path or "", "summary": summary or "",
                    "title_en": title_en or "", "title_ar": title_ar or "",
                    "summary_ar": summary_ar or "",
                    "sentiment": sent or "Neutral", "tickers": tickers,
                    "published_at": pub or "", "added_at": added or "",
                    "ai_status": ai_st or "ok", "category": cat or "Economic"})
    return out


@app.post("/api/translate/{key}")
def translate_article(key: str, lang: str = "ar"):
    """Lazily translate an article's title and summary to Arabic. Cached in DB."""
    if lang != "ar":
        raise HTTPException(400, "only lang=ar supported")
    conn = db()
    row = conn.execute(
        "SELECT title, summary, title_en, title_ar, summary_ar FROM seen WHERE key=?", (key,)
    ).fetchone()
    if not row:
        raise HTTPException(404, "article not found")
    title, summary, title_en, title_ar, summary_ar = row

    if title_ar and summary_ar:
        conn.close()
        return {"title_ar": title_ar, "summary_ar": summary_ar, "cached": True}

    src_title = title_en or title or ""
    if not summary:
        conn.close()
        return {"title_ar": title_ar or "", "summary_ar": "", "cached": False}

    result = ai_translate_ar(src_title, summary)
    if result:
        new_title_ar = result.get("title_ar") or title_ar or ""
        new_summary_ar = result.get("summary_ar", "")
        conn.execute(
            "UPDATE seen SET title_ar=?, summary_ar=? WHERE key=?",
            (new_title_ar, new_summary_ar, key)
        )
        conn.commit()
        conn.close()
        return {"title_ar": new_title_ar, "summary_ar": new_summary_ar, "cached": False}

    conn.close()
    return {"title_ar": title_ar or "", "summary_ar": "", "cached": False}

@app.get("/api/provider-stats")
def api_provider_stats():
    conn = db()
    rows = conn.execute(
        "SELECT ai_provider, COUNT(*) as cnt FROM seen WHERE ai_provider IS NOT NULL GROUP BY ai_provider"
    ).fetchall()
    conn.close()
    return {r[0]: r[1] for r in rows}


class IngestBody(BaseModel):
    url: str
    title: str = ""
    content: str = ""        # article body text; if empty, app tries to fetch from url
    image_url: str = ""
    published_at: str = ""   # ISO 8601; defaults to now
    source: str = "Manual"

@app.post("/api/ingest")
def api_ingest(body: IngestBody):
    """Manually ingest a single article: fetch missing fields, run AI analysis, store in DB."""
    url = body.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="url is required")

    conn = db()
    key = hashlib.md5(url.encode()).hexdigest()

    existing = conn.execute("SELECT key FROM seen WHERE key=?", (key,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=409, detail="Article already exists (same URL)")

    # --- resolve content & date ---
    content = body.content.strip()
    pub = body.published_at.strip()
    if not content:
        fetched_text, fetched_pub = fetch_article_text(url)
        content = fetched_text or ""
        if not pub:
            pub = fetched_pub or ""

    title = body.title.strip()
    if not title:
        # derive a minimal title from url path
        title = url.split("?")[0].rstrip("/").split("/")[-1].replace("-", " ").replace("_", " ")

    if not pub:
        pub = dt.datetime.now(dt.timezone.utc).isoformat()

    # --- image ---
    img_url = body.image_url.strip()
    if not img_url:
        img_url = fetch_og_image(url)
    img_path = ""
    if img_url:
        img_path, _ = download_image(img_url)

    # --- AI analysis ---
    ai = ai_analyze(title, content or title, body.source)

    added_at = dt.datetime.now(dt.timezone.utc).isoformat()
    mark_seen(
        conn, key=key, link=url, guid=key, title=title,
        source=body.source,
        image_url=img_url, image_path=img_path,
        summary=ai["summary"], summary_ar=ai.get("summary_ar", ""),
        sentiment=ai["sentiment"],
        tickers=ai["tickers"],
        published_at=pub,
        ai_status=ai["_status"],
        category=ai.get("category", "Economic"),
        ai_provider=ai["_provider"],
        title_en=ai.get("title_en", "") or title,
        title_ar=ai.get("title_ar", ""),
        scope=ai.get("scope", "local"),
        confidence=ai.get("confidence", "medium"),
        is_egx_official=False,
    )
    conn.close()

    return {
        "ok": True,
        "key": key,
        "title": ai.get("title_en") or title,
        "title_ar": ai.get("title_ar", ""),
        "sentiment": ai["sentiment"],
        "category": ai.get("category"),
        "tickers": ai["tickers"],
        "ai_status": ai["_status"],
        "ai_provider": ai["_provider"],
    }

@app.get("/", response_class=HTMLResponse)
def index():
    p = pathlib.Path("static/index.html")
    return p.read_text(encoding="utf-8") if p.exists() else "<h1>Frontend not found</h1>"

@app.get("/data", response_class=HTMLResponse)
def data():
    conn = db()
    rows = conn.execute(
        "SELECT title,link,image_path,sentiment,tickers,added_at FROM seen ORDER BY added_at DESC"
    ).fetchall()
    conn.close()
    rows_html = ""
    for title, link, img_path, sentiment, tickers_json, added_at in rows:
        thumb = (f'<img src="{html.escape(img_path or "")}" '
                 'style="width:80px;height:45px;object-fit:cover;border-radius:4px">'
                 if img_path else "")
        tickers = []
        try: tickers = json.loads(tickers_json or "[]")
        except Exception: pass
        chips = "".join(
            f'<span style="background:#222;color:#ddd;border-radius:4px;padding:2px 7px;'
            f'margin:0 3px;font-size:11px;font-weight:700">{html.escape(t)}</span>'
            for t in tickers)
        col = {"Positive":"#00c48c","Negative":"#ff4d4d"}.get(sentiment or "","#888")
        rows_html += f"""<tr>
  <td>{thumb}</td>
  <td><a href="{html.escape(link or "")}" target="_blank" style="color:#4f8bff">
      {html.escape(title or "")}</a><div style="margin-top:4px">{chips}</div></td>
  <td style="color:{col};font-size:12px;font-weight:700">{html.escape(sentiment or "")}</td>
  <td style="color:#555;font-size:11px;white-space:nowrap">{html.escape(added_at or "")}</td>
</tr>"""
    return f"""<!doctype html><html><head><meta charset="utf-8">
<style>body{{font-family:system-ui,sans-serif;background:#0a0a0a;color:#eee;padding:24px;margin:0}}
h1{{font-size:18px;color:#fff;margin-bottom:16px}}
table{{border-collapse:collapse;width:100%;max-width:1050px}}
th{{text-align:left;color:#555;font-size:12px;padding:6px 10px;border-bottom:1px solid #222}}
td{{padding:8px 10px;border-bottom:1px solid #181818;vertical-align:middle;font-size:13px}}
</style></head><body>
<h1>Seen articles ({len(rows)})</h1>
<table><thead><tr><th>Image</th><th>Title / Tickers</th><th>Sentiment</th><th>Added</th></tr></thead>
<tbody>{rows_html}</tbody></table></body></html>"""
