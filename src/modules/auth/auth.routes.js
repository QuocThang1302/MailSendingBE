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
  role: z.string().trim().max(50).optional(),
});

const loginSchema = z.object({
  email: z.string().email().max(150),
  password: z.string().min(8).max(72),
});

router.post(
  "/register",
  validate({ body: registerSchema }),
  authController.register,
);
router.post("/login", validate({ body: loginSchema }), authController.login);
router.get("/me", auth, authController.me);

module.exports = router;
