import { Address } from '../models/Address';

export class AddressService {
    async createAddress(userId: string, addressData: any) {
        // If this is set as default, unset other defaults
        if (addressData.isDefault) {
            await Address.updateMany({ userId }, { isDefault: false });
        }

        const address = await Address.create({ userId, ...addressData });
        return address;
    }

    async getUserAddresses(userId: string) {
        return await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean();
    }

    async getAddressById(addressId: string, userId: string) {
        const address = await Address.findOne({ _id: addressId, userId }).lean();
        if (!address) throw new Error('address_not_found');
        return address;
    }

    async updateAddress(addressId: string, userId: string, updateData: any) {
        const address = await Address.findOne({ _id: addressId, userId });
        if (!address) throw new Error('address_not_found');

        // If setting as default, unset other defaults
        if (updateData.isDefault) {
            await Address.updateMany({ userId, _id: { $ne: addressId } }, { isDefault: false });
        }

        Object.assign(address, updateData);
        await address.save();
        return address;
    }

    async deleteAddress(addressId: string, userId: string) {
        const address = await Address.findOneAndDelete({ _id: addressId, userId });
        if (!address) throw new Error('address_not_found');
        return address;
    }

    async getDefaultAddress(userId: string) {
        return await Address.findOne({ userId, isDefault: true }).lean();
    }
}
