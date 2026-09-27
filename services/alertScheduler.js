const MaintenanceAlert = require("../models/MaintenanceAlert");
const Vehicle = require("../models/Vehicle");
const User = require("../models/User");
const { sendMaintenanceAlertEmail } = require("./emailService");

/**
 * Check for due maintenance alerts and send email reminders
 * This function should be called periodically (e.g., daily via cron job)
 */
const checkAndSendAlerts = async () => {
  try {
    console.log(`[Alert Scheduler] Starting alert check at ${new Date().toISOString()}`);

    // Get all open alerts
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Alerts that are:
    // 1. Due within 7 days (upcoming alerts)
    // 2. Already overdue
    const dueAlerts = await MaintenanceAlert.find({
      status: "open",
      $or: [
        { dueDate: { $lte: sevenDaysFromNow, $gte: now } }, // Due within next 7 days
        { dueDate: { $lt: now } } // Already overdue
      ]
    })
      .populate("vehicle", "brand model registrationNo user mileage")
      .populate("serviceType", "name")
      .lean();

    console.log(`[Alert Scheduler] Found ${dueAlerts.length} alerts to process`);

    // Also check mileage-based alerts
    const allOpenAlerts = await MaintenanceAlert.find({ status: "open" })
      .populate("vehicle", "brand model registrationNo user mileage")
      .populate("serviceType", "name")
      .lean();

    const mileageBasedAlerts = allOpenAlerts.filter((alert) => {
      if (!alert.dueMileage || !alert.vehicle || !alert.vehicle.mileage) return false;
      return alert.vehicle.mileage >= alert.dueMileage;
    });

    // Combine both types
    const allAlertsToProcess = [...dueAlerts, ...mileageBasedAlerts];
    const uniqueAlerts = Array.from(
      new Map(allAlertsToProcess.map((item) => [item._id.toString(), item])).values()
    );

    let sentCount = 0;
    let failedCount = 0;

    // Send email for each alert
    for (const alert of uniqueAlerts) {
      try {
        const user = await User.findById(alert.vehicle.user);
        if (!user || !user.email) {
          console.warn(`[Alert Scheduler] User not found or no email for alert ${alert._id}`);
          failedCount++;
          continue;
        }

        const alertData = {
          vehicleBrand: alert.vehicle.brand,
          vehicleModel: alert.vehicle.model,
          serviceType: alert.serviceType.name,
          dueDate: alert.dueDate,
          dueMileage: alert.dueMileage
        };

        const result = await sendMaintenanceAlertEmail(user.email, user.fullname, alertData);

        if (result.success) {
          sentCount++;
          // Mark alert as having been notified (optional: add a notifiedAt field to model)
          console.log(`[Alert Scheduler] Email sent for alert ${alert._id} to ${user.email}`);
        } else {
          failedCount++;
          console.error(`[Alert Scheduler] Failed to send email for alert ${alert._id}`);
        }
      } catch (error) {
        failedCount++;
        console.error(`[Alert Scheduler] Error processing alert:`, error.message);
      }
    }

    console.log(
      `[Alert Scheduler] Completed. Sent: ${sentCount}, Failed: ${failedCount}, Total: ${uniqueAlerts.length}`
    );
    return { sent: sentCount, failed: failedCount, total: uniqueAlerts.length };
  } catch (error) {
    console.error("[Alert Scheduler] Critical error:", error.message);
    return { sent: 0, failed: -1, error: error.message };
  }
};

/**
 * Start the alert scheduler to run at specified intervals
 * @param {number} intervalMinutes - How often to check for alerts (default: 60 minutes)
 */
const startAlertScheduler = (intervalMinutes = 60) => {
  console.log(`[Alert Scheduler] Starting scheduler (interval: ${intervalMinutes} minutes)`);

  // Run immediately on startup
  checkAndSendAlerts();

  // Then run at the specified interval
  const intervalMs = intervalMinutes * 60 * 1000;
  setInterval(checkAndSendAlerts, intervalMs);

  console.log(`[Alert Scheduler] Scheduler started successfully`);
};

module.exports = {
  checkAndSendAlerts,
  startAlertScheduler
};
