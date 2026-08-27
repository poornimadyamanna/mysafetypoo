import { injectable } from "tsyringe";
import { Document } from "../models/Document";
import { DocumentCategory } from "../models/DocumentCategory";
import { DigiLockerService } from "./digilocker.service";
import { parseStringPromise } from "xml2js";
import axios from "axios";
import logger from "../config/logger";

const {
  DIGILOCKER_PARTNER_BASE,
  DIGILOCKER_PARTNER_TOKEN,
  DIGILOCKER_PARTNER_ORGID,
  DIGILOCKER_PARTNER_PAN_DOCTYPE,
} = process.env;

if (!DIGILOCKER_PARTNER_BASE || !DIGILOCKER_PARTNER_TOKEN || !DIGILOCKER_PARTNER_ORGID) {
  logger.warn(
    "[DigiLockerPartnerService] Missing env vars. Set DIGILOCKER_PARTNER_BASE, DIGILOCKER_PARTNER_TOKEN, DIGILOCKER_PARTNER_ORGID."
  );
}

function bearer() {
  return `Bearer ${DIGILOCKER_PARTNER_TOKEN}`;
}

export interface PulledFileMeta {
  uri: string;
  mimeType: string;
  fileSize: number;
}
@injectable()
export class DocumentService {
  constructor(private digiLockerService: DigiLockerService) { }
  uploadDocument = async (userId: string, documentData: any, documentId?: string) => {
    try {
      if (documentId) {
        const document = await Document.findOneAndUpdate(
          { _id: documentId, userId },
          documentData,
          { new: true }
        ).lean();

        if (!document) throw new Error("document_not_found");

        return {
          _id: document._id,
          categoryId: document.categoryId,
          fileUrl: document.fileUrl,
          uploadMethod: document.uploadMethod,
          isLinkedToDigiLocker: document.isLinkedToDigiLocker,
          expiryDate: document.expiryDate
        };
      } else {
        const category = await DocumentCategory.findById(documentData.categoryId);
        if (!category || !category.isActive) {
          throw new Error("invalid_document_category");
        }

        // Check if category allows multiple documents
        if (!category.allowMultiple) {
          const existingDocument = await Document.findOne({
            userId,
            categoryId: documentData.categoryId,
            isActive: true
          });

          if (existingDocument) {
            throw new Error("document_already_exists_for_category");
          }
        }

        // For vehicle documents, vehicleId or vehicleNumber is required
        if (category.isVehicleDocument && !documentData.vehicleId && !documentData.vehicleNumber) {
          throw new Error("vehicle_id_or_number_required");
        }

        const document = await Document.create({
          userId,
          categoryId: documentData.categoryId,
          vehicleId: documentData.vehicleId,
          vehicleNumber: documentData.vehicleNumber,
          fileUrl: documentData.fileUrl,
          fileName: documentData.fileName,
          fileSize: documentData.fileSize,
          mimeType: documentData.mimeType,
          uploadMethod: documentData.uploadMethod,
          isLinkedToDigiLocker: documentData.isLinkedToDigiLocker || false,
          expiryDate: documentData.expiryDate,
          tags: documentData.tags || []
        });

        return {
          _id: document._id,
          categoryId: document.categoryId,
          vehicleId: document.vehicleId,
          vehicleNumber: document.vehicleNumber,
          fileUrl: document.fileUrl,
          uploadMethod: document.uploadMethod,
          isLinkedToDigiLocker: document.isLinkedToDigiLocker,
          expiryDate: document.expiryDate,
          createdAt: document.createdAt
        };
      }
    } catch (err: any) {
      logger.error("uploadDocument Error:", err);
      throw new Error(err.message);
    }
  };

  getDocuments = async (userId: string, categoryId?: string, vehicleId?: string) => {
    try {
      const filter: any = { userId, isActive: true };
      if (categoryId) filter.categoryId = categoryId;
      if (vehicleId) filter.vehicleId = vehicleId;

      const documents = await Document.find(filter)
        .populate('categoryId', 'categoryName displayName allowMultiple isVehicleDocument')
        .populate('vehicleId', 'vehicleNumber brand model')
        .select("categoryId vehicleId vehicleNumber fileUrl uploadMethod isLinkedToDigiLocker expiryDate createdAt")
        .sort({ createdAt: -1 })
        .lean();

      return documents;
    } catch (err) {
      logger.error("getDocuments Error:", err);
      throw new Error("document_get_failed");
    }
  };

