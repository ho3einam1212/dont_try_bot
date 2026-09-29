interface Env {
  BOT_TOKEN: string;
  WEBHOOK_SECRET: string;
  CHANNEL_USERNAME: string;
}

const telegramApi = (env: Env, method: string) =>
  `https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`;

async function telegram(
  env: Env,
  method: string,
  payload: Record<string, unknown> = {}
) {
  const response = await fetch(telegramApi(env, method), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as {
    ok: boolean;
    result?: unknown;
    description?: string;
  };

  if (!data.ok) {
    throw new Error(data.description || "Telegram API error");
  }

  return data.result;
}

async function sendMessage(
  env: Env,
  chatId: string | number,
  text: string,
  replyMarkup?: unknown
) {
  return telegram(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

const mainMenu = {
  inline_keyboard: [
    [
      { text: "🧠 پست جدید", callback_data: "new_post" },
      { text: "📢 انتشار", callback_data: "publish" },
    ],
    [
      { text: "🧪 تست ربات", callback_data: "test" },
      { text: "ℹ️ درباره DON'T TRY", callback_data: "about" },
    ],
  ],
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return new Response("DON'T TRY Bot is running 🖤");
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "dont-try-bot",
      });
    }

    if (request.method === "GET" && url.pathname === "/setup") {
      try {
        const webhookUrl = `${url.origin}/webhook`;

        const result = await telegram(env, "setWebhook", {
          url: webhookUrl,
          secret_token: env.WEBHOOK_SECRET,
          allowed_updates: ["message", "callback_query"],
          drop_pending_updates: true,
        });

        return Response.json({
          ok: true,
          webhook: webhookUrl,
          result,
        });
      } catch (error) {
        return Response.json(
          {
            ok: false,
            error: String(error),
          },
          { status: 500 }
        );
      }
    }

    if (request.method === "GET" && url.pathname === "/webhook-info") {
      try {
        const result = await telegram(env, "getWebhookInfo");

        return Response.json({
          ok: true,
          result,
        });
      } catch (error) {
        return Response.json(
          {
            ok: false,
            error: String(error),
          },
          { status: 500 }
        );
      }
    }

    if (request.method === "POST" && url.pathname === "/webhook") {
      try {
        const suppliedSecret = request.headers.get(
          "X-Telegram-Bot-Api-Secret-Token"
        );

        if (suppliedSecret !== env.WEBHOOK_SECRET) {
          return Response.json(
            { ok: false },
            { status: 401 }
          );
        }

        const update = (await request.json()) as any;

        // دکمه‌های منو
        const callbackQuery = update?.callback_query;

        if (callbackQuery) {
          const callbackId = callbackQuery.id;
          const chatId = callbackQuery.message?.chat?.id;
          const data = callbackQuery.data;

          await telegram(env, "answerCallbackQuery", {
            callback_query_id: callbackId,
          });

          if (!chatId) {
            return Response.json({ ok: true });
          }

          if (data === "test") {
            await sendMessage(
              env,
              chatId,
              "✅ <b>ربات سالم و فعاله.</b>\n\nاتصال DON'T TRY به تلگرام برقرار است.",
              mainMenu
            );
          }

          else if (data === "about") {
            await sendMessage(
              env,
              chatId,
              `🖤 <b>DON'T TRY</b>\n\n` +
              `یک اتاق کنترل برای مدیریت محتوای کانال.\n\n` +
              `اینجا قراره انتشار محتوا، تست ربات و امکانات بعدی رو مدیریت کنیم.`,
              mainMenu
            );
          }

          else if (data === "new_post") {
            await sendMessage(
              env,
              chatId,
              `🧠 <b>پست جدید</b>\n
