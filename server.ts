// Serveur Node traditionnel : utilisé en développement local (npm run dev) et
// pour tout hébergement Node persistant (Railway, Render, VM, etc.). Sur
// Vercel, c'est api/index.ts qui sert les mêmes routes en fonction serverless
// (voir apiRoutes.ts, partagé entre les deux entrées) — server.ts n'y tourne pas.
import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerApiRoutes } from './apiRoutes.js';

dotenv.config();

// En dev (npm run dev via tsx), ce fichier tourne en ESM : import.meta.url est disponible
// et __dirname ne l'est pas. En production, esbuild bundle ce fichier en CommonJS
// (dist/server.cjs) : Node fournit alors nativement __dirname, mais import.meta.url est vidé
// par esbuild (voir avertissement de build) — l'appeler inconditionnellement fait planter le
// serveur au démarrage. On détecte donc le format à l'exécution plutôt que de supposer l'un ou l'autre.
const currentDir = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' })); // signatures tactiles encodées en base64

  registerApiRoutes(app);

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    // Serve index.html dynamically
    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = await vite.transformIndexHtml(url, `<!doctype html>
<html lang="fr-CA">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gestion Chantier Pro</title>
  </head>
  <body class="bg-[#0F1115] text-[#E0E2E6]">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        console.error(e);
        next(e);
      }
    });
  } else {
    // Serve static files in production. Le bundle esbuild (dist/server.cjs) vit dans le
    // même dossier dist/ que les fichiers générés par Vite (dist/index.html, dist/assets/...)
    // — currentDir EST déjà ce dossier dist/, pas besoin d'y ajouter 'dist' à nouveau.
    app.use(express.static(currentDir));
    app.get('*', (req, res) => {
      res.sendFile(path.join(currentDir, 'index.html'));
    });
  }

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer();
