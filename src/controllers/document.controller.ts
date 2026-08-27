import { Request, Response } from "express";
import { container } from "tsyringe";
import { DocumentService } from "../services/document.service";
import { DocumentCategory } from "../models/DocumentCategory";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { errorResponse, successResponse } from "../utils/response";
import { DigiLockerService } from "../services/digilocker.service";
import logger from "../config/logger";

export class DocumentController {
  private documentService = container.resolve(DocumentService);
  private digiLockerService = container.resolve(DigiLockerService);

  uploadDocument = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id;
      const { documentId } = req.body;
      const documentData = req.body;

      const document = await this.documentService.uploadDocument(userId, documentData, documentId);

      return successResponse(req, res, 'document_uploaded_successfully', document);
    } catch (error: any) {
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };

  getDocuments = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id;
      const { categoryId, vehicleId } = req.query;

      const documents = await this.documentService.getDocuments(userId, categoryId as string, vehicleId as string);

      return successResponse(req, res, 'documents_retrieved', documents);
    } catch (error: any) {
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };

  getCategories = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const categories = await DocumentCategory.find({ isActive: true })
        .select('categoryName displayName allowMultiple isVehicleDocument hasExpiry description')
        .sort({ categoryName: 1 })
        .lean();

      return successResponse(req, res, 'categories_retrieved', categories);
    } catch (error: any) {
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };

  getDocumentsByCategory = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id;

      const documents = await this.documentService.getDocumentsByCategory(userId);

      return successResponse(req, res, 'documents_retrieved', documents);
    } catch (error: any) {
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };

  // updateDocument = async (req: AuthenticatedRequest, res: Response) => {
  //   try {
  //     const userId = req.user?._id;
  //     const { documentId } = req.body;
  //     const updates = req.body;

  //     const document = await this.documentService.updateDocument(documentId, userId, updates);

  //     return successResponse(req, res, 'document_updated_successfully', document);
  //   } catch (error: any) {
  //     return errorResponse(req, res, error.message || "something_went_wrong", 400);
  //   }
  // };

  deleteDocument = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id;
      const { documentId } = req.body;

      const result = await this.documentService.deleteDocument(documentId, userId);

      return successResponse(req, res, 'document_deleted_successfully', result);
    } catch (error: any) {
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };




  digilockerConnect = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id as string;
      const url = this.digiLockerService.getAuthorizeUrl(userId);

      // either redirect or just send url; I'll send url so frontend can decide
      return successResponse(req, res, "digilocker_connect_url_success", { url });
    } catch (error: any) {
      return errorResponse(
        req,
        res,
        error.message || "something_went_wrong",
        400
      );
    }
  };

  digilockerCallback = async (req: Request, res: Response) => {
    try {
      const { code, state, error, error_description } = req.query as any;

      // If DigiLocker returned an explicit error, show/log it
      if (error) {
        logger.error("DigiLocker authorize error:", error, error_description);
        return res
          .status(400)
          .send(`DigiLocker error: ${error} - ${error_description || ""}`);
      }

      if (!code || !state) {
        return res.status(400).send("Missing code or state");
      }

      // state now also contains code_verifier
      const { userId, codeVerifier } = this.digiLockerService.verifyState(state);

      await this.digiLockerService.handleCallback(code, userId, codeVerifier);

      return res.redirect(
        "https://your-frontend-domain.com/documents/digilocker-linked"
      );
    } catch (error: any) {
      logger.error("digilockerCallback Error:", error);
      return res.status(400).send("Failed to link DigiLocker");
    }
  };

  getDigiLockerDocuments = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id as string;
      const docs = await this.documentService.getDigiLockerDocuments(userId);

      return successResponse(req, res, "digilocker_documents_fetched", docs);
    } catch (error: any) {
      return errorResponse(
        req,
        res,
        error.message || "something_went_wrong",
        400
      );
    }
  };

  linkDigiLocker = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id as string;
      const category = req.params.category as string;
      const digiLockerData = req.body; // must contain `uri`

      const document = await this.documentService.linkDigiLocker(
        userId,
        category,
        digiLockerData
      );

      return successResponse(
        req,
        res,
        "digilocker_document_linked_successfully",
        document
      );
    } catch (error: any) {
      return errorResponse(
        req,
        res,
        error.message || "something_went_wrong",
        400
      );
    }
  };











  /**
   * DEMO: Pull PAN via Authorized Partner Pull API (sandbox).
   * POST /digilocker/demo/pull-pan
   * Body: { panNo: string }
   */
  digilockerDemoPullPan = async (req: AuthenticatedRequest | Request, res: Response) => {
    try {
      const { panNo } = (req.body || {}) as { panNo?: string };

      if (!panNo) {
        return errorResponse(
          req as any,
          res,
          "panNo is required in body",
          400
        );
      }

      const meta = await this.documentService.pullPanAndDownload(panNo);

      return successResponse(req as any, res, "digilocker_demo_pan_pulled", meta);
    } catch (error: any) {
      logger.error("digilockerDemoPullPan Error:", error);
      return errorResponse(
        req as any,
        res,
        error.message || "something_went_wrong",
        500
      );
    }
  };

  /**
   * DEMO: Get Issued Documents list (sandbox).
   * GET /digilocker/demo/issued
   */
  digilockerDemoIssued = async (req: AuthenticatedRequest | Request, res: Response) => {
    try {
      const data = await this.documentService.getIssuedDocuments();
      return successResponse(req as any, res, "digilocker_demo_issued_docs", data);
    } catch (error: any) {
      logger.error("digilockerDemoIssued Error:", error);
      return errorResponse(
        req as any,
        res,
        error.message || "something_went_wrong",
        500
      );
    }
  };

  /**
   * DEMO: Get file from URI (sandbox).
   * GET /digilocker/demo/file?uri=...
   */
  digilockerDemoGetFile = async (req: AuthenticatedRequest | Request, res: Response) => {
    try {
      const uri = (req.query.uri as string) || "";
      if (!uri) {
        return errorResponse(req as any, res, "uri query param is required", 400);
      }

      const meta = await this.documentService.getFileFromUri(uri);
      return successResponse(req as any, res, "digilocker_demo_file", meta);
    } catch (error: any) {
      logger.error("digilockerDemoGetFile Error:", error);
      return errorResponse(
        req as any,
        res,
        error.message || "something_went_wrong",
        500
      );
    }
  };

  /**
   * DEMO: Get e-Aadhaar XML (sandbox).
   * GET /digilocker/demo/eaadhaar
   */
  digilockerDemoEAadhaar = async (req: AuthenticatedRequest | Request, res: Response) => {
    try {
      const data = await this.documentService.getEAadhaarXml();
      return successResponse(req as any, res, "digilocker_demo_eaadhaar", data);
    } catch (error: any) {
      logger.error("digilockerDemoEAadhaar Error:", error);
      return errorResponse(
        req as any,
        res,
        error.message || "something_went_wrong",
        500
      );
    }
  };
}