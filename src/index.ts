import "reflect-metadata";
import dotenv from 'dotenv';
dotenv.config({ quiet: true });
import './config/axios';
import http from 'http';
import { app } from './app';
import { connectDB } from './config/db';
import { Server } from 'socket.io';
import { initRedis, closeRedis } from "./config/redis";
import { ChatSocketHandler } from './socket/chat.socket';
import { LogsSocketHandler } from './socket/logs.socket';
import { container } from 'tsyringe';
import './queues/qr-expiry.queue';
import './queues/payment-timeout.queue';
import './queues/subscription-cleanup.queue';
import './jobs/subscription-renewal.job';
import './jobs/subscription-sync.job';
import mongoose from 'mongoose';
import logger from './config/logger';

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

async function main() {
    try {
        // Database connection
        await connectDB();
        // Redis connection
        await initRedis();
        
        const server = http.createServer(app);
        
        // Production-ready server configurations
        server.timeout = 30000; // 30 seconds
        server.keepAliveTimeout = 65000; // 65 seconds
        server.headersTimeout = 66000; // 66 seconds
        server.maxHeadersCount = 100;
        
        // Socket.IO configuration with security
        const io = new Server(server, { 
            cors: { 
                origin: isProduction ? process.env.ALLOWED_ORIGINS?.split(',') : '*',
                credentials: true,
                methods: ['GET', 'POST']
            },
            pingTimeout: 60000,
            pingInterval: 25000,
            connectTimeout: 45000,
            maxHttpBufferSize: 1e6, // 1MB max message size
            transports: ['websocket', 'polling'],
            allowEIO3: true,
            perMessageDeflate: isProduction, // Compression in production
            httpCompression: isProduction
        });
        
        // Register Socket.IO in DI container
        container.register('SocketIO', { useValue: io });
        
        // Initialize chat socket
        const chatSocket = new ChatSocketHandler(io);
        chatSocket.initialize();
        
        // Initialize logs socket
        const logsSocket = new LogsSocketHandler(io);
        logsSocket.initialize();
        
        // Queue initialization
        logger.info('[QR Expiry Queue] Initialized');
        logger.info('[Payment Timeout Queue] Initialized');
        logger.info('[Subscription Cleanup Queue] Initialized');
        
        // Start server
        server.listen(PORT, () => {
            logger.info(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
        });

        // Graceful shutdown handler
        const shutdown = async (signal: string) => {
            logger.warn(`${signal} received, initiating graceful shutdown...`);
            
            // Stop accepting new connections
            server.close(async (err) => {
                if (err) {
                    logger.error('Error during server close:', err);
                }
                logger.info('HTTP server closed');
            });
            
            // Close Socket.IO connections
            io.close(() => {
                logger.info('Socket.IO connections closed');
            });
            
            try {
                // Close Redis connection
                await closeRedis();
                logger.info('Redis connection closed');
                
                // Close MongoDB connection
                await mongoose.connection.close();
                logger.info('MongoDB connection closed');
                
                logger.info('Graceful shutdown completed');
                process.exit(0);
            } catch (error) {
                logger.error('Error during shutdown:', error);
                process.exit(1);
            }
        };

        // Handle shutdown signals
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error: Error) => {
            logger.error('Uncaught Exception:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            shutdown('uncaughtException');
        });
        
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
            logger.error('Unhandled Promise Rejection:', {
                reason: reason?.message || reason,
                stack: reason?.stack,
                promise: promise.toString()
            });
            if (isProduction) {
                shutdown('unhandledRejection');
            }
        });
        
        // Handle warnings
        process.on('warning', (warning: Error) => {
            logger.warn('Process Warning:', {
                name: warning.name,
                message: warning.message,
                stack: warning.stack
            });
        });
        
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

main();