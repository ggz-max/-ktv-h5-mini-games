const fs = require("fs");
const path = require("path");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
const externalCatalog = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "catalog.json"), "utf8"));
const STORAGE_KEY = "jingguang-reading-h5-state";
const CURRENT_CONTENT_VERSION = Number(script.match(/const CONTENT_VERSION = (\d+);/)?.[1] || 0);
const CURRENT_PROGRESS_PAGE_MODEL_VERSION = Number(script.match(/const PROGRESS_PAGE_MODEL_VERSION = (\d+);/)?.[1] || 0);

function extractConstLiteral(name, opener, closer) {
  let start = script.indexOf(`const ${name} = ${opener}`);
  if (start < 0) start = script.indexOf(`let ${name} = ${opener}`);
  if (start < 0) throw new Error(`missing const ${name}`);
  const literalStart = script.indexOf(opener, start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = literalStart; index < script.length; index += 1) {
    const char = script[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === opener) depth += 1;
    if (char === closer) {
      depth -= 1;
      if (depth === 0) return script.slice(literalStart, index + 1);
    }
  }
  throw new Error(`unterminated const ${name}`);
}

function readConstArray(name) {
  return vm.runInNewContext(`(${extractConstLiteral(name, "[", "]")})`);
}

function readConstObject(name) {
  return vm.runInNewContext(`(${extractConstLiteral(name, "{", "}")})`);
}

class FakeElement {
  constructor(selector) {
    this.selector = selector;
    this.dataset = {};
    this.value = "";
    this._innerHTML = "";
    this._textContent = "";
    this.style = { setProperty() {} };
    this.classList = {
      add() {},
      remove() {},
      contains() { return false; }
    };
  }

  set innerHTML(value) { this._innerHTML = String(value); }
  get innerHTML() { return this._innerHTML; }
  set textContent(value) { this._textContent = String(value); }
  get textContent() { return this._textContent; }
  addEventListener() {}
  focus() {}
  setSelectionRange() {}
  matches() { return false; }
  closest() { return null; }
}

class FakeTextAreaElement extends FakeElement {}

