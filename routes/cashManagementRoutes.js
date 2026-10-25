import express from "express";
import { routeProtector } from "../middleware/routeProtector.js";
import {
  createCMS,
  deleteCMS,
  getAllCMS,
} from "../controllers/cashManagementController.js";

const router = express.Router();

router.post("/add", routeProtector, createCMS);
router.get("/all", routeProtector, getAllCMS);
router.delete("/delete/:cmsId", routeProtector, deleteCMS);

export default router;
