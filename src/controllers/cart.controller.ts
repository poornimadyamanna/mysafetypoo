import { Response } from 'express';
import { CartService } from '../services/cart.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { successResponse, errorResponse } from '../utils/response';

export class CartController {
    private cartService = new CartService();

    addOrUpdateCart = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const { moduleType, quantity, orderType } = req.body;

            if (!moduleType || !quantity) {
                return errorResponse(req, res, 'missing_required_fields', 400);
            }

            // if (quantity <= 0) {
            //     return errorResponse(req, res, 'invalid_quantity', 400);
            // }

            const cart = await this.cartService.addOrUpdateCart(
                userId,
                moduleType,
                quantity,
                orderType || 'PURCHASE'
            );
            return successResponse(req, res, 'cart_updated', cart);
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    getCart = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const { orderType } = req.body;
            const cart = await this.cartService.getCart(userId, (orderType as 'PURCHASE' | 'DOWNLOAD') || 'PURCHASE');
            return successResponse(req, res, 'cart_retrieved', cart);
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };

    clearCart = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user._id;
            const { orderType } = req.body;
            
            if (!orderType) {
                return errorResponse(req, res, 'missing_required_fields', 400);
            }

            await this.cartService.clearCart(userId, orderType);
            return successResponse(req, res, 'cart_cleared', { totalItems: 0, totalAmount: 0 });
        } catch (error: any) {
            return errorResponse(req, res, error.message || 'something_went_wrong', 400);
        }
    };
}
