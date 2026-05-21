require('dotenv').config();

const express = require('express');
const axios = require('axios');
const http = require('http');

const app = express();

app.use(express.json());

// ======================================================
// CONFIGURATION
// ======================================================

const SERVER_PORT = 8080;

const RLNK = {
  ip: process.env.RLNK_IP,
  username: process.env.RLNK_USER,
  password: process.env.RLNK_PASS
};

// Disable HTTP keepalive for older embedded devices
const httpAgent = new http.Agent({
  keepAlive: false
});

// ======================================================
// RLNK REQUEST
// ======================================================

async function sendRequest(url, formData) {

  for (let attempt = 1; attempt <= 3; attempt++) {

    try {

      console.log(`RLNK attempt ${attempt}`);

      await axios({
        method: 'post',

        url: url,

        data: formData.toString(),

        auth: {
          username: RLNK.username,
          password: RLNK.password
        },

        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Connection': 'close'
        },

        httpAgent: httpAgent,

        timeout: 15000,

        responseType: 'text',

        transitional: {
          forcedJSONParsing: false
        },

        validateStatus: () => true

      });

      console.log('RLNK command success');

      return;

    } catch (err) {

      console.log(`RLNK attempt ${attempt} failed`);
      console.log(err.message);

      // Wait before retry
      if (attempt < 3) {

        await new Promise(resolve =>
          setTimeout(resolve, 2000)
        );

      }

    }

  }

  console.log('RLNK command ultimately failed');

}

// ======================================================
// OUTLET CONTROL
// ======================================================

function controlOutlet(outlet, action) {

  const command = action.toUpperCase();

  const formData = new URLSearchParams();

  formData.append('controlnum', outlet);
  formData.append('command', command);
  formData.append('controlname', `Outlet ${outlet}`);
  formData.append('delay', '3');

  const url = `http://${RLNK.ip}/outletsubmit.htm`;

  console.log(`POST -> ${url}`);
  console.log(formData.toString());

  // Fire-and-forget
  sendRequest(url, formData);

}

// ======================================================
// HEALTH CHECK
// ======================================================

app.get('/health', (req, res) => {

  res.status(200).json({
    status: 'ok'
  });

});

// ======================================================
// CISCO ENDPOINT
// ======================================================

app.post('/api/v1/racklink/state', (req, res) => {

  console.log('Incoming:', req.body);

  // Respond immediately to Cisco
  res.status(200).json({
    success: true
  });

  try {

    const { outlet, action } = req.body;

    console.log(`SUCCESS: outlet ${outlet} -> ${action}`);

    // Async RLNK handling
    controlOutlet(outlet, action);

  } catch (err) {

    console.error('RLNK ERROR');
    console.error(err.message);

  }

});

// ======================================================
// START SERVER
// ======================================================

app.listen(SERVER_PORT, '0.0.0.0', () => {

  console.log(`RackLink Listener Running on ${SERVER_PORT}`);

});