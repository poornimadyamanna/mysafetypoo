import { injectable } from "tsyringe";
import { Vehicle } from "../models/Vehicle";
import { VehicleAlertEvent } from "../models/VehicleAlertEvent";
import { FamilyMember } from "../models/FamilyMember";
import axios from "axios";
import { parseStringPromise } from "xml2js";
import { QRService } from "./qr.service";
import dayjs from "dayjs";
import { PredefinedMessage } from "../models/PredefinedMessage";
import mongoose from "mongoose";
import { QR } from "../models/QR";
import { SMSService } from "./sms.service";
import { AudioRecording } from "../models/AudioRecordings";
import logger from "../config/logger";
import { SmartCard } from "../models/SmartCard";

const {
  TRANSPORT_SANDBOX_BASE,
  TRANSPORT_SANDBOX_CLIENT_ID,
  TRANSPORT_SANDBOX_API_KEY,
} = process.env;

if (!TRANSPORT_SANDBOX_BASE || !TRANSPORT_SANDBOX_CLIENT_ID || !TRANSPORT_SANDBOX_API_KEY) {
  logger.warn(
    "[VehicleService] Sandbox env vars missing. Set TRANSPORT_SANDBOX_BASE, TRANSPORT_SANDBOX_CLIENT_ID, TRANSPORT_SANDBOX_API_KEY."
  );
}

export interface VehicleRcRequest {
  regNo: string;
  chassisNo: string;
  uid?: string;
  fullName?: string;
}

export interface VehicleRcResult {
  rawXml: string;
  certificate: any; // full parsed XML tree
  summary: {
    regNo?: string;
    ownerName?: string;
    issueDate?: string;
    vehicleClass?: string;
    make?: string;
    model?: string;
    fuel?: string;
    color?: string;
    insurance?: {
      policyNo?: string;
      validTill?: string;
      companyName?: string;
    };
    puc?: {
      certificateNo?: string;
      validTill?: string;
    };
  };
}

@injectable()
export class VehicleService {
  constructor(private qrService: QRService, private smsService: SMSService) { }
  createVehicle = async (userId: string, vehicleData: any, creationType: 'Temporary' | 'Full' = 'Temporary') => {
    const vehicle = await Vehicle.create({ userId, ...vehicleData });

    // Auto-generate temporary QR if not provided
    if (!vehicleData.qrId) {
      const qr = await this.qrService.generateTemporaryQR(userId, "Temporary", "Vehicle", vehicle._id.toString(), creationType);
      vehicle.qrId = qr._id;
      await vehicle.save();
    }

    return vehicle;
  };

