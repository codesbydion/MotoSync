const nodemailer = require("nodemailer");

// Email transporter configuration
let transporter = null;

const initializeTransporter = () => {
  if (transporter) return transporter;

  // Use Gmail with app password or other SMTP provider
  const emailUser = process.env.EMAIL_USER || "your-email@gmail.com";
  const emailPass = process.env.EMAIL_PASSWORD || "your-app-password";
  const emailService = process.env.EMAIL_SERVICE || "gmail";

  transporter = nodemailer.createTransport({
    service: emailService,
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });

  return transporter;
};

/**
 * Send maintenance alert email
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's name
 * @param {Object} alertData - Alert data { vehicleBrand, vehicleModel, serviceType, dueDate, dueMileage }
 */
const sendMaintenanceAlertEmail = async (userEmail, userName, alertData) => {
  try {
    const transporter = initializeTransporter();

    const dueDateStr = alertData.dueDate ? new Date(alertData.dueDate).toLocaleDateString() : "N/A";
    const dueMileageStr = alertData.dueMileage ? `${alertData.dueMileage} km` : "N/A";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🔧 Maintenance Alert</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Your vehicle needs attention</p>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="margin-top: 0; font-size: 16px; color: #333;">Hi ${userName},</p>
          <p style="color: #666; font-size: 15px; line-height: 1.6;">
            Your <strong>${alertData.vehicleBrand} ${alertData.vehicleModel}</strong> requires maintenance for:
          </p>
          <div style="background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
              <strong>Service:</strong> ${alertData.serviceType}
            </p>
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
              <strong>Due Date:</strong> ${dueDateStr}
            </p>
            <p style="margin: 0; font-size: 14px; color: #666;">
              <strong>Due Mileage:</strong> ${dueMileageStr}
            </p>
          </div>
          <p style="color: #666; font-size: 15px; line-height: 1.6;">
            Please schedule a service appointment soon to keep your vehicle in excellent condition.
          </p>
          <p style="text-align: center; margin-top: 30px;">
            <a href="${process.env.APP_URL || "http://localhost:5001"}/user-dashboard.html" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
              View Dashboard
            </a>
          </p>
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
            MotoSync - Your Vehicle Maintenance Companion
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER || "noreply@motosync.com",
      to: userEmail,
      subject: `⚠️ Maintenance Alert: ${alertData.serviceType} for ${alertData.vehicleBrand} ${alertData.vehicleModel}`,
      html: htmlContent,
      text: `Hi ${userName},\n\nYour ${alertData.vehicleBrand} ${alertData.vehicleModel} requires maintenance for: ${alertData.serviceType}\n\nDue Date: ${dueDateStr}\nDue Mileage: ${dueMileageStr}\n\nPlease schedule a service appointment soon.\n\nMotoSync Team`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${userEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Failed to send email to ${userEmail}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send custom email
 */
const sendCustomEmail = async (to, subject, htmlContent) => {
  try {
    const transporter = initializeTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER || "noreply@motosync.com",
      to,
      subject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  initializeTransporter,
  sendMaintenanceAlertEmail,
  sendCustomEmail
};
