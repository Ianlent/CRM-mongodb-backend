import express from "express";

import { getFinancialSummary } from "../controller/analytics/financialController.js";
import { getOrderTrafficSummary } from "../controller/analytics/trafficAnalytics.js";
import { getServicePopularity } from "../controller/analytics/servicePopularity.js";

const router = express.Router();

router.get("/financial", getFinancialSummary); //?start=2025-04-01&end=2025-04-30

router.get("/traffic", getOrderTrafficSummary); //?start=2025-04-01&end=2025-04-30

router.get("/service-popularity", getServicePopularity); //?type=revenue||quantity&start=2025-04-01&end=2025-04-30

export default router;
