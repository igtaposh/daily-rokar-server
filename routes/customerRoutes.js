import express from "express";
import { routeProtector } from "../middleware/routeProtector.js";
import {
  createCustomer,
  customerProfile,
  deleteCustomer,
  fetchAllCustomers,
  updateCustomer,
} from "../controllers/customerController.js";

const router = express.Router();

router.post("/create", routeProtector, createCustomer);
router.get("/profile/:customerId", routeProtector, customerProfile);
router.get("/", routeProtector, fetchAllCustomers);
router.patch("/update/:customerId", routeProtector, updateCustomer);
router.delete("/delete/:customerId", routeProtector, deleteCustomer);

export default router;