  getDocumentsByCategory = async (userId: string) => {
    try {
      const documents = await Document.aggregate([
        { $match: { userId, isActive: true } },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            documents: {
              $push: {
                _id: "$_id",
                name: "$name",
                fileUrl: "$fileUrl",
                uploadMethod: "$uploadMethod",
                isLinkedToDigiLocker: "$isLinkedToDigiLocker",
                expiryDate: "$expiryDate",
                createdAt: "$createdAt"
              }
            }
          }
        },
        {
          $project: {
            category: "$_id",
            count: 1,
            documents: 1,
            _id: 0
          }
        }
      ]);

      return documents;
    } catch (err) {
      logger.error("getDocumentsByCategory Error:", err);
      throw new Error("document_get_failed");
    }
  };

  // updateDocument = async (documentId: string, userId: string, updates: any) => {
  //   try {
  //     const document = await Document.findOneAndUpdate(
  //       { _id: documentId, userId },
  //       updates,
  //       { new: true }
  //     ).lean();

  //     if (!document) throw new Error("document_not_found");

  //     return {
  //       _id: document._id,
  //       categoryId: document.categoryId,
  //       fileUrl: document.fileUrl,
  //       uploadMethod: document.uploadMethod,
  //       isLinkedToDigiLocker: document.isLinkedToDigiLocker,
  //       expiryDate: document.expiryDate
  //     };
  //   } catch (err: any) {
  //     logger.error("updateDocument Error:", err);
  //     throw new Error(err.message);
  //   }
  // };

  deleteDocument = async (documentId: string, userId: string) => {
    try {
      const document = await Document.findOneAndUpdate(
        { _id: documentId, userId },
        { isActive: false },
        { new: true }
      ).lean();

      if (!document) throw new Error("document_not_found");

      return { deletedId: documentId };
    } catch (err) {
      logger.error("deleteDocument Error:", err);
      throw new Error("document_delete_failed");
    }
  };

  linkDigiLocker = async (userId: string, categoryId: string, digiLockerData: any) => {
    try {
      const { uri } = digiLockerData;
      if (!uri) {
        throw new Error("digilocker_uri_required");
      }

      // 1) Download from DigiLocker & save to local/S3
      const downloaded = await this.digiLockerService.downloadAndSaveDocument(
        userId,
        uri
      );

      // 2) Create a new Document entry
      const document = await Document.create({
        userId,
        categoryId,
        fileUrl: downloaded.fileUrl,
        fileName: downloaded.fileName,
        fileSize: downloaded.fileSize,
        mimeType: downloaded.mimeType,
        uploadMethod: "digilocker",
        isLinkedToDigiLocker: true,
        expiryDate: digiLockerData.expiryDate || null,
        tags: digiLockerData.tags || [],
      });

      return {
        _id: document._id,
        categoryId: document.categoryId,
        fileUrl: document.fileUrl,
        uploadMethod: document.uploadMethod,
        isLinkedToDigiLocker: document.isLinkedToDigiLocker,
        expiryDate: document.expiryDate,
        createdAt: document.createdAt,
      };
    } catch (err: any) {
      logger.error("linkDigiLocker Error:", err);
      throw new Error(err.message || "digilocker_link_failed");
    }
  };

  getDigiLockerDocuments = async (userId: string) => {
    return this.digiLockerService.getIssuedDocuments(userId);
  };













  /**
   * Sandbox: Pull PAN document using Pull Document API.
   * This returns the URI and then downloads the file as binary.
   */
  async pullPanAndDownload(panNo: string): Promise<PulledFileMeta> {
    if (!panNo) {
      throw new Error("panNo is required");
    }

    const uri = await this.pullDocument({
      doctype: process.env.DIGILOCKER_PARTNER_PAN_DOCTYPE! || "PANCR",
      extraParams: { panno: panNo },
    });

    const fileMeta = await this.getFileFromUri(uri);
    return fileMeta;
  }

  /**
   * Generic Pull Document handler.
   * doctype: e.g. PANCR, DRVLC, RVCER etc.
   * extraParams: { panno, regno, dob, ... } depending on issuer spec.
   */
  async pullDocument(options: {
    doctype: string;
    extraParams: Record<string, string>;
  }): Promise<string> {
    const { doctype, extraParams } = options;

    const url = `${process.env.DIGILOCKER_PARTNER_BASE!}/1/pull/pulldocument`;

    const body = new URLSearchParams();
    body.append("orgid", process.env.DIGILOCKER_PARTNER_ORGID!);
    body.append("doctype", doctype);
    body.append("consent", "Y");

    Object.entries(extraParams).forEach(([k, v]) => {
      if (v != null) {
        body.append(k, v);
      }
    });

    try {
      const response = await axios.post(url, body.toString(), {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${process.env.DIGILOCKER_PARTNER_TOKEN!}`,
        },
      });

      const data = response.data as { uri?: string };
      if (!data.uri) {
        logger.error("[DigiLockerPartnerService] Pull Document: no uri in response", data);
        throw new Error("digilocker_pull_no_uri");
      }

      return data.uri;
    } catch (err: any) {
      logger.error(
        "[DigiLockerPartnerService] Pull Document error:",
        err?.response?.data || err.message
      );
      throw new Error("digilocker_pull_failed");
    }
  }

  /**
   * Get File from URI (binary file). For demo we only return metadata.
   */
  async getFileFromUri(uri: string): Promise<PulledFileMeta> {
    const encoded = encodeURIComponent(uri);
    const url = `${process.env.DIGILOCKER_PARTNER_BASE!}/1/file/${encoded}`;

    try {
      const response = await axios.get(url, {
        headers: {
          Accept: "application/pdf, image/jpeg, application/xml",
          Authorization: `Bearer ${process.env.DIGILOCKER_PARTNER_TOKEN!}`,
        },
        responseType: "arraybuffer",
      });

      const buffer = response.data as Buffer;
      const mimeType =
        response.headers["content-type"] || "application/octet-stream";
      const fileSize = buffer.length;

      // For now we don't persist the buffer; you can store it in S3/disk later.
      return { uri, mimeType, fileSize };
    } catch (err: any) {
      logger.error(
        "[DigiLockerPartnerService] Get File from URI error:",
        err?.response?.data || err.message
      );
      throw new Error("digilocker_get_file_failed");
    }
  }

  /**
   * Issued Documents (for the account linked to this token).
   */
  async getIssuedDocuments(): Promise<any> {
    const url = `${process.env.DIGILOCKER_PARTNER_BASE!}/2/files/issued`;

    try {
      const response = await axios.get(url, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${process.env.DIGILOCKER_PARTNER_TOKEN!}`,
        },
      });
      return response.data;
    } catch (err: any) {
      logger.error(
        "[DigiLockerPartnerService] Issued Documents error:",
        err?.response?.data || err.message
      );
      throw new Error("digilocker_issued_docs_failed");
    }
  }

  /**
   * Get e-Aadhaar XML for the account.
   */
  async getEAadhaarXml(): Promise<{ rawXml: string; parsed: any }> {
    const url = `${process.env.DIGILOCKER_PARTNER_BASE!}/3/xml/eaadhaar`;

    try {
      const response = await axios.get(url, {
        headers: {
          Accept: "application/xml",
          Authorization: `Bearer ${process.env.DIGILOCKER_PARTNER_TOKEN!}`,
        },
        responseType: "text",
      });

      const rawXml = response.data as string;
      const parsed = await parseStringPromise(rawXml, { explicitArray: false });

      return { rawXml, parsed };
    } catch (err: any) {
      logger.error(
        "[DigiLockerPartnerService] e-Aadhaar XML error:",
        err?.response?.data || err.message
      );
      throw new Error("digilocker_eaadhaar_failed");
    }
  }
}