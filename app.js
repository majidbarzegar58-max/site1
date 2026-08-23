const SUPABASE_URL = "https://jqieckvydpwyitearyfg.supabase.co";
const SUPABASE_KEY = "sb_publishable_wz7DIMoz1lySeDUZyLb5Aw_Yc-WAxFJ";

// مقداردهی کلاینت Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let activeFriend = null;

// بررسی خودکار نشست کاربری هنگام لود شدن صفحه (حفظ ورود با رفرش)
document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    currentUser = session.user;
    initApp();
  }
});

// ۱. سیستم ثبت‌نام و ورود
async function signUp() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const username = document.getElementById("username").value.trim();

  if (!email || !password || !username) {
    return alert("لطفاً تمام فیلدها را پر کنید!");
  }

  // ذخیره نام کاربری در حافظه مرورگر برای موقع ورود
  localStorage.setItem("pending_username", username);

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { username: username } }
    });

    if (error) return alert("خطا در ثبت‌نام: " + error.message);

    alert("ثبت‌نام با موفقیت انجام شد! حالا دکمه ورود را بزنید.");
  } catch (err) {
    alert("خطای ناشناخته: " + err.message);
  }
}

async function signIn() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    return alert("لطفاً ایمیل و رمز عبور را وارد کنید!");
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return alert("خطا در ورود: " + error.message);

  currentUser = data.user;

  // بررسی و ساخت خودکار پروفایل اگر وجود نداشته باشد
  await ensureProfileExists();

  initApp();
}

// تابع اطمینان از وجود پروفایل در جدول profiles
async function ensureProfileExists() {
  if (!currentUser) return;

  // ۱. چک می‌کنیم آیا پروفایل دارد؟
  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("username")
    .eq("id", currentUser.id)
    .maybeSingle();

  // ۲. اگر پروفایل نداشت، آن را می‌سازیم
  if (!profile) {
    const savedUsername = localStorage.getItem("pending_username") || 
                          currentUser.user_metadata?.username || 
                          currentUser.email.split("@")[0];

    await supabaseClient.from("profiles").upsert([
      { id: currentUser.id, username: savedUsername }
    ]);
  }
}

async function signOut() {
  await supabaseClient.auth.signOut();
  localStorage.removeItem("pending_username");
  location.reload();
}

// ۲. مقداردهی اولیه برنامه
async function initApp() {
  document.getElementById("auth-container").classList.add("hidden");
  document.getElementById("app-container").classList.remove("hidden");

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("username")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (profile) {
    document.getElementById("current-username").innerText = profile.username;
  }

  loadFriends();
  listenToMessages();
}

// ۳. مدیریت دوستان
async function sendFriendRequest() {
  const friendUsername = document.getElementById("friend-username").value.trim();
  if (!friendUsername) return alert("نام کاربری دوست را وارد کنید!");

  const { data: targetUsers, error } = await supabaseClient
    .from("profiles")
    .select("id, username")
    .ilike("username", friendUsername);

  if (error || !targetUsers || targetUsers.length === 0) {
    return alert(`کاربری با نام "${friendUsername}" یافت نشد!`);
  }

  const targetUser = targetUsers[0];

  if (targetUser.id === currentUser.id) {
    return alert("نمی‌توانید به خودتان درخواست دهید!");
  }

  const { error: reqError } = await supabaseClient.from("friend_requests").insert([
    { sender_id: currentUser.id, receiver_id: targetUser.id, status: "accepted" }
  ]);

  if (reqError) {
    return alert("خطا در ثبت دوست: " + reqError.message);
  }

  alert(`کاربر ${targetUser.username} با موفقیت اضافه شد!`);
  document.getElementById("friend-username").value = "";
  loadFriends();
}

async function loadFriends() {
  const { data: profiles } = await supabaseClient.from("profiles").select("*");
  const list = document.getElementById("friends-list");
  list.innerHTML = "";

  if (profiles) {
    profiles.forEach(p => {
      if (p.id !== currentUser.id) {
        const li = document.createElement("li");
        li.innerText = p.username;
        li.onclick = () => selectFriend(p);
        list.appendChild(li);
      }
    });
  }
}

function selectFriend(friend) {
  activeFriend = friend;
  document.getElementById("chat-header").innerText = `چت با ${friend.username}`;
  document.getElementById("input-box").classList.remove("hidden");
  loadMessages();
}

// ۴. چت و ارسال پیام
async function sendMessage() {
  const textInput = document.getElementById("message-text");
  const content = textInput.value;
  if (!content || !activeFriend) return;

  await supabaseClient.from("messages").insert([
    { sender_id: currentUser.id, receiver_id: activeFriend.id, content }
  ]);

  textInput.value = "";
}

async function loadMessages() {
  if (!activeFriend) return;
  const { data: msgs } = await supabaseClient.from("messages")
    .select("*")
    .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeFriend.id}),and(sender_id.eq.${activeFriend.id},receiver_id.eq.${currentUser.id})`)
    .order("created_at", { ascending: true });

  const list = document.getElementById("messages-list");
  list.innerHTML = "";
  if (msgs) {
    msgs.forEach(m => {
      const div = document.createElement("div");
      div.className = `msg ${m.sender_id === currentUser.id ? 'sent' : 'received'}`;
      div.innerText = m.content;
      list.appendChild(div);
    });
  }
  list.scrollTop = list.scrollHeight;
}

// ۵. دریافت آنلاین پیام‌ها (Realtime)
function listenToMessages() {
  supabaseClient.channel("public:messages")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, payload => {
      if (activeFriend && (payload.new.sender_id === activeFriend.id || payload.new.sender_id === currentUser.id)) {
        loadMessages();
      }
    })
    .subscribe();
}
