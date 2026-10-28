import { initBotId } from "botid/client/core";

// Paid YouCam task starts. The server checks the BotID verdict before any quota or provider call.
initBotId({
  protect: [
    { path: "/api/analyze", method: "POST" },
    { path: "/api/try-on", method: "POST" },
  ],
});
