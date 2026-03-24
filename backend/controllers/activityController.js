const Activity = require("../models/Activity");

// POST /log-activity -> Save activity data
exports.logActivity = async (req, res) => {
  try {
    const { userId, domain, durationSeconds, classification, timestamp } = req.body;

    if (!userId || !domain || durationSeconds === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const activity = new Activity({
      userId,
      domain,
      durationSeconds,
      classification,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    await activity.save();
    res.status(201).json({ message: "Activity logged successfully" });
  } catch (err) {
    console.error("Error logging activity:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// GET /weekly-report -> Return aggregated weekly analytics
exports.getWeeklyReport = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "UserId is required" });

    // Calculate dates for the last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    // Fetch activities for the user in the last week
    const activities = await Activity.find({
      userId,
      timestamp: { $gte: startDate, $lte: endDate }
    });

    // Aggregate Summary (sum duration by classification)
    let summary = {
      productive: 0,
      unproductive: 0,
      neutral: 0
    };

    activities.forEach(log => {
      summary[log.classification] += log.durationSeconds;
    });

    // Aggregate Domain Stats (Top Sites) using Mongoose Aggregation
    const domainStats = await Activity.aggregate([
      { $match: { userId, timestamp: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: "$domain", totalTime: { $sum: "$durationSeconds" }, class: { $first: "$classification" } } },
      { $sort: { totalTime: -1 } } // Highest time first
    ]);

    res.status(200).json({ summary, domainStats, message: "Weekly report generated." });
  } catch (err) {
    console.error("Error generating report:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
