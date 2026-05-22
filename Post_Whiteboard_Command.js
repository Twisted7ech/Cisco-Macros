const SERVER_URL = 'http://10.0.151.30:8080/api/v1/racklink/state'; // <-- Update as needed

async function postWhiteboardCommand() {
  try {
    await xapi.Command.HttpClient.Post({
      Url: SERVER_URL,
      Header: [ 'Content-Type: application/json' ],
      ResultBody: 'PlainText',
      Timeout: 10
    },
    JSON.stringify({
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