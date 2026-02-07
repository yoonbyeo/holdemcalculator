export default {
  async fetch(request, env) {
    // Serve static assets from /public via the built-in assets binding.
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return assetResponse;

    // Fallback to index.html for unknown paths.
    const url = new URL(request.url);
    const indexUrl = new URL("/index.html", url.origin);
    return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
  },
};