  fetchAndCreateVehicle = async (userId: string, vehicleNumber: string, chassisNumber?: string, creationType: 'Temporary' | 'Full' = 'Temporary') => {
    try {
      const vehicle = await Vehicle.findOne({ vehicleNumber }).lean();

      if (vehicle) {
        throw new Error('already_present_with_this_vehicle_number')
      }
      let challanData: any = null;
      // Fetch vehicle details from 3rd party API
      const vehicleData = await this.fetchVehicleFromThirdParty(vehicleNumber);
      try {
        challanData = await this.fetchVehicleChallan(vehicleNumber);
      } catch (error: any) {
        // throw new Error(error.message);
        challanData = null
      }
      if (!vehicleData) throw new Error("vehicle_data_not_found");
      if (vehicleData.underTheHood.chassisNumber != chassisNumber) throw new Error("chassis_number_mismatch");

      // Static vehicle image for now
      const carImage = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800";
      const bikeImage = "https://mysafety.blr1.digitaloceanspaces.com/1770886422755_herve-papaux-u41pGFqExG4-unsplash-1.jpg";

      const vehicleType = this.mapVehicleClass(vehicleData.vehicleClass);
      const vehicleImage = vehicleType === "Car" ? carImage : bikeImage;

      // Create vehicle with fetched data
      const vehiclePayload = {
        ...vehicleData,
        brand: vehicleData.make,
        vehicleImage,
        vehicleType,
        isManualEntry: false,
        vehicleNumber: vehicleData.regNo || vehicleNumber,
        challanDetails: challanData?.challans || [],
      };

      // logger.log(vehiclePayload);


      return await this.createVehicle(userId, vehiclePayload, creationType);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  getChallan = async (userId: string, vehicleId: string) => {
    try {
      const vehicle = await Vehicle.findById(vehicleId);

      if (!vehicle) {
        throw new Error('vehicle_not_found_with_this_vehicle_number')
      }

      // Fetch vehicle details from 3rd party API
      const challanData = await this.fetchVehicleChallan(vehicle.vehicleNumber);

      vehicle.challanDetails = challanData.challans;
      await vehicle.save();

      return challanData;
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  createManualVehicle = async (userId: string, vehicleNumber: string, model: string, vehicleType: string, creationType: 'Temporary' | 'Full' = 'Temporary') => {
    const vehicleData = {
      vehicleNumber,
      model,
      vehicleType,
      isManualEntry: true
    };

    return await this.createVehicle(userId, vehicleData, creationType);
  };

  private mapVehicleClass(vehicleClass?: string): string {
    if (!vehicleClass) return "Other";
    const lower = vehicleClass.toLowerCase();
    if (lower.includes("car") || lower.includes("sedan") || lower.includes("suv")) return "Car";
    if (lower.includes("bike") || lower.includes("motorcycle") || lower.includes("scooter")) return "Bike";
    if (lower.includes("truck")) return "Truck";
    if (lower.includes("bus")) return "Bus";
    return "Other";
  }

  getVehicles = async (userId: string) => {
    try {
      const result = await Vehicle.aggregate([
        {
          $match: {
            $or: [
              { userId: new mongoose.Types.ObjectId(userId) },
              // {
              //   memberIds: {
              //     $in: await FamilyMember.find({ memberId: userId }).distinct('_id')
              //   }
              // }
            ]
          }
        },
        {
          $lookup: {
            from: "qrs",
            localField: "qrId",
            foreignField: "_id",
            as: "qrDetails"
          }
        },
        {
          $addFields: {
            // role: {
            //   $cond: {
            //     if: { $eq: ["$userId", new mongoose.Types.ObjectId(userId)] },
            //     then: "owner",
            //     else: "member"
            //   }
            // },
            qrCode: { $arrayElemAt: ["$qrDetails.qrId", 0] },
            redirectUrl: {
              $concat: [
                process.env.APP_BASE_URL || "",
                { $arrayElemAt: ["$qrDetails.qrId", 0] }
              ]
            },
            qrStatus: {
              isTemporary: { $arrayElemAt: ["$qrDetails.isTemporary", 0] },
              isFrozen: { $arrayElemAt: ["$qrDetails.isFrozen", 0] },
              expiresAt: { $arrayElemAt: ["$qrDetails.expiresAt", 0] },
              status: { $arrayElemAt: ["$qrDetails.status", 0] }
            }
          }
        },
        {
          $project: {
            vehicleNumber: 1,
            // vehicleType: 1,
            brand: 1,
            model: 1,
            // color: 1,
            vehicleImage: 1,
            // ownerName: 1,
            // isManualEntry: 1,
            redirectUrl: 1,
            qrId: 1,
            qrCode: 1,
            qrStatus: 1,
            createdAt: 1,
            // role: 1
          }
        },
        { $sort: { createdAt: -1 } }
      ]);

      return result;
    } catch (err) {
      logger.error("getVehicles Error:", err);
      throw new Error("vehicle_get_failed");
    }
  };

  getVehicleDetails = async (vehicleId: string, userId: string) => {
    try {
      const result = await Vehicle.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(vehicleId),
            userId: new mongoose.Types.ObjectId(userId)
          }
        },
        {
          $lookup: {
            from: "qrs",
            localField: "qrId",
            foreignField: "_id",
            as: "qrDetails"
          }
        },
        {
          $lookup: {
            from: "vehicleemergencycontacts",
            localField: "emergencyContacts",
            foreignField: "_id",
            as: "emergencyContactsDetails"
          }
        },
        {
          $addFields: {
            qrCode: { $arrayElemAt: ["$qrDetails.qrId", 0] },
            qrStatus: {
              isTemporary: { $arrayElemAt: ["$qrDetails.isTemporary", 0] },
              isFrozen: { $arrayElemAt: ["$qrDetails.isFrozen", 0] },
              expiresAt: { $arrayElemAt: ["$qrDetails.expiresAt", 0] },
              status: { $arrayElemAt: ["$qrDetails.status", 0] }
            },
            emergencyContacts: "$emergencyContactsDetails"
          }
        },
        {
          $project: {
            qrDetails: 0,
            emergencyContactsDetails: 0
          }
        }
      ]);

      if (!result || result.length === 0) throw new Error("vehicle_not_found");

      return result[0];
    } catch (err) {
      logger.error("getVehicleDetails Error:", err);
      throw new Error("vehicle_details_get_failed");
    }
  };

