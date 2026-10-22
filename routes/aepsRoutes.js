import express from "express";
import { routeProtector } from "../middleware/routeProtector.js";
import {
  createTransaction,
  deleteTransaction,
  getAllTransactions,
} from "../controllers/aepsController.js";

const router = express.Router();

router.post("/add", routeProtector, createTransaction);
router.get("/all", routeProtector, getAllTransactions);
router.delete("/delete/:transactionId", routeProtector, deleteTransaction);

export default router;
