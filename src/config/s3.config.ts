import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config({quiet:true});

const {
    DO_SPACES_KEY,
    DO_SPACES_SECRET,
    DO_SPACES_REGION,
} = process.env;

if (!DO_SPACES_KEY || !DO_SPACES_SECRET || !DO_SPACES_REGION) {
    throw new Error("Missing required S3 environment variables");
}

export const s3Client = new S3Client({
    region: DO_SPACES_REGION,
    endpoint: `https://${DO_SPACES_REGION}.digitaloceanspaces.com`,
    credentials: {
        accessKeyId: DO_SPACES_KEY,
        secretAccessKey: DO_SPACES_SECRET,
    },
});
