import xapi from 'xapi';

// ==================================================
// CONFIGURATION
// ==================================================

const SERVER_URL = 'http://10.0.151.30:8080/api/v1/racklink/state'; // Change as needed
const WIDGET_WHITEBOARD = 'btn_whiteboard';
const WIDGET_DUALSCREEN = 'btn_dualscreen';
const DEFAULT_MODE = 'dualscreen';

const MAX_RETRIES = 3;       // How many times to retry failed posts
const RETRY_DELAY_MS = 2000; // Milliseconds between attempts

// ==================================================
// STATE
// ==================================================

let syncInProgress = false;
let commandBusy = false;

// ==================================================
// RLNK COMMANDS (By Mode)
// ==================================================

async function postWhiteboardCommand() {
  try {
    await xapi.Command.HttpClient.Post({
      Url: SERVER_URL,
      Header: [ 'Content-Type: application/json' ],
      ResultBody: 'PlainText',
      Timeout: 10
    }, JSON.stringify({
      device: 'rlink-215',
      outlet: '2',
      action: 'off'
    }));
    console.log('Whiteboard POST: success');
    return true;
  } catch (err) {
    console.log(`Whiteboard POST: error - ${err.message}`);
    return false;
  }
}

async function postDualScreenCommand() {
  try {
    await xapi.Command.HttpClient.Post({
      Url: SERVER_URL,
      Header: [ 'Content-Type: application/json' ],
      ResultBody: 'PlainText',
      Timeout: 10
    }, JSON.stringify({
      device: 'rlink-215',
      outlet: '2',
      action: 'on'
    }));
    console.log('DualScreen POST: success');
    return true;
  } catch (err) {
    console.log(`DualScreen POST: error - ${err.message}`);
    return false;
  }
}

// ==================================================
// RETRY HELPERS
// ==================================================

async function reliableCommand(postCommandFn, maxTries = MAX_RETRIES, delayMs = RETRY_DELAY_MS) {
  if (commandBusy) {
    console.log('RLNK busy, skipping new request');
    return;
  }
  commandBusy = true;
  let attempt = 0;
  let success = false;
  while (attempt < maxTries && !success) {
    attempt++;
    success = await postCommandFn();
    if (success) break;
    if (attempt < maxTries) {
      console.log(`Retrying in ${delayMs/1000} sec...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } else {
      console.log("Command ultimately failed after max retries");
    }
  }
  setTimeout(() => { commandBusy = false; }, 1000); // Cooldown after command
}

// ==================================================
// UI MODE CONTROL
// ==================================================

async function setMode(mode, sendCommand = true) {
  syncInProgress = true;
  try {
    if (mode === 'whiteboard') {
      await xapi.Command.UserInterface.Extensions.Widget.SetValue({
        WidgetId: WIDGET_WHITEBOARD, Value: 'on'
      });
      await xapi.Command.UserInterface.Extensions.Widget.SetValue({
        WidgetId: WIDGET_DUALSCREEN, Value: 'off'
      });
      console.log('MODE: Whiteboard Only');
      if (sendCommand) {
        reliableCommand(postWhiteboardCommand);
      }
    }
    if (mode === 'dualscreen') {
      await xapi.Command.UserInterface.Extensions.Widget.SetValue({
        WidgetId: WIDGET_WHITEBOARD, Value: 'off'
      });
      await xapi.Command.UserInterface.Extensions.Widget.SetValue({
        WidgetId: WIDGET_DUALSCREEN, Value: 'on'
      });
      console.log('MODE: Dual Screen Meeting');
      if (sendCommand) {
        reliableCommand(postDualScreenCommand);
      }
    }
  } catch (err) {
    console.log(`UI ERROR: ${err.message}`);
  }
  setTimeout(() => { syncInProgress = false; }, 500);
}

// ==================================================
// WIDGET EVENTS
// ==================================================

xapi.Event.UserInterface.Extensions.Widget.Action.on((event) => {
  if (syncInProgress) return;
  if (event.Type !== 'changed') return;
  console.log(`Widget Event: ${JSON.stringify(event)}`);

  if (event.WidgetId === WIDGET_WHITEBOARD && event.Value === 'on') {
    setMode('whiteboard');
  }
  if (event.WidgetId === WIDGET_DUALSCREEN && event.Value === 'on') {
    setMode('dualscreen');
  }
});

// ==================================================
// INITIALIZATION
// ==================================================

async function initialize() {
  console.log('Initializing Room Mode UI');
  setTimeout(() => {
    setMode(DEFAULT_MODE);
  }, 10000); // Wait 10 seconds for network to stabilize
}

initialize();

console.log('Room_Mode_UI Ready');