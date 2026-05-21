import xapi from 'xapi';

// ======================================================
// CONFIGURATION
// ======================================================

const VACANCY_TIMEOUT_MINUTES = 15;

let vacancyTimer = null;

// ======================================================
// RESET ROOM
// ======================================================

async function restoreDualScreenMode() {

  console.log('Restoring Dual Screen Mode due to vacancy');

  try {

    await xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: 'btn_whiteboard',
      Value: 'off'
    });

    await xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: 'btn_dualscreen',
      Value: 'on'
    });

  } catch (err) {

    console.log(`RESTORE ERROR: ${err.message}`);

  }

}

// ======================================================
// PRESENCE MONITORING
// ======================================================

xapi.Status.RoomAnalytics.PeoplePresence.on((value) => {

  console.log(`Presence State: ${value}`);

  // Room occupied
  if (value === 'Yes') {

    if (vacancyTimer) {

      clearTimeout(vacancyTimer);
      vacancyTimer = null;

      console.log('Vacancy timer cancelled');

    }

    return;
  }

  // Room vacant
  if (value === 'No') {

    console.log(`Starting ${VACANCY_TIMEOUT_MINUTES} minute vacancy timer`);

    vacancyTimer = setTimeout(() => {

      restoreDualScreenMode();

    }, VACANCY_TIMEOUT_MINUTES * 60 * 1000);

  }

});

console.log('Room_Reset_On_Vacancy Ready');