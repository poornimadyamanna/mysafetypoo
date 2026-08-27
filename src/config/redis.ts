import { createClient } from "redis";
import logger from './logger';

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > MAX_RECONNECT_ATTEMPTS) {
        logger.error(`Redis reconnection failed after ${MAX_RECONNECT_ATTEMPTS} attempts. Stopping reconnection.`);
        return false;
      }
      const delay = Math.min(retries * 1000, 5000);
      logger.info(`Redis reconnect attempt ${retries}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
      return delay;
    },
    connectTimeout: 10000,
    noDelay: true
  }
});

redis.on("error", (err) => {
  logger.error("Redis Client Error:", err.message);
  reconnectAttempts++;
  if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
    logger.error('Max Redis errors reached. Consider restarting the service.');
  }
});

redis.on("reconnecting", () => {
  logger.info("Redis reconnecting...");
});

redis.on("ready", () => {
  logger.info("Redis connection ready");
  reconnectAttempts = 0;
});

redis.on("end", () => {
  logger.info("Redis connection closed");
});

export const initRedis = async () => {
  try {
    if (!redis.isOpen) {
      await redis.connect();
      logger.info('Connected to Redis');
      
      // Keep connection alive with periodic ping
      setInterval(async () => {
        try {
          if (redis.isOpen) await redis.ping();
        } catch (err) {
          logger.error('Redis ping failed:', err);
        }
      }, 30000); // Ping every 30 seconds
    }
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

export const closeRedis = async () => {
  try {
    if (redis.isOpen) {
      await redis.quit();
      logger.info('Redis connection closed gracefully');
    }
  } catch (error) {
    logger.error('Error closing Redis:', error);
  }
};

export default redis;
