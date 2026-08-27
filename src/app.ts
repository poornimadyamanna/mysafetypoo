import 'reflect-metadata';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import masterRoutes from "./routes/master.routes";
import userRoutes from "./routes/user.routes";
import adminRoutes from "./routes/admin.routes";
import chatRoutes from "./routes/chat.routes";
import { errorHandler } from "./middlewares/errorHandler";
import { requestLogger } from "./middlewares/logger.middleware";
import { errorLogger } from "./middlewares/error-logger.middleware";
import { securityMiddleware } from "./middlewares/security.middleware";
import cors from 'cors';


import dotenv from 'dotenv';
import logger from './config/logger';
dotenv.config({ quiet: true });

const isProduction = process.env.NODE_ENV === 'production';

export const app = express();

// Trust proxy for production (behind nginx/load balancer)
if (isProduction) {
    app.set('trust proxy', 1);
}

// Security: Helmet - Set security HTTP headers
app.use(helmet({
    contentSecurityPolicy: isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false
}));

// Security: CORS configuration
app.use(cors({
    origin: isProduction ? process.env.ALLOWED_ORIGINS?.split(',') : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-language', 'Accept','x-access-token','x-totp-code'],
    exposedHeaders: ['Content-Type', 'Authorization', 'x-language', 'Accept','x-access-token','x-totp-code'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400 // 24 hours
}));

// Security: Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProduction ? 10000 : 100000, // Limit each IP
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// Security: Stricter rate limit for auth routes
// const authLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000,
//     max: 5,
//     message: 'Too many authentication attempts, please try again later',
//     skipSuccessfulRequests: true
// });
// app.use('/api/user/auth/sendOtp', authLimiter);
// app.use('/api/user/auth/verifyOtpAndLogin', authLimiter);

// Body parser with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Cookie parser
app.use(cookieParser());

// Security: Data sanitization against NoSQL injection (body and params only)
app.use((req, res, next) => {
    req.body = mongoSanitize.sanitize(req.body, { replaceWith: '_' });
    req.params = mongoSanitize.sanitize(req.params, { replaceWith: '_' });
    // Don't sanitize query - it's read-only in newer Express versions
    next();
});

// Security: Prevent HTTP Parameter Pollution
app.use(hpp());

// Disable X-Powered-By header
app.disable('x-powered-by');

// Security: IP blocking and suspicious activity detection
// if (isProduction) {
//     app.use(securityMiddleware);
// }

// Request logging
app.use(requestLogger);

app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use("/api/app", masterRoutes);
app.use('/api/chat', chatRoutes);

// Error logging
app.use(errorLogger);

// Global error handler
app.use(errorHandler);

export default app;