  updateVehicle = async (vehicleId: string, userId: string, updates: any) => {
    const vehicle = await Vehicle.findOne({ _id: vehicleId, userId });
    if (!vehicle) throw new Error("vehicle_not_found");
    Object.assign(vehicle, updates);
    await vehicle.save();
    return vehicle;
  };

  deleteVehicle = async (vehicleId: string, userId: string) => {
    const vehicle = await Vehicle.findOneAndDelete({ _id: vehicleId, userId });
    if (!vehicle) throw new Error("vehicle_not_found");
    return { deletedId: vehicleId };
  };

  createAlert = async (qrId: any, vehicleId: any, ownerId: any, scannerId: string, scannerType: string, location: any) => {
    const alert = await VehicleAlertEvent.create({
      qrId,
      vehicleId,
      ownerId,
      scannerId,
      scannerType,
      location
    });
    return alert;
  };

  getAlerts = async (userId: string) => {
    return await VehicleAlertEvent.find({ ownerId: userId }).sort({ createdAt: -1 }).populate("vehicleId").lean();
  };

  resolveAlert = async (alertId: string, userId: string) => {
    const alert = await VehicleAlertEvent.findOne({ _id: alertId, ownerId: userId });
    if (!alert) throw new Error("alert_not_found");
    alert.status = "Resolved";
    await alert.save();
    return alert;
  };



  createPredefinedMessage = async (vehicleId: string, messageData: any) => {
    try {
      const message = await PredefinedMessage.create({
        vehicleId,
        title: messageData.title,
        message: messageData.message
      });

      return {
        _id: message._id,
        title: message.title,
        message: message.message
      };
    } catch (err: any) {
      logger.error("createPredefinedMessage Error:", err);
      throw new Error(err.message);
    }
  };

  getPredefinedMessages = async (vehicleId: string) => {
    try {
      const messages = await PredefinedMessage.find({ vehicleId })
        .select("title message createdAt")
        .sort({ createdAt: -1 })
        .lean();

      return messages;
    } catch (err) {
      logger.error("getPredefinedMessages Error:", err);
      throw new Error("messages_get_failed");
    }
  };

  updatePredefinedMessage = async (messageId: string, updates: any) => {
    try {
      const message = await PredefinedMessage.findByIdAndUpdate(
        messageId,
        updates,
        { new: true }
      ).lean();

      if (!message) throw new Error("message_not_found");

      return {
        _id: message._id,
        title: message.title,
        message: message.message
      };
    } catch (err: any) {
      logger.error("updatePredefinedMessage Error:", err);
      throw new Error(err.message);
    }
  };

