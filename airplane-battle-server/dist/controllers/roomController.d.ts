import { Request, Response } from 'express';
export declare class RoomController {
    static createRoom(req: Request, res: Response): Promise<void>;
    static joinRoom(req: Request, res: Response): Promise<void>;
    static leaveRoom(req: Request, res: Response): Promise<void>;
    static getRoomList(req: Request, res: Response): Promise<void>;
    static getRoomDetails(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=roomController.d.ts.map