function createAppRuntime(storageData = {}) {
  const elements = new Map();
  function element(selector) {
    if (!elements.has(selector)) elements.set(selector, new FakeElement(selector));
    return elements.get(selector);
  }

  const listeners = {};
  const storage = {
    data: { ...storageData },
    getItem(key) { return this.data[key] || "{}"; },
    setItem(key, value) { this.data[key] = value; }
  };
  global.document = {
    querySelector: element,
    addEventListener(type, callback) {
      listeners[type] = callback;
    }
  };
  global.window = {
    innerWidth: 1280,
    innerHeight: 720,
    JINGGUANG_CATALOG: externalCatalog,
    addEventListener() {}
  };
  global.fetch = async (url) => {
    if (String(url).includes("data/catalog.json")) {
      return {
        ok: true,
        status: 200,
        async json() {
          return externalCatalog;
        }
      };
    }
    return { ok: false, status: 404, async json() { return {}; } };
  };
  global.localStorage = storage;
  global.HTMLInputElement = FakeElement;
  global.HTMLTextAreaElement = FakeTextAreaElement;
  global.setTimeout = setTimeout;
  global.clearTimeout = clearTimeout;

  eval(script);

  return {
    appView: element("#app-view"),
    reader: element("#reader"),
    sheet: element("#sheet-layer"),
    localStorage: storage,
    click(action, dataset = {}) {
      handleAction(action, { dataset });
    },
    input(action, value) {
      const target = new FakeElement(`[data-action="${action}"]`);
      target.dataset.action = action;
      target.value = value;
      listeners.input({ target });
    },
    textarea(action, value) {
      const target = new FakeTextAreaElement(`[data-action="${action}"]`);
      target.dataset.action = action;
      target.value = value;
      listeners.input({ target });
    }
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const runtime = createAppRuntime();

function click(action, dataset = {}) {
  runtime.click(action, dataset);
}

function input(action, value) {
  runtime.input(action, value);
}

function textarea(action, value) {
  runtime.textarea(action, value);
}

const appView = runtime.appView;
const reader = runtime.reader;
const sheet = runtime.sheet;

function assertNoGenericSheetJump(label) {
  assert(!/打开[^<]{0,12}页面/.test(sheet.innerHTML), `${label} should not include a generic page jump button`);
}

function bookSetSignature(ids) {
  return [...ids].sort().join("|");
}

function jaccardScore(a, b) {
  const left = new Set(a);
  const right = new Set(b);
  const intersection = [...left].filter((id) => right.has(id)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

const staticActions = new Set(
  [...script.matchAll(/data-action="([^"$]+)"/g)]
    .map((match) => match[1])
    .filter((action) => action && !action.includes("{") && !action.includes("}"))
);
const handledActions = new Set([
  ...[...script.matchAll(/action === "([^"]+)"/g)].map((match) => match[1]),
  ...[...script.matchAll(/dataset\.action === "([^"]+)"/g)].map((match) => match[1])
]);
const dynamicActions = [
  "request-restart-book",
  "start-book",
  "reader-jump",
  "catalog-jump"
];
dynamicActions.forEach((action) => staticActions.add(action));
const unhandledActions = [...staticActions].filter((action) => !handledActions.has(action));
assert(unhandledActions.length === 0, `all rendered actions should have handlers: ${unhandledActions.join(", ")}`);

const contentSets = [
  ...readConstArray("topics").map((item) => ({ type: "topic", id: item.id, books: item.books })),
  ...readConstArray("rankings").map((item) => ({ type: "ranking", id: item.id, books: item.books })),
  ...readConstArray("defaultCollections").map((item) => ({ type: "collection", id: item.id, books: item.books }))
];
const contentBaseBooks = readConstArray("baseBooks");
const contentPublicDomainBooks = readConstArray("publicDomainBooks");
const contentPageLibrary = readConstObject("pageLibrary");
const mergedPublicDomainBooks = [
  ...contentPublicDomainBooks,
  ...externalCatalog.publicDomainBooks.filter((book) => !contentPublicDomainBooks.some((item) => item.id === book.id))
];
const mergedPageLibrary = { ...contentPageLibrary, ...externalCatalog.pageLibrary };
const knownBookIds = new Set([...contentBaseBooks, ...contentPublicDomainBooks].map((book) => book.id));
externalCatalog.publicDomainBooks.forEach((book) => knownBookIds.add(book.id));
const contentCoverage = new Set(contentSets.flatMap((item) => item.books));
[
  ...(externalCatalog.topics || []),
  ...(externalCatalog.rankings || []),
  ...(externalCatalog.defaultCollections || [])
].forEach((item) => (item.books || []).forEach((bookId) => contentCoverage.add(bookId)));
assert(contentBaseBooks.length >= 10, "prototype sample books should remain available as interaction fixtures");
assert(mergedPublicDomainBooks.length >= 38, "public domain library should be large enough for a real MVP resource pool");
assert(mergedPublicDomainBooks.length > contentBaseBooks.length, "real public domain books should be the primary content pool");
assert(mergedPublicDomainBooks.every((book) => book.sourceUrl && book.license && book.shelves.includes("公版")), "public domain works should expose source and license metadata");
assert(new Set(mergedPublicDomainBooks.map((book) => book.sourceUrl)).size === mergedPublicDomainBooks.length, "public domain works should keep distinct source URLs");
assert(["shuihu", "rulin", "shishuo", "shanhaijing", "guwen", "chuci", "soushen", "jinghuayuan", "xixiangji", "mudanting", "caigentan", "yanshi", "zizhi", "sunzi", "sanzi", "qianzi", "liweng", "youxue", "zhanguoce", "guoyu", "zuozhuan", "liji", "xiaojing", "yijing", "mengqiu", "xuxiake", "dongpo", "xiaolin"].every((id) => knownBookIds.has(id)), "expanded real public domain works should be registered across built-in and server catalogs");
assert(["analects", "daodejing", "zhuangzi", "mencius", "shijing", "tang-poems", "fusheng", "shuihu", "shishuo", "caigentan", "zizhi", "sunzi", "sanzi", "qianzi", "zuozhuan", "xuxiake"].every((id) => mergedPageLibrary[id] && mergedPageLibrary[id].length >= 6), "core reading books should have at least six readable pages instead of shallow three-page samples");
assert(mergedPublicDomainBooks.every((book) => mergedPageLibrary[book.id] && mergedPageLibrary[book.id].length >= 6), "each public domain book should have at least six readable pages for a usable MVP");
assert(mergedPublicDomainBooks.every((book) => {
  const titles = (mergedPageLibrary[book.id] || []).map((page) => page.title);
  return new Set(titles).size === titles.length;
}), "public domain reader pages should not repeat catalog titles within a book");
assert((externalCatalog.publicDomainBooks || []).length >= 16, "server catalog should carry additional real public domain books");
assert((externalCatalog.libraryCategories || []).includes("历史") && externalCatalog.libraryCategories.includes("蒙学") && externalCatalog.libraryCategories.includes("兵法"), "server catalog should add meaningful content categories");
assert(contentCoverage.size >= 34, "topics, rankings and collections should cover most books");
assert(contentBaseBooks.every((book) => contentPageLibrary[book.id] && contentPageLibrary[book.id].length >= 3), "each MVP book should have its own readable sample pages");
assert(mergedPublicDomainBooks.every((book) => mergedPageLibrary[book.id] && mergedPageLibrary[book.id].length >= 6), "each public domain book should have readable source excerpts");
contentSets.forEach((item) => {
  assert(item.books.length >= 3, `${item.type}:${item.id} should contain at least three books`);
  assert(item.books.every((bookId) => knownBookIds.has(bookId)), `${item.type}:${item.id} should only reference known books`);
});
for (let i = 0; i < contentSets.length; i += 1) {
  for (let j = i + 1; j < contentSets.length; j += 1) {
    const a = contentSets[i];
    const b = contentSets[j];
    assert(bookSetSignature(a.books) !== bookSetSignature(b.books), `${a.type}:${a.id} and ${b.type}:${b.id} should not be identical book lists`);
    assert(jaccardScore(a.books, b.books) < 0.86, `${a.type}:${a.id} and ${b.type}:${b.id} overlap too much`);
  }
}

assert(appView.innerHTML.includes("今日阅读计划"), "home plan card should render");
assert(appView.innerHTML.includes("论语"), "home current public domain book should render");
assert(appView.innerHTML.includes("为政第二") && !appView.innerHTML.includes("学而第一</span>"), "home current card should show the real resume chapter instead of the seed chapter");
assert(appView.innerHTML.includes("道德经") || appView.innerHTML.includes("庄子"), "home recommendations should prioritize real public domain books");
assert(appView.innerHTML.includes("今日可读"), "home should expose readable recommendations in the first screen flow");
assert(!appView.innerHTML.includes("山茶文集") && !appView.innerHTML.includes("慢慢读书的人"), "home recommendations should not foreground three-page prototype samples");
assert(appView.innerHTML.includes("更多书"), "home recommendation link should be explicit");
assert(!appView.innerHTML.includes("今日路径"), "home MVP should not expose clipped secondary path tasks");
const savedHomePositionRuntime = createAppRuntime({
  [STORAGE_KEY]: JSON.stringify({
    contentVersion: CURRENT_CONTENT_VERSION,
    progressPageModelVersion: CURRENT_PROGRESS_PAGE_MODEL_VERSION,
    selectedBookId: "daodejing",
    shelf: ["daodejing"],
    progress: { daodejing: 0 },
    readerPages: { daodejing: 2 },
    todayKey: "2000-01-01",
    checkedIn: false,
    todayMinutes: 0
  })
});
assert(savedHomePositionRuntime.appView.innerHTML.includes("当前位置 50%") && savedHomePositionRuntime.appView.innerHTML.includes("读到 3/6 页"), "home current card should show saved page location instead of zero completed progress");
savedHomePositionRuntime.click("open-reader");
assert(savedHomePositionRuntime.reader.innerHTML.includes('aria-label="当前位置 50%"'), "home current card should resume the saved page location");
const defaultResumeRuntime = createAppRuntime();
defaultResumeRuntime.click("switch-tab", { tab: "shelf" });
assert(defaultResumeRuntime.appView.innerHTML.includes("当前：为政第二"), "default shelf row should show the real resume chapter instead of the seed chapter");
defaultResumeRuntime.click("switch-tab", { tab: "home" });
defaultResumeRuntime.click("open-reader");
assert(defaultResumeRuntime.reader.innerHTML.includes("为政第二"), "default current book should resume from the page implied by visible progress");
assert(!defaultResumeRuntime.reader.innerHTML.includes("<span>学而第一</span>"), "reader header should show the current page title instead of the seed chapter");
assert(defaultResumeRuntime.reader.innerHTML.includes("aria-label=\"当前位置 33%\""), "default resume progress should match the page implied by 33% visible progress");
const legacyProgressRuntime = createAppRuntime({
  [STORAGE_KEY]: JSON.stringify({
    contentVersion: CURRENT_CONTENT_VERSION,
    selectedBookId: "analects",
    progress: { analects: 33 },
    shelf: ["analects"],
    todayKey: "2000-01-01",
    checkedIn: false,
    todayMinutes: 0
  })
});
legacyProgressRuntime.click("open-reader");
assert(legacyProgressRuntime.reader.innerHTML.includes("为政第二"), "legacy progress-only state should migrate resume page from visible progress");
let afterLegacyProgressResume = JSON.parse(legacyProgressRuntime.localStorage.data[STORAGE_KEY] || "{}");
assert(afterLegacyProgressResume.readerPages && afterLegacyProgressResume.readerPages.analects === 1, "migrated progress-only state should persist aligned reader page");
const legacyMidProgressRuntime = createAppRuntime({
  [STORAGE_KEY]: JSON.stringify({
    contentVersion: CURRENT_CONTENT_VERSION,
    selectedBookId: "analects",
    progress: { analects: 67 },
    shelf: ["analects"],
    todayKey: "2000-01-01",
    checkedIn: false,
    todayMinutes: 0
  })
});
legacyMidProgressRuntime.click("open-reader");
assert(legacyMidProgressRuntime.reader.innerHTML.includes("里仁第四"), "legacy 67 percent state should resume deeper into a six-page book");
assert(legacyMidProgressRuntime.reader.innerHTML.includes("aria-label=\"当前位置 67%\""), "legacy 67 percent state should not render as either 33 or 100 percent");
const afterLegacyMidProgressResume = JSON.parse(legacyMidProgressRuntime.localStorage.data[STORAGE_KEY] || "{}");
assert(afterLegacyMidProgressResume.readerPages && afterLegacyMidProgressResume.readerPages.analects === 3, "legacy 67 percent state should persist the aligned fourth page");
const noMinuteSyncRuntime = createAppRuntime({
  [STORAGE_KEY]: JSON.stringify({
    contentVersion: CURRENT_CONTENT_VERSION,
    progressPageModelVersion: CURRENT_PROGRESS_PAGE_MODEL_VERSION,
    selectedBookId: "shuihu",
    progress: { shuihu: 0 },
    readerPages: { shuihu: 0 },
    shelf: ["shuihu"],
    preferences: { defaultTheme: "sepia", quietMode: false, syncProgress: false },
    todayKey: "2000-01-01",
    checkedIn: false,
    todayMinutes: 0
  })
});
noMinuteSyncRuntime.click("open-reader");
noMinuteSyncRuntime.click("reader-next");
const afterNoMinuteSyncNext = JSON.parse(noMinuteSyncRuntime.localStorage.data[STORAGE_KEY] || "{}");
assert(afterNoMinuteSyncNext.readerPages && afterNoMinuteSyncNext.readerPages.shuihu === 1, "turning off page-minute tracking should still persist the reader page");
assert(afterNoMinuteSyncNext.progress && afterNoMinuteSyncNext.progress.shuihu === 33, "turning off page-minute tracking should not freeze reading progress");
assert(afterNoMinuteSyncNext.todayMinutes === 0, "turning off page-minute tracking should only stop adding today's minutes");
const legacyRatingSortRuntime = createAppRuntime({
  [STORAGE_KEY]: JSON.stringify({
    contentVersion: CURRENT_CONTENT_VERSION,
    progressPageModelVersion: CURRENT_PROGRESS_PAGE_MODEL_VERSION,
    selectedBookId: "analects",
    progress: { analects: 33 },
    readerPages: { analects: 1 },
    shelf: ["analects", "daodejing"],
    shelfSort: "rating",
    todayKey: "2000-01-01",
    checkedIn: false,
    todayMinutes: 0
  })
});
legacyRatingSortRuntime.click("switch-tab", { tab: "shelf" });
assert(legacyRatingSortRuntime.appView.innerHTML.includes("全部书架 · 最近加入"), "legacy rating sort should fall back to reading-oriented shelf order");
assert(!legacyRatingSortRuntime.appView.innerHTML.includes("评分优先"), "legacy rating sort should not remain visible");
const staleDayRuntime = createAppRuntime({
  [STORAGE_KEY]: JSON.stringify({
    contentVersion: CURRENT_CONTENT_VERSION,
    selectedBookId: "analects",
    progress: { analects: 33 },
    shelf: ["analects", "daodejing"],
    todayKey: "2000-01-01",
    checkedIn: true,
    todayMinutes: 77,
    dailyGoal: 30
  })
});
assert(staleDayRuntime.appView.innerHTML.includes("已读 0 / 30 分钟"), "stale daily minutes should reset when a new local day starts");
assert(!staleDayRuntime.appView.innerHTML.includes("今日已读 77 分钟"), "stale check-in copy should not carry into today");
assert(!staleDayRuntime.appView.innerHTML.includes('data-action="checkin"'), "home should not expose a check-in action that fakes reading minutes");
const afterStaleDailyReset = JSON.parse(staleDayRuntime.localStorage.data[STORAGE_KEY] || "{}");
assert(afterStaleDailyReset.todayMinutes === 0, "new-day reset should keep today's minutes at zero until real reading happens");
assert(/^\d{4}-\d{2}-\d{2}$/.test(afterStaleDailyReset.todayKey), "saved daily state should include a local date key");
const readOnlyDailyRuntime = createAppRuntime();
assert(!readOnlyDailyRuntime.appView.innerHTML.includes('data-action="checkin"'), "home should show a read-only daily status instead of check-in");
assert(readOnlyDailyRuntime.appView.innerHTML.includes("今日已读 18 分钟"), "home daily status should show live minute count without a check-in button");
click("open-focus", { id: "analects" });
assert(sheet.innerHTML.includes("专注阅读"), "focus sheet should open from home");
click("set-focus-minutes", { minutes: "30" });
assert(sheet.innerHTML.includes("30"), "focus duration should render selected minutes");
click("complete-focus", { id: "analects" });
let afterFocus = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterFocus.focusSessions && afterFocus.focusSessions[0].minutes === 30, "focus session should persist");
assert(afterFocus.todayMinutes >= 48, "focus completion should add minutes");
assert(afterFocus.selectedBookId === "analects", "focus completion should keep the real public domain book as current");
assert(afterFocus.progress && afterFocus.progress.analects >= 43, "focus completion should update real book progress");
assert(afterFocus.readerPages && afterFocus.readerPages.analects >= 1, "focus completion should advance real book resume page with progress");

click("switch-tab", { tab: "discover" });
assert(appView.innerHTML.includes("资源库"), "discover library should render");
assert(appView.innerHTML.includes("搜索书名"), "discover search should render");
assert(appView.innerHTML.includes("作者小径"), "discover author lane should render");
assert(appView.innerHTML.includes("搜索灵感"), "discover search prompts should render");
assert(appView.innerHTML.includes("孔子") && appView.innerHTML.includes("老子"), "discover author lane should prioritize real public domain authors");
assert(appView.innerHTML.includes("阅读榜单"), "discover ranking section should render");
assert(!appView.innerHTML.includes("共读房间") && !appView.innerHTML.includes("阅读路径") && !appView.innerHTML.includes("作者动态"), "discover MVP should not foreground secondary social/path feeds");
assert(!appView.innerHTML.includes("山茶午后共读") && !appView.innerHTML.includes("城市边角散步"), "discover front modules should not expose prototype sample rooms");
assert(appView.innerHTML.includes("书库来源：data/catalog.json") && appView.innerHTML.includes("静态服务器书库已连接"), "discover should expose loaded server catalog status");
assert(appView.innerHTML.includes("资治通鉴") && appView.innerHTML.includes("孙子兵法"), "server catalog should render real public domain books");
assert(appView.innerHTML.includes("试读：") && appView.innerHTML.includes("来源：维基文库"), "library cards should show source and sample before opening detail");
assert(appView.innerHTML.includes("论语") && appView.innerHTML.includes("道德经"), "discover should include real public domain works");
assert(!appView.innerHTML.includes("来源：静光书库"), "discover resource cards should not expose fictional prototype books");
assert(!appView.innerHTML.includes("原型样章用于交互场景"), "discover resource copy should not present prototype samples as resource content");
click("filter-discover", { category: "公版" });
assert(appView.innerHTML.includes("论语") && appView.innerHTML.includes("红楼梦"), "public domain category should show real works");
assert(appView.innerHTML.includes("筛选：公版") && appView.innerHTML.includes("当前分类：公版"), "discover category filter should show a visible scope summary");
assert(appView.innerHTML.indexOf("资源库 · 公版") < appView.innerHTML.indexOf("阅读榜单"), "discover category results should appear before secondary modules");
click("filter-discover", { category: "历史" });
assert(appView.innerHTML.includes("资治通鉴") && appView.innerHTML.includes("左传"), "history filter should show server catalog public domain works");
click("filter-discover", { category: "蒙学" });
assert(appView.innerHTML.includes("三字经") && appView.innerHTML.includes("千字文"), "primer filter should show server catalog public domain works");
input("search-library", "论语");
assert(appView.innerHTML.includes("搜索结果") && appView.innerHTML.includes("论语"), "search should find real public domain books");
assert(appView.innerHTML.includes("搜索范围：全库") && appView.innerHTML.includes("当前命中"), "discover search should explain its active scope");
assert((appView.innerHTML.match(/class="library-list/g) || []).length === 1, "discover search should not duplicate the same book list under the resource section");
input("search-library", "资治通鉴");
assert(appView.innerHTML.includes("搜索结果") && appView.innerHTML.includes("周纪一"), "search should find server catalog real books");
input("search-library", "孙子兵法");
assert(appView.innerHTML.includes("计篇") && appView.innerHTML.includes("兵法"), "search should find public domain strategy books");
input("search-library", "城市边角");
assert(appView.innerHTML.includes("找到 0 本书"), "search should exclude fictional prototype books from resource results");
assert(!appView.innerHTML.includes("来源：静光书库"), "prototype sample books should not appear as discover search cards");
click("open-detail", { id: "analects" });
assert(sheet.innerHTML.includes("维基文库") && sheet.innerHTML.includes("公版古籍"), "public domain detail should show source and license");
click("start-book", { id: "analects" });
assert(reader.innerHTML.includes("学而第一") && reader.innerHTML.includes("学而时习之"), "reader should open real public domain excerpts");
click("close-reader");
click("switch-tab", { tab: "discover" });
click("use-search-prompt", { query: "公版经典", category: "公版" });
assert(appView.innerHTML.includes("搜索「公版经典」"), "search prompt should apply query");
assert(appView.innerHTML.includes("搜索结果"), "search prompt should show a visible result section");
assert(appView.innerHTML.indexOf("论语") < appView.innerHTML.indexOf("阅读榜单"), "search results should appear before discover modules");
let afterSearch = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterSearch.searchHistory && afterSearch.searchHistory.includes("公版经典"), "search prompt should persist history");
click("clear-search", {});
assert(appView.innerHTML.includes("最近：公版经典"), "recent search should render after clearing query");
input("search-library", "晨读");
assert(appView.innerHTML.includes("搜索结果"), "typed search should show a visible result section");
afterSearch = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(!afterSearch.searchHistory.includes("晨读"), "typing alone should not persist search history before confirmation");
click("clear-search", {});
afterSearch = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterSearch.searchHistory && afterSearch.searchHistory.includes("晨读"), "clearing a completed typed search should persist the final query");
input("search-library", "晨");
afterSearch = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(!afterSearch.searchHistory.includes("晨"), "partial typed search should not pollute history");
input("search-library", "晨读计划");
afterSearch = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(!afterSearch.searchHistory.includes("晨读计划"), "progressive typing should wait for explicit confirmation");
click("clear-search", {});
afterSearch = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterSearch.searchHistory[0] === "晨读计划", "confirmed typed search should save only the final query");
click("use-search-prompt", { query: "生活笔记", category: "笔记" });
assert(appView.innerHTML.includes("浮生六记") && appView.innerHTML.includes("维基文库"), "life prompt should show real public domain note books");
click("clear-search-history", {});
afterSearch = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(Array.isArray(afterSearch.searchHistory) && afterSearch.searchHistory.length === 0, "clearing search history should persist");

click("open-ranking", { ranking: "weekly-hot" });
assert(sheet.innerHTML.includes("阅读榜单"), "ranking sheet should open");
assert(sheet.innerHTML.includes("公版热读榜"), "ranking sheet should render selected ranking");
click("save-ranking", { ranking: "weekly-hot" });
let afterRanking = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterRanking.shelf && afterRanking.shelf.includes("analects") && afterRanking.shelf.includes("daodejing") && afterRanking.shelf.includes("fusheng"), "saving ranking should add varied public domain books to shelf");
click("open-detail", { id: "analects" });
assert(sheet.innerHTML.includes("论语"), "ranking detail action should open top book");

click("open-topic", { topic: "grow" });
assert(sheet.innerHTML.includes("专题书单"), "topic sheet should open");
assert(sheet.innerHTML.includes("晨间修身"), "topic sheet should render selected topic");
assert(sheet.innerHTML.includes("孟子"), "growth topic should include distinct public domain book");
click("save-topic", { topic: "grow" });
let afterTopic = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterTopic.shelf && afterTopic.shelf.includes("analects") && afterTopic.shelf.includes("mencius"), "saving topic should add varied public domain topic books to shelf");

click("open-author", { author: "confucius" });
assert(sheet.innerHTML.includes("作者页"), "author sheet should open");
assert(sheet.innerHTML.includes("孔子"), "author sheet should render real public domain author");
assert(sheet.innerHTML.includes("代表作品"), "author sheet should focus on representative works");
assert(!sheet.innerHTML.includes("作者动态"), "author sheet should not expose an author feed module");
assert(!sheet.innerHTML.includes("关注作者") && !sheet.innerHTML.includes("取消关注"), "author sheet should not expose follow state as a reading action");
click("save-author-books", { author: "confucius" });
let afterAuthor = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterAuthor.shelf && afterAuthor.shelf.includes("analects"), "author works action should add representative public domain book");
click("switch-tab", { tab: "discover" });
assert(appView.innerHTML.includes("孔子") && appView.innerHTML.includes("代表作入架") && !appView.innerHTML.includes("作者动态"), "discover should keep author discovery focused on representative works");
assert(!appView.innerHTML.includes("关注作者") && !appView.innerHTML.includes("取消关注"), "discover author lane should not expose follow buttons");
click("switch-tab", { tab: "discover" });