  deletePredefinedMessage = async (messageId: string) => {
    try {
      const message = await PredefinedMessage.findByIdAndDelete(messageId).lean();

      if (!message) throw new Error("message_not_found");

      return { deletedId: messageId };
    } catch (err) {
      logger.error("deletePredefinedMessage Error:", err);
      throw new Error("message_delete_failed");
    }
  };



  getVehicleInsurance = async (qrId: string) => {
    try {
      const qr = await QR.findOne({ qrId }).lean();

      if (!qr) throw new Error("qr_not_found");

      const vehicle = await Vehicle.findById(qr.moduleProfileId).lean();
      if (vehicle?.insurance?.status == 'Active') {
        return vehicle.insurance;
      } else {
        throw new Error("vehicle_insurance_expired_or_not_found")
      }
    } catch (err) {
      logger.error("getVehicleInsurance Error:", err);
      throw new Error("vehicle_insurance_get_failed");
    }
  };



  initiateAutoGeneratedCall = async (qrId: string, audioCode?: string) => {
    try {
      const qr = await QR.findOne({ qrId }).lean();
      if (!qr) throw new Error("qr_not_found");

      const vehicle = await Vehicle.findById(qr.moduleProfileId)
        .populate('emergencyContacts', 'name mobile email')
        .lean();
      const audioId = audioCode || process.env.VOICENSMS_ACCIDENT_OBD;
      const audioRecording = await AudioRecording.findById(audioId).lean();
      // logger.log(audioRecording);

      if (!audioRecording) throw new Error("audioRecording_not_found");


      if (!vehicle) throw new Error("vehicle_not_found");
      if (!vehicle.emergencyContacts || vehicle.emergencyContacts.length === 0) {
        throw new Error("no_emergency_contacts");
      }
      const mobiles = vehicle.emergencyContacts.map((x: any) => x.mobile);

      await this.smsService.initiateAutoGeneratedCall(audioRecording.fileName, mobiles).catch(err => {
        logger.error('auto generated call failed', err.message);
        throw new Error("auto_call_initiation_failed");
      });

      return true;
    } catch (err) {
      logger.error("initiateAutoGeneratedCall Error:", err);
      throw new Error("auto_call_initiation_failed");
    }
  };



  getSmartCardDetails = async (qrId: string) => {
    try {
      const qr = await QR.findOne({ qrId }).lean();
      if (!qr) throw new Error("qr_not_found");

      const smartCard = await SmartCard.findById(qr.moduleProfileId)
        .populate('activeSocialLinks.type', ' -_id type logoUrl webSiteName')
        .lean();
      if (!smartCard) throw new Error("smart_card_not_found");

      const activeLinks = smartCard.activeSocialLinks.filter((x: any) => x.isActive);
      const businessDetails = {
        businessName: smartCard.businessName,
        siteUrl: smartCard.siteUrl,
        siteName: smartCard.siteName,
        resumeUrl: smartCard.resumeUrl,
      }

      return { businessDetails, activeLinks };
    } catch (err) {
      logger.error("getSmartCardDetails Error:", err);
      throw new Error("smart_card_get_failed");
    }
  };









