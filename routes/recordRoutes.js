import express from "express";
import { routeProtector } from "../middleware/routeProtector.js";
import {
  createRecord,
  deleteRecord,
  readAllRecords,
} from "../controllers/recordController.js";

const router = express.Router();

router.post("/add", routeProtector, createRecord);
router.get("/all", routeProtector, readAllRecords);
router.delete("/delete/:recordId", routeProtector, deleteRecord);
export default router;
