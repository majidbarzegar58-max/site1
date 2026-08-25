const SUPABASE_URL = "https://jqieckvydpwyitearyfg.supabase.co";
const SUPABASE_KEY = "sb_publishable_wz7DIMoz1lySeDUZyLb5Aw_Yc-WAxFJ";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let currentUser = null;
let activeFriend = null;
let realtimeChannel = null;


// ========================================
// ثبت نام
// ========================================

async function signUp() {

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const username = document.getElementById("username").value.trim();

  if (!email || !password || !username) {
    return alert("لطفاً تمام فیلدها را پر کنید!");
  }

  if (password.length < 6) {
    return alert("رمز عبور باید حداقل ۶ کاراکتر باشد!");
  }

  try {

    const { data, error } =
      await supabaseClient.auth.signUp({
        email: email,
        password: password
      });

    if (error) {
      console.error(error);
      return alert("خطا در ثبت‌نام: " + error.message);
    }

    if (data.user) {

      const { error: profileError } =
        await supabaseClient
          .from("profiles")
          .insert([
            {
              id: data.user.id,
              username: username
            }
          ]);

      if (profileError) {
        console.error("Profile Error:", profileError);

        return alert(
          "حساب ساخته شد ولی ساخت پروفایل با مشکل مواجه شد."
        );
      }

      alert(
        "ثبت‌نام با موفقیت انجام شد!\nحالا می‌توانید وارد شوید."
      );
    }

  } catch (err) {

    console.error(err);

    alert(
      "خطای ناشناخته: " + err.message
    );
  }
}


// ========================================
// ورود
// ========================================

async function signIn() {

  const email =
    document.getElementById("email").value.trim();

  const password =
    document.getElementById("password").value;

  if (!email || !password) {
    return alert(
      "لطفاً ایمیل و رمز عبور را وارد کنید!"
    );
  }

  try {

    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

    if (error) {

      console.error(error);

      return alert(
        "خطا در ورود: " + error.message
      );
    }

    currentUser = data.user;

    await initApp();

  } catch (err) {

    console.error(err);

    alert(
      "خطای ناشناخته: " + err.message
    );
  }
}


// ========================================
// خروج
// ========================================

async function signOut() {

  try {

    if (realtimeChannel) {
      await supabaseClient
        .removeChannel(realtimeChannel);

      realtimeChannel = null;
    }

    await supabaseClient.auth.signOut();

    currentUser = null;
    activeFriend = null;

    location.reload();

  } catch (err) {

    console.error(err);

    location.reload();
  }
}


// ========================================
// مقداردهی اولیه برنامه
// ========================================

async function initApp() {

  document
    .getElementById("auth-container")
    .classList.add("hidden");

  document
    .getElementById("app-container")
    .classList.remove("hidden");


  // گرفتن پروفایل کاربر

  const { data: profile, error } =
    await supabaseClient
      .from("profiles")
      .select("username")
      .eq("id", currentUser.id)
      .single();


  if (error) {
    console.error(
      "Profile Load Error:",
      error
    );
  }


  if (profile) {

    const usernameElement =
      document.getElementById(
        "current-username"
      );

    if (usernameElement) {
      usernameElement.innerText =
        profile.username;
    }
  }


  // نمایش صفحه خالی چت

  const emptyChat =
    document.getElementById("empty-chat");

  const chatContent =
    document.getElementById("chat-content");

  if (emptyChat) {
    emptyChat.classList.remove("hidden");
  }

  if (chatContent) {
    chatContent.classList.add("hidden");
  }


  // بارگذاری دوستان

  await loadFriends();


  // فعال کردن Realtime

  listenToMessages();
}


// ========================================
// افزودن دوست
// ========================================

async function sendFriendRequest() {

  const input =
    document.getElementById(
      "friend-username"
    );

  const friendUsername =
    input.value.trim();


  if (!friendUsername) {
    return alert(
      "نام کاربری دوست را وارد کنید!"
    );
  }


  if (!currentUser) {
    return alert(
      "ابتدا وارد حساب خود شوید."
    );
  }


  try {

    const { data: targetUser, error } =
      await supabaseClient
        .from("profiles")
        .select("id, username")
        .eq("username", friendUsername)
        .maybeSingle();


    if (error) {

      console.error(error);

      return alert(
        "خطا در پیدا کردن کاربر."
      );
    }


    if (!targetUser) {

      return alert(
        "کاربری با این نام یافت نشد!"
      );
    }


    if (targetUser.id === currentUser.id) {

      return alert(
        "نمی‌توانید به خودتان درخواست دهید!"
      );
    }


    const { error: requestError } =
      await supabaseClient
        .from("friend_requests")
        .insert([
          {
            sender_id: currentUser.id,
            receiver_id: targetUser.id,
            status: "accepted"
          }
        ]);


    if (requestError) {

      console.error(requestError);

      return alert(
        "خطا در افزودن دوست: " +
        requestError.message
      );
    }


    alert(
      `${targetUser.username} با موفقیت اضافه شد!`
    );


    input.value = "";

    await loadFriends();

  } catch (err) {

    console.error(err);

    alert(
      "خطای ناشناخته: " +
      err.message
    );
  }
}


