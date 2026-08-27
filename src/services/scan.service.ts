import { injectable } from "tsyringe";
import { ScanEvent } from "../models/ScanEvent";
import { DoorBellVisitEvent } from "../models/DoorBellVisitEvent";

@injectable()
export class ScanService {
    logScan = async (qrId: any, scannerId: string, scannerType: string, moduleType: string, location?: any) => {
        const scan = await ScanEvent.create({
            qrId,
            scannerId,
            scannerType,
            moduleType,
            location
        });
        return scan;
    };

    getScanHistory = async (qrId: any) => {
        return await ScanEvent.find({ qrId }).sort({ createdAt: -1 }).limit(100).lean();
    };

    createDoorBellVisit = async (qrId: any, houseId: any, ownerId: any, scannerId: string, scannerType: string, location: any) => {
        const visit = await DoorBellVisitEvent.create({
            qrId,
            houseId,
            ownerId,
            scannerId,
            scannerType,
            location
        });
        return visit;
    };

    getDoorBellVisits = async (userId: string) => {
        return await DoorBellVisitEvent.find({ ownerId: userId }).sort({ createdAt: -1 }).populate("houseId").lean();
    };

    updateVisitStatus = async (visitId: string, status: string) => {
        const visit = await DoorBellVisitEvent.findById(visitId);
        if (!visit) throw new Error("visit_not_found");
        visit.status = status as any;
        await visit.save();
        return visit;
    };
}
