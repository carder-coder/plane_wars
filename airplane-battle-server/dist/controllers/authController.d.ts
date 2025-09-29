import { Request, Response } from 'express';
export declare class AuthController {
    static register(req: Request, res: Response): Promise<void>;
    static login(req: Request, res: Response): Promise<void>;
    static refreshToken(req: Request, res: Response): Promise<void>;
    static logout(req: Request, res: Response): Promise<void>;
    static getProfile(req: Request, res: Response): Promise<void>;
    static verifyToken(req: Request, res: Response): Promise<void>;
}
export declare class UserController {
    static getLeaderboard(_req: Request, res: Response): Promise<void>;
    static getOnlineUsers(_req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=authController.d.ts.map