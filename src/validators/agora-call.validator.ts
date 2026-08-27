import { z } from 'zod';

export const startCallSchema = z.object({
    qrId: z.string(),
    callType: z.enum(['video', 'audio']).default('video')
});

export const joinCallSchema = z.object({
    role: z.enum(['owner', 'visitor', 'family']).default('visitor'),
    visitorId: z.string().optional()
});

export const generateTokenSchema = z.object({
    role: z.enum(['publisher', 'subscriber']),
    visitorId: z.string().optional()
});

export type StartCallInput = z.infer<typeof startCallSchema>;
export type JoinCallInput = z.infer<typeof joinCallSchema>;
export type GenerateTokenInput = z.infer<typeof generateTokenSchema>;