click("clear-search", {});
click("filter-discover", { category: "诗词" });
assert(appView.innerHTML.includes("诗经") && appView.innerHTML.includes("唐诗三百首"), "category filter should show varied public domain poetry books");
assert(appView.innerHTML.indexOf("资源库 · 诗词") < appView.innerHTML.indexOf("阅读榜单"), "poetry category result list should be directly below category feedback");
click("filter-discover", { category: "志怪" });
assert(appView.innerHTML.includes("搜神记") && appView.innerHTML.includes("山海经"), "weird category filter should show expanded real public domain works");
input("search-library", "晨读");
assert(appView.innerHTML.includes("论语") && appView.innerHTML.includes("搜索结果"), "typed search should reset stale category filters and show matching books");
input("search-library", "水浒");
assert(appView.innerHTML.includes("水浒传") && appView.innerHTML.includes("维基文库"), "typed search should find newly added real public domain works");

click("clear-search", {});
click("open-topic", { topic: "city" });
assert(sheet.innerHTML.includes("长篇名著入口"), "city topic should open");
assert(sheet.innerHTML.includes("红楼梦") && sheet.innerHTML.includes("水浒传") && sheet.innerHTML.includes("儒林外史"), "city topic should include real public domain fiction books");
click("filter-discover", { category: "小说" });
assert(appView.innerHTML.includes("资源库") && appView.innerHTML.includes("红楼梦"), "topic category action should close sheet and show discover results");
assert(!sheet.innerHTML.includes("长篇名著入口"), "topic category action should not leave the topic sheet covering results");
click("open-topic", { topic: "city" });
click("save-topic", { topic: "city" });
const afterCityTopic = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterCityTopic.shelf && afterCityTopic.shelf.includes("hongloumeng") && afterCityTopic.shelf.includes("sanguo"), "city topic should add distinct public domain books");

