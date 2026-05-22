async function postDualScreenCommand() {
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
      action: 'on'
    }));
    console.log('DualScreen POST: success');
    return true;
  } catch (err) {
    console.log(`DualScreen POST: error - ${err.message}`);
    return false;
  }
}