import { Router } from 'express';
import { UserController } from '../controllers/authController.js';
import { authenticate, optionalAuth } from '../middlewares/auth.js';
const userRouter = Router();
userRouter.get('/leaderboard', optionalAuth, UserController.getLeaderboard);
userRouter.get('/online', authenticate, UserController.getOnlineUsers);
export { userRouter };
//# sourceMappingURL=users.js.map