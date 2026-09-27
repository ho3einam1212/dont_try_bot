# DON'T TRY Bot — Render Ready

Telegram bot starter for the DON'T TRY channel.

## Render settings

Build Command:
npm install && npm run build

Start Command:
npm start

Environment Variables:
- BOT_TOKEN = token from @BotFather
- WEBHOOK_SECRET = long random secret
- CHANNEL_USERNAME = @i_dont_try

After deployment, open:

https://YOUR-RENDER-DOMAIN/setup

Then test the bot:
- /start
- /test
- /publish

The bot must already be an administrator of the channel with permission to post messages.

Never commit BOT_TOKEN to GitHub or put it in source code.