click("switch-tab", { tab: "shelf" });
assert(appView.innerHTML.includes("论语"), "added book should appear in shelf");
assert(appView.innerHTML.includes("个人书单"), "shelf should render personal collections");
assert(appView.innerHTML.includes("当前位置") && appView.innerHTML.includes("继续"), "shelf rows should expose current location progress and next action");
assert(appView.innerHTML.includes("在读 ") && appView.innerHTML.includes("%"), "collection cards should show resumable reading status instead of only static book counts");
assert(!appView.innerHTML.includes('data-action="select-book"'), "shelf rows should not use an ambiguous whole-row reader action");
assert(appView.innerHTML.includes('data-action="open-detail"') && (appView.innerHTML.includes('data-action="resume-book"') || appView.innerHTML.includes('data-action="start-book"')), "shelf rows should expose separate detail and reading actions");
assert(appView.innerHTML.indexOf("儒林外史") < appView.innerHTML.indexOf("红楼梦"), "recent shelf sort should put newly added topic books first");
click("toggle-shelf", { id: "shijing" });
click("toggle-shelf", { id: "shijing" });
click("sort-shelf", { sort: "recent" });
assert(appView.innerHTML.indexOf("诗经") < appView.innerHTML.indexOf("儒林外史"), "re-adding a book should refresh its recent shelf position");
click("open-collection", { collection: "morning" });
assert(sheet.innerHTML.includes("书单详情"), "collection detail should open");
assert(sheet.innerHTML.includes("晨读经典"), "collection detail should render title");
assert(sheet.innerHTML.includes("孟子"), "morning collection should include distinct public domain book");
assert(sheet.innerHTML.includes("<span>在读</span>") && sheet.innerHTML.includes("<span>最高位置</span>"), "collection detail should summarize visible reading progress");
click("pin-collection", { collection: "nature" });
let afterPinCollection = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterPinCollection.collections && afterPinCollection.collections.find((item) => item.id === "nature").pinned === true, "pinning collection should persist");
click("pin-collection", { collection: "nature" });
afterPinCollection = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterPinCollection.collections && afterPinCollection.collections.find((item) => item.id === "nature").pinned === false, "pinning collection button should toggle off instead of acting like a static status");
click("pin-collection", { collection: "nature" });
click("cache-collection", { collection: "nature" });
let afterCacheCollection = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterCacheCollection.offlineBooks && afterCacheCollection.offlineBooks.includes("shijing") && afterCacheCollection.offlineBooks.includes("zhuangzi") && afterCacheCollection.offlineBooks.includes("fusheng"), "caching collection should persist varied public domain offline books");
assert(!appView.innerHTML.includes("评分优先"), "shelf MVP sorting should not expose rating as a primary reading order");
click("sort-shelf", { sort: "progress" });
assert(appView.innerHTML.includes("位置优先"), "shelf sorting controls should render location-oriented order");
assert(appView.innerHTML.includes("全部书架 · 位置优先"), "shelf sort summary should show the active order");
const afterSort = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterSort.shelfSort === "progress", "shelf sort should persist");
click("filter-shelf", { filter: "saved" });
assert(appView.innerHTML.includes("孟子"), "saved shelf filter should use live unread progress");
assert(appView.innerHTML.indexOf("孟子") < appView.innerHTML.indexOf("个人书单"), "saved shelf filter should show matching books before personal collections");
assert(appView.innerHTML.includes("待读 · 位置优先") && appView.innerHTML.includes("没有保存阅读位置"), "shelf saved filter should explain its rule");
click("start-book", { id: "shijing" });
click("reader-next");
click("close-reader");
click("filter-shelf", { filter: "reading" });
assert(appView.innerHTML.includes("诗经"), "reading shelf filter should include books with a real saved reader position");
assert(appView.innerHTML.indexOf("诗经") < appView.innerHTML.indexOf("个人书单"), "reading shelf filter should show matching books before personal collections");
assert(appView.innerHTML.includes("在读按当前位置判断") && !appView.innerHTML.includes("已完成进度"), "shelf reading filter should explain live location status");

