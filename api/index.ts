// Point d'entrée Vercel : toute requête /api/* est réécrite ici (voir vercel.json).
// Les routes elles-mêmes vivent dans apiRoutes.ts, partagé avec server.ts (le
// serveur Node traditionnel utilisé en développement local et hors Vercel).
import express from 'express';
import { registerApiRoutes } from '../apiRoutes';

const app = express();
app.use(express.json({ limit: '15mb' })); // signatures tactiles encodées en base64
registerApiRoutes(app);

export default app;
