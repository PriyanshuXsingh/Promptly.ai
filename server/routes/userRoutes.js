import express from "express";
import { auth } from "../middlewares/auth.js";
import {
  getPublishCreation,
  getUserCreation,
  togglelikeCreation,
} from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.get("/get-user-creations", auth, getUserCreation);
userRouter.get("/get-published-creations", auth, getPublishCreation);
userRouter.post("/toggle-like-creation", auth, togglelikeCreation);

export default userRouter;
