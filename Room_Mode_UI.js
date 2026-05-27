import xapi from 'xapi';

// ======================================================
// CONFIGURATION
// ======================================================

const SERVER_URL = 'http://10.0.151.30:8080/api/v1/racklink/state';

const WIDGET_WHITEBOARD = 'btn_whiteboard';
const WIDGET_DUALSCREEN = 'btn_dualscreen';

const DEFAULT_MODE = 'dualscreen';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

// ======================================================
// STATE
// ======================================================

let syncInProgress = false;
let commandBusy = false;

// ======================================================
// USER FEEDBACK
// ======================================================

function showStatus(title, text) {

  xapi.Command.UserInterface.Message.Prompt.Display({

    Title: title,
    Text: text,
    FeedbackId: 'room_mode_status',

    'Option.1': 'OK'

  });

}

function clearStatus() {

  xapi.Command.UserInterface.Message.Prompt.Clear({
    FeedbackId: 'room_mode_status'
  });

}

function showModeTransition(mode) {

  if (mode === 'whiteboard') {

    showStatus(
      'Room Mode',
      'Switching to Whiteboard Only Mode. Please wait while displays reconfigure.'
    );

  }

  if (mode === 'dualscreen') {

    showStatus(
      'Room Mode',
      'Switching to Dual Screen Meeting Mode. Please wait while displays reconfigure.'
    );

  }

}

// ======================================================
// RELIABLE HTTP POST
// ======================================================

async function reliableCommand(action) {

  if (commandBusy) {

    console.log('RLNK busy, skipping new request');

    return false;

  }

  commandBusy = true;

  const payload = JSON.stringify({
    device: 'rlink-215',
    outlet: '2',
    action: action
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

    try {

      console.log(
        `${action.toUpperCase()} POST attempt ${attempt}`
      );

      const result =
        await xapi.Command.HttpClient.Post(

          {

            Url: SERVER_URL,

            Header: [
              'Content-Type: application/json'
            ],

            ResultBody: 'PlainText',

            ResponseSizeLimit: 10000,

            Timeout: 8,

            AllowInsecureHTTPS: 'True'

          },

          payload

        );

      console.log(
        `${action.toUpperCase()} POST success`
      );

      console.log(result.Body);
      clearStatus();

      commandBusy = false;

      return true;

    } catch (err) {

      console.log(
        `${action.toUpperCase()} POST error: ${err.message}`
      );

      if (attempt < MAX_RETRIES) {

        console.log(
          `Retrying in ${RETRY_DELAY_MS / 1000} sec...`
        );

        await new Promise(resolve =>
          setTimeout(resolve, RETRY_DELAY_MS)
        );

      }

    }

  }

  console.log(
    'Command ultimately failed after max retries'
  );
  showStatus(
    'Room Mode Error',
    'Unable to communicate with room relay controller'
  );

  commandBusy = false;

  return false;

}


// ======================================================
// UI MODE CONTROL
// ======================================================

async function setMode(mode, sendCommand = true) {

  syncInProgress = true;

  try {

    // ==============================================
    // WHITEBOARD ONLY
    // ==============================================

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
      showModeTransition(mode);

      if (sendCommand) {

        reliableCommand('off');

      }

    }

    // ==============================================
    // DUAL SCREEN MEETING
    // ==============================================

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
      showModeTransition(mode);
      if (sendCommand) {

        reliableCommand('on');

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

  console.log(
    `Widget Event: ${JSON.stringify(event)}`
  );

  // ==============================================
  // WHITEBOARD TOGGLE
  // ==============================================

  if (
    event.WidgetId === WIDGET_WHITEBOARD &&
    event.Value === 'on'
  ) {

    setMode('whiteboard');

  }

  // ==============================================
  // DUAL SCREEN TOGGLE
  // ==============================================

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

  // Delay startup for network stabilization
  setTimeout(() => {

    setMode(DEFAULT_MODE);

  }, 10000);

}

initialize();

console.log('Room_Mode_UI Ready');