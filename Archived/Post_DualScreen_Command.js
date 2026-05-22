const SERVER_URL = 'http://10.0.151.30:8080/api/v1/racklink/state'; // <-- Update as needed

async function postDualScreenCommand() {
  try {
    const result = await xapi.Command.HttpClient.Post({
      Url: SERVER_URL,
      Header: [ 'Content-Type: application/json' ],
      ResultBody: 'PlainText',
      Timeout: 10
    },
    JSON.stringify({
      device: 'rlink-215',
      outlet: '2',
      action: 'on'
    }));
    return result;
  } catch (err) {
    console.log(`DualScreen POST: error - ${err.message}`);
    return { Body: JSON.stringify({ success: false, error: err.message }) };
  }
}