// Point d'entrée Vercel : toute requête /api/* est réécrite ici (voir vercel.json).
// Les routes elles-mêmes vivent dans apiRoutes.ts, partagé avec server.ts (le
// serveur Node traditionnel utilisé en développement local et hors Vercel).
import express from 'express';
import { registerApiRoutes } from '../apiRoutes';

const app = express();
app.use(express.json({ limit: '15mb' })); // signatures tactiles encodées en base64

// Filet de sécurité : si l'enregistrement des routes échoue (dépendance qui plante
// à l'import, configuration invalide…), on expose l'erreur en JSON sur toutes les
// routes au lieu de laisser Vercel renvoyer sa page FUNCTION_INVOCATION_FAILED
// opaque — le diagnostic reste alors possible via n'importe quel appel /api/*.
try {
  registerApiRoutes(app);
} catch (e: any) {
  const startupError = e?.message || String(e);
  console.error('API startup failed:', e);
  app.use((_req, res) => {
    res.status(500).json({ error: `Erreur de démarrage de l'API : ${startupError}` });
  });
}

// Gestionnaire d'erreurs Express : toute exception non interceptée dans une route
// redevient une réponse JSON exploitable par le client plutôt qu'un crash de fonction.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled API error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: err?.message || 'Erreur interne du serveur' });
  }
});

export default app;
