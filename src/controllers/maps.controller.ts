import { Request, Response } from "express";
import { container } from "tsyringe";
import { MapsService } from "../services/maps.service";
import { errorResponse, successResponse } from "../utils/response";

export class MapsController {
  private mapsService = container.resolve(MapsService);

  getAddress = async (req: Request, res: Response) => {
    try {
      const { lat, lng } = req.body;

      if (!lat || !lng) {
        return errorResponse(req, res, "lat_and_lng_required", 400);
      }

      const result = await this.mapsService.getAddressFromCoordinates(lat, lng);

      return successResponse(req, res, 'address_retrieved', result);
    } catch (error: any) {
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };

  getAutocomplete = async (req: Request, res: Response) => {
    try {
      const { input, country } = req.body;

      if (!input) {
        return errorResponse(req, res, "input_required", 400);
      }

      const suggestions = await this.mapsService.getAutocompleteSuggestions(input, country);

      return successResponse(req, res, 'suggestions_retrieved', { suggestions });
    } catch (error: any) {
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };

  getPlaceDetails = async (req: Request, res: Response) => {
    try {
      const { placeId } = req.body;

      if (!placeId) {
        return errorResponse(req, res, "place_id_required", 400);
      }

      const details = await this.mapsService.getPlaceDetails(placeId);

      return successResponse(req, res, 'place_details_retrieved', details);
    } catch (error: any) {
      return errorResponse(req, res, error.message || "something_went_wrong", 400);
    }
  };
}