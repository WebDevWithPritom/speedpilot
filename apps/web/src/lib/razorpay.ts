import Razorpay from "razorpay";

// Fallback dummy keys if not yet provided via environment
const key_id = process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder";
const key_secret = process.env.RAZORPAY_KEY_SECRET || "dummy_secret_placeholder";

export const razorpay = new Razorpay({
  key_id,
  key_secret,
});
