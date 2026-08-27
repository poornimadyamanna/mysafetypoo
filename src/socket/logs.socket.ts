import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import logger from "../config/logger";
import fs from "fs";
import path from "path";
import { Tail } from "tail";

interface AuthenticatedSocket extends Socket {
    adminId?: string;
    tail?: Tail;
}

export class LogsSocketHandler {
    private io: Server;

    constructor(io: Server) {
        this.io = io;
    }

    initialize() {
        const logsNamespace = this.io.of("/logs");

        logsNamespace.use(this.authenticateSocket.bind(this));

        logsNamespace.on("connection", (socket: AuthenticatedSocket) => {
            logger.info(`Admin logs connected: ${socket.adminId}`);

            socket.on("watchFile", (filename: string) => {
                this.startTailing(socket, filename);
            });

            socket.on("unwatchFile", () => {
                this.stopTailing(socket);
            });

            socket.on("disconnect", () => {
                this.stopTailing(socket);
                logger.info(`Admin logs disconnected: ${socket.adminId}`);
            });
        });
    }

    private startTailing(socket: AuthenticatedSocket, filename: string) {
        try {
            this.stopTailing(socket);

            const logFile = path.join('logs', filename);

            if (!fs.existsSync(logFile)) {
                socket.emit("logError", "Log file not found");
                return;
            }

            const tail = new Tail(logFile, { follow: true, useWatchFile: true });

            tail.on("line", (line: string) => {
                socket.emit("newLogLine", line);
            });

            tail.on("error", (error: Error) => {
                logger.error("Tail error:", error);
                socket.emit("logError", error.message);
            });

            socket.tail = tail;
            socket.emit("watchStarted", filename);
        } catch (error: any) {
            socket.emit("logError", error.message);
        }
    }

    private stopTailing(socket: AuthenticatedSocket) {
        if (socket.tail) {
            socket.tail.unwatch();
            socket.tail = undefined;
        }
    }

    private authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void) {
        try {
            const token = socket.handshake.auth.token;
            if (!token) throw new Error("No token provided");

            const secret = process.env.ACCESS_TOKEN_SECRET;
            if (!secret) throw new Error("JWT secret not configured");

            const decoded: any = jwt.verify(token, secret);
            
            if (decoded.role !== 'admin') {
                throw new Error("Admin access required");
            }

            socket.adminId = decoded.id;
            next();
        } catch (error) {
            next(new Error("Authentication failed"));
        }
    }
}
