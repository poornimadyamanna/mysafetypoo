import { injectable } from "tsyringe";
import { LostFoundEvent } from "../../models/LostFoundEvent";

@injectable()
export class LostFoundService {
    constructor() { }

    getAllLostFounds = async (page: number = 1, limit: number = 10, search?: string, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc') => {
        const skip = (page - 1) * limit;
        const query: any = {};

        if (search) {
            query.$or = [
                { message: { $regex: search, $options: 'i' } },
                { status: { $regex: search, $options: 'i' } },
                { 'location.address': { $regex: search, $options: 'i' } }
            ];
        }

        const sort: any = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [items, total] = await Promise.all([
            LostFoundEvent.find(query)
                .populate('qrId')
                .populate('lostFoundId')
                .populate('ownerId')
                .populate('scannerId')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            LostFoundEvent.countDocuments(query)
        ]);

        return {
            items,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    };

    // createAudioRecording = async (data: any) => {
    //     const recording = await AudioRecording.create(data);
    //     return recording;
    // };

    // updateAudioRecording = async (id: string, data: any) => {
    //     const recording = await AudioRecording.findByIdAndUpdate(id, data, { new: true }).lean();
    //     return recording;
    // };

    // deleteAudioRecording = async (id: string) => {
    //     const recording = await AudioRecording.findByIdAndDelete(id).lean();
    //     return recording;
    // };

}