click("start-book", { id: "analects" });
assert(!reader.innerHTML.includes('data-action="open-reader-search"'), "reader top toolbar should not expose search entry");
assert(!reader.innerHTML.includes('data-action="open-focus"'), "reader top toolbar should not expose focus entry");
assert(!reader.innerHTML.includes('data-action="open-audio"'), "reader top toolbar should not expose audio entry");
assert(!reader.innerHTML.includes('data-sheet="assistant"'), "reader top toolbar should not expose assistant entry");
assert(reader.innerHTML.includes('data-drawer="catalog"') && reader.innerHTML.includes('data-drawer="settings"'), "reader top toolbar should keep catalog and settings");
assert(reader.innerHTML.includes("论语"), "reader should open selected book");
click("reader-prev");
let afterReaderPrevAtStart = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterReaderPrevAtStart.readerPages && afterReaderPrevAtStart.readerPages.analects === 0, "reader previous on first page should stay on first page");

click("toggle-reader-drawer", { drawer: "settings" });
assert(reader.innerHTML.includes("阅读设置"), "reader settings drawer should render");

click("set-theme", { theme: "night" });
assert(reader.innerHTML.includes("theme-dot night active") || reader.innerHTML.includes("theme-night"), "night theme should be active");
click("toggle-reader-drawer", { drawer: "catalog" });
assert(reader.innerHTML.includes("目录跳转只改变当前位置") && reader.innerHTML.includes("不会自动标记完读") && reader.innerHTML.includes("位置 67%"), "reader catalog should label page percentages as location, not completed progress");
const progressBeforeCatalogJump = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}").progress?.analects || 0;
click("reader-jump", { page: "2" });
const afterCatalogJump = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterCatalogJump.readerPages && afterCatalogJump.readerPages.analects === 2, "reader catalog jump should persist current page");
assert((afterCatalogJump.progress?.analects || 0) === progressBeforeCatalogJump, "reader catalog jump should not inflate completed progress");

