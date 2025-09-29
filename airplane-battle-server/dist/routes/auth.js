import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate, registerSchema, loginSchema } from '../middlewares/validation.js';
import { authRateLimit } from '../middlewares/index.js';
const authRouter = Router();
authRouter.post('/register', authRateLimit, validate(registerSchema), AuthController.register);
authRouter.post('/login', authRateLimit, validate(loginSchema), AuthController.login);
authRouter.post('/refresh', AuthController.refreshToken);
authRouter.post('/logout', authenticate, AuthController.logout);
authRouter.get('/profile', authenticate, AuthController.getProfile);
authRouter.get('/verify', authenticate, AuthController.verifyToken);
export { authRouter };
//# sourceMappingURL=auth.js.map