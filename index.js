const TelegramBot = require("node-telegram-bot-api");

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is missing!");
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, {
  polling: true,
});

console.log("🤖 EarnAFN Bot is running...");

bot.onText(/^\/start(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || "User";
  const referral = match?.[1] || null;

  await bot.sendMessage(
    chatId,
    `سلام ${firstName}! 👋

💰 EarnAFN ته ښه راغلاست!

دلته کولی شې:
👤 خپل Account وګورې
👥 Referral وکړې
💰 AFN وګټې
💸 Withdrawal وکړې

👇 له Menu څخه یو انتخاب وکړه.`,
    {
      reply_markup: {
        keyboard: [
          ["👤 Account", "👥 Referrals"],
          ["💰 Rewards", "💸 Withdraw"],
          ["📊 Statistics", "ℹ️ Help"],
        ],
        resize_keyboard: true,
      },
    }
  );
});

bot.on("polling_error", (error) => {
  console.error("Polling error:", error.message);
});
