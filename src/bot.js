const { Telegraf, Markup } = require("telegraf");

const {
  getPlayerStats,
  getLeaderboard
} = require("./database/db");

const BOT_TOKEN = process.env.BOT_TOKEN;
const MINI_APP_URL = process.env.MINI_APP_URL;

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is missing");
}

if (!MINI_APP_URL) {
  throw new Error("MINI_APP_URL is missing");
}

const bot = new Telegraf(BOT_TOKEN);

function mainKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.webApp(
        "🎮 شروع بازی",
        MINI_APP_URL
      )
    ],
    [
      Markup.button.callback(
        "📊 آمار من",
        "stats"
      ),
      Markup.button.callback(
        "🏆 رتبه‌بندی",
        "leaderboard"
      )
    ],
    [
      Markup.button.callback(
        "🛟 پشتیبانی",
        "support"
      )
    ]
  ]);
}

bot.start(async (ctx) => {
  const name =
    ctx.from?.first_name ||
    "Player";

  await ctx.reply(
    `⚡ سلام ${name}!\n\n` +
    `به Tap-Tap خوش اومدی! 🎮\n\n` +
    `با ۲ تا ۶ نفر وارد اتاق شو و ببین کی می‌تونه در ۱۰ ثانیه بیشتر Tap بزنه.\n\n` +
    `آماده‌ای؟ 🔥`,
    mainKeyboard()
  );
});

bot.command("game", async (ctx) => {
  await ctx.reply(
    "🎮 برای شروع بازی روی دکمه زیر بزن:",
    Markup.inlineKeyboard([
      [
        Markup.button.webApp(
          "⚡ START GAME",
          MINI_APP_URL
        )
      ]
    ])
  );
});

bot.action("stats", async (ctx) => {
  await ctx.answerCbQuery();

  try {
    if (!process.env.DATABASE_URL) {
      return ctx.reply(
        "📊 آمار من\n\n" +
        "هنوز دیتابیس بازی متصل نشده است.\n" +
        "بعد از اتصال Railway آمار اینجا ثبت می‌شود."
      );
    }

    const stats = await getPlayerStats(
      ctx.from.id
    );

    if (!stats) {
      return ctx.reply(
        "📊 هنوز هیچ بازی‌ای انجام ندادی!\n\n" +
        "اولین بازی رو شروع کن. ⚡"
      );
    }

    await ctx.reply(
      `📊 آمار ${stats.first_name || "Player"}\n\n` +
      `🎮 بازی‌ها: ${stats.games_played}\n` +
      `🏆 بردها: ${stats.wins}\n` +
      `💀 باخت‌ها: ${stats.losses}\n\n` +
      `⚡ مجموع امتیاز: ${stats.total_score}\n` +
      `🔥 بهترین امتیاز: ${stats.best_score}\n` +
      `👆 بیشترین Tap: ${stats.best_taps}\n\n` +
      `📈 درصد برد: ${stats.win_rate}%\n` +
      `🔥 برد متوالی فعلی: ${stats.current_win_streak}\n` +
      `👑 بهترین برد متوالی: ${stats.best_win_streak}`
    );
  } catch (error) {
    console.error(error);

    await ctx.reply(
      "❌ فعلاً نتونستم آمار رو دریافت کنم."
    );
  }
});

bot.action("leaderboard", async (ctx) => {
  await ctx.answerCbQuery();

  try {
    if (!process.env.DATABASE_URL) {
      return ctx.reply(
        "🏆 رتبه‌بندی بعد از اتصال دیتابیس فعال می‌شود."
      );
    }

    const players = await getLeaderboard(10);

    if (!players.length) {
      return ctx.reply(
        "🏆 هنوز کسی امتیازی ثبت نکرده."
      );
    }

    const lines = players.map((player, index) => {
      const name =
        player.username
          ? `@${player.username}`
          : player.first_name || "Player";

      return `${index + 1}. ${name} — ${player.total_score} ⚡`;
    });

    await ctx.reply(
      "🏆 TOP 10\n\n" +
      lines.join("\n")
    );
  } catch (error) {
    console.error(error);

    await ctx.reply(
      "❌ خطا در دریافت رتبه‌بندی."
    );
  }
});

bot.action("support", async (ctx) => {
  await ctx.answerCbQuery();

  const username =
    process.env.SUPPORT_USERNAME;

  if (username) {
    return ctx.reply(
      "🛟 پشتیبانی\n\n" +
      "برای ارتباط با پشتیبانی روی لینک زیر بزن:",
      Markup.inlineKeyboard([
        [
          Markup.button.url(
            "💬 ارتباط با پشتیبانی",
            `https://t.me/${username.replace("@", "")}`
          )
        ]
      ])
    );
  }

  await ctx.reply(
    "🛟 پشتیبانی\n\n" +
    "در حال حاضر اطلاعات پشتیبانی تنظیم نشده است."
  );
});

bot.catch((error) => {
  console.error(
    "Telegram bot error:",
    error
  );
});

async function startBot() {
  await bot.launch();

  console.log(
    "Tap-Tap Telegram bot started"
  );
}

function stopBot() {
  bot.stop("SIGTERM");
}

module.exports = {
  startBot,
  stopBot
};
