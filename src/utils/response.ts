import { Request, Response } from "express";

// export const successResponse = (res: Response, message: string, data: any = {}, status = 200) => {
//     return res.status(status).json({
//         success: true,
//         message,
//         data,
//     });
// };

// export const errorResponse = (res: Response, message: string, status = 400) => {
//     return res.status(status).json({
//         success: false,
//         message,
//     });
// };

import { translate } from "./translate";

export const successResponse = async (
    req: Request,
    res: Response,
    messageKey: string,
    data: any = {},
    status = 200
) => {
    const message = await translate(req, messageKey);
    return res.status(status).json({
        success: true,
        message,
        data,
    });
};

export const errorResponse = async (
    req: Request,
    res: Response,
    messageKey: string,
    status = 400
) => {
    const message = await translate(req, messageKey);
    return res.status(status).json({
        success: false,
        message,
    });
};
