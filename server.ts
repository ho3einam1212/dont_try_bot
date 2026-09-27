import express, { Request, Response } from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.PORT || 10000);
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME || "@i_dont_try";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is not configured.");
  process.exit(1);
}

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function telegram<T = unknown>(
  method: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  const response = await fetch(`${TELEGRAM_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json() as {
    ok: boolean;
    result?: T;
    description?: string;
  };

  if (!data.ok) {
    throw new Error(data.description || "Telegram API error");
  }

  return data.result as T;
}

async function sendMessage(chatId: string | number, text: string) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML"
  });
}

app.get("/", (_req: Request, res: Response) => {
  res.status(200).send("DON'T TRY Bot is running 🖤");
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, service: "dont-try-bot" });
});

app.post("/webhook", async (req: Request, res: Response) => {
  try {
    if (WEBHOOK_SECRET) {
      const supplied = req.header("X-Telegram-Bot-Api-Secret-Token");
      if (supplied !== WEBHOOK_SECRET) {
        return res.status(401).json({ ok: false });
      }
    }

    const message = req.body?.message;

    if (!message?.text || !message?.chat?.id) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id as number;
    const text = String(message.text).trim();

    if (text === "/start") {
      await sendMessage(
        chatId,
        `🖤 <b>DON'T TRY</b>\n\n` +
        `به اتاق کنترل DON’T TRY خوش اومدی.\n\n` +
        `<b>دستورها:</b>\n` +
        `/test — تست اتصال ربات\n` +
        `/publish — انتشار پست آزمایشی`
      );
    } else if (text === "/test") {
      await sendMessage(chatId, "✅ ربات فعاله.\n\nDON'T TRY آماده‌ست.");
    } else if (text === "/publish") {
      await sendMessage(
        CHANNEL_USERNAME,
        `🧠 <b>DON'T TRY — 001</b>\n\n` +
        `گاهی دلت برای یک آدم تنگ نشده؛\n` +
        `برای احساسی تنگ شده که وقتی کنارش بودی داشتی.\n\n` +
        `<i>بعضی حقیقت‌ها راحت نیستند.</i>\n\n` +
        `#DONTTry #Psychology`
      );

      await sendMessage(
        chatId,
        "🔥 پست آزمایشی با موفقیت در کانال منتشر شد."
      );
    } else {
      await sendMessage(
        chatId,
        "دستور شناخته نشد.\n\n/start را بزن."
      );
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ ok: false });
  }
});

app.get("/setup", async (req: Request, res: Response) => {
  try {
    const host = req.get("host");
    if (!host) {
      return res.status(500).json({ ok: false, error: "Missing host" });
    }

    if (!WEBHOOK_SECRET) {
      return res.status(500).json({
        ok: false,
        error: "WEBHOOK_SECRET is not configured"
      });
    }

    const protocol =
      process.env.RENDER_EXTERNAL_URL?.startsWith("https://")
        ? ""
        : "";

    const baseUrl =
      process.env.RENDER_EXTERNAL_URL ||
      `https://${host}`;

    const webhookUrl = `${baseUrl.replace(/\/$/, "")}/webhook`;

    const result = await telegram("setWebhook", {
      url: webhookUrl,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ["message"],
      drop_pending_updates: true
    });

    return res.status(200).json({
      ok: true,
      webhook: webhookUrl,
      result
    });
  } catch (error) {
    console.error("Setup error:", error);
    return res.status(500).json({
      ok: false,
      error: "Webhook setup failed"
    });
  }
});

app.get("/webhook-info", async (_req: Request, res: Response) => {
  try {
    const result = await telegram("getWebhookInfo");
    return res.status(200).json({ ok: true, result });
  } catch (error) {
    return res.status(500).json({ ok: false });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`DON'T TRY Bot listening on port ${PORT}`);
});
