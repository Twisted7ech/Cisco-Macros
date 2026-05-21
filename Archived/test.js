import xapi from 'xapi';

// Listen for any UI interaction
xapi.event.on('UserInterface Extensions Panel Clicked', (event) => {
    // Check if the clicked button matches your ID from Step A
    if (event.PanelId === 'lights_toggle') {
        console.log('User pressed the macro button!');
        
        // Example Action: Show a message on the Navigator screen
        xapi.command('UserInterface Message Prompt Display', {
            Title: 'Action Triggered',
            Text: 'Your macro is working inside the Teams interface.',
            Duration: 5
        });
        
        // You can also add actual hardware commands here
        // e.g., xapi.command('Video SelfView Set', { Mode: 'On' });
    }
});
