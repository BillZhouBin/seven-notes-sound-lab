import { cp, mkdir, rm, writeFile } from 'node:fs/promises';

const staticFiles = [
  'index.html',
  'styles.css',
  'app.js',
  'manifest.webmanifest',
  'service-worker.js',
  'CNAME',
  'icons',
];

await rm('dist/client', { recursive: true, force: true });
await rm('dist/server', { recursive: true, force: true });
await mkdir('dist/client', { recursive: true });
await mkdir('dist/server', { recursive: true });

for (const file of staticFiles) {
  await cp(file, `dist/client/${file}`, { recursive: true });
}

await writeFile(
  'dist/server/index.js',
  `export default {
  async fetch(request, env) {
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Static assets are unavailable.', { status: 500 });
  },
};
`,
);
