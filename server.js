import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import recordRoutes from "./routes/recordRoutes.js";
import aepsRoutes from "./routes/aepsRoutes.js";
import cashManagementRoutes from "./routes/cashManagementRoutes.js";
import ledgerRoutes from "./routes/ledgerRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import cors from "cors";

const app = express();

dotenv.config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const corsOptions = {
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
};
app.use(cors(corsOptions));

app.use("/v1/api/user", userRoutes);
app.use("/v1/api/record", recordRoutes);
app.use("/v1/api/aeps", aepsRoutes);
app.use("/v1/api/cms", cashManagementRoutes);
app.use("/v1/api/ledger", ledgerRoutes);
app.use("/v1/api/customer", customerRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found", success: false });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: "Internal server error",
    success: false,
  });
});

const startServer = async () => {
  try {
    await connectDB();
    const port = process.env.PORT;
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch {
    process.exitCode = 1;
  }
};

startServer();
