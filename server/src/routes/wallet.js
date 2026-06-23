import { Router } from 'express';
import { success, error } from '../lib/response.js';
import { authenticate, requireRole, requireTenantUser } from '../middleware/auth.js';
import { getWalletForUser, getWalletSummary, getPersonalAdvanceDue } from '../services/wallet.js';

const router = Router();

router.use(authenticate);
router.use(requireTenantUser);
router.use(requireRole('ADMIN', 'DISTRIBUTOR', 'SUPERVISOR'));

router.get('/', async (req, res) => {
  try {
    const wallet = await getWalletForUser(req.user);
    if (!wallet) {
      return success(res, {
        balance: 0,
        openingBalance: 0,
        holderType: req.user.role === 'DISTRIBUTOR' ? 'DISTRIBUTOR' : 'SUPERVISOR',
        transactions: [],
        message: 'Wallet not set up yet',
      });
    }

    const summary = await getWalletSummary(wallet.id);
    const personalAdvanceDue = await getPersonalAdvanceDue(wallet.id);
    return success(res, { ...summary, personalAdvanceDue });
  } catch (err) {
    return error(res, 'SERVER_ERROR', err.message, 500);
  }
});

export default router;
