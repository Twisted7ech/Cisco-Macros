import xapi from 'xapi';

// Listen for any UI interaction
xapi.event.on('UserInterface Extensions Panel Clicked', (event) => {
    // Check if the clicked button matches your ID from Step A
    if (event.PanelId === 'Disp_2_On') {
        console.log('User pressed the macro button!');
        
        // Example Action: Show a message on the Navigator screen
        xapi.command('Video Output Connector CECPower On', { ConnectorId: 2 }), {
            Title: 'Display 2 On',
            Text: 'Display 2 Power On',
            Duration: 5
        };
        
        // You can also add actual hardware commands here
        // e.g., xapi.command('Video SelfView Set', { Mode: 'On' });
    }
});
