// DEPENDENCIES & SETUP
require('dotenv').config();

const express = require('express');
const axios = require('axios');
const http = require('http');
const winston = require('winston');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(express.json());

// ========================
// CONFIGURATION
// ========================

const SERVER_PORT = process.env.LISTENER_PORT || 8080;

const RLNK = {
  ip: process.env.RLNK_IP,
  username: process.env.RLNK_USER,
  password: process.env.RLNK_PASS
};

if (!RLNK.ip || !RLNK.username || !RLNK.password) {
  console.error('FATAL: Missing RLNK config in .env!');
  process.exit(1);
}

// Keepalive disabled for RLNK
const httpAgent = new http.Agent({ keepAlive: false });

// ========================
// LOGGING SETUP
// ========================

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(
      ({ level, message, timestamp }) => `${timestamp} [${level.toUpperCase()}] ${message}`
    )
  ),
  transports: [
    new winston.transports.Console(),
    // Rotating file logs
    new winston.transports.File({
      filename: 'log/rl_listener.log',
      maxsize: 1000000, // 1MB
      maxFiles: 10,
      tailable: true
    })
  ]
});

// Basic stats for `/health`
let recentRlnkErrors = 0;
let totalRlnkErrors = 0;
let lastRlnkResult = 'Never Attempted';

// ========================
// RLNK REQUEST (RELIABLE)
// ========================


async function sendRequestToRLNK(url, formData) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      logger.info(`RLNK POST attempt ${attempt} to ${url}`);
      const response = await axios({
        method: 'post',
        url: url,
        data: formData.toString(),
        auth: {
          username: RLNK.username,
          password: RLNK.password
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Origin': `http://${RLNK.ip}`,
          'Referer': `http://${RLNK.ip}/`,
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': '*/*'
        },
        timeout: 15000,
        responseType: 'text',
        validateStatus: null
      });

      logger.info(`RLNK Response: status=${response.status} length=${response.data?.length}`);
      // Success if 200 OK
      if (response.status === 200) {
        recentRlnkErrors = 0;
        lastRlnkResult = `Success ${new Date().toISOString()}`;
        return true;
      }
      logger.warn(`RLNK: Non-200 status: ${response.status}; data: ${response.data?.substring(0, 80)}`);

    } catch (err) {
      logger.warn(`RLNK POST attempt ${attempt} failed on exception: ${err.message}`);

      // ---- THIS IS THE SPECIAL CASE FOR RLNK'S PARSE ERROR ---- //
      if (err.message && err.message.includes('Parse Error: Invalid header token')) {
        logger.warn('Treating Parse Error as probable RLNK command success (see RLNK bug/quirk)');
        lastRlnkResult = `Success (parse error) ${new Date().toISOString()}`;
        recentRlnkErrors = 0;
        return true;
      }
      // ---- END PARSE ERROR HANDLING ---- //
    }
    totalRlnkErrors += 1;
    recentRlnkErrors += 1;
    if (attempt < 3) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  logger.error('RLNK command ultimately failed after 3 tries');
  lastRlnkResult = `FAIL ${new Date().toISOString()}`;
  return false;

}

// ========================
// VALIDATION MIDDLEWARE
// ========================

function validateRacklinkPayload(req, res, next) {
  const { outlet, action } = req.body;
  if (
    !outlet || !action ||
    !/^\d{1,2}$/.test(String(outlet)) ||
    !/^(on|off)$/i.test(String(action))
  ) {
    logger.warn(`Rejected invalid payload: ${JSON.stringify(req.body)}`);
    return res.status(400).json({ success: false, message: 'Invalid payload: specify outlet (1-99) and action ("on" or "off")' });
  }
  next();
}

// ========================
// RATE LIMITING (OPTIONAL)
// ========================

app.use(
  '/api/v1/racklink/state',
  rateLimit({
    windowMs: 5 * 1000,
    max: 5,
    handler: (req, res) => {
      logger.warn('Rate limit triggered');
      res.status(429).json({ success: false, message: 'Slow down...' });
    }
  })
);

// ========================
// OUTLET CONTROL
// ========================

function controlOutlet(outlet, action) {
  const command = action.toUpperCase();
  const formData = new URLSearchParams();
  formData.append('controlnum', outlet);
  formData.append('command', command);
  formData.append('controlname', `Outlet ${outlet}`);
  formData.append('delay', '3');

  const url = `http://${RLNK.ip}/outletsubmit.htm`;

  logger.info(`Posting to RLNK: ${formData.toString()}`);

  // Fire-and-forget, background
  sendRequestToRLNK(url, formData);
}

// ========================
// HEALTH ENDPOINT
// ========================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    lastRlnkResult,
    recentRlnkErrors,
    totalRlnkErrors,
    uptimeMinutes: Math.round(process.uptime() / 60)
  });
});

// ========================
// CISCO ENDPOINT
// ========================

app.post('/api/v1/racklink/state', validateRacklinkPayload, (req, res) => {
  logger.info('Incoming Cisco request: ' + JSON.stringify(req.body));
  res.status(200).json({ success: true });
  try {
    const { outlet, action } = req.body;
    logger.info(`Cisco requested outlet ${outlet} -> ${action}`);
    controlOutlet(outlet, action);
  } catch (err) {
    logger.error(`RLNK ERROR: ${err.message}`);
  }
});

// ========================
// START SERVER
// ========================

app.listen(SERVER_PORT, '0.0.0.0', () => {
  logger.info(`RackLink Listener Running on port ${SERVER_PORT}`);
});

// GRACEFUL SHUTDOWN
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down...');
  process.exit(0);
});
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down...');
  process.exit(0);
});