import { injectable } from "tsyringe";
import { PredefinedMessage } from "../../models/PredefinedMessage";
import { AudioRecording } from "../../models/AudioRecordings";

@injectable()
export class AudioService {
  constructor() { }

  getAllAudioRecordings = async () => {
        const recordings = await AudioRecording.find().lean();
        return recordings;
    };

    createAudioRecording = async (data: any) => {
        const recording = await AudioRecording.create(data);
        return recording;
    };

    updateAudioRecording = async (id: string, data: any) => {
        const recording = await AudioRecording.findByIdAndUpdate(id, data, { new: true }).lean();
        return recording;
    };

    deleteAudioRecording = async (id: string) => {
        const recording = await AudioRecording.findByIdAndDelete(id).lean();
        return recording;
    };

}