import { User } from "../models/User";

export const generateUserId = async (): Promise<string> => {
    let isUnique = false;
    let id = "";
    while (!isUnique) {
        id = Math.floor(10000000 + Math.random() * 90000000).toString(); // 8-digit
        const existingUser = await User.findOne({ uniqueId: id });
        if (!existingUser) isUnique = true;
    }
    return id;
};