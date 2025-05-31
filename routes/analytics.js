import express from "express";

import { getFinancialSummary } from "../controller/analytics/financialController.js";
import { getOrderTrafficSummary } from "../controller/analytics/trafficAnalytics.js";

const router = express.Router();

router.get("/financial", getFinancialSummary); //?start=2025-04-01&end=2025-04-30

router.get("/traffic", getOrderTrafficSummary); //?start=2025-04-01&end=2025-04-30

export default router;
