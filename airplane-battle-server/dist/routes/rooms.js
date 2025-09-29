import { Router } from 'express';
import { RoomController } from '../controllers/roomController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate, createRoomSchema, joinRoomSchema } from '../middlewares/validation.js';
import { gameRateLimit } from '../middlewares/index.js';
const roomRouter = Router();
roomRouter.get('/', RoomController.getRoomList);
roomRouter.post('/', authenticate, gameRateLimit, validate(createRoomSchema), RoomController.createRoom);
roomRouter.get('/:roomId', authenticate, RoomController.getRoomDetails);
roomRouter.post('/join', authenticate, gameRateLimit, validate(joinRoomSchema), RoomController.joinRoom);
roomRouter.delete('/:roomId/leave', authenticate, gameRateLimit, RoomController.leaveRoom);
export { roomRouter };
//# sourceMappingURL=rooms.js.map