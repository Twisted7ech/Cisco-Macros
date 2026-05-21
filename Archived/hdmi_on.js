import xapi from 'xapi';

// --- CONFIGURATION ---
const WINDOWS_PC_URL = 'http://192.168.10.50:8080/api/v1/racklink/state'; 
const OUTLET_NUMBER = '2'; 

async function turnOutletOn(outletId) {
  try {
    console.log(`[PDU Control] Directing proxy to turn ON outlet: ${outletId}`);
    
    const response = await xapi.command('HttpClient Post', {
      Url: WINDOWS_PC_URL,
      Header: ['Content-Type: application/json'],
      Timeout: 10,
      ResultBody: 'PlainText',
      Body: JSON.stringify({
        device: 'rlink-215',
        action: 'on', // Explicit ON state
        outlet: outletId
      })
    });
    
    console.log(`[PDU Control] Server responded with code: ${response.StatusCode}`);
  } catch (error) {
    console.error(`[PDU Control] ON command failed: ${error.message}`);
  }
}

// --- EVENT LISTENER ---
xapi.ui.extensions.on('WidgetAction', (event) => {
  // Matches a custom button with ID: btn_device_on
  if (event.WidgetId === 'btn_device_on' && event.Type === 'clicked') {
    console.log('[UI Event] Power ON requested via Room Navigator');
    turnOutletOn(OUTLET_NUMBER);
  }
});