const savedPositionRuntime = createAppRuntime({
  [STORAGE_KEY]: JSON.stringify({
    contentVersion: CURRENT_CONTENT_VERSION,
    progressPageModelVersion: CURRENT_PROGRESS_PAGE_MODEL_VERSION,
    activeTab: "shelf",
    selectedBookId: "analects",
    shelf: ["daodejing"],
    progress: { daodejing: 0 },
    readerPages: { daodejing: 2 }
  })
});
savedPositionRuntime.click("switch-tab", { tab: "shelf" });
assert(savedPositionRuntime.appView.innerHTML.includes("道德经"), "saved reader position test should render the shelved book");
assert(savedPositionRuntime.appView.innerHTML.includes("当前：") && savedPositionRuntime.appView.innerHTML.includes('data-action="resume-book" data-id="daodejing"'), "shelf row should treat saved page position as a resumable reading state even when completed progress is zero");
assert(savedPositionRuntime.appView.innerHTML.includes('aria-label="当前位置 50%"') && savedPositionRuntime.appView.innerHTML.includes("读到 3/6 页"), "shelf row should show saved page location instead of a confusing zero percent progress");
savedPositionRuntime.click("open-detail", { id: "daodejing" });
assert(savedPositionRuntime.sheet.innerHTML.includes("继续阅读") && savedPositionRuntime.sheet.innerHTML.includes("从头阅读"), "book detail should separate resume and restart actions for books with saved page position but zero progress");
assert(savedPositionRuntime.sheet.innerHTML.includes("当前位置 50%") && !savedPositionRuntime.sheet.innerHTML.includes("已完成 0%"), "book detail should avoid showing a misleading zero completed progress for saved positions");
savedPositionRuntime.click("resume-book", { id: "daodejing" });
const afterSavedPositionResume = JSON.parse(savedPositionRuntime.localStorage.data[STORAGE_KEY] || "{}");
assert(afterSavedPositionResume.readerPages && afterSavedPositionResume.readerPages.daodejing === 2, "resuming a saved page position should not reset the book to page one");
assert(savedPositionRuntime.reader.innerHTML.includes('aria-label="当前位置 50%"'), "reader should open at the saved page location and show the visible page progress");

click("open-reader-search", { id: "daodejing" });
assert(sheet.innerHTML.includes("书内查找"), "reader search sheet should open");
input("search-reader", "道");
assert(sheet.innerHTML.includes("找到"), "reader search should render result count");
assert(sheet.innerHTML.includes("道"), "reader search should keep query text");
click("reader-search-jump", { page: "0" });
let afterReaderSearch = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterReaderSearch.readerPages && afterReaderSearch.readerPages.daodejing === 0, "reader search jump should persist per-book reader page");
assert(reader.innerHTML.includes("道德经"), "reader search jump should keep reader open");

click("open-focus", { id: "daodejing" });
assert(sheet.innerHTML.includes("道德经"), "focus sheet should open from reader");
click("set-focus-minutes", { minutes: "10" });
click("complete-focus", { id: "daodejing" });
let afterReaderFocus = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterReaderFocus.focusSessions && afterReaderFocus.focusSessions[0].bookId === "daodejing", "reader focus should persist book");
assert(afterReaderFocus.focusSessions[0].minutes === 10, "reader focus should persist selected duration");
assert(afterReaderFocus.readerPages && afterReaderFocus.readerPages.daodejing >= 1, "reader focus should keep progress and resume page aligned");

click("select-paragraph", { paragraph: "1" });
assert(reader.innerHTML.includes("selected"), "reader should show the selected paragraph before using bottom tools");
click("highlight-paragraph");
const afterHighlight = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterHighlight.highlights && afterHighlight.highlights.length > 0, "highlight should be created");
assert(afterHighlight.highlights[0].paragraphIndex === 1, "bottom highlight should use the paragraph selected by the reader instead of the first paragraph");
assert(afterHighlight.highlights[0].source.includes("第 2 段"), "highlight source should keep the selected paragraph");

click("add-reader-note");
assert(sheet.innerHTML.includes("写笔记") && sheet.innerHTML.includes("道德经"), "reader note editor should open with the current book source");
let afterNoteDraft = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterNoteDraft.noteDraft && afterNoteDraft.noteDraft.includes("居善地"), "bottom note should prefill the selected paragraph text");
assert(afterNoteDraft.noteSource && afterNoteDraft.noteSource.includes("第 2 段"), "bottom note should keep the selected paragraph source");
textarea("edit-note-draft", `${afterNoteDraft.noteDraft}\n读到这里，想留给今天。`);
afterNoteDraft = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterNoteDraft.noteDraft && afterNoteDraft.noteDraft.includes("想留给今天"), "note draft should persist while typing");
click("save-note-draft");
const afterNote = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterNote.notes && afterNote.notes[0].text.includes("居善地") && afterNote.notes[0].text.includes("想留给今天"), "reader note should save selected paragraph and typed user text");
assert(afterNote.notes[0].source.includes("道德经") && afterNote.notes[0].source.includes("第 2 段"), "reader note should keep the selected paragraph source");
const newestNoteId = afterNote.notes[0].id;

click("reader-jump", { page: "5" });
assert(reader.innerHTML.includes("当前位置") && !reader.innerHTML.includes("已完成阅读"), "reader should show one clear progress meter");
assert(reader.innerHTML.includes("到最后一页就是 100%"), "reader should explain the visible progress model");
assert(reader.innerHTML.includes("aria-label=\"当前位置 100%\""), "last page should display 100 percent progress");
assert(reader.innerHTML.includes("写小结"), "last page should expose a completion summary action");
click("finish-book");
assert(sheet.innerHTML.includes("完读小结"), "finished sheet should open after last page");
assert(sheet.innerHTML.includes("已读完"), "finished sheet should render completion copy");
assert(!sheet.innerHTML.includes("读后感受"), "finished sheet should prioritize note and review-box actions over rating");
const afterFinished = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterFinished.progress && afterFinished.progress.daodejing === 100, "finishing a book should persist 100 percent progress");
click("switch-tab", { tab: "shelf" });
click("filter-shelf", { filter: "finished" });
assert(appView.innerHTML.includes("道德经"), "finished shelf filter should use live finished progress");
click("finish-note", { id: "daodejing" });
const afterFinishNote = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterFinishNote.notes && afterFinishNote.notes[0].source.includes("完读小结"), "finish note should be saved");
click("open-detail", { id: "daodejing" });
assert(sheet.innerHTML.includes("老子"), "book detail should include author card");
assert(sheet.innerHTML.includes("作者页"), "book detail should include author entry");
assert(sheet.innerHTML.includes("代表作入架") && !sheet.innerHTML.includes("关注作者"), "book detail author card should offer representative works instead of follow state");
assert(sheet.innerHTML.includes("阅读记录") && sheet.innerHTML.includes("写/看笔记") && sheet.innerHTML.includes("看划线"), "book detail should focus on personal reading actions");
assert(!sheet.innerHTML.includes("读友短评") && !sheet.innerHTML.includes("data-action=\"open-comments\""), "book detail should not foreground social comments in MVP");
assert(sheet.innerHTML.includes("不用给书打分") && !sheet.innerHTML.includes("data-action=\"rate-book\""), "book detail should steer completion toward notes instead of rating buttons");
assert(sheet.innerHTML.includes("继续阅读") && sheet.innerHTML.includes("从头阅读"), "book detail should separate resume and restart actions for books with progress");
const legacyScoreReviewRuntime = createAppRuntime({
  [STORAGE_KEY]: JSON.stringify({
    contentVersion: CURRENT_CONTENT_VERSION,
    progressPageModelVersion: CURRENT_PROGRESS_PAGE_MODEL_VERSION,
    selectedBookId: "daodejing",
    shelf: ["daodejing"],
    progress: { daodejing: 100 },
    readerPages: { daodejing: 5 },
    bookReviews: {
      daodejing: { score: 9, text: "读完后想留下上善若水。", date: "刚刚" }
    }
  })
});
legacyScoreReviewRuntime.click("open-detail", { id: "daodejing" });
assert(legacyScoreReviewRuntime.sheet.innerHTML.includes("读完后想留下上善若水") && !legacyScoreReviewRuntime.sheet.innerHTML.includes("9 分"), "book detail should hide legacy score values and keep the feeling text");
legacyScoreReviewRuntime.click("open-sheet", { sheet: "reviews" });
assert(legacyScoreReviewRuntime.sheet.innerHTML.includes("读完后想留下上善若水") && !legacyScoreReviewRuntime.sheet.innerHTML.includes("9 分"), "book feeling list should hide legacy score values");
click("request-restart-book", { id: "daodejing" });
assert(sheet.innerHTML.includes("确认从头阅读") && sheet.innerHTML.includes("继续原位置"), "restart reading should require an explicit confirmation sheet");
let afterRestartRequest = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterRestartRequest.progress && afterRestartRequest.progress.daodejing === 100, "requesting restart should not clear progress before confirmation");
click("resume-book", { id: "daodejing" });
let afterCancelRestart = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterCancelRestart.progress && afterCancelRestart.progress.daodejing === 100, "continuing from restart confirmation should preserve progress");
click("close-reader");
click("open-detail", { id: "daodejing" });
click("request-restart-book", { id: "daodejing" });
click("confirm-restart-book", { id: "daodejing" });
const afterRestartDaodejing = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterRestartDaodejing.readerPages && afterRestartDaodejing.readerPages.daodejing === 0, "restart reading should reset the book page");
assert(afterRestartDaodejing.progress && afterRestartDaodejing.progress.daodejing === 0, "restart reading should reset current book progress instead of keeping stale completion");
assert(reader.innerHTML.includes("aria-label=\"当前位置 17%\""), "reader progress meter should reflect current page after restart");
assert(!reader.innerHTML.includes("已完成阅读"), "reader should not show a second completed-progress meter after restart");
click("close-reader");
click("open-detail", { id: "daodejing" });
click("add-to-collection", { id: "daodejing", collection: "night" });
let afterAddCollection = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterAddCollection.collections && afterAddCollection.collections.find((item) => item.id === "night").books.includes("daodejing"), "adding book to collection should persist");
assert(!sheet.innerHTML.includes("data-action=\"like-comment\"") && !sheet.innerHTML.includes("data-action=\"comment-note\""), "book detail should not expose comment like or quote actions");
click("open-sheet", { sheet: "reviews" });
assert(sheet.innerHTML.includes("读后感受"), "book feeling sheet should open");
assert(sheet.innerHTML.includes("还没有读后感受"), "book feeling sheet should stay secondary when no rating record exists");
assertNoGenericSheetJump("book reviews sheet");

