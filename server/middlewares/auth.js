//middleware to check userId and hasPremiumPlan

import { clerkClient} from "@clerk/express";

export const auth = async (req, res, next) => {
  try {
    const authData = await req.auth(); 
   
    const { userId, has } = authData;

    const hasPremiumPlan = await has({ plan: 'premium' });

    const user = await clerkClient.users.getUser(userId);

    if (!hasPremiumPlan && user.privateMetadata.free_usage) {
      req.free_usage = user.privateMetadata.free_usage;
    } else {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: 0,
        }
      })
      req.free_usage = 0;
    }
    req.plan = hasPremiumPlan ? 'premium' : 'free';
    next();
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
