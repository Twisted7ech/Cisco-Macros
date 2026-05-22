import xapi from 'xapi';

xapi.Command.UserInterface.Message.Alert.Display({
  Title: 'TEST',
  Text: 'Toast notifications are working',
  Duration: 10
});