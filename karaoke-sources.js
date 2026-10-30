/*
 * Open timed-lyrics adapters.
 *
 * The page keeps its hand-edited Japanese/translation lyrics as the display
 * source.  This file only fetches word timings and converts the formats used
 * by open lyric providers into one small, TTML-like model:
 *
 *   {
 *     format: "timed-lyrics-v1",
 *     lines: [{ start, end, words: [{ text, start, end }] }]
 *   }
 *
 * Keeping this boundary separate means a provider can disappear without
 * changing the renderer.  The default worker is the public backend used by
 * Beautiful Lyrics Reborn; it races the open Musixmatch RichSync, QQ QRC,
 * KuGou KRC and NetEase YRC providers.  AMLL TTML DB is tried afterwards as
 * a direct, CORS-enabled fallback.
 */
(function (root) {
  "use strict";

  const CACHE_VERSION = "v3";
  const CACHE_PREFIX = "kaze-karaoke-";
  const DEFAULT_WORKER = "https://lyrics.txw.qzz.io";
  const AMLL_API = "https://api.amll.dev";
  const LRCLIB_API = "https://lrclib.net/api";
  const PROVIDER_ORDER = Object.freeze([
    "Musixmatch RichSync",
    "QQ Music QRC",
    "KuGou KRC",
    "NetEase YRC",
    "AMLL TTML DB",
    "LRCLIB lyricsfile（逐行時間）"
  ]);
  const pending = new Map();

  function finite(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function normaliseText(value) {
    return String(value == null ? "" : value)
      .normalize("NFKC")
      .replace(/[\[(](?:wave|clap|mic|chant|jump|spin|turn)[\])]/gi, "")
      .toLocaleLowerCase()
      .replace(/[\s\u3000、。！？!?.,，．・「」『』（）()\[\]{}【】<>《》:：;；…—–_「」『』“”‘’]/g, "");
  }

  function parseTime(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const text = String(value == null ? "" : value).trim();
    if (!text) return null;
    if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
    const unit = text.match(/^(-?\d+(?:\.\d+)?)(ms|s)$/i);
    if (unit) return Number(unit[1]) * (unit[2].toLowerCase() === "ms" ? 0.001 : 1);
    const clock = text.match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.:](\d+))?$/);
    if (!clock) return null;
    const hours = Number(clock[1] || 0);
    const minutes = Number(clock[2] || 0);
    const seconds = Number(clock[3] || 0);
    const fraction = clock[4] ? Number(`0.${clock[4]}`) : 0;
    return hours * 3600 + minutes * 60 + seconds + fraction;
  }

  function normaliseWords(rawWords) {
    if (!Array.isArray(rawWords)) return [];
    const out = [];
    rawWords.forEach((raw, index) => {
      if (!raw || typeof raw !== "object") return;
      const text = String(raw.text ?? raw.Text ?? raw.c ?? "");
      if (!text) return;
      const start = parseTime(raw.start ?? raw.StartTime ?? raw.ts ?? raw.time);
      let end = parseTime(raw.end ?? raw.EndTime ?? raw.te);
      const next = rawWords[index + 1];
      const nextStart = next && parseTime(next.start ?? next.StartTime ?? next.ts ?? next.time);
      if (end == null && nextStart != null) end = nextStart;
      if (start == null) return;
      if (end == null || end <= start) end = start + 0.04;
      out.push({ text, start, end });
    });
    return out;
  }

  function normaliseLines(lines, sourceName) {
    if (!Array.isArray(lines)) return null;
    const result = lines.map((line) => {
      const words = normaliseWords(line && (line.words || line.Syllables || line.syllables));
      if (!words.length) return null;
      const start = finite(line.start ?? line.StartTime) ?? words[0].start;
      const end = Math.max(
        finite(line.end ?? line.EndTime) ?? words[words.length - 1].end,
        words[words.length - 1].end
      );
      return {
        start: Math.max(0, start),
        end: Math.max(start + 0.04, end),
        text: words.map((word) => word.text).join(""),
        words
      };
    }).filter(Boolean).sort((a, b) => a.start - b.start);

    if (!result.length) return null;
    return {
      format: "timed-lyrics-v1",
      source: sourceName || "open timed lyrics",
      lines: result
    };
  }

  function normaliseBeautifulLyrics(payload) {
    if (!payload || typeof payload !== "object") return null;
    const type = String(payload.Type ?? payload.type ?? "").toLowerCase();
    if (type !== "syllable" && !Array.isArray(payload.Content) && !Array.isArray(payload.content)) return null;
    const content = payload.Content || payload.content || [];
    const lines = [];
    content.forEach((entry) => {
      if (!entry || String(entry.Type ?? entry.type ?? "").toLowerCase() !== "vocal") return;
      const lead = entry.Lead || entry.lead || entry;
      const syllables = lead.Syllables || lead.syllables || [];
      const words = syllables.map((word) => ({
        text: word.Text ?? word.text ?? "",
        start: word.StartTime ?? word.start,
        end: word.EndTime ?? word.end
      }));
      const line = normaliseLines([{
        start: lead.StartTime ?? lead.start,
        end: lead.EndTime ?? lead.end,
        words
      }], "");
      if (line) lines.push(line.lines[0]);
    });
    return normaliseLines(lines, "open provider pool");
  }

  function parseEnhancedLrc(text) {
    const lines = [];
    String(text || "").split(/\r?\n/).forEach((rawLine) => {
      const match = rawLine.match(/^\s*\[(\d+):(\d{1,2}(?:\.\d+)?)\](.*)$/);
      if (!match) return;
      const lineStart = Number(match[1]) * 60 + Number(match[2]);
      const body = match[3] || "";
      const timed = [];
      const token = /<((?:\d+:)?\d{1,2}:\d{1,2}(?:[.:]\d+)?)>/g;
      let cursor = 0;
      let hit;
      while ((hit = token.exec(body))) {
        if (cursor < hit.index && timed.length) {
          timed[timed.length - 1].text += body.slice(cursor, hit.index);
        }
        const start = parseTime(hit[1]);
        if (start != null) timed.push({ text: "", start, end: start + 0.04 });
        cursor = token.lastIndex;
      }
      if (cursor < body.length && timed.length) timed[timed.length - 1].text += body.slice(cursor);
      if (!timed.length) return;
      timed.forEach((word, index) => {
        const next = timed[index + 1];
        word.end = next ? Math.max(word.start + 0.04, next.start) : Math.max(word.start + 0.04, lineStart + 4);
      });
      lines.push({ start: lineStart, end: timed[timed.length - 1].end, words: timed });
    });
    return normaliseLines(lines, "Musixmatch RichSync");
  }

  function parseLrclibScalar(value) {
    const text = String(value == null ? "" : value).trim();
    if (text === "''" || text === '""') return "";
    if (text.startsWith("'") && text.endsWith("'")) {
      return text.slice(1, -1).replace(/''/g, "'");
    }
    if (text.startsWith('"') && text.endsWith('"')) {
      try { return JSON.parse(text); } catch (error) { return text.slice(1, -1); }
    }
    return text;
  }

  function parseLrclibLyricsFile(text) {
    const lines = [];
    String(text || "").split(/\r?\n(?=-\s*text:)/).forEach((block) => {
      const textMatch = block.match(/(?:^|\r?\n)-\s*text:\s*(.*)$/m);
      const startMatch = block.match(/(?:^|\r?\n)\s*start_ms:\s*(-?\d+(?:\.\d+)?)\s*$/m);
      const endMatch = block.match(/(?:^|\r?\n)\s*end_ms:\s*(-?\d+(?:\.\d+)?)\s*$/m);
      if (!textMatch || !startMatch || !endMatch) return;
      const lineText = parseLrclibScalar(textMatch[1]);
      const start = Number(startMatch[1]) / 1000;
      const end = Number(endMatch[1]) / 1000;
      if (!lineText.trim() || !Number.isFinite(start) || !Number.isFinite(end)) return;
      lines.push({ start, end, words: [{ text: lineText, start, end }] });
    });
    return normaliseLines(lines, "LRCLIB lyricsfile（逐行時間）");
  }

  function parseLrclibSyncedLyrics(text) {
    const lines = [];
    String(text || "").split(/\r?\n/).forEach((rawLine) => {
      const tags = [...rawLine.matchAll(/\[(\d+):(\d{1,2}(?:\.\d+)?)\]/g)];
      if (!tags.length) return;
      const lineText = rawLine.replace(/\[\d+:\d{1,2}(?:\.\d+)?\]/g, "").trim();
      if (!lineText) return;
      tags.forEach((tag) => {
        const start = Number(tag[1]) * 60 + Number(tag[2]);
        if (Number.isFinite(start)) lines.push({ start, text: lineText });
      });
    });
    lines.sort((a, b) => a.start - b.start);
    const timed = lines.map((line, index) => {
      const next = lines[index + 1];
      const end = next ? Math.max(line.start + 0.04, next.start) : line.start + 4;
      return { start: line.start, end, words: [{ text: line.text, start: line.start, end }] };
    });
    return normaliseLines(timed, "LRCLIB syncedLyrics（逐行時間）");
  }

  function parseLrclib(payload) {
    if (!payload || typeof payload !== "object") return null;
    return parseLrclibLyricsFile(payload.lyricsfile)
      || parseLrclibSyncedLyrics(payload.syncedLyrics);
  }

  function parseTtml(text) {
    if (typeof root.DOMParser !== "function") return null;
    let doc;
    try {
      doc = new root.DOMParser().parseFromString(String(text || ""), "application/xml");
    } catch (error) {
      return null;
    }
    if (!doc || doc.querySelector("parsererror")) return null;
    const paragraphs = Array.from(doc.getElementsByTagName("p"));
    const lines = [];
    paragraphs.forEach((paragraph) => {
      const timedNodes = Array.from(paragraph.getElementsByTagName("span"))
        .filter((node) => node.hasAttribute("begin"))
        .filter((node) => !Array.from(node.children || []).some((child) => child.hasAttribute("begin")));
      const words = timedNodes.map((node, index) => ({
        text: node.textContent || "",
        start: parseTime(node.getAttribute("begin")),
        end: parseTime(node.getAttribute("end"))
          ?? (timedNodes[index + 1] ? parseTime(timedNodes[index + 1].getAttribute("begin")) : null)
      }));
      const fallbackText = paragraph.textContent || "";
      const start = parseTime(paragraph.getAttribute("begin"));
      const end = parseTime(paragraph.getAttribute("end"));
      if (words.some((word) => word.text.trim())) {
        lines.push({ start, end, words });
      } else if (fallbackText.trim() && start != null) {
        lines.push({ start, end: end ?? start + 2, words: [{ text: fallbackText, start, end: end ?? start + 2 }] });
      }
    });
    return normaliseLines(lines, "AMLL TTML DB");
  }

  function getLocalStorage() {
    try {
      return root.localStorage;
    } catch (error) {
      return null;
    }
  }

  function cacheKey(song) {
    return `${CACHE_PREFIX}${CACHE_VERSION}-${String(song && song.id || "unknown")}`;
  }

  function readCache(song) {
    const storage = getLocalStorage();
    if (!storage) return null;
    try {
      const value = JSON.parse(storage.getItem(cacheKey(song)) || "null");
      return value && value.format === "timed-lyrics-v1" ? value : null;
    } catch (error) {
      return null;
    }
  }

  function writeCache(song, value) {
    const storage = getLocalStorage();
    if (!storage || !value) return;
    try {
      storage.setItem(cacheKey(song), JSON.stringify(value));
    } catch (error) {
      // A full localStorage must never disable the lyric page.
    }
  }

  function notify(options, event) {
    if (options && typeof options.onStatus === "function") {
      try { options.onStatus(event); } catch (error) { /* UI callback is optional */ }
    }
  }

  async function fetchJson(url, options) {
    const controller = typeof root.AbortController === "function" ? new root.AbortController() : null;
    const timeout = root.setTimeout(() => controller && controller.abort(), (options && options.timeoutMs) || 9000);
    try {
      const response = await root.fetch(url, {
        signal: controller ? controller.signal : undefined,
        headers: (options && options.headers) || { Accept: "application/json" }
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      return null;
    } finally {
      root.clearTimeout(timeout);
    }
  }

  function sourceTitle(song) {
    if (song && Array.isArray(song.karaokeTitles) && song.karaokeTitles.length) return String(song.karaokeTitles[0]);
    if (song && song.karaokeTitle) return String(song.karaokeTitle);
    const title = String(song && song.title || "");
    const matches = [...title.matchAll(/\(([^()]*)\)/g)];
    return matches.length ? matches[matches.length - 1][1] : title;
  }

  function sourceArtist(song) {
    return String(song && (song.artist || song.karaokeArtist) || "Fujii Kaze");
  }

  function sourceTitles(song) {
    return [...new Set([sourceTitle(song), ...((song && song.karaokeTitles) || [])])];
  }

  function sourceArtists(song) {
    return [...new Set([sourceArtist(song), ...((song && song.karaokeArtists) || [])])];
  }

  function normaliseSearch(value) {
    return String(value || "").normalize("NFKD").replace(/\p{M}/gu, "")
      .toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
  }

  function matchesSong(titles, artists, song) {
    if (!Array.isArray(titles) || !Array.isArray(artists)) return false;
    return titles.some(title => sourceTitles(song).some(wanted => normaliseSearch(title) === normaliseSearch(wanted)))
      && artists.some(artist => sourceArtists(song).some(wanted => normaliseSearch(artist) === normaliseSearch(wanted)));
  }

  function estimatedSongDuration(song) {
    const times = Array.isArray(song && song.lyrics)
      ? song.lyrics.map(line => finite(line && line.time)).filter(value => value != null)
      : [];
    return times.length ? Math.max(...times) + 5 : null;
  }

  function scoreLrclibCandidate(candidate, song, options) {
    if (!candidate || candidate.instrumental) return -Infinity;
    if (!candidate.lyricsfile && !candidate.syncedLyrics) return -Infinity;
    if (!matchesSong([candidate.trackName || candidate.name], [candidate.artistName], song)) return -Infinity;
    const wantedTitle = normaliseText(sourceTitle(song));
    const candidateTitle = normaliseText(candidate.trackName || candidate.name || "");
    const wantedArtist = normaliseText(sourceArtist(song));
    const candidateArtist = normaliseText(candidate.artistName || "");
    if (!candidateTitle || !candidateArtist) return -Infinity;

    let score = 0;
    if (candidateTitle === wantedTitle) score += 30;
    else if (candidateTitle.includes(wantedTitle) || wantedTitle.includes(candidateTitle)) score += 12;
    if (candidateArtist === wantedArtist) score += 12;
    else if (candidateArtist.includes(wantedArtist) || wantedArtist.includes(candidateArtist)) score += 8;

    const wantedDuration = finite(options && options.duration) || estimatedSongDuration(song);
    const candidateDuration = finite(candidate.duration);
    if (wantedDuration && candidateDuration) {
      const difference = Math.abs(wantedDuration - candidateDuration);
      if (difference <= 3) score += 12;
      else if (difference <= 8) score += 7;
      else if (difference <= 20) score += 2;
      else if (difference <= 30) score -= 3;
      else score -= 25;
    }
    if (candidate.lyricsfile) score += 2;
    return score;
  }

  async function fetchWorker(song, options) {
    const base = String((options && options.workerUrl) || DEFAULT_WORKER).replace(/\/$/, "");
    const trackId = encodeURIComponent(`kaze-${String(song && song.id || "song")}`);
    const url = new URL(`${base}/lyrics/${trackId}`);
    url.searchParams.set("track_name", sourceTitle(song));
    url.searchParams.append("artist_name", sourceArtist(song));
    const duration = finite(options && options.duration);
    if (duration && duration > 0) url.searchParams.set("duration", String(Math.round(duration)));
    const payload = await fetchJson(url.toString(), {
      timeoutMs: (options && options.timeoutMs) || 12000,
      headers: { Accept: "application/json", Authorization: "Bearer static-site" }
    });
    const timed = normaliseBeautifulLyrics(payload);
    if (timed) {
      timed.source = "開源多來源（Musixmatch / QQ / 酷狗 / 網易雲）";
      timed.providerOrder = PROVIDER_ORDER.slice(0, 4);
    }
    return timed;
  }

  async function searchProvider(song, provider, options) {
    let failed = false;
    const queries = sourceTitles(song).map(title => ({ title }));
    if (provider === "lrclib") queries.push({ title: sourceTitle(song), keyword: true });
    for (const { title, keyword } of queries) {
      const url = new URL(provider === "amll" ? `${AMLL_API}/v1/lyrics/search` : `${LRCLIB_API}/search`);
      if (keyword) url.searchParams.set("q", `${sourceArtist(song)} ${title}`);
      else {
        url.searchParams.set(provider === "amll" ? "musicName" : "track_name", title);
        url.searchParams.set(provider === "amll" ? "artistName" : "artist_name", sourceArtist(song));
      }
      if (provider === "amll") url.searchParams.set("pageSize", "10");
      const search = await fetchJson(url.toString(), { timeoutMs: (options && options.timeoutMs) || 7000 });
      // Preserve a service failure as an error, distinct from an empty result.
      if (search == null) { failed = true; continue; }
      const items = provider === "amll"
        ? (search.status === 200 && Array.isArray(search.data && search.data.items) ? search.data.items : null)
        : (Array.isArray(search) ? search : null);
      if (!items) { failed = true; continue; }
      const matches = items.filter(candidate => provider === "amll"
        ? matchesSong(candidate.musicNames || [], candidate.artistNames || [], song)
        : matchesSong([candidate.trackName || candidate.name], [candidate.artistName], song) && !candidate.instrumental
          && (!(options && options.syncedOnly) || candidate.lyricsfile || candidate.syncedLyrics));
      if (matches.length) return matches;
    }
    return failed ? null : [];
  }

  // Discovery deliberately exposes only source metadata, never lyric text.
  async function discover(song, options) {
    const [amll, lrclib] = await Promise.all([
      searchProvider(song, "amll", options), searchProvider(song, "lrclib", options)
    ]);
    return {
      amll: {
        state: amll === null ? "error" : amll.length ? "found" : "miss",
        candidates: (amll || []).map(item => ({
          id: item.id, titles: item.musicNames, artists: item.artistNames,
          url: `${AMLL_API}/v1/lyrics/get?id=${encodeURIComponent(item.id)}`
        }))
      },
      lrclib: {
        state: lrclib === null ? "error" : lrclib.length ? "found" : "miss",
        candidates: (lrclib || []).map(item => ({
          id: item.id, title: item.trackName, artist: item.artistName, album: item.albumName,
          duration: item.duration, hasSyncedLyrics: Boolean(item.lyricsfile || item.syncedLyrics),
          url: `${LRCLIB_API}/get/${encodeURIComponent(item.id)}`
        }))
      }
    };
  }

  async function fetchAmll(song, options) {
    const items = await searchProvider(song, "amll", options);
    const item = items && items[0];
    if (!item) return null;

    const lyricUrl = new URL(`${AMLL_API}/v1/lyrics/get`);
    lyricUrl.searchParams.set("id", String(item.id));
    const fetched = await fetchJson(lyricUrl.toString(), { timeoutMs: (options && options.timeoutMs) || 7000 });
    const ttml = fetched && fetched.status === 200 && fetched.data && fetched.data.lyrics;
    const timed = ttml ? parseTtml(ttml) : null;
    if (timed) timed.providerOrder = ["AMLL TTML DB"];
    return timed;
  }

  async function fetchLrclib(song, options) {
    const search = await searchProvider(song, "lrclib", { ...options, syncedOnly: true });
    if (!Array.isArray(search)) return null;

    const candidates = search
      .map((candidate, index) => ({ candidate, index, score: scoreLrclibCandidate(candidate, song, options) }))
      .filter(entry => Number.isFinite(entry.score))
      .sort((a, b) => b.score - a.score || a.index - b.index);
    for (const entry of candidates) {
      const timed = parseLrclib(entry.candidate);
      if (!timed) continue;
      timed.source = timed.source || "LRCLIB lyricsfile（逐行時間）";
      timed.providerOrder = ["LRCLIB lyricsfile（逐行時間）"];
      timed.granularity = "line";
      timed.trackId = entry.candidate.id;
      return timed;
    }
    return null;
  }

  async function load(song, options) {
    if (!song || !song.id) return null;
    const opts = options || {};
    const key = cacheKey(song);
    if (pending.has(key)) return pending.get(key);

    const cached = readCache(song);
    if (cached) {
      notify(opts, { state: "cache", source: cached.source });
      return cached;
    }
    if (root.navigator && root.navigator.onLine === false) {
      notify(opts, { state: "offline" });
      return null;
    }

    const request = (async () => {
      notify(opts, { state: "loading", source: PROVIDER_ORDER.slice(0, 4).join(" → ") });
      let timed = await fetchWorker(song, opts);
      if (!timed) {
        notify(opts, { state: "fallback", source: "AMLL TTML DB" });
        timed = await fetchAmll(song, opts);
      }
      if (!timed) {
        notify(opts, { state: "fallback", source: "LRCLIB lyricsfile（逐行時間）" });
        timed = await fetchLrclib(song, opts);
      }
      if (timed) {
        writeCache(song, timed);
        notify(opts, { state: "ready", source: timed.source });
      } else {
        notify(opts, { state: "miss" });
      }
      return timed;
    })();
    pending.set(key, request);
    try {
      return await request;
    } finally {
      pending.delete(key);
    }
  }

  function flattenWords(lines) {
    const words = [];
    (lines || []).forEach((line) => (line.words || []).forEach((word) => {
      words.push({ ...word, sourceWord: words.length });
    }));
    return words;
  }

  function median(values) {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (!sorted.length) return 0;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  /* Match provider text to the hand-edited line list, then translate the
     provider's audio clock into the YouTube video's clock. */
  function alignToLocalLyrics(timedLyrics, localLyrics) {
    if (!timedLyrics || !Array.isArray(timedLyrics.lines) || !Array.isArray(localLyrics)) return null;
    const words = flattenWords(timedLyrics.lines);
    const chars = [];
    words.forEach((word, wordIndex) => {
      Array.from(normaliseText(word.text)).forEach((char) => {
        chars.push({ char, wordIndex, start: word.start, end: word.end });
      });
    });
    const sourceText = chars.map((entry) => entry.char).join("");
    if (!sourceText) return null;

    const matches = [];
    let cursor = 0;
    localLyrics.forEach((line, index) => {
      const text = normaliseText(line && line.jp);
      if (text.length < 2) return;
      let position = sourceText.indexOf(text, cursor);
      if (position < 0) position = sourceText.indexOf(text);
      if (position < 0) return;
      const first = chars[position];
      const last = chars[position + text.length - 1];
      if (!first || !last) return;
      const localStart = finite(line.time);
      if (localStart == null) return;
      const firstWord = first.wordIndex;
      const lastWord = last.wordIndex;
      const matchedWords = words.slice(firstWord, lastWord + 1);
      if (!matchedWords.length) return;
      matches.push({
        index,
        position,
        start: first.start,
        end: Math.max(first.start + 0.04, last.end),
        localStart,
        words: matchedWords
      });
      cursor = position + text.length;
    });

    const eligible = localLyrics.filter((line) => normaliseText(line && line.jp).length >= 2).length;
    const minimum = Math.min(3, Math.max(1, eligible));
    if (matches.length < minimum) return null;
    if (eligible >= 6 && matches.length / eligible < 0.18) return null;

    /* Keep the existing hand-edited line anchors authoritative.  Providers
       often use a different intro trim or combine/split lines, so applying
       one global offset to every word can make the first line visibly late.
       We still expose the robust median offset for diagnostics, while each
       matched line keeps its local anchor and preserves the provider's
       relative word rhythm inside that line. */
    const offset = median(matches.map((match) => match.localStart - match.start));
    const aligned = Array(localLyrics.length).fill(null);
    matches.forEach((match) => {
      const lineOffset = match.localStart - match.start;
      const wordsWithOffset = match.words.map((word) => ({
        text: word.text,
        start: Math.max(0, word.start + lineOffset),
        end: Math.max(word.start + lineOffset + 0.04, word.end + lineOffset)
      }));
      aligned[match.index] = {
        start: Math.max(0, match.localStart),
        end: Math.max(match.localStart + 0.04, match.end + lineOffset),
        granularity: timedLyrics.granularity || "word",
        words: wordsWithOffset
      };
    });
    return {
      format: "timed-lyrics-v1-aligned",
      songId: null,
      source: timedLyrics.source,
      providerOrder: timedLyrics.providerOrder || PROVIDER_ORDER.slice(),
      offset,
      matchedLines: matches.length,
      totalLines: eligible,
      lines: aligned
    };
  }

  /* Map the displayed units (Japanese, ruby-wrapped kana, or romaji words)
     to provider words.  Romaji cannot be text-matched to Japanese, so the
     caller can use the returned match count to choose a proportional fallback. */
  function mapUnitsToWords(unitTexts, words) {
    const chars = [];
    (words || []).forEach((word, wordIndex) => {
      Array.from(normaliseText(word.text)).forEach((char) => chars.push({ char, wordIndex, word }));
    });
    const text = chars.map((entry) => entry.char).join("");
    const out = [];
    let cursor = 0;
    let matched = 0;
    (unitTexts || []).forEach((unitText) => {
      const wanted = normaliseText(unitText);
      if (!wanted) {
        out.push(null);
        return;
      }
      let position = text.indexOf(wanted, cursor);
      if (position < 0) position = text.indexOf(wanted);
      if (position < 0) {
        out.push(null);
        return;
      }
      const first = chars[position];
      const last = chars[position + wanted.length - 1];
      out.push({
        start: first.word.start,
        end: Math.max(first.word.start + 0.04, last.word.end)
      });
      cursor = position + wanted.length;
      matched += 1;
    });
    return { timings: out, matched, total: (unitTexts || []).filter((textValue) => normaliseText(textValue)).length };
  }

  function normaliseRomajiText(value) {
    return String(value == null ? "" : value)
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLocaleLowerCase()
      .replace(/[\s\u3000、。！？!?.,，．・「」『』（）()\[\]{}【】<>《》:：;；…—–_「」『』“”‘’'’"]/g, "");
  }

  function romajiVariants(value) {
    const raw = String(value == null ? "" : value).toLocaleLowerCase();
    const base = normaliseRomajiText(raw);
    const variants = new Set(base ? [base] : []);
    const macronExpansions = {
      "ā": ["aa"],
      "ī": ["ii"],
      "ū": ["uu"],
      "ē": ["ee", "ei"],
      "ō": ["oo", "ou"],
    };
    let expandedValues = [raw];
    Object.entries(macronExpansions).forEach(([macron, values]) => {
      const nextValues = [];
      expandedValues.forEach(current => {
        if (!current.includes(macron)) {
          nextValues.push(current);
          return;
        }
        values.forEach(value => nextValues.push(current.replaceAll(macron, value)));
      });
      expandedValues = nextValues;
    });
    expandedValues.forEach(expanded => {
      const expandedValue = normaliseRomajiText(expanded);
      if (expandedValue) variants.add(expandedValue);
    });

    /* A standalone macron can correspond to the preceding vowel, a source
       kana `う`, or a long-mark expansion.  Keep all of those forms
       equivalent while matching display words to the Japanese reference. */
    if (/^[āīūēō]$/u.test(raw)) {
      const standalone = {
        "ā": ["a", "aa"],
        "ī": ["i", "ii"],
        "ū": ["u", "uu"],
        "ē": ["e", "ee", "ei"],
        "ō": ["o", "u", "oo", "ou"],
      }[raw] || [];
      standalone.forEach(value => variants.add(value));
    }

    /* Natural romaji commonly writes the topic particle は as `wa` and the
       direction particle へ as `e`, while their kana readings remain は／へ.
       Keep the ordinary word spellings first, then accept these two
       context-sensitive alternatives when the canonical stream needs them. */
    if (base === "wa") variants.add("ha");
    if (base === "e") variants.add("he");
    if (/wa$/u.test(base)) variants.add(base.replace(/wa$/u, "ha"));

    /* Existing lyric readings use ordinary Hepburn spellings as well as the
       nasal-assimilation spellings heard in singing: `senmei`/`semmei`,
       `unmei`/`ummei`, `shinpaku`/`shimpaku`, and so on. */
    if (/m(?=[bmp])/u.test(base)) variants.add(base.replace(/m(?=[bmp])/gu, "n"));
    if (/n(?=[bmp])/u.test(base)) variants.add(base.replace(/n(?=[bmp])/gu, "m"));

    /* A few hand-maintained lines keep a visible word break inside a yōon,
       e.g. `hi yururi` for ひゅるり.  When adjacent units are considered
       together, accept the equally common `hiyu` → `hyu` spelling. */
    [...variants].forEach(candidate => {
      const yōonVariant = candidate.replace(/([bcdfghjklmnpqrstvwxyz])i(?=y[aeiou])/gu, "$1");
      if (yōonVariant !== candidate) variants.add(yōonVariant);
      const iuVariant = candidate.replace(/yuu/gu, "iu");
      if (iuVariant !== candidate) variants.add(iuVariant);
    });
    [...variants].forEach(candidate => {
      if (/cch/u.test(candidate)) variants.add(candidate.replace(/cch/gu, "tch"));
      if (/tch/u.test(candidate)) variants.add(candidate.replace(/tch/gu, "cch"));
    });

    return [...variants].filter(Boolean).sort((a, b) => b.length - a.length);
  }

  const KANA_ROMAJI = Object.freeze({
    "ぁ": "a", "あ": "a", "ぃ": "i", "い": "i", "ぅ": "u", "う": "u", "ぇ": "e", "え": "e", "ぉ": "o", "お": "o",
    "か": "ka", "き": "ki", "く": "ku", "け": "ke", "こ": "ko", "が": "ga", "ぎ": "gi", "ぐ": "gu", "げ": "ge", "ご": "go",
    "さ": "sa", "し": "shi", "す": "su", "せ": "se", "そ": "so", "ざ": "za", "じ": "ji", "ず": "zu", "ぜ": "ze", "ぞ": "zo",
    "た": "ta", "ち": "chi", "つ": "tsu", "て": "te", "と": "to", "だ": "da", "ぢ": "ji", "づ": "zu", "で": "de", "ど": "do",
    "な": "na", "に": "ni", "ぬ": "nu", "ね": "ne", "の": "no", "は": "ha", "ひ": "hi", "ふ": "fu", "へ": "he", "ほ": "ho",
    "ば": "ba", "び": "bi", "ぶ": "bu", "べ": "be", "ぼ": "bo", "ぱ": "pa", "ぴ": "pi", "ぷ": "pu", "ぺ": "pe", "ぽ": "po",
    "ま": "ma", "み": "mi", "む": "mu", "め": "me", "も": "mo", "や": "ya", "ゆ": "yu", "よ": "yo",
    "ら": "ra", "り": "ri", "る": "ru", "れ": "re", "ろ": "ro", "わ": "wa", "ゐ": "wi", "ゑ": "we", "を": "o", "ん": "n",
    "ゔ": "vu", "きゃ": "kya", "きゅ": "kyu", "きょ": "kyo", "ぎゃ": "gya", "ぎゅ": "gyu", "ぎょ": "gyo",
    "しゃ": "sha", "しゅ": "shu", "しょ": "sho", "じゃ": "ja", "じゅ": "ju", "じょ": "jo",
    "ちゃ": "cha", "ちゅ": "chu", "ちょ": "cho", "ぢゃ": "ja", "ぢゅ": "ju", "ぢょ": "jo",
    "にゃ": "nya", "にゅ": "nyu", "にょ": "nyo", "ひゃ": "hya", "ひゅ": "hyu", "ひょ": "hyo",
    "びゃ": "bya", "びゅ": "byu", "びょ": "byo", "ぴゃ": "pya", "ぴゅ": "pyu", "ぴょ": "pyo",
    "みゃ": "mya", "みゅ": "myu", "みょ": "myo", "りゃ": "rya", "りゅ": "ryu", "りょ": "ryo",
    "うぁ": "wa", "うぃ": "wi", "うぇ": "we", "うぉ": "wo", "ゔぁ": "va", "ゔぃ": "vi", "ゔぇ": "ve", "ゔぉ": "vo",
    "しぇ": "she", "じぇ": "je", "ちぇ": "che", "てぃ": "ti", "でぃ": "di", "とぅ": "tu", "どぅ": "du",
    "ふぁ": "fa", "ふぃ": "fi", "ふぇ": "fe", "ふぉ": "fo",
    "ぁ": "a", "ぃ": "i", "ぅ": "u", "ぇ": "e", "ぉ": "o", "ゃ": "ya", "ゅ": "yu", "ょ": "yo",
  });

  function hiraganaChar(char) {
    const code = String(char || "").codePointAt(0);
    return code >= 0x30a1 && code <= 0x30f6
      ? String.fromCodePoint(code - 0x60)
      : String(char || "");
  }

  function referenceRomajiChars(referenceTexts) {
    const source = [];
    (referenceTexts || []).forEach((value, referenceIndex) => {
      Array.from(String(value == null ? "" : value).normalize("NFKC"))
        .forEach(char => source.push({ char, referenceIndex }));
    });

    const output = [];
    const append = (value, indices) => {
      const chars = Array.from(value);
      const first = indices[0];
      const last = indices[indices.length - 1] ?? first;
      chars.forEach((char, index) => {
        output.push({
          char,
          referenceIndex: index === chars.length - 1 ? last : first,
        });
      });
    };
    const nextKana = index => hiraganaChar(source[index]?.char || "");

    for (let index = 0; index < source.length;) {
      const current = hiraganaChar(source[index].char);
      if (/\s/u.test(current) || /[、。！？!?.,，．・「」『』（）()\[\]{}【】<>《》:：;；…—–_'"]/u.test(current)) {
        index += 1;
        continue;
      }

      if (current === "っ") {
        const next = nextKana(index + 1);
        const nextPair = `${next}${nextKana(index + 2)}`;
        const nextRomaji = KANA_ROMAJI[nextPair] || KANA_ROMAJI[next] || "";
        const consonant = nextRomaji.startsWith("ch")
          ? "t"
          : nextRomaji.match(/^[bcdfghjklmnpqrstvwxyz]/u)?.[0];
        if (consonant) output.push({ char: consonant, referenceIndex: source[index].referenceIndex });
        index += 1;
        continue;
      }

      if (current === "ー") {
        const previous = [...output].reverse().find(entry => /[aeiou]/u.test(entry.char));
        if (previous) {
          output.push({
            char: previous.char.match(/[aeiou]/u)[0],
            referenceIndex: source[index].referenceIndex,
          });
        }
        index += 1;
        continue;
      }

      const next = nextKana(index + 1);
      const pair = `${current}${next}`;
      const romaji = KANA_ROMAJI[pair] || KANA_ROMAJI[current];
      if (romaji) {
        const indices = [source[index].referenceIndex];
        if (KANA_ROMAJI[pair] && source[index + 1]) indices.push(source[index + 1].referenceIndex);
        append(romaji, indices);
        index += KANA_ROMAJI[pair] ? 2 : 1;
        continue;
      }

      const normalised = normaliseRomajiText(current);
      if (normalised) append(normalised, [source[index].referenceIndex]);
      index += 1;
    }
    return output;
  }

  function fillUnmatchedReferenceTimings(unitTexts, timings, referenceTimings) {
    const out = timings.slice();
    const total = (unitTexts || []).filter(textValue => romajiVariants(textValue).length).length;
    const isTimed = timing => timing && Number.isFinite(Number(timing.start)) && Number.isFinite(Number(timing.end));
    const lineStart = referenceTimings.find(isTimed)?.start ?? 0;
    const reverse = [...referenceTimings].reverse().find(isTimed);
    const lineEnd = reverse ? reverse.end : lineStart + 0.04;
    const meaningful = (unitTexts || []).map((textValue, index) => ({
      index,
      meaningful: romajiVariants(textValue).length > 0,
    })).filter(entry => entry.meaningful);

    for (let position = 0; position < meaningful.length;) {
      if (isTimed(out[meaningful[position].index])) {
        position += 1;
        continue;
      }

      const first = position;
      while (position < meaningful.length && !isTimed(out[meaningful[position].index])) position += 1;
      const last = position - 1;
      const previous = first > 0 ? out[meaningful[first - 1].index] : null;
      const next = position < meaningful.length ? out[meaningful[position].index] : null;
      const start = Number(previous?.end ?? lineStart);
      const end = Number(next?.start ?? lineEnd);
      const span = Math.max(0.04, end - start);
      const weights = meaningful.slice(first, last + 1).map(entry =>
        Math.max(0.45, romajiVariants(unitTexts[entry.index]).join("").length || 1)
      );
      const weightSum = weights.reduce((sum, value) => sum + value, 0) || 1;
      let cursor = start;
      weights.forEach((weight, offset) => {
        const nextCursor = cursor + span * weight / weightSum;
        out[meaningful[first + offset].index] = {
          start: cursor,
          end: Math.max(cursor + 0.02, nextCursor),
        };
        cursor = nextCursor;
      });
    }
    return { timings: out, total };
  }

  /* Map natural romaji display units onto the timing spans of the Japanese
     reference units.  The readings are kept as separate units while they
     are transliterated as one stream, so さと + っ + て becomes satotte and
     the resulting word spans all three Japanese timings. */
  function mapUnitsToReferenceTimings(unitTexts, referenceTexts, referenceTimings) {
    const chars = referenceRomajiChars(referenceTexts);
    const text = chars.map(entry => entry.char).join("");
    const out = [];
    const unmatched = [];
    let cursor = 0;
    let matched = 0;

    const units = unitTexts || [];
    const findMatch = variants => {
      let position = -1;
      let matchedValue = "";
      for (const variant of variants) {
        const candidate = text.indexOf(variant, cursor);
        if (candidate < 0) continue;
        if (position < 0 || candidate < position
          || (candidate === position && variant.length > matchedValue.length)) {
          position = candidate;
          matchedValue = variant;
        }
      }
      return { position, matchedValue };
    };

    for (let unitIndex = 0; unitIndex < units.length; unitIndex += 1) {
      const unitText = units[unitIndex];
      const variants = romajiVariants(unitText);
      if (!variants.length) {
        out.push(null);
        continue;
      }

      let consumed = 1;
      let match = findMatch(variants);
      if (match.position < 0 && unitIndex + 1 < units.length
        && romajiVariants(units[unitIndex + 1]).length) {
        const combined = romajiVariants(`${unitText}${units[unitIndex + 1]}`);
        const combinedMatch = findMatch(combined);
        if (combinedMatch.position >= 0) {
          match = combinedMatch;
          consumed = 2;
        }
      }

      if (match.position < 0) {
        out.push(null);
        unmatched.push(unitIndex);
        continue;
      }

      const first = chars[match.position];
      const last = chars[match.position + match.matchedValue.length - 1];
      const firstTiming = first && referenceTimings[first.referenceIndex];
      const lastTiming = last && referenceTimings[last.referenceIndex];
      if (!firstTiming || !lastTiming) {
        for (let offset = 0; offset < consumed; offset += 1) {
          out.push(null);
          unmatched.push(unitIndex + offset);
        }
        unitIndex += consumed - 1;
        continue;
      }
      const timing = {
        start: Number(firstTiming.start),
        end: Math.max(Number(firstTiming.start) + 0.04, Number(lastTiming.end)),
      };
      out.push(timing);
      if (consumed === 2) out.push({ ...timing });
      cursor = match.position + match.matchedValue.length;
      matched += consumed;
      unitIndex += consumed - 1;
    }

    const filled = fillUnmatchedReferenceTimings(unitTexts, out, referenceTimings);
    return {
      timings: filled.timings,
      matched,
      total: filled.total,
      complete: unmatched.length === 0,
      unmatched,
    };
  }

  function allocateUnitTimings(unitTexts, start, end) {
    const total = Math.max(0.04, end - start);
    const weights = (unitTexts || []).map((text) =>
      normaliseText(text) ? Math.max(0.45, normaliseText(text).length || 1) : 0
    );
    const weightSum = weights.reduce((sum, value) => sum + value, 0) || 1;
    let cursor = start;
    return weights.map((weight) => {
      if (!weight) return null;
      const next = cursor + total * weight / weightSum;
      const result = { start: cursor, end: Math.max(cursor + 0.02, next) };
      cursor = next;
      return result;
    });
  }

  root.KARAOKE_SOURCES = Object.freeze({
    CACHE_VERSION,
    DEFAULT_WORKER,
    LRCLIB_API,
    PROVIDER_ORDER,
    normaliseText,
    normaliseRomajiText,
    parseEnhancedLrc,
    parseLrclib,
    parseLrclibLyricsFile,
    parseLrclibSyncedLyrics,
    parseTtml,
    normaliseBeautifulLyrics,
    discover,
    load,
    alignToLocalLyrics,
    mapUnitsToWords,
    mapUnitsToReferenceTimings,
    allocateUnitTimings
  });
})(typeof window !== "undefined" ? window : globalThis);
