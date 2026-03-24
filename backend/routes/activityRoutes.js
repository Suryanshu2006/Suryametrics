const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activityController");

// POST /log-activity
router.post("/log-activity", activityController.logActivity);

// GET /weekly-report
router.get("/weekly-report", activityController.getWeeklyReport);

module.exports = router;
