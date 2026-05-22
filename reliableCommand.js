async function reliableCommand(postCommandFn, maxTries = 3, delayMs = 2000) {
  let attempt = 0;
  while (attempt < maxTries) {
    attempt++;
    const success = await postCommandFn();
    if (success) {
      return true;
    }
    if (attempt < maxTries) {
      console.log(`Retrying in ${delayMs/1000} sec...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } else {
      console.log("Command ultimately failed after max retries");
      return false;
    }
  }
}