  /**
   * Fetch vehicle details from 3rd party API
   */
  async fetchVehicleFromThirdParty(vehicleNumber: string): Promise<any> {
    try {
      // const apiUrl = process.env.THIRD_PARTY_VEHICLE_API_URL || "https://api.invincibleocean.com/invincible/vehicleRegistrationV10";
      // const clientId = process.env.THIRD_PARTY_VEHICLE_CLIENT_ID;
      // const secretKey = process.env.THIRD_PARTY_VEHICLE_SECRET_KEY;

      const response = await axios.post(process.env.THIRD_PARTY_VEHICLE_API_URL!,
        { vehicleNumber },
        {
          headers: {
            "Content-Type": "application/json",
            "clientId": process.env.THIRD_PARTY_VEHICLE_CLIENT_ID!,
            "secretKey": process.env.THIRD_PARTY_VEHICLE_SECRET_KEY!
          }
        }
      );

      const data = response.data;

      if (data.code !== 200 || !data.result) {
        throw new Error("vehicle_data_not_found");
      }

      const result = data.result;

      // Map 3rd party response to our format
      return {
        regNo: result.rc_number || vehicleNumber,
        ownerName: result.owner_name,
        ownerNumber: result.owner_number,
        vehicleClass: result.vehicle_category,
        make: result.maker_description,
        model: result.maker_model,
        fuel: result.fuel_type,
        color: result.color,
        unldWt: result.unladen_weight,
        manufDate: result.manufacturing_date_formatted,
        wheelbase: result.wheelbase,
        seatCap: result.seat_capacity,
        issueDate: result.registration_date,
        regAuthority: result.regAuthority,
        rcStatus: result.rc_status,
        rcExpiry: result.fit_up_to,
        underTheHood: {
          engineNo: result.vehicle_engine_number,
          cylinder: result.no_cylinders,
          cc: result.cubic_capacity,
          chassisNumber: result.vehicle_chasi_number,
        },
        insurance: {
          policyNo: result.insurance_policy_number,
          validTill: dayjs(result.insurance_upto, 'YYYY-MM-DD').format('DD, MMM, YYYY'),
          companyName: result.insurance_company,
          status: dayjs(result.insurance_upto, 'YYYY-MM-DD').isAfter(dayjs()) ? 'Active' : 'Expired'
        },
        puc: {
          certificateNo: result.pucc_number,
          emmisionNorm: result.norms_type,
          validTill: dayjs(result.pucc_upto, 'YYYY-MM-DD').format('DD, MMM, YYYY'),
          status: dayjs(result.pucc_upto, 'YYYY-MM-DD').isAfter(dayjs()) ? 'Active' : 'Expired',
        }
      };
    } catch (err: any) {
      logger.error("[VehicleService] Error calling 3rd party API:", err?.response?.data || err.message);
      throw new Error("third_party_vehicle_fetch_failed");
    }
  }

  //fetch vehicle challan from 3rd party API
  async fetchVehicleChallan(vehicleNumber: string): Promise<any> {
    try {
      const response = await axios.post(process.env.THIRD_PARTY_VEHICLE_CHALLAN_API_URL!,
        { vehicleNumber },
        {
          headers: {
            "Content-Type": "application/json",
            "clientId": process.env.THIRD_PARTY_VEHICLE_CLIENT_ID!,
            "secretKey": process.env.THIRD_PARTY_VEHICLE_SECRET_KEY!
          }
        }
      );

      const data = response.data;

      if (data.code !== 200 || !data.result) {
        throw new Error("vehicle_challan_not_found");
      }

      const challans = data.result.map((challan: any) => ({
        challanNo: challan.challanNo,
        vehicleNumber: challan.dlRcNumber,
        violatorName: challan.nameViolator,
        challanDate: challan.dateChallan,
        location: challan.locationChallan,
        violations: challan.detailsViolation?.map((v: any) => v.offence) || [],
        amount: challan.amountChallan,
        status: challan.status,
        rtoName: challan.nameRTO,
        paymentDate: challan.datePayment,
        receiptNo: challan.noReceipt
      }));

      return {
        vehicleNumber,
        totalChallans: challans.length,
        challans
      };
    } catch (err: any) {
      logger.error("[VehicleService] Error calling challan API:", err?.response?.data || err.message);
      throw new Error("vehicle_challan_fetch_failed");
    }
  }

