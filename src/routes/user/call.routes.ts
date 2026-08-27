import { Router } from 'express';
import { CallController } from '../../controllers/call.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { optionalAuth } from '../../middlewares/optionalAuth.middleware';
import { container } from 'tsyringe';
import { AgoraCallController } from '../../controllers/agora-call.controller';

const router = Router();
const callController = container.resolve(CallController);
const agoraCallController = container.resolve(AgoraCallController);

// Agora video/audio call routes (visitor can access)
router.post('/agora/start', optionalAuth, agoraCallController.startCall);
router.post('/agora/:callId/join', optionalAuth, agoraCallController.joinCall);
router.post('/agora/:callId/token', optionalAuth, agoraCallController.generateToken);
router.post('/agora/:callId/end', optionalAuth, agoraCallController.endCall);

// Call history & chat routes (authenticated only)
router.use(authenticate);
router.get('/usage', callController.getUsage);
router.post('/calls', callController.getModuleCalls);
router.post('/chatrooms', callController.getModuleChatRooms);
router.post('/messages', callController.getChatMessages);

export default router;
