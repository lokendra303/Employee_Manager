import { Router } from 'express';
import { success, error } from '../lib/response.js';
import { getPublicApiBaseUrl } from '../services/systemSettings.js';

const router = Router();

router.get('/config', async (_req, res) => {
  try {
    const apiBaseUrl = await getPublicApiBaseUrl();
    return success(res, { apiBaseUrl });
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

export default router;
