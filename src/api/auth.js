const crypto = require("crypto");

function validateTelegramInitData(initData, botToken) {
  if (!initData || !botToken) {
    return null;
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");

    if (!hash) {
      return null;
    }

    params.delete("hash");

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    const calculated = Buffer.from(calculatedHash, "hex");
    const received = Buffer.from(hash, "hex");

    if (
      calculated.length !== received.length ||
      !crypto.timingSafeEqual(calculated, received)
    ) {
      return null;
    }

    const authDate = Number(params.get("auth_date"));

    if (!authDate) {
      return null;
    }

    const age = Math.floor(Date.now() / 1000) - authDate;

    if (age > 86400 || age < -60) {
      return null;
    }

    const userRaw = params.get("user");

    if (!userRaw) {
      return null;
    }

    return JSON.parse(userRaw);
  } catch {
    return null;
  }
}

function requireTelegramUser(req, res, next) {
  const initData =
    req.headers["x-telegram-init-data"] ||
    req.headers["X-Telegram-Init-Data"];

  const user = validateTelegramInitData(
    initData,
    process.env.BOT_TOKEN
  );

  if (!user) {
    return res.status(401).json({
      ok: false,
      error: "Invalid Telegram authentication"
    });
  }

  req.telegramUser = user;
  next();
}

module.exports = {
  validateTelegramInitData,
  requireTelegramUser
};