click("close-reader");
click("switch-tab", { tab: "profile" });
assert(!appView.innerHTML.includes("听读记录") && !appView.innerHTML.includes("我的书评"), "profile MVP should not foreground audio or reviews over reading notes");
assert(appView.innerHTML.includes("作者作品") && !appView.innerHTML.includes("关注作者"), "profile should expose author works without follow management");
assert(appView.innerHTML.includes("阅读日历"), "profile should show reading calendar entry");
assert(appView.innerHTML.includes("个人书单"), "profile should keep library management entry");
assert(!appView.innerHTML.includes("阅读路径"), "profile MVP should not foreground path management");
assert(appView.innerHTML.includes("data-action=\"open-sheet\" data-sheet=\"plan\""), "profile monthly plan should open the plan sheet directly");
assert(!appView.innerHTML.includes("data-action=\"export-notes\""), "profile should not expose stale export naming for monthly plan");

click("start-book", { id: "shuihu" });
assert(reader.innerHTML.includes("水浒传"), "reader should open expanded public domain novel");
assert(reader.innerHTML.includes("张天师祈禳瘟疫"), "public domain novel should render its own chapter");
click("reader-next");
let afterShuihuNext = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterShuihuNext.readerPages && afterShuihuNext.readerPages.shuihu === 1, "public domain book should persist its own reader page");
assert(afterShuihuNext.progress && afterShuihuNext.progress.shuihu === 33, "book progress should count the current page position");
assert(reader.innerHTML.includes("aria-label=\"当前位置 33%\""), "second page of a six-page book should display 33 percent");
assert(reader.innerHTML.includes("王教头私走延安府"), "public domain reader should move to its second page");
click("reader-next");
click("reader-next");
click("reader-next");
click("reader-next");
let afterShuihuLastPage = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterShuihuLastPage.readerPages && afterShuihuLastPage.readerPages.shuihu === 5, "public domain book should move to its last page before completion");
assert(afterShuihuLastPage.progress && afterShuihuLastPage.progress.shuihu === 100, "six-page public domain book should show 100 percent after reaching the last page");
assert(reader.innerHTML.includes("aria-label=\"当前位置 100%\""), "last page of a six-page book should display 100 percent");
click("close-reader");
click("start-book", { id: "caigentan" });
assert(reader.innerHTML.includes("菜根谭"), "reader should open another real public domain book");
assert(reader.innerHTML.includes("修省"), "second public domain book should render its own chapter");
assert(!reader.innerHTML.includes("张天师祈禳瘟疫"), "different public domain books should not share reader body");
let afterCaigentanStart = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterCaigentanStart.readerPages && afterCaigentanStart.readerPages.caigentan === 0, "starting a different book should not reuse prior book page");
click("close-reader");

click("open-sheet", { sheet: "calendar" });
assert(sheet.innerHTML.includes("本周阅读日历"), "calendar sheet should open");
assert(sheet.innerHTML.includes("安静成就"), "calendar sheet should render achievements");
assertNoGenericSheetJump("calendar sheet");
click("save-calendar-note");
const afterCalendarNote = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterCalendarNote.notes && afterCalendarNote.notes[0].source.includes("阅读日历"), "calendar note should be saved");

click("open-sheet", { sheet: "reviewBox" });
assert(sheet.innerHTML.includes("复习盒"), "review box should open");
assert(sheet.innerHTML.includes("今日书摘复习"), "review box should render summary");
assertNoGenericSheetJump("review box sheet");
click("mark-reviewed", { review: `note:${newestNoteId}` });
const afterReviewBox = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterReviewBox.reviewedItems && afterReviewBox.reviewedItems.includes(`note:${newestNoteId}`), "reviewed note should persist");
assert(afterReviewBox.todayMinutes > afterNote.todayMinutes, "reviewing a note should add a minute");

click("open-sheet", { sheet: "insights" });
assert(sheet.innerHTML.includes("阅读数据中心"), "insights sheet should open");
assert(sheet.innerHTML.includes("本周阅读节奏"), "weekly rhythm should render");
assert(sheet.innerHTML.includes("主题偏好"), "topic preference should render");
assert(sheet.innerHTML.includes("阅读日历"), "insights should include calendar panel");
assert(sheet.innerHTML.includes("安静成就"), "insights should include achievements");
assertNoGenericSheetJump("insights sheet");
click("share-insights");
const afterInsights = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterInsights.notes && afterInsights.notes[0].source.includes("周报摘要"), "insights summary should be saved to notes");

