function setLoginMessage(text, color = "rgba(238, 246, 255, 0.9)") {
  const message = document.getElementById("login-message");
  message.textContent = text;
  message.style.color = color;
}

function updateLoginMode() {
  const identity = document.getElementById("login_identity").value.trim().toLowerCase();
  const secretLabel = document.getElementById("login-secret-label");
  const secretInput = document.getElementById("login_secret");

  if (identity === ADMIN_USERNAME) {
    secretLabel.textContent = "Password";
    secretInput.type = "password";
    secretInput.placeholder = "Enter admin password";
  } else {
    secretLabel.textContent = "Student ID";
    secretInput.type = "text";
    secretInput.placeholder = "Example: 1SI23AD001";
  }
}

function handleLogin(event) {
  event.preventDefault();

  const identity = document.getElementById("login_identity").value.trim();
  const secret = document.getElementById("login_secret").value.trim();

  if (identity.toLowerCase() === ADMIN_USERNAME) {
    if (secret !== ADMIN_PASSWORD) {
      setLoginMessage("Incorrect admin password.", "#fecaca");
      return;
    }

    saveSession({ role: "admin" });
    redirectTo("/admin");
    return;
  }

  if (!STUDENT_ID_PATTERN.test(secret)) {
    setLoginMessage("Student ID must follow the format 1SI23AD001.", "#fecaca");
    return;
  }

  saveSession({
    role: "student",
    student_name: identity,
    student_id: secret,
  });

  redirectTo("/student");
}

function bootstrapLoginPage() {
  const session = loadSession();
  if (session?.role === "student") {
    redirectTo("/student");
    return;
  }
  if (session?.role === "admin") {
    redirectTo("/admin");
    return;
  }

  document.getElementById("login_identity").addEventListener("input", updateLoginMode);
  document.getElementById("login-form").addEventListener("submit", handleLogin);
  updateLoginMode();
  setLoginMessage("");
}

bootstrapLoginPage();
