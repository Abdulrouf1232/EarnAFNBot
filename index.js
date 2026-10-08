const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = 7526276190;

const REQUIRED_GROUP = "@Azad_coin12";
const REQUIRED_CHANNEL_1 = "@EarnAFNWithdraw";
const REQUIRED_CHANNEL_2 = "@Azadcoinche";

const WITHDRAW_CHANNEL = "@EarnAFNWithdraw";

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is missing!");
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, {
  polling: true
});

const DATA_FILE = "./data.json";

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return { users: {}, withdrawals: [] };
    }

    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (error) {
    console.error("❌ Database error:", error);
    return { users: {}, withdrawals: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let db = loadData();

function getUser(user) {
  const id = String(user.id);

  if (!db.users[id]) {
    db.users[id] = {
      id: user.id,
      firstName: user.first_name || "User",
      username: user.username || "",
      balance: 0,
      referrals: 0,
      referredBy: null,
      joinedAt: new Date().toISOString()
    };

    saveData(db);
  }

  return db.users[id];
}

async function isMember(chatId, username) {
  try {
    const member = await bot.getChatMember(username, chatId);

    return ["creator", "administrator", "member"].includes(member.status);
  } catch (error) {
    console.error(`Membership check failed for ${username}:`, error.message);
    return false;
  }
}

async function checkRequiredMembership(chatId) {
  const group = await isMember(chatId, REQUIRED_GROUP);
  const channel1 = await isMember(chatId, REQUIRED_CHANNEL_1);
  const channel2 = await isMember(chatId, REQUIRED_CHANNEL_2);

  return group && channel1 && channel2;
}

async function sendJoinMessage(chatId) {
  await bot.sendMessage(
    chatId,
    `⚠️ د EarnAFN Bot د استعمال لپاره باید لومړی لاندې ټول ځایونه Join کړې:

👥 Group
📢 Channel 1
📢 Channel 2

کله چې ټول Join کړې، بیا لاندې تڼۍ کېکاږه:

✅ ما Join کړي دي`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "👥 Join Group",
              url: "https://t.me/Azad_coin12"
            }
          ],
          [
            {
              text: "📢 Join Channel 1",
              url: "https://t.me/EarnAFNWithdraw"
            }
          ],
          [
            {
              text: "📢 Join Channel 2",
              url: "https://t.me/Azadcoinche"
            }
          ],
          [
            {
              text: "✅ ما Join کړي دي",
              callback_data: "check_join"
            }
          ]
        ]
      }
    }
  );
}

function mainKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        ["👤 Account", "👥 Referrals"],
        ["🎁 Rewards", "💸 Withdraw"],
        ["📊 Statistics", "ℹ️ Help"]
      ],
      resize_keyboard: true
    }
  };
}

// START
bot.onText(/^\/start(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const user = getUser(msg.from);

  const referralCode = match && match[1] ? match[1] : null;

  if (
    referralCode &&
    referralCode !== String(msg.from.id) &&
    !user.referredBy
  ) {
    const referrer = db.users[String(referralCode)];

    if (referrer) {
      user.referredBy = referrer.id;
      referrer.referrals += 1;
      referrer.balance += 2;

      saveData(db);

      await bot.sendMessage(
        referrer.id,
        `🎉 نوی Referral!

👤 ${user.firstName}
💰 +2 AFN

ستاسې نوی Balance: ${referrer.balance} AFN`
      );
    }
  }

  const joined = await checkRequiredMembership(chatId);

  if (!joined) {
    return sendJoinMessage(chatId);
  }

  await bot.sendMessage(
    chatId,
    `سلام ${user.firstName}! 👋

💰 EarnAFN ته ښه راغلاست.

له Menu څخه خپل کار انتخاب کړه. 🚀`,
    mainKeyboard()
  );
});

