import { RtcTokenBuilder, RtcRole } from 'agora-token';
import { injectable } from 'tsyringe';

@injectable()
export class AgoraService {
    private defaultTokenExpire: number;

    constructor() {
        this.defaultTokenExpire = parseInt(process.env.AGORA_TOKEN_EXPIRE_SECONDS || '900', 10);
    }

    generateRtcToken(
        channelName: string,
        uid: number,
        role: 'publisher' | 'subscriber',
        expirySeconds: number
    ): string {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirySeconds;

        const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

        return RtcTokenBuilder.buildTokenWithUid(
            process.env.AGORA_APP_ID!,
            process.env.AGORA_APP_CERTIFICATE!,
            channelName,
            uid,
            agoraRole,
            privilegeExpiredTs,
            privilegeExpiredTs
        );
    }

    getAppId(): string {
        return process.env.AGORA_APP_ID!;
    }

    getDefaultTokenExpire(): number {
        return this.defaultTokenExpire;
    }
}
