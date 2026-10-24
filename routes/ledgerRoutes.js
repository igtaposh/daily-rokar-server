import express from "express";
import { routeProtector } from "../middleware/routeProtector.js";
import {
  allLedgers,
  createLedger,
  deleteLedger,
} from "../controllers/ledgerController.js";

const router = express.Router();

router.post("/create/:customerId", routeProtector, createLedger);
router.get("/:customerId", routeProtector, allLedgers);
router.delete("/delete/:ledgerId", routeProtector, deleteLedger);

export default router;
