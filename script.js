document.addEventListener("DOMContentLoaded", () => {
  // ۱. دریافت عناصر فرم ورود و ثبت‌نام
  const authContainer = document.getElementById("auth-container");
  const appContainer = document.getElementById("app-container");

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const usernameInput = document.getElementById("username");

  const loginBtn = document.getElementById("login-btn");
  const signupBtn = document.getElementById("signup-btn");
  const logoutBtn = document.getElementById("logout-btn");

  const currentUsernameSpan = document.getElementById("current-username");

  // آدرس بک‌اند (در صورت نیاز آدرس دقیق Railway خودت را جایگزین کن)
  const API_URL = "https://tion-2491.up.railway.app"; 

  // ==========================================
  // عملیات ثبت‌نام
  // ==========================================
  signupBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const username = usernameInput.value.trim();

    if (!email || !password || !username) {
      alert("لطفاً تمام فیلدها (ایمیل، رمز عبور و نام کاربری) را پر کنید.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username })
      });

      const data = await response.json();

      if (response.ok) {
        alert("ثبت‌نام با موفقیت انجام شد! حالا وارد شوید.");
      } else {
        alert(data.message || "خطا در ثبت‌نام!");
      }
    } catch (error) {
      console.error("خطای اتصال:", error);
      alert("ارتباط با سرور برقرار نشد.");
    }
  });

  // ==========================================
  // عملیات ورود
  // ==========================================
  loginBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      alert("لطفاً ایمیل و رمز عبور را وارد کنید.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // ذخیره توکن یا اطلاعات کاربر
        localStorage.setItem("userToken", data.token || "true");
        localStorage.setItem("username", data.username || email.split("@")[0]);

        showApp(data.username || email.split("@")[0]);
      } else {
        alert(data.message || "ایمیل یا رمز عبور اشتباه است.");
      }
    } catch (error) {
      console.error("خطای اتصال:", error);
      alert("ارتباط با سرور برقرار نشد.");
    }
  });

  // ==========================================
  // عملیات خروج
  // ==========================================
  logoutBtn.addEventListener("click", () => {
    localStorage.clear();
    authContainer.classList.remove("hidden");
    appContainer.classList.add("hidden");
  });

  // نمایش صفحه برنامه اصلی
  function showApp(username) {
    currentUsernameSpan.textContent = username;
    authContainer.classList.add("hidden");
    appContainer.classList.remove("hidden");
  }

  // بررسی ورود قبلی کاربر
  const savedUsername = localStorage.getItem("username");
  if (savedUsername) {
    showApp(savedUsername);
  }
});