  /**
* Call API Setu Transport RC certificate API (sandbox).
*/
  async fetchRVCertificate(params: VehicleRcRequest): Promise<VehicleRcResult> {
    const { regNo, chassisNo, uid, fullName } = params;

    if (!regNo || !chassisNo) {
      throw new Error("regNo and chassisNo are required");
    }

    const url = `${process.env.TRANSPORT_SANDBOX_BASE!}/certificate/v3/transport/rvcer`;

    // In sandbox, demo consent artifact & dummy data are allowed.
    // For production, you must build a real consentArtifact per guidelines.
    const payload = {
      txnId: cryptoRandomUUID(), // small helper below
      format: "xml", // we want XML so we can parse; could also request pdf
      certificateParameters: {
        reg_no: regNo,
        chasis_no: chassisNo,
        UID: uid || "123412341234", // dummy for sandbox
        FullName: fullName || "Demo user", // dummy for sandbox
      },
      consentArtifact: {
        consent: {
          consentId: cryptoRandomUUID(),
          timestamp: new Date().toISOString(),
          dataConsumer: {
            id: "mysafety24x7", // your org identifier
          },
          dataProvider: {
            id: "morth", // for example; adjust as per spec if needed
          },
          purpose: {
            description: "Vehicle RC verification for safety/compliance",
          },
          user: {
            idType: "MOBILE",
            idNumber: "9999999999",
            mobile: "9999999999",
            email: "test@example.com",
          },
          data: {
            id: "transport-rc",
          },
          permission: {
            access: "VIEW",
            dateRange: {
              from: new Date().toISOString(),
              to: new Date().toISOString(),
            },
            frequency: {
              unit: "ONCE",
              value: 1,
              repeats: 0,
            },
          },
        },
        signature: {
          signature: "dummy-signature-for-sandbox", // sandbox doesn't verify this
        },
      },
    };

    const headers = {
      Accept: "application/xml", // or application/pdf, but xml is easier to parse
      "Content-Type": "application/json",
      "X-APISETU-APIKEY": process.env.TRANSPORT_SANDBOX_API_KEY!,
      "X-APISETU-CLIENTID": process.env.TRANSPORT_SANDBOX_CLIENT_ID!,
    };

    try {
      const response = await axios.post(url, payload, {
        headers,
        // For sandbox, it returns XML in the body.
        responseType: "text",
      });

      const rawXml = response.data as string;
      const parsed = await parseStringPromise(rawXml, { explicitArray: false });

      // The XML root is <Certificate> ... </Certificate>
      const cert = parsed?.Certificate || {};

      // Extract some key fields into a friendly summary
      const number = cert?.number;
      const issueDate = cert?.issueDate;
      const issuedToPerson = cert?.IssuedTo?.Person || {};
      const ownerName = issuedToPerson?.name;

      const vr = cert?.CertificateData?.VehicleRegistration || {};
      const vehicle = vr?.Vehicle || {};
      const insurance = vr?.Insurance || {};
      const puc = vr?.PUCCertificate || {};

      const summary: VehicleRcResult["summary"] = {
        regNo: number,
        ownerName,
        issueDate,
        vehicleClass: vehicle?.class,
        make: vehicle?.make,
        model: vehicle?.model,
        fuel: vehicle?.fuelDesc,
        color: vehicle?.color,
        insurance: {
          policyNo: insurance?.policyNo,
          validTill: insurance?.validTill,
          companyName: insurance?.companyName,
        },
        puc: {
          certificateNo: puc?.certificateNo,
          validTill: puc?.validTill,
        },
      };

      return {
        rawXml,
        certificate: cert,
        summary,
      };
    } catch (err: any) {
      logger.error("[VehicleService] Error calling Transport RC API:", err?.response?.data || err.message);
      throw new Error("transport_rc_fetch_failed");
    }
  }
}



// Quick UUID generator for demo (Node 18+ has crypto.randomUUID)
function cryptoRandomUUID() {
  if (typeof (global as any).crypto?.randomUUID === "function") {
    return (global as any).crypto.randomUUID();
  }
  // fallback simple uuid-ish
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}