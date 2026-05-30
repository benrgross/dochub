import { initBotId } from 'botid/client/core'

// Register the routes BotID should challenge from the client. The matching
// server-side checkBotId() lives in app/api/ai-edit/route.ts.
initBotId({
  protect: [{ path: '/api/ai-edit', method: 'POST' }],
})
