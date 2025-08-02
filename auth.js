// auth.js (Versi Final dengan RPC Login)

const SUPABASE_URL = "https://cxgmkobednujqyktehvs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4Z21rb2JlZG51anF5a3RlaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwOTE1MTEsImV4cCI6MjA2OTY2NzUxMX0.4tnwdHLdR20Qbu__iLSSyY1lgZnYlAvm79D6RjdqAww";

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elemen-elemen DOM
const loginContainer = document.getElementById("login-container");
const signupContainer = document.getElementById("signup-container");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const loginMessage = document.getElementById("login-message");
const signupMessage = document.getElementById("signup-message");
const showSignup = document.getElementById("show-signup");
const showLogin = document.getElementById("show-login");

// --- Event Listeners untuk Beralih Form ---
showSignup.addEventListener("click", (e) => {
  e.preventDefault();
  loginContainer.classList.add("hidden");
  signupContainer.classList.remove("hidden");
});
showLogin.addEventListener("click", (e) => {
  e.preventDefault();
  signupContainer.classList.add("hidden");
  loginContainer.classList.remove("hidden");
});

// --- Fungsi Bantuan ---
function showMessage(element, type, text) {
  element.className = `message-container ${type}`;
  element.textContent = text;
}
function setLoading(form, isLoading) {
  const button = form.querySelector("button");
  if (isLoading) {
    button.disabled = true;
    button.textContent = "Memproses...";
  } else {
    button.disabled = false;
    button.textContent = form.id === "login-form" ? "Masuk" : "Buat Akun";
  }
}

// --- LOGIKA PENDAFTARAN ---
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("signup-username").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;

  if (!username || !email || !password) {
    showMessage(signupMessage, "error", "Semua kolom wajib diisi.");
    return;
  }
  if (password.length < 6) {
    showMessage(signupMessage, "error", "Kata sandi harus minimal 6 karakter.");
    return;
  }

  setLoading(signupForm, true);

  const { data: existingUser } = await _supabase
    .from("profiles")
    .select("username")
    .eq("username", username)
    .single();
  if (existingUser) {
    showMessage(signupMessage, "error", "Username ini sudah digunakan.");
    setLoading(signupForm, false);
    return;
  }

  const { data, error } = await _supabase.auth.signUp({
    email: email,
    password: password,
    options: { data: { username: username } },
  });

  if (error) {
    showMessage(signupMessage, "error", `Gagal mendaftar: ${error.message}`);
    setLoading(signupForm, false);
  } else if (data.session) {
    showMessage(
      signupMessage,
      "success",
      "Pendaftaran berhasil! Mengalihkan ke dasbor..."
    );
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
  } else {
    showMessage(
      signupMessage,
      "success",
      "Pendaftaran berhasil! Cek email untuk verifikasi."
    );
    setLoading(signupForm, false);
  }
});

// --- LOGIKA LOGIN (DIPERBAIKI DENGAN RPC) ---
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;

  if (!username || !password) {
    showMessage(loginMessage, "error", "Username dan kata sandi wajib diisi.");
    return;
  }

  setLoading(loginForm, true);

  // Langkah 1: Panggil fungsi database 'get_email_by_username'
  const { data: email, error: rpcError } = await _supabase.rpc(
    "get_email_by_username",
    {
      p_username: username,
    }
  );

  if (rpcError || !email) {
    // Jika fungsi error atau tidak mengembalikan email, berarti username tidak ada
    showMessage(loginMessage, "error", "Username atau kata sandi salah.");
    setLoading(loginForm, false);
    return;
  }

  // Langkah 2: Coba login dengan email yang didapat dan password yang diinput
  const { data, error } = await _supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    // Jika di sini error, berarti passwordnya yang salah
    showMessage(loginMessage, "error", "Username atau kata sandi salah.");
  } else if (data.user) {
    window.location.href = "index.html";
  }

  setLoading(loginForm, false);
});

// --- Pengecekan Sesi Login ---
async function checkLoginStatus() {
  const {
    data: { session },
  } = await _supabase.auth.getSession();
  if (session) {
    window.location.href = "index.html";
  }
}

checkLoginStatus();
