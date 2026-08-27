import { injectable } from "tsyringe";
import axios from "axios";
import logger from "../config/logger";

@injectable()
export class MapsService {
  getAddressFromCoordinates = async (lat: number, lng: number) => {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.GOOGLE_API_KEY}`
      );

      if (response.data.status !== "OK") {
        throw new Error("geocoding_failed");
      }

      const result = response.data.results[0];
      if (!result) throw new Error("address_not_found");

      const address = result.formatted_address;
      const components = result.address_components || [];
      
      // Extract address components
      const street = components.find((c: any) => c.types.includes("route"))?.long_name || 
                     components.find((c: any) => c.types.includes("street_address"))?.long_name || null;
      
      const city = components.find((c: any) => c.types.includes("locality"))?.long_name || 
                   components.find((c: any) => c.types.includes("administrative_area_level_2"))?.long_name || null;
      
      const state = components.find((c: any) => c.types.includes("administrative_area_level_1"))?.long_name || null;
      
      const country = components.find((c: any) => c.types.includes("country"))?.long_name || null;
      
      const pincode = components.find((c: any) => c.types.includes("postal_code"))?.long_name || null;

      // Generate Google Maps URL using place_id for better accuracy
      const mapUrl = result.place_id 
        ? `https://www.google.com/maps/place/?q=place_id:${result.place_id}`
        : `https://www.google.com/maps?q=${lat},${lng}`;

      return { address, street, city, state, country, pincode, mapUrl };
    } catch (err: any) {
      logger.error("getAddressFromCoordinates Error:", err);
      throw new Error(err.message);
    }
  };

  getAutocompleteSuggestions = async (input: string, country?: string) => {
    try {
      const countryParam = country ? `&components=country:${country}` : '';
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}${countryParam}&key=${process.env.GOOGLE_API_KEY}`
      );

      if (response.data.status !== "OK" && response.data.status !== "ZERO_RESULTS") {
        throw new Error("autocomplete_failed");
      }

      const suggestions = await Promise.all(
        response.data.predictions.map(async (prediction: any) => {
          const details = await this.getPlaceDetails(prediction.place_id);
          return {
            placeId: prediction.place_id,
            description: prediction.description,
            mainText: prediction.structured_formatting?.main_text,
            secondaryText: prediction.structured_formatting?.secondary_text,
            lat: details.lat,
            lng: details.lng
          };
        })
      );

      return suggestions;
    } catch (err: any) {
      logger.error("getAutocompleteSuggestions Error:", err);
      throw new Error(err.message);
    }
  };

  getPlaceDetails = async (placeId: string) => {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${process.env.GOOGLE_API_KEY}`
      );

      if (response.data.status !== "OK") {
        throw new Error("place_details_failed");
      }

      const result = response.data.result;
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        address: result.formatted_address
      };
    } catch (err: any) {
      logger.error("getPlaceDetails Error:", err);
      throw new Error(err.message);
    }
  };
}