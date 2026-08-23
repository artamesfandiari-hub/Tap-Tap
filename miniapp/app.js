let currentScreen =
  "home-screen";

window.TAP_USER_ID =
  Number(
    window.Telegram?.WebApp?.initDataUnsafe
      ?.user?.id || 0
  );

window.TAP_BOT_USERNAME =
  "";

function showScreen(id) {
  document
    .querySelectorAll(".screen")
    .forEach((screen) => {
      screen.classList.remove(
        "active"
      );
    });

  const screen =
    document.getElementById(id);

  if (!screen) return;

  screen.classList.add(
    "active"
  );

  currentScreen = id;
}

window.showScreen =
  showScreen;

async function handleCreateRoom() {
  try {
    const data =
      await createRoom();

    await openRoom(
      data.room
    );
  } catch (error) {
    alert(
      error.message ||
      "ساخت اتاق ناموفق بود."
    );
  }
}

function openJoinModal() {
  document
    .getElementById(
      "join-modal"
    )
    .classList.remove(
      "hidden"
    );

  document
    .getElementById(
      "room-code-input"
    )
    .focus();
}

function closeJoinModal() {
  document
    .getElementById(
      "join-modal"
    )
    .classList.add(
      "hidden"
    );
}

async function handleJoinRoom() {
  const input =
    document.getElementById(
      "room-code-input"
    );

  const error =
    document.getElementById(
      "join-error"
    );

  const code =
    input.value
      .trim()
      .toUpperCase();

  error.textContent = "";

  if (!/^[A-Z0-9]{6}$/.test(code)) {
    error.textContent =
      "کد باید ۶ کاراکتر باشد.";
    return;
  }

  try {
    const data =
      await joinRoom(code);

    closeJoinModal();

    await openRoom(
      data.room
    );
  } catch (err) {
    error.textContent =
      err.message ===
      "ROOM_NOT_FOUND"
        ? "این اتاق پیدا نشد."
        : err.message ===
          "ROOM_FULL"
        ? "اتاق پر است."
        : "ورود به اتاق ناموفق بود.";
  }
}

async function loadStats() {
  showScreen(
    "stats-screen"
  );

  try {
    const data =
      await getMyStats();

    const stats =
      data.stats || {};

    document.getElementById(
      "stat-games"
    ).textContent =
      stats.games_played || 0;

    document.getElementById(
      "stat-wins"
    ).textContent =
      stats.wins || 0;

    document.getElementById(
      "stat-losses"
    ).textContent =
      stats.losses || 0;

    document.getElementById(
      "stat-winrate"
    ).textContent =
      `${stats.win_rate || 0}%`;

    document.getElementById(
      "stat-total"
    ).textContent =
      stats.total_score || 0;

    document.getElementById(
      "stat-best"
    ).textContent =
      stats.best_score || 0;

    document.getElementById(
      "stat-taps"
    ).textContent =
      stats.best_taps || 0;

    document.getElementById(
      "stat-streak"
    ).textContent =
      stats.best_win_streak || 0;
  } catch (error) {
    console.error(error);
  }
}

async function loadLeaderboard() {
  showScreen(
    "leaderboard-screen"
  );

  const list =
    document.getElementById(
      "leaderboard-list"
    );

  list.innerHTML =
    "در حال دریافت...";

  try {
    const data =
      await getLeaderboard();

    list.innerHTML = "";

    if (
      !data.leaderboard?.length
    ) {
      list.textContent =
        "هنوز امتیازی ثبت نشده.";
      return;
    }

    data.leaderboard
      .forEach(
        (player, index) => {
          const row =
            document.createElement(
              "div"
            );

          row.className =
            "leader-row";

          row.innerHTML = `
            <strong>${index + 1}</strong>
            <span style="flex:1">
              ${
                player.username
                  ? `@${escapeHtml(player.username)}`
                  : escapeHtml(
                      player.first_name ||
                      "Player"
                    )
              }
            </span>
            <b>
              ${player.total_score} ⚡
            </b>
          `;

          list.appendChild(
            row
          );
        }
      );
  } catch (error) {
    list.textContent =
      "خطا در دریافت رتبه‌بندی.";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openSupport() {
  const username =
    window.TAP_SUPPORT_USERNAME;

  if (username) {
    const clean =
      username.replace(
        "@",
        ""
      );

    if (
      window.Telegram?.WebApp
    ) {
      Telegram.WebApp.openTelegramLink(
        `https://t.me/${clean}`
      );
    }

    return;
  }

  alert(
    "اطلاعات پشتیبانی هنوز تنظیم نشده."
  );
}

function handleStartAppRoom() {
  const params =
    new URLSearchParams(
      window.Telegram?.WebApp
        ?.initDataUnsafe
        ?.start_param
        ? `startapp=${window.Telegram.WebApp.initDataUnsafe.start_param}`
        : location.search
    );

  let startParam =
    window.Telegram?.WebApp
      ?.initDataUnsafe
      ?.start_param;

  if (
    !startParam
  ) {
    startParam =
      new URLSearchParams(
        location.search
      ).get("startapp");
  }

  if (
    startParam &&
    startParam.startsWith(
      "room_"
    )
  ) {
    const code =
      startParam
        .slice(5)
        .toUpperCase();

    document.getElementById(
      "room-code-input"
    ).value = code;

    openJoinModal();

    setTimeout(
      handleJoinRoom,
      250
    );
  }
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    document
      .getElementById(
        "create-room-btn"
      )
      .addEventListener(
        "click",
        handleCreateRoom
      );

    document
      .getElementById(
        "join-room-btn"
      )
      .addEventListener(
        "click",
        openJoinModal
      );

    document
      .getElementById(
        "close-join-modal"
      )
      .addEventListener(
        "click",
        closeJoinModal
      );

    document
      .getElementById(
        "confirm-join-btn"
      )
      .addEventListener(
        "click",
        handleJoinRoom
      );

    document
      .getElementById(
        "stats-btn"
      )
      .addEventListener(
        "click",
        loadStats
      );

    document
      .getElementById(
        "leaderboard-btn"
      )
      .addEventListener(
        "click",
        loadLeaderboard
      );

    document
      .getElementById(
        "support-btn"
      )
      .addEventListener(
        "click",
        openSupport
      );

    document
      .getElementById(
        "stats-back-btn"
      )
      .addEventListener(
        "click",
        () =>
          showScreen(
            "home-screen"
          )
      );

    document
      .getElementById(
        "leaderboard-back-btn"
      )
      .addEventListener(
        "click",
        () =>
          showScreen(
            "home-screen"
          )
      );

    document
      .getElementById(
        "lobby-back-btn"
      )
      .addEventListener(
        "click",
        () =>
          showScreen(
            "home-screen"
          )
      );

    document
      .getElementById(
        "back-home-btn"
      )
      .addEventListener(
        "click",
        () =>
          showScreen(
            "home-screen"
          )
      );

    document
      .getElementById(
        "room-code-input"
      )
      .addEventListener(
        "input",
        (event) => {
          event.target.value =
            event.target.value
              .replace(
                /[^a-zA-Z0-9]/g,
                ""
              )
              .toUpperCase();
        }
      );

    handleStartAppRoom();
  }
);
