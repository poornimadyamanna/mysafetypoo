import { Request, Response, NextFunction } from "express";
import { errorResponse } from "../utils/response";
import { AppError } from "../utils/AppError";
import logger from "../config/logger";

export const errorHandler = async (err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error("[Error]", err);

    let statusCode = 500;
    let message = "internal_server_error";

    // Custom AppError
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    }
    // Mongoose validation error
    else if (err.name === "ValidationError") {
        statusCode = 400;
        message = "validation_error";
    }
    // Mongoose cast error (invalid ObjectId)
    else if (err.name === "CastError") {
        statusCode = 400;
        message = "invalid_id";
    }
    // Mongoose duplicate key error
    else if (err.code === 11000) {
        statusCode = 400;
        message = "duplicate_entry";
    }
    // MongoDB server error
    else if (err.name === "MongoServerError") {
        statusCode = 400;
        message = "database_error";
    }
    // JWT errors
    else if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        message = "invalid_token";
    }
    else if (err.name === "TokenExpiredError") {
        statusCode = 401;
        message = "token_expired";
    }
    // Generic Error with statusCode
    else if (err.statusCode) {
        statusCode = err.statusCode;
        message = err.message || message;
    }
    // Generic Error with message
    else if (err.message) {
        message = err.message;
    }

    return errorResponse(req, res, message, statusCode);
};
