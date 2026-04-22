// routes/service.js  — example Express route wiring

const express = require("express");
const { callExternalService } = require("../services/externalApi");

const router = express.Router();

router.get("/:serviceId/*", async (req, res) => {
  const { serviceId } = req.params;

  // path[0] is always "*" wildcard — reconstruct the sub-path safely
  const subPath = "/" + (req.params[0] || "");

  // Only forward an explicit whitelist of query params, never req.query wholesale
  const { page, limit } = req.query;
  const safeParams = {};
  if (page)  safeParams.page  = page;
  if (limit) safeParams.limit = limit;

  const data = await callExternalService(serviceId, subPath, safeParams, res);

  if (data !== null) {
    res.status(200).json(data);
  }
  // If null, callExternalService has already written an error response
});

module.exports = router;