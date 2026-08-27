import { House } from "../models/House";
import { Subscription } from "../models/Subscription";

export class FrozenMemberService {
  async reassignFrozenMembers(houseId: string, userId: string, memberIds: string[]) {
    const subscription = await Subscription.findOne({ userId, status: 'active' }).lean();
    const userPlan = subscription?.plan || 'Free';
    
    if (userPlan === 'Free' && memberIds.length > 2) {
      throw new Error('free_users_can_reassign_max_2_members');
    }

    const house = await House.findById(houseId);
    if (!house) throw new Error('house_not_found');

    // Validate all memberIds exist in frozenMemberIds
    const invalidIds = memberIds.filter(id => 
      !(house as any).frozenMemberIds.some((fid: any) => fid.toString() === id)
    );
    if (invalidIds.length > 0) throw new Error('invalid_frozen_member_ids');

    // Move selected members from frozen to active
    (house as any).frozenMemberIds = (house as any).frozenMemberIds.filter(
      (id: any) => !memberIds.includes(id.toString())
    );
    house.memberIds = [...house.memberIds, ...memberIds as any];
    await house.save();

    return {
      reassignedCount: memberIds.length,
      totalActive: house.memberIds.length,
      totalFrozen: (house as any).frozenMemberIds.length
    };
  }
}
