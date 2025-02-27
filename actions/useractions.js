"use server";

import Razorpay from "razorpay";
import Payment from "@/models/Payment";
import connectDb from "@/db/connectDb";
import User from "@/models/User";

export const initiate = async (amount, to_username, paymentform) => {
  try {
    await connectDb();

    // Fetch the secret of the user who is receiving the payment
    let user = await User.findOne({ username: to_username });
    if (!user) {
      throw new Error(`User with username ${to_username} not found`);
    }

    const secret = user.razorpaysecret;
    const instance = new Razorpay({ key_id: user.razorpayid, key_secret: secret });

    let options = {
      amount: Number.parseInt(amount),
      currency: "INR",
    };

    let order = await instance.orders.create(options);

    // Create a payment object to show a pending payment in the database
    await Payment.create({ 
      oid: order.id, 
      amount: amount / 100, 
      to_user: to_username, 
      name: paymentform.name, 
      message: paymentform.message 
    });

    return order;
  } catch (error) {
    console.error("Error initiating payment:", error);
    throw error;
  }
};

export const fetchuser = async (username) => {
  try {
    await connectDb();
    let user = await User.findOne({ username: username });
    if (!user) {
      throw new Error(`User with username ${username} not found`);
    }
    return user.toObject({ flattenObjectIds: true });
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
};

export const fetchpayments = async (username) => {
  try {
    await connectDb();
    // Find all payments sorted by decreasing order of amount and flatten object IDs
    let payments = await Payment.find({ to_user: username, done: true })
      .sort({ amount: -1 })
      .limit(10)
      .lean();
    return payments;
  } catch (error) {
    console.error("Error fetching payments:", error);
    throw error;
  }
};

export const updateProfile = async (data, oldusername) => {
  try {
    await connectDb();

    // Ensure data is an object
    let ndata = typeof data === 'object' && data !== null ? data : {};

    // If the username is being updated, check if the new username is available
    if (oldusername !== ndata.username) {
      let existingUser = await User.findOne({ username: ndata.username });
      if (existingUser) {
        throw new Error("Username already exists");
      }

      // Update user data
      await User.updateOne({ email: ndata.email }, ndata);

      // Update all the usernames in the Payments table
      await Payment.updateMany({ to_user: oldusername }, { to_user: ndata.username });
    } else {
      await User.updateOne({ email: ndata.email }, ndata);
    }
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};