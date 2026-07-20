export default {
  async fetch(request, env) {
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Static assets are unavailable.', { status: 500 });
  },
};