click("open-sheet", { sheet: "import" });
assert(sheet.innerHTML.includes("导入书籍"), "import sheet should open");
assert(sheet.innerHTML.includes("TXT 正文") && sheet.innerHTML.includes("导入文本"), "import sheet should expose real text import fields");
assertNoGenericSheetJump("import sheet");
click("import-book");
const afterEmptyImport = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(!afterEmptyImport.importedBooks || !afterEmptyImport.importedBooks.length, "empty import should not create a fake sample book");
input("edit-import-title", "我的读书摘录");
textarea("edit-import-text", "第一段来自本地文本，今天只读这一小节。\n\n第二段保留自己的批注空间。\n\n第三段应该出现在下一页。");
click("import-book");
const afterImport = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
const importedBook = afterImport.importedBooks && afterImport.importedBooks.find((book) => book.title === "我的读书摘录");
assert(importedBook, "text import should persist the user-created book");
assert(importedBook.pages && importedBook.pages.length === 2, "text import should split pasted content into reader pages");
assert(importedBook.pages[0].body[0].includes("第一段来自本地文本"), "text import should keep the pasted first paragraph");
assert(afterImport.shelf && afterImport.shelf.includes(importedBook.id), "imported text book should be added to shelf");
assert(afterImport.offlineBooks && afterImport.offlineBooks.includes(importedBook.id), "imported text book should be cached for offline reading");
click("start-book", { id: importedBook.id });
assert(reader.innerHTML.includes("我的读书摘录"), "imported text book should open in reader");
assert(reader.innerHTML.includes("第一段来自本地文本"), "imported reader should render pasted text");
assert(!reader.innerHTML.includes("纸页上有今天早晨留下的铅笔痕"), "imported text book should not fall back to the sample pages");
click("close-reader");

click("open-sheet", { sheet: "offline" });
assert(sheet.innerHTML.includes("离线书包"), "offline sheet should open");
assertNoGenericSheetJump("offline sheet");
click("toggle-offline", { id: "daodejing" });
const afterOffline = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterOffline.offlineBooks && afterOffline.offlineBooks.includes("daodejing"), "offline toggle should persist");

click("open-sheet", { sheet: "preferences" });
assert(sheet.innerHTML.includes("阅读偏好"), "preferences sheet should open");
assertNoGenericSheetJump("preferences sheet");
click("set-default-theme", { theme: "sage" });
let afterPreference = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterPreference.preferences && afterPreference.preferences.defaultTheme === "sage", "default reader theme should persist");
click("toggle-pref", { pref: "quietMode" });
afterPreference = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterPreference.preferences && afterPreference.preferences.quietMode === true, "quiet mode preference should persist");
click("switch-tab", { tab: "discover" });
assert(!appView.innerHTML.includes("共读房间"), "discover should keep co-reading promotion removed even when quiet mode changes");
click("switch-tab", { tab: "profile" });

click("open-sheet", { sheet: "goal" });
assert(sheet.innerHTML.includes("阅读目标"), "goal sheet should open");
assertNoGenericSheetJump("goal sheet");
click("set-goal", { goal: "45" });
const afterGoal = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterGoal.dailyGoal === 45, "daily goal should update");

click("open-sheet", { sheet: "review" });
assert(sheet.innerHTML.includes("本周阅读复盘"), "review sheet should render");
assert(sheet.innerHTML.includes("看看推荐"), "review should include next-book action");
assertNoGenericSheetJump("review sheet");

click("share-note", { id: newestNoteId });
assert(sheet.innerHTML.includes("书摘卡片"), "note card should render");
assert(sheet.innerHTML.includes("复制文案"), "note card should expose copy action");
click("copy-card");
assert(sheet.innerHTML.includes("已生成可复制文案"), "copy card should show a visible generated text result");
assert(sheet.innerHTML.includes("静光阅读") && sheet.innerHTML.includes("把喜欢的句子留在光里"), "copy card result should include brand line and reusable copy");

click("open-sheet", { sheet: "plan" });
assert(sheet.innerHTML.includes("本月慢读书单"), "monthly plan should render");
assert(sheet.innerHTML.includes("继续读") && sheet.innerHTML.includes("本月短读") && sheet.innerHTML.includes("下月候选"), "monthly plan should show useful sections instead of a flat repeated list");
assert(!sheet.innerHTML.includes("生成计划") && !sheet.innerHTML.includes("刷新计划") && !sheet.innerHTML.includes('data-action="generate-monthly-plan"'), "monthly plan should be live instead of exposing a fake generation action");
assert(sheet.innerHTML.includes("加入候选书"), "monthly plan should expose a concrete save action");
let afterMonthlyPlan = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterMonthlyPlan.monthlyPlanSaved !== true, "opening monthly plan should not persist a fake generated state");
const shelfSizeBeforeMonthlySave = new Set(afterMonthlyPlan.shelf || []).size;
click("save-monthly-plan");
afterMonthlyPlan = JSON.parse(localStorage.data["jingguang-reading-h5-state"] || "{}");
assert(afterMonthlyPlan.monthlyPlanSaved === true, "saving monthly plan should persist saved status");
assert(new Set(afterMonthlyPlan.shelf || []).size >= shelfSizeBeforeMonthlySave, "saving monthly plan should keep or expand the real-book shelf without removing books");

const savedPositionPlanRuntime = createAppRuntime({
  [STORAGE_KEY]: JSON.stringify({
    contentVersion: CURRENT_CONTENT_VERSION,
    progressPageModelVersion: CURRENT_PROGRESS_PAGE_MODEL_VERSION,
    selectedBookId: "daodejing",
    shelf: ["daodejing", "mencius", "caigentan"],
    progress: { daodejing: 0, mencius: 0, caigentan: 0 },
    readerPages: { daodejing: 2 },
    todayKey: "2000-01-01",
    checkedIn: false,
    todayMinutes: 0
  })
});
savedPositionPlanRuntime.click("open-sheet", { sheet: "plan" });
const planHtml = savedPositionPlanRuntime.sheet.innerHTML;
assert(planHtml.indexOf("继续读") < planHtml.indexOf("道德经") && planHtml.indexOf("道德经") < planHtml.indexOf("本月短读"), "monthly plan should put books with saved reader position into continue-reading instead of short unread list");

const savedPositionCollectionRuntime = createAppRuntime({
  [STORAGE_KEY]: JSON.stringify({
    contentVersion: CURRENT_CONTENT_VERSION,
    progressPageModelVersion: CURRENT_PROGRESS_PAGE_MODEL_VERSION,
    selectedBookId: "daodejing",
    shelf: ["daodejing"],
    progress: { daodejing: 0 },
    readerPages: { daodejing: 2 },
    collections: [
      { id: "night", title: "睡前短章", desc: "晚上只读一小段。", books: ["daodejing"], pinned: false }
    ],
    todayKey: "2000-01-01",
    checkedIn: false,
    todayMinutes: 0
  })
});
savedPositionCollectionRuntime.click("open-sheet", { sheet: "collections" });
assert(savedPositionCollectionRuntime.sheet.innerHTML.includes("在读 1 本 · 50%"), "collection card should count saved reader position as active reading even when completed progress is zero");
savedPositionCollectionRuntime.click("open-collection", { collection: "night" });
assert(savedPositionCollectionRuntime.sheet.innerHTML.includes("<strong>1</strong><span>在读</span>") && savedPositionCollectionRuntime.sheet.innerHTML.includes("<strong>50%</strong><span>最高位置</span>"), "collection detail should summarize saved reader position as visible progress");

console.log("qa-check passed");
