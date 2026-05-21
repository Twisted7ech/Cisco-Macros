import xapi from 'xapi';

// Listen for any UI interaction
xapi.event.on('UserInterface Extensions Panel Clicked', (event) => {
    // Check if the clicked button matches your ID from Step A
    if (event.PanelId === 'Disp_1_Off') {
        console.log('User pressed the macro button!');
        
        // Example Action: Show a message on the Navigator screen
        xapi.command('Video Output Connector CECPower Off', { ConnectorId: 1 }), {
            Title: 'Display 1 Off',
            Text: 'Display 1 Power Off',
            Duration: 5
        };
        
        // You can also add actual hardware commands here
        // e.g., xapi.command('Video SelfView Set', { Mode: 'On' });
    }
});
