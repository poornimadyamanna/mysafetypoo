import { Response } from 'express';
import { AddressService } from '../services/address.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { successResponse, errorResponse } from '../utils/response';

export class AddressController {
    private addressService = new AddressService();

    createAddress = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const { house, street, city, state, zipCode, country, fullAddress, fullMapUrl, longitude, latitude, isDefault } = req.body;

            // if (!house || !street || !city || !state || !zipCode) {
            //     return errorResponse(req, res, 'missing_required_fields', 400);
            // }

            const address = await this.addressService.createAddress(userId, {
                house,
                street,
                city,
                state,
                zipCode,
                country: country || 'India',
                fullMapUrl,
                fullAddress,
                longitude,
                latitude,
                isDefault: isDefault || false
            });

            return successResponse(req, res, 'address_created', address);
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    getUserAddresses = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const addresses = await this.addressService.getUserAddresses(userId);
            return successResponse(req, res, 'addresses_retrieved', addresses);
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    getAddressById = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const { addressId } = req.body;
            const address = await this.addressService.getAddressById(addressId, userId);
            return successResponse(req, res, 'address_retrieved', address);
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    updateAddress = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const { addressId, updateData } = req.body;
            const address = await this.addressService.updateAddress(addressId, userId, updateData);
            return successResponse(req, res, 'address_updated', address);
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    deleteAddress = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const { addressId } = req.body;
            await this.addressService.deleteAddress(addressId, userId);
            return successResponse(req, res, 'address_deleted', { addressId });
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    getDefaultAddress = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const address = await this.addressService.getDefaultAddress(userId);
            return successResponse(req, res, 'default_address_retrieved', address);
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };
}
