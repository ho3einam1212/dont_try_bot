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
  text: string
) {
  return telegram(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // صفحه اصلی
    if (request.method === "GET" && url.pathname === "/") {
      return new Response("DON'T TRY Bot is running 🖤", {
        status: 200,
      });
    }

    // تست سلامت
    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "dont-try-bot",
      });
    }

    // تنظیم Webhook
    if (request.method === "GET" && url.pathname === "/setup") {
      try {
        const webhookUrl = `${url.origin}/webhook`;

        const result = await telegram(env, "setWebhook", {
          url: webhookUrl,
          secret_token: env.WEBHOOK_SECRET,
          allowed_updates: ["message"],
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

    // اطلاعات Webhook
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

    // Webhook تلگرام
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
        const message = update?.message;

        if (!message?.text || !message?.chat?.id) {
          return Response.json({ ok: true });
        }

        const chatId = message.chat.id;
        const text = String(message.text).trim();

        if (text === "/start") {
          await sendMessage(
            env,
            chatId,
            `🖤 <b>DON'T TRY</b>\n\n` +
              `به اتاق کنترل DON'T TRY خوش اومدی.\n\n` +
              `<b>دستورها:</b>\n` +
              `/test — تست اتصال ربات\n` +
              `/publish — انتشار پست آزمایشی`
          );
        }

        else if (text === "/test") {
          await sendMessage(
            env,
            chatId,
            "✅ ربات فعاله.\n\nDON'T TRY آماده‌ست."
          );
        }

        else if (text === "/publish") {
          await sendMessage(
            env,
            env.CHANNEL_USERNAME,
            `🧠 <b>DON'T TRY — 001</b>\n\n` +
              `گاهی دلت برای یک آدم تنگ نشده؛\n` +
              `برای احساسی تنگ شده که وقتی کنارش بودی داشتی.\n\n` +
              `<i>بعضی حقیقت‌ها راحت نیستند.</i>\n\n` +
              `#DONTTry #Psychology`
          );

          await sendMessage(
            env,
            chatId,
            "🔥 پست آزمایشی با موفقیت در کانال منتشر شد."
          );
        }

        else {
          await sendMessage(
            env,
            chatId,
            "دستور شناخته نشد.\n\n/start را بزن."
          );
        }

        return Response.json({ ok: true });
      } catch (error) {
        console.error("Webhook error:", error);

        return Response.json(
          {
            ok: false,
            error: String(error),
          },
          { status: 500 }
        );
      }
    }

    return new Response("Not Found", {
      status: 404,
    });
  },
};
