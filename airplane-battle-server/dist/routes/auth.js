import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate, registerSchema, loginSchema } from '../middlewares/validation.js';
import { authRateLimit } from '../middlewares/index.js';
const authRouter = Router();
authRouter.post('/register', authRateLimit, validate(registerSchema), AuthController.register);
authRouter.get('/register', (_req, res) => {
    res.json({
        success: true,
        message: '注册接口可用，请使用POST方法',
        data: {
            method: 'POST',
            endpoint: '/api/auth/register',
            requiredFields: ['username', 'email', 'password', 'displayName'],
            example: {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                displayName: '测试用户'
            }
        }
    });
});
authRouter.post('/login', authRateLimit, validate(loginSchema), AuthController.login);
authRouter.post('/refresh', AuthController.refreshToken);
authRouter.post('/logout', authenticate, AuthController.logout);
authRouter.get('/profile', authenticate, AuthController.getProfile);
authRouter.get('/verify', authenticate, AuthController.verifyToken);
export { authRouter };
//# sourceMappingURL=auth.js.map