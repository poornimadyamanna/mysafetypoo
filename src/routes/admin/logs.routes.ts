import { Router } from 'express';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { authenticateAdmin } from '../../middlewares/admin.middleware';
import logger from '../../config/logger';

const router = Router();
const isProduction = process.env.NODE_ENV === 'production';
const logsPath = isProduction ? '../../../../logs' : '../../../logs';

// List all log files
router.get('/', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const logDir = join(__dirname, logsPath);
        
        if (!existsSync(logDir)) {
            return res.json({ success: true, logs: [] });
        }
        
        const files = readdirSync(logDir).filter(f => f.endsWith('.log'));
        
        const logs = files.map(file => {
            const stats = statSync(join(logDir, file));
            return {
                filename: file,
                size: stats.size,
                modified: stats.mtime
            };
        }).sort((a, b) => b.modified.getTime() - a.modified.getTime());

        res.json({ success: true, logs });
    } catch (error: any) {
        logger.error('Error reading logs:', error);
        res.status(500).json({ success: false, message: 'Error reading logs' });
    }
});

// Get log file content with pagination
router.get('/:filename', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { filename } = req.params as { filename: string };
        const offset = parseInt(req.query.offset as string) || 0;
        const limit = parseInt(req.query.limit as string) || 100;
        
        const logPath = join(__dirname, logsPath, filename);
        
        if (!existsSync(logPath)) {
            return res.status(404).json({ success: false, message: 'Log file not found' });
        }
        
        const content = readFileSync(logPath, 'utf-8');
        const allLines = content.split('\n').filter(line => line.trim());
        
        const totalLines = allLines.length;
        const start = Math.max(0, totalLines - offset - limit);
        const end = totalLines - offset;
        const lines = allLines.slice(start, end);

        res.json({ 
            success: true, 
            filename, 
            lines,
            totalLines,
            hasMore: start > 0
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error reading log file' });
    }
});

// Download log file
router.get('/:filename/download', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { filename } = req.params as { filename: string };
        const logPath = join(__dirname, logsPath, filename);
        
        if (!existsSync(logPath)) {
            return res.status(404).json({ success: false, message: 'Log file not found' });
        }
        
        res.download(logPath, filename);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error downloading log file' });
    }
});

export default router;
