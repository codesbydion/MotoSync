# MotoSync Email Alerts & Cost Analytics Implementation

## Features Implemented

### 1. Email Maintenance Alerts 🚨
Automatic email reminders for upcoming maintenance based on due dates and mileage.

**Features:**
- Daily scheduler checks for due alerts
- Sends beautiful HTML emails with alert details
- Supports both date-based and mileage-based alerts
- Configurable email intervals (default: 60 minutes)
- Logs all email activities for troubleshooting

**Files Created:**
- `services/emailService.js` - Email sending utility
- `services/alertScheduler.js` - Scheduled alert job runner

### 2. Cost Analytics Dashboard 📊
Comprehensive spending analytics with charts and comparisons.

**Features:**
- Monthly spending trend chart
- Service type breakdown (doughnut chart)
- Yearly cost analysis
- Vehicle-to-vehicle cost comparison
- Recent maintenance records view
- CSV export functionality

**Files Created:**
- `routes/analyticsRoutes.js` - Analytics API endpoints
- `public/analytics.js` - Frontend analytics UI

---

## Setup Instructions

### Email Configuration

1. **For Gmail Users:**
   - Enable 2-Factor Authentication: https://myaccount.google.com/security
   - Generate App Password: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer"
   - Copy the 16-character password

2. **Update `.env` file:**
   ```env
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-16-char-app-password
   APP_URL=http://localhost:5001
   ```

3. **For Other Email Services:**
   - SendGrid: `EMAIL_SERVICE=sendgrid`, `EMAIL_PASSWORD=<api-key>`
   - Mailgun: Update transporter config in `services/emailService.js`
   - Any SMTP: Update nodemailer config

### API Endpoints

#### Analytics Endpoints

**Get Cost Overview:**
```
GET /api/analytics/overview
Headers: Authorization: Bearer {token}

Response:
{
  "summary": {
    "totalCost": "50000.00",
    "recordCount": 25,
    "avgMonthlyCost": "2083.33",
    "mostExpensiveType": "General Service",
    "mostExpensiveCost": "15000.00"
  },
  "monthlyBreakdown": [
    { "month": "2026-01", "cost": 3000, "count": 2 },
    { "month": "2026-02", "cost": 5000, "count": 3 }
  ],
  "typeBreakdown": [
    { "type": "General Service", "cost": 15000, "count": 5 },
    { "type": "Oil Change", "cost": 10000, "count": 8 }
  ],
  "yearlyBreakdown": [
    { "year": 2026, "cost": 50000, "count": 25 }
  ]
}
```

**Vehicle Cost Comparison:**
```
GET /api/analytics/vehicle-comparison
Headers: Authorization: Bearer {token}

Response:
{
  "vehicles": [
    {
      "vehicleId": "...",
      "brand": "Honda",
      "model": "City",
      "registrationNo": "ABC-123",
      "totalCost": 25000,
      "recordCount": 10,
      "avgCostPerService": 2500
    }
  ]
}
```

**Recent Records:**
```
GET /api/analytics/recent-records?limit=10
Headers: Authorization: Bearer {token}

Response:
{
  "records": [
    {
      "date": "2026-06-15",
      "type": "Oil Change",
      "vehicle": "Honda City",
      "cost": 2500,
      "source": "service"
    }
  ]
}
```

### Frontend Features

#### Dashboard Updates

1. **Analytics automatically loads on dashboard:**
   - Monthly spending chart in the dashboard overview
   - Service type breakdown chart
   - Vehicle cost comparison section
   - Real-time stats update

2. **User interaction:**
   - Charts update every 5 minutes
   - Responsive design works on mobile
   - Dark/light theme support

3. **Export functionality:**
   - Users can export analytics as CSV
   - Function: `exportAnalyticsCSV()`

### Email Alert Example

Users will receive emails like:

```
Subject: ⚠️ Maintenance Alert: General Service for Honda City

Body:
Hi User,

Your Honda City requires maintenance for: General Service

Due Date: 2026-06-30
Due Mileage: 10000 km

Please schedule a service appointment soon to keep your vehicle in excellent condition.

[View Dashboard Button]

MotoSync - Your Vehicle Maintenance Companion
```

---

## Testing

### Test Email Alerts Locally

1. Run the server:
   ```bash
   npm install
   npm start
   ```

2. Create a maintenance alert with a past due date
3. The scheduler will check every 60 minutes (configurable)
4. For immediate testing, call the scheduler function:
   ```javascript
   // In services/alertScheduler.js, export checkAndSendAlerts
   // Or add a manual trigger endpoint
   ```

### Test Analytics Endpoints

```bash
# Get analytics overview
curl -X GET http://localhost:5001/api/analytics/overview \
  -H "Authorization: Bearer {token}"

# Get vehicle comparison
curl -X GET http://localhost:5001/api/analytics/vehicle-comparison \
  -H "Authorization: Bearer {token}"

# Get recent records
curl -X GET "http://localhost:5001/api/analytics/recent-records?limit=20" \
  -H "Authorization: Bearer {token}"
```

---

## Configuration Options

### Alert Scheduler Frequency

In `server.js`, modify the interval:
```javascript
// Default: 60 minutes
startAlertScheduler(60);

// Change to:
startAlertScheduler(30);  // Every 30 minutes
startAlertScheduler(1440);  // Once per day
```

### Email Subject & Template

Customize in `services/emailService.js`:
- Modify `htmlContent` for email template
- Update email subject prefix
- Change from email address

### Chart Colors

Customize in `public/analytics.js`:
- Line chart color: `borderColor: "#1fb6ff"`
- Doughnut chart colors array

---

## Troubleshooting

### Emails Not Sending

1. Check `.env` configuration
   ```bash
   echo $EMAIL_USER
   echo $EMAIL_PASSWORD
   ```

2. Enable Gmail less secure apps (if using old Gmail):
   - Go to https://myaccount.google.com/lesssecureapps
   - Allow less secure app access (NOT recommended, use App Password instead)

3. Check server logs:
   ```bash
   npm start  # Look for email error messages
   ```

4. Test email service directly:
   ```javascript
   // In Node REPL
   const emailService = require('./services/emailService');
   emailService.sendCustomEmail('test@example.com', 'Test', '<p>Test email</p>');
   ```

### Analytics Not Loading

1. Verify API endpoints are accessible
2. Check browser console for errors (F12)
3. Ensure user has service records in the database
4. Check MongoDB connection

### Charts Not Displaying

1. Verify Chart.js is loaded: `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>`
2. Check browser console for errors
3. Verify `analytics.js` is loaded after dashboard script
4. Clear browser cache and reload

---

## Performance Notes

- Scheduler runs every 60 minutes (configurable, not CPU intensive)
- Analytics queries are indexed on userId for fast retrieval
- Consider adding database indexes for large deployments:
  ```javascript
  // In ServiceRecord model
  maintenanceAlertSchema.index({ vehicle: 1, status: 1 });
  serviceRecordSchema.index({ user: 1, serviceDate: -1 });
  ```

---

## Future Enhancements

- [ ] SMS alerts in addition to email
- [ ] WhatsApp notifications
- [ ] Email digest (weekly/monthly summary)
- [ ] Custom alert thresholds per vehicle
- [ ] Spending predictions & budgets
- [ ] Service history PDF export
- [ ] Recurring service templates
- [ ] Warranty tracking

---

## Support

For issues or questions:
1. Check server logs: `npm start`
2. Check browser developer console: F12
3. Verify all environment variables are set correctly
4. Ensure MongoDB connection is active
5. Review the code comments in the service files

---

**Version:** 1.0
**Last Updated:** June 2026
**Author:** MotoSync Team
