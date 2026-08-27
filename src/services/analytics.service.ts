import { QR } from '../models/QR';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { Subscription } from '../models/Subscription';
import { CallSession } from '../models/CallSession';
import { House } from '../models/House';
import { Vehicle } from '../models/Vehicle';
import { SmartCard } from '../models/SmartCard';
import { LostFound } from '../models/LostFound';

export class AnalyticsService {
    async getDashboardStats() {
        const [
            totalUsers,
            activeUsers,
            freeUsers,
            premiumUsers,
            totalQRs,
            activeQRs,
            temporaryQRs,
            physicalQRs,
            totalOrders,
            completedOrders,
            totalRevenue,
            monthlyRevenue
        ] = await Promise.all([
            User.countDocuments({ role: 'user' }),
            User.countDocuments({ role: 'user', isActive: true }),
            Subscription.countDocuments({ plan: 'Free', status: 'active' }),
            Subscription.countDocuments({ plan: 'Premium', status: 'active' }),
            QR.countDocuments({}),
            QR.countDocuments({ status: 'ACTIVE' }),
            QR.countDocuments({ isTemporary: true }),
            QR.countDocuments({ qrType: 'Physical' }),
            Order.countDocuments({}),
            Order.countDocuments({ orderStatus: 'Completed', paymentStatus: 'Completed' }),
            this.getTotalRevenue(),
            this.getMonthlyRevenue()
        ]);

        return {
            users: { total: totalUsers, active: activeUsers, free: freeUsers, premium: premiumUsers },
            qrs: { total: totalQRs, active: activeQRs, temporary: temporaryQRs, physical: physicalQRs },
            orders: { total: totalOrders, completed: completedOrders },
            revenue: { total: totalRevenue, monthly: monthlyRevenue }
        };
    }

    async getModuleStats() {
        const modules = ['DoorBell', 'Vehicle', 'SmartCard', 'LostFound'];
        const stats: any = {};

        for (const module of modules) {
            const [totalQRs, activeQRs, totalProfiles] = await Promise.all([
                QR.countDocuments({ moduleType: module }),
                QR.countDocuments({ moduleType: module, status: 'ACTIVE' }),
                this.getModuleProfileCount(module)
            ]);

            stats[module] = { totalQRs, activeQRs, totalProfiles };
        }

        return stats;
    }

    async getUserGrowth(days: number = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const growth = await User.aggregate([
            { $match: { role: 'user', createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        return growth.map(g => ({ date: g._id, users: g.count }));
    }

    async getRevenueGrowth(months: number = 6) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        const revenue = await Order.aggregate([
            {
                $match: {
                    orderStatus: 'Completed',
                    paymentStatus: 'Completed',
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                    revenue: { $sum: '$totalAmount' },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        return revenue.map(r => ({ month: r._id, revenue: r.revenue, orders: r.orders }));
    }

    async getQRUsageStats() {
        const [scannedQRs, expiredQRs, frozenQRs] = await Promise.all([
            QR.countDocuments({ status: 'ACTIVE', lastScannedAt: { $exists: true } }),
            QR.countDocuments({ status: 'EXPIRED' }),
            QR.countDocuments({ isFrozen: true })
        ]);

        return { scanned: scannedQRs, expired: expiredQRs, frozen: frozenQRs };
    }

    async getCallStats(days: number = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const stats = await CallSession.aggregate([
            { $match: { status: 'completed', createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: '$callType',
                    totalCalls: { $sum: 1 },
                    totalDuration: { $sum: '$durationSeconds' },
                    avgDuration: { $avg: '$durationSeconds' }
                }
            }
        ]);

        return stats.reduce((acc, s) => {
            acc[s._id] = {
                totalCalls: s.totalCalls,
                totalDuration: s.totalDuration,
                avgDuration: Math.round(s.avgDuration)
            };
            return acc;
        }, {} as any);
    }

    async getTopUsers(limit: number = 10) {
        const topUsers = await QR.aggregate([
            { $match: { ownerId: { $exists: true, $ne: null } } },
            { $group: { _id: '$ownerId', qrCount: { $sum: 1 } } },
            { $sort: { qrCount: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    userId: '$_id',
                    name: '$user.name',
                    phone: '$user.phone',
                    email: '$user.email',
                    qrCount: 1
                }
            }
        ]);

        return topUsers;
    }

    async getSubscriptionStats() {
        const conversions = await Subscription.aggregate([
            {
                $group: {
                    _id: '$plan',
                    count: { $sum: 1 }
                }
            }
        ]);

        const conversionRate = conversions.find(c => c._id === 'Premium')?.count || 0;
        const totalUsers = conversions.reduce((sum, c) => sum + c.count, 0);

        return {
            free: conversions.find(c => c._id === 'Free')?.count || 0,
            premium: conversionRate,
            conversionRate: totalUsers > 0 ? ((conversionRate / totalUsers) * 100).toFixed(2) : 0
        };
    }

    private async getTotalRevenue() {
        const result = await Order.aggregate([
            { $match: { orderStatus: 'Completed', paymentStatus: 'Completed' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        return result[0]?.total || 0;
    }

    private async getMonthlyRevenue() {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const result = await Order.aggregate([
            {
                $match: {
                    orderStatus: 'Completed',
                    paymentStatus: 'Completed',
                    createdAt: { $gte: startOfMonth }
                }
            },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        return result[0]?.total || 0;
    }

    private async getModuleProfileCount(moduleType: string) {
        const models: any = { DoorBell: House, Vehicle, SmartCard, LostFound };
        return models[moduleType] ? await models[moduleType].countDocuments({}) : 0;
    }
}