// JOIN CHECK
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;

  if (query.data === "check_join") {
    const joined = await checkRequiredMembership(chatId);

    if (!joined) {
      await bot.answerCallbackQuery(query.id, {
        text: "❌ لا هم ټول Required ځایونه نه دي Join شوي!",
        show_alert: true
      });

      return sendJoinMessage(chatId);
    }

    await bot.answerCallbackQuery(query.id, {
      text: "✅ Membership تایید شوه!"
    });

    await bot.sendMessage(
      chatId,
      "✅ ټول Required ځایونه دې Join کړي دي.\n\nاوس کولی شې Bot استعمال کړې. 🚀",
      mainKeyboard()
    );
  }
});

// EVERY MESSAGE MEMBERSHIP CHECK
bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/start")) return;

  const chatId = msg.chat.id;

  const joined = await checkRequiredMembership(chatId);

  if (!joined) {
    return sendJoinMessage(chatId);
  }

  const user = getUser(msg.from);
  const text = msg.text;

  if (text === "👤 Account") {
    return bot.sendMessage(
      chatId,
      `👤 Account

🆔 ID: ${user.id}
👤 Name: ${user.firstName}
💰 Balance: ${user.balance} AFN
👥 Referrals: ${user.referrals}`,
      mainKeyboard()
    );
  }

  if (text === "👥 Referrals") {
    const referralLink =
      `https://t.me/EarnAFNBot?start=${user.id}`;

    return bot.sendMessage(
      chatId,
      `👥 Referral System

💰 د هر بریالي Referral انعام: 2 AFN

🔗 ستا Referral Link:

${referralLink}

👥 ټول Referrals: ${user.referrals}`,
      mainKeyboard()
    );
  }

  if (text === "🎁 Rewards") {
    return bot.sendMessage(
      chatId,
      `🎁 Rewards

💰 ستا Balance: ${user.balance} AFN

د Referral له لارې AFN ترلاسه کولی شې.`,
      mainKeyboard()
    );
  }

  if (text === "📊 Statistics") {
    const totalUsers = Object.keys(db.users).length;
    const totalWithdrawals = db.withdrawals.length;

    return bot.sendMessage(
      chatId,
      `📊 EarnAFN Statistics

👥 Total Users: ${totalUsers}
💸 Total Withdrawals: ${totalWithdrawals}

🚀 EarnAFN`
    );
  }

  if (text === "ℹ️ Help") {
    return bot.sendMessage(
      chatId,
      `ℹ️ Help

👥 Invite users through your Referral Link.
💰 Earn 2 AFN for each successful Referral.
💸 Minimum Withdrawal: 30 AFN

که کومه ستونزه لرې، له Admin سره اړیکه ونیسه.`,
      mainKeyboard()
    );
  }

  if (text === "💸 Withdraw") {
    if (user.balance < 30) {
      return bot.sendMessage(
        chatId,
        `❌ ستا Balance کافي نه دی.

💰 Minimum Withdrawal: 30 AFN
💵 ستا Balance: ${user.balance} AFN`
      );
    }

    user.withdrawStep = "amount";
    saveData(db);

    return bot.sendMessage(
      chatId,
      `💸 Withdrawal

لطفاً د Withdrawal اندازه په AFN ولیکه.

Minimum: 30 AFN`
    );
  }

  // WITHDRAWAL AMOUNT
  if (user.withdrawStep === "amount") {
    const amount = Number(text);

    if (!Number.isFinite(amount) || amount < 30) {
      return bot.sendMessage(
        chatId,
        "❌ صحیح اندازه ولیکه. Minimum Withdrawal 30 AFN دی."
      );
    }

    if (amount > user.balance) {
      return bot.sendMessage(
        chatId,
        "❌ ستا Balance د دې Withdrawal لپاره کافي نه دی."
      );
    }

    user.withdrawAmount = amount;
    user.withdrawStep = "payment";

    saveData(db);

    return bot.sendMessage(
      chatId,
      `💳 اوس خپل د تادیې معلومات ولیکه.

مثلاً:
📱 Phone Number
یا
🏦 Account Number`
    );
  }

  // PAYMENT INFORMATION
  if (user.withdrawStep === "payment") {
    const paymentInfo = text;
    const amount = user.withdrawAmount;

    const withdrawal = {
      id: Date.now(),
      userId: user.id,
      firstName: user.firstName,
      username: user.username,
      amount,
      paymentInfo,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    db.withdrawals.push(withdrawal);

    user.balance -= amount;
    user.withdrawStep = null;
    user.withdrawAmount = null;

    saveData(db);

    await bot.sendMessage(
      chatId,
      `✅ Withdrawal Request ثبت شوه.

💰 Amount: ${amount} AFN
⏳ Status: Pending

Admin به ستا Request بررسی کړي.`
    );

    return bot.sendMessage(
      ADMIN_ID,
      `💸 NEW WITHDRAWAL

🆔 Withdrawal ID: ${withdrawal.id}
👤 User ID: ${user.id}
👤 Name: ${user.firstName}
🔗 Username: @${user.username || "N/A"}

💰 Amount: ${amount} AFN
💳 Payment: ${paymentInfo}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ Approve",
                callback_data: `approve_${withdrawal.id}`
              },
              {
                text: "❌ Reject",
                callback_data: `reject_${withdrawal.id}`
              }
            ]
          ]
        }
      }
    );
  }
});

// ADMIN WITHDRAWAL ACTIONS
bot.on("callback_query", async (query) => {
  const data = query.data;

  if (!data.startsWith("approve_") && !data.startsWith("reject_")) {
    return;
  }

  if (query.from.id !== ADMIN_ID) {
    return bot.answerCallbackQuery(query.id, {
      text: "❌ دا یوازې د Admin لپاره دی.",
      show_alert: true
    });
  }

  const withdrawalId = Number(data.split("_")[1]);

  const withdrawal = db.withdrawals.find(
    (w) => w.id === withdrawalId
  );

  if (!withdrawal) {
    return bot.answerCallbackQuery(query.id, {
      text: "❌ Withdrawal پیدا نه شو.",
      show_alert: true
    });
  }

  if (withdrawal.status !== "pending") {
    return bot.answerCallbackQuery(query.id, {
      text: "⚠️ دا Request مخکې Process شوی.",
      show_alert: true
    });
  }

  const user = db.users[String(withdrawal.userId)];

  if (data.startsWith("approve_")) {
    withdrawal.status = "approved";
    withdrawal.approvedAt = new Date().toISOString();

    saveData(db);

    await bot.sendMessage(
      withdrawal.userId,
      `✅ Withdrawal Approved!

💰 Amount: ${withdrawal.amount} AFN

ستاسې Withdrawal تایید شو.`
    );

    // PROOF ONLY IN WITHDRAWAL CHANNEL
    await bot.sendMessage(
      WITHDRAW_CHANNEL,
      `✅ WITHDRAWAL PROOF

👤 User: ${withdrawal.firstName}
💰 Amount: ${withdrawal.amount} AFN
🆔 ID: ${withdrawal.id}

✅ Payment Approved
🚀 EarnAFN`
    );

    await bot.answerCallbackQuery(query.id, {
      text: "✅ Withdrawal Approved"
    });

    return bot.editMessageText(
      `✅ APPROVED

🆔 ${withdrawal.id}
👤 ${withdrawal.firstName}
💰 ${withdrawal.amount} AFN`,
      {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id
      }
    );
  }

  if (data.startsWith("reject_")) {
    withdrawal.status = "rejected";
    withdrawal.rejectedAt = new Date().toISOString();

    if (user) {
      user.balance += withdrawal.amount;
    }

    saveData(db);

    await bot.sendMessage(
      withdrawal.userId,
      `❌ Withdrawal Rejected.

💰 Amount: ${withdrawal.amount} AFN

ستاسې Amount بېرته Balance ته اضافه شو.`
    );

    await bot.answerCallbackQuery(query.id, {
      text: "❌ Withdrawal Rejected"
    });

    return bot.editMessageText(
      `❌ REJECTED

🆔 ${withdrawal.id}
👤 ${withdrawal.firstName}
💰 ${withdrawal.amount} AFN`,
      {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id
      }
    );
  }
});

bot.on("polling_error", (error) => {
  console.error("Polling Error:", error.message);
});

console.log("🤖 EarnAFN Bot is running...");
