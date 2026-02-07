const MAX_ENTRIES = 200;
const MAX_NAME = 16;
const MAX_SCORE = 1_000_000_000;
const ALLOWED_GAMES = new Set(["holdem", "blackjack", "baccarat", "slots"]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function sanitizeName(raw) {
  if (!raw) return "익명";
  const cleaned = String(raw)
    .trim()
    .replace(/[^0-9a-zA-Z가-힣 _.-]/g, "")
    .slice(0, MAX_NAME);
  return cleaned || "익명";
}

async function readBoard(env) {
  const data = await env.LEADERBOARD.get("board", "json");
  return Array.isArray(data) ? data : [];
}

async function writeBoard(env, list) {
  const trimmed = list.slice(0, MAX_ENTRIES);
  await env.LEADERBOARD.put("board", JSON.stringify(trimmed));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/leaderboard") {
      if (request.method === "GET") {
        const game = url.searchParams.get("game");
        const list = await readBoard(env);
        const filtered = ALLOWED_GAMES.has(game) ? list.filter(x => x.game === game) : list;
        const top = filtered
          .slice()
          .sort((a, b) => b.score - a.score)
          .slice(0, 50);
        return json({ items: top });
      }
      if (request.method === "POST") {
        let body = null;
        try {
          body = await request.json();
        } catch {
          return json({ error: "invalid_json" }, 400);
        }
        const name = sanitizeName(body?.name);
        const game = ALLOWED_GAMES.has(body?.game) ? body.game : "holdem";
        let score = Number(body?.score || 0);
        if (!Number.isFinite(score)) score = 0;
        score = Math.max(0, Math.min(MAX_SCORE, Math.floor(score)));

        const list = await readBoard(env);
        list.push({ name, score, game, ts: Date.now() });
        list.sort((a, b) => b.score - a.score);
        await writeBoard(env, list);
        return json({ ok: true });
      }
      return json({ error: "method_not_allowed" }, 405);
    }

    // Serve static assets from /public via the built-in assets binding.
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return assetResponse;

    // Fallback to index.html for unknown paths.
    const indexUrl = new URL("/index.html", url.origin);
    return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
  },
};