// ========================================
// بارگذاری دوستان
// ========================================

async function loadFriends() {

  if (!currentUser) return;


  const { data: profiles, error } =
    await supabaseClient
      .from("profiles")
      .select("*");


  const list =
    document.getElementById(
      "friends-list"
    );


  if (!list) return;


  list.innerHTML = "";


  if (error) {

    console.error(
      "Friends Error:",
      error
    );

    return;
  }


  if (!profiles || profiles.length === 0) {

    const empty = document.createElement("div");

    empty.style.padding = "20px";
    empty.style.textAlign = "center";
    empty.style.color = "#8b98a5";
    empty.style.fontSize = "13px";

    empty.innerText =
      "هنوز کاربری وجود ندارد.";

    list.appendChild(empty);

    return;
  }


  profiles.forEach(profile => {

    // خود کاربر را نمایش نده

    if (profile.id === currentUser.id) {
      return;
    }


    const li =
      document.createElement("li");


    li.dataset.username =
      (profile.username || "")
        .toLowerCase();


    // اسم کاربر

    const name =
      document.createElement("span");

    name.className =
      "friend-name";

    name.innerText =
      profile.username || "کاربر";


    // آواتار

    const avatar =
      document.createElement("span");

    avatar.className =
      "friend-avatar";

    avatar.innerText = "👤";


    // ساختار ردیف

    li.innerHTML = "";

    li.appendChild(avatar);
    li.appendChild(name);


    // انتخاب دوست

    li.onclick = () => {

      selectFriend(profile);
    };


    list.appendChild(li);

  });
}


// ========================================
// انتخاب دوست
// ========================================

async function selectFriend(friend) {

  if (!friend) return;


  activeFriend = friend;


  // مخفی کردن صفحه اصلی

  const emptyChat =
    document.getElementById(
      "empty-chat"
    );

  if (emptyChat) {
    emptyChat.classList.add("hidden");
  }


  // نمایش چت

  const chatContent =
    document.getElementById(
      "chat-content"
    );

  if (chatContent) {
    chatContent.classList.remove(
      "hidden"
    );
  }


  // نام دوست

  const chatHeader =
    document.getElementById(
      "chat-header"
    );

  if (chatHeader) {

    chatHeader.innerText =
      friend.username;
  }


  // نمایش input

  const inputBox =
    document.getElementById(
      "input-box"
    );

  if (inputBox) {
    inputBox.classList.remove(
      "hidden"
    );
  }


  // حذف حالت انتخاب از همه

  document
    .querySelectorAll(
      "#friends-list li"
    )
    .forEach(li => {

      li.classList.remove(
        "active"
      );

    });


  // انتخاب ردیف فعلی

  const selected =
    [...document.querySelectorAll(
      "#friends-list li"
    )]
      .find(li =>
        li.dataset.username ===
        (friend.username || "")
          .toLowerCase()
      );


  if (selected) {

    selected.classList.add(
      "active"
    );
  }


  // بارگذاری پیام‌ها

  await loadMessages();


  // فوکوس روی کادر پیام

  const messageInput =
    document.getElementById(
      "message-text"
    );

  if (messageInput) {

    setTimeout(() => {
      messageInput.focus();
    }, 100);
  }
}


// ========================================
// ارسال پیام
// ========================================

async function sendMessage() {

  const textInput =
    document.getElementById(
      "message-text"
    );


  if (!textInput) return;


  const content =
    textInput.value.trim();


  if (!content) return;


  if (!activeFriend) {

    return alert(
      "ابتدا یک گفتگو را انتخاب کنید."
    );
  }


  if (!currentUser) {

    return alert(
      "ابتدا وارد حساب خود شوید."
    );
  }


  try {

    const { error } =
      await supabaseClient
        .from("messages")
        .insert([
          {
            sender_id:
              currentUser.id,

            receiver_id:
              activeFriend.id,

            content:
              content
          }
        ]);


    if (error) {

      console.error(
        "Send Message Error:",
        error
      );

      return alert(
        "ارسال پیام ناموفق بود: " +
        error.message
      );
    }


    textInput.value = "";


    // پیام جدید را سریع نمایش بده

    await loadMessages();

  } catch (err) {

    console.error(err);

    alert(
      "خطا در ارسال پیام: " +
      err.message
    );
  }
}


