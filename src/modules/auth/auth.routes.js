const { Router } = require("express");
const { z } = require("zod");

const validate = require("../../common/validate");
const auth = require("../../middlewares/auth");
const authController = require("./auth.controller");

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().email().max(150),
  password: z.string().min(8).max(72),
});

const registerVerifySchema = z.object({
  email: z.string().email().max(150),
  otp: z.string().trim().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

const loginSchema = z.object({
  email: z.string().email().max(150),
  password: z.string().min(8).max(72),
});

const passwordChangeRequestSchema = z.object({
  currentPassword: z.string().min(8).max(72),
  newPassword: z.string().min(8).max(72),
});

const passwordChangeVerifySchema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().email().max(150).optional(),
});

const profileEmailVerifySchema = z.object({
  email: z.string().email().max(150),
  otp: z.string().trim().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

router.post(
  "/register",
  validate({ body: registerSchema }),
  authController.register,
);
router.post(
  "/register/verify-otp",
  validate({ body: registerVerifySchema }),
  authController.verifyRegistrationOtp,
);
router.post("/login", validate({ body: loginSchema }), authController.login);
router.get("/me", auth, authController.me);
router.patch(
  "/profile",
  auth,
  validate({ body: profileUpdateSchema }),
  authController.updateProfile,
);
router.post(
  "/profile/verify-email-otp",
  auth,
  validate({ body: profileEmailVerifySchema }),
  authController.verifyProfileEmailOtp,
);
router.post(
  "/password/request-otp",
  auth,
  validate({ body: passwordChangeRequestSchema }),
  authController.requestPasswordChangeOtp,
);
router.post(
  "/password/verify-otp",
  auth,
  validate({ body: passwordChangeVerifySchema }),
  authController.verifyPasswordChangeOtp,
);

module.exports = router;
