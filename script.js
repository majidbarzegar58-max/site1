document.addEventListener("DOMContentLoaded", () => {
  const authContainer = document.getElementById("auth-container");
  const appContainer = document.getElementById("app-container");

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const usernameInput = document.getElementById("username");

  const loginBtn = document.getElementById("login-btn");
  const signupBtn = document.getElementById("signup-btn");
  const logoutBtn = document.getElementById("logout-btn");

  const currentUsernameSpan = document.getElementById("current-username");

  const API_URL = "https://site1-production-2491.up.railway.app"; 

  // تابع کمکی برای ارسال درخواست
  async function sendAuthRequest(endpoints, bodyData) {
    for (let endpoint of endpoints) {
      try {
        const res = await fetch(`${API_URL}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData)
        });
        
        if (res.status !== 404) {
          return { response: res, data: await res.json() };
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      }
    }
    return null;
  }

  // ثبت‌نام
  signupBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const username = usernameInput.value.trim();

    if (!email || !password || !username) {
      return alert("لطفاً تمام فیلدها را پر کنید.");
    }

    const result = await sendAuthRequest(["/register", "/api/register", "/api/signup"], { email, password, username });

    if (!result) {
      alert("خطای CORS یا عدم ارتباط با سرور! کنسول (F12) را بررسی کنید.");
    } else if (result.response.ok) {
      alert("ثبت‌نام با موفقیت انجام شد!");
    } else {
      alert(result.data.message || result.data.error || "خطا در ثبت‌نام");
    }
  });

  // ورود
  loginBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      return alert("لطفاً ایمیل و رمز عبور را وارد کنید.");
    }

    const result = await sendAuthRequest(["/login", "/api/login", "/api/signin"], { email, password });

    if (!result) {
      alert("خطای CORS یا عدم ارتباط با سرور! کنسول (F12) را بررسی کنید.");
    } else if (result.response.ok) {
      localStorage.setItem("username", result.data.username || email.split("@")[0]);
      showApp(result.data.username || email.split("@")[0]);
    } else {
      alert(result.data.message || result.data.error || "ایمیل یا رمز عبور اشتباه است.");
    }
  });

  logoutBtn?.addEventListener("click", () => {
    localStorage.clear();
    authContainer.classList.remove("hidden");
    appContainer.classList.add("hidden");
  });

  function showApp(username) {
    if (currentUsernameSpan) currentUsernameSpan.textContent = username;
    authContainer.classList.add("hidden");
    appContainer.classList.remove("hidden");
  }

  const savedUsername = localStorage.getItem("username");
  if (savedUsername) showApp(savedUsername);
});
