import xapi from 'xapi';

// ======================================================
// CONFIGURATION
// ======================================================

const SERVER_URL = 'http://10.0.151.30:8080/api/v1/racklink/state';

const WIDGET_WHITEBOARD = 'btn_whiteboard';
const WIDGET_DUALSCREEN = 'btn_dualscreen';

const DEFAULT_MODE = 'dualscreen';

// ======================================================
// STATE
// ======================================================

let syncInProgress = false;
let commandBusy = false;

// ======================================================
// SEND RLNK COMMAND
// ======================================================

async function sendRacklinkCommand(action) {

  if (commandBusy) {
    console.log('RLNK busy');
    return;
  }

  commandBusy = true;

  try {

    console.log(`Sending RLNK command: ${action}`);

    await xapi.Command.HttpClient.Post({
      Url: SERVER_URL,
      Header: [
        'Content-Type: application/json'
      ],
      ResultBody: 'PlainText',
      Timeout: 3
    },
    JSON.stringify({
      device: 'rlink-215',
      outlet: '2',
      action: action
    }));

    console.log(`RLNK command sent`);

  } catch (err) {

    console.log(`HTTP ERROR: ${err.message}`);

  }

  setTimeout(() => {
    commandBusy = false;
  }, 3000);

}

// ======================================================
// UI MODE CONTROL
// ======================================================

async function setMode(mode, sendCommand = true) {

  syncInProgress = true;

  try {

    if (mode === 'whiteboard') {

      await xapi.Command.UserInterface.Extensions.Widget.SetValue({
        WidgetId: WIDGET_WHITEBOARD,
        Value: 'on'
      });

      await xapi.Command.UserInterface.Extensions.Widget.SetValue({
        WidgetId: WIDGET_DUALSCREEN,
        Value: 'off'
      });

      console.log('MODE: Whiteboard Only');

      if (sendCommand) {
        sendRacklinkCommand('off');
      }

    }

    if (mode === 'dualscreen') {

      await xapi.Command.UserInterface.Extensions.Widget.SetValue({
        WidgetId: WIDGET_WHITEBOARD,
        Value: 'off'
      });

      await xapi.Command.UserInterface.Extensions.Widget.SetValue({
        WidgetId: WIDGET_DUALSCREEN,
        Value: 'on'
      });

      console.log('MODE: Dual Screen Meeting');

      if (sendCommand) {
        sendRacklinkCommand('on');
      }

    }

  } catch (err) {

    console.log(`UI ERROR: ${err.message}`);

  }

  setTimeout(() => {
    syncInProgress = false;
  }, 500);

}

// ======================================================
// WIDGET EVENTS
// ======================================================

xapi.Event.UserInterface.Extensions.Widget.Action.on((event) => {

  if (syncInProgress) {
    return;
  }

  if (event.Type !== 'changed') {
    return;
  }

  console.log(`Widget Event: ${JSON.stringify(event)}`);

  // ==========================================
  // WHITEBOARD MODE
  // ==========================================

  if (
    event.WidgetId === WIDGET_WHITEBOARD &&
    event.Value === 'on'
  ) {

    setMode('whiteboard');

  }

  // ==========================================
  // DUAL SCREEN MODE
  // ==========================================

  if (
    event.WidgetId === WIDGET_DUALSCREEN &&
    event.Value === 'on'
  ) {

    setMode('dualscreen');

  }

});

// ======================================================
// INITIALIZATION
// ======================================================

async function initialize() {

  console.log('Initializing Room Mode UI');

  // Delay startup to allow network stack to stabilize
  setTimeout(() => {

    setMode(DEFAULT_MODE);

  }, 10000);

}

initialize();

console.log('Room_Mode_UI Ready');