// ========================================
// دریافت پیام‌ها
// ========================================

async function loadMessages() {

  if (!activeFriend || !currentUser) {
    return;
  }


  const { data: msgs, error } =
    await supabaseClient
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeFriend.id}),and(sender_id.eq.${activeFriend.id},receiver_id.eq.${currentUser.id})`
      )
      .order(
        "created_at",
        {
          ascending: true
        }
      );


  const list =
    document.getElementById(
      "messages-list"
    );


  if (!list) return;


  list.innerHTML = "";


  if (error) {

    console.error(
      "Messages Error:",
      error
    );

    return;
  }


  if (!msgs || msgs.length === 0) {

    const empty =
      document.createElement("div");

    empty.style.textAlign =
      "center";

    empty.style.color =
      "#8b98a5";

    empty.style.padding =
      "30px";

    empty.style.fontSize =
      "13px";

    empty.innerText =
      "هنوز پیامی ارسال نشده است.";

    list.appendChild(empty);

    return;
  }


  msgs.forEach(message => {

    const div =
      document.createElement("div");


    if (
      message.sender_id ===
      currentUser.id
    ) {

      div.className =
        "msg sent";

    } else {

      div.className =
        "msg received";
    }


    div.innerText =
      message.content;


    list.appendChild(div);

  });


  // رفتن به آخرین پیام

  list.scrollTop =
    list.scrollHeight;
}


// ========================================
// جستجوی کاربران
// ========================================

function searchFriends() {

  const searchInput =
    document.getElementById(
      "search-friends"
    );


  if (!searchInput) return;


  const search =
    searchInput.value
      .trim()
      .toLowerCase();


  const friends =
    document.querySelectorAll(
      "#friends-list li"
    );


  friends.forEach(friend => {

    const username =
      friend.dataset.username || "";


    if (
      username.includes(search)
    ) {

      friend.style.display =
        "flex";

    } else {

      friend.style.display =
        "none";
    }

  });
}


// ========================================
// ارسال پیام با Enter
// ========================================

function handleMessageKey(event) {

  if (event.key === "Enter") {

    event.preventDefault();

    sendMessage();
  }
}


// ========================================
// Realtime پیام‌ها
// ========================================

function listenToMessages() {

  // اگر کانال قبلی وجود داشت حذفش کن

  if (realtimeChannel) {

    supabaseClient
      .removeChannel(
        realtimeChannel
      );

    realtimeChannel = null;
  }


  realtimeChannel =
    supabaseClient
      .channel(
        "messages-realtime"
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages"
        },
        payload => {

          if (
            !currentUser ||
            !activeFriend
          ) {
            return;
          }


          const newMessage =
            payload.new;


          const isCurrentChat =
            (
              newMessage.sender_id ===
                currentUser.id &&
              newMessage.receiver_id ===
                activeFriend.id
            )
            ||
            (
              newMessage.sender_id ===
                activeFriend.id &&
              newMessage.receiver_id ===
                currentUser.id
            );


          if (isCurrentChat) {

            loadMessages();
          }

        }
      )
      .subscribe(
        status => {

          console.log(
            "Realtime status:",
            status
          );

        }
      );
}


// ========================================
// بررسی Session هنگام باز شدن سایت
// ========================================

async function checkSession() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();


    if (error) {

      console.error(
        "Session Error:",
        error
      );

      return;
    }


    if (data.session) {

      currentUser =
        data.session.user;

      await initApp();

    }

  } catch (err) {

    console.error(
      "Session Check Error:",
      err
    );
  }
}


// ========================================
// تغییر وضعیت Auth
// ========================================

supabaseClient.auth.onAuthStateChange(
  async (event, session) => {

    console.log(
      "Auth event:",
      event
    );


    if (
      event === "SIGNED_IN" &&
      session
    ) {

      currentUser =
        session.user;

    }


    if (
      event === "SIGNED_OUT"
    ) {

      currentUser = null;
      activeFriend = null;
    }

  }
);


// ========================================
// شروع برنامه
// ========================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    checkSession();

  }
);
