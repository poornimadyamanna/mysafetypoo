import { injectable } from "tsyringe";
import { PutObjectCommand, ObjectCannedACL } from "@aws-sdk/client-s3";
import { s3Client } from "../config/s3.config";

@injectable()
export class UploadService {
  uploadFile = async (file: Express.Multer.File): Promise<any> => {
    if (!file) throw new Error("no_file_uploaded");

    const bucket = process.env.DO_SPACES_BUCKET!;
    const region = process.env.DO_SPACES_REGION!;
    const key = `${Date.now()}_${file.originalname}`;

    const uploadParams = {
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read" as ObjectCannedACL,
    };

    const s3file = await s3Client.send(new PutObjectCommand(uploadParams));


    return {
      fileUrl: `https://${bucket}.${region}.digitaloceanspaces.com/${key}`,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,

    };
  };
}
