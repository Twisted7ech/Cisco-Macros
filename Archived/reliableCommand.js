async function reliableCommand(postCommandFn, maxTries = 3, delayMs = 2000) {
  let attempt = 0;
  let lastResult = null;
  while (attempt < maxTries) {
    attempt++;
    lastResult = await postCommandFn();
    try {
      const body = JSON.parse(lastResult.Body);
      if (body.success) {
        return body;
      }
    } catch (err) {
      // Malformed response, treat as failure and retry
      console.log("Error parsing response; will retry.");
    }
    if (attempt < maxTries) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return lastResult ? JSON.parse(lastResult.Body) : { success: false, error: "No response" };
}