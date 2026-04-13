const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "0507_@Rtbda";
const STUDENT_ID_PATTERN = /^\dSI\d{2}[A-Z]{2}\d{3}$/;

function saveSession(session) {
  sessionStorage.setItem("smartenrollUser", JSON.stringify(session));
}

function loadSession() {
  const raw = sessionStorage.getItem("smartenrollUser");
  return raw ? JSON.parse(raw) : null;
}

function clearSession() {
  sessionStorage.removeItem("smartenrollUser");
}

function redirectTo(path) {
  window.location.href = path;
}

function requireRole(role) {
  const session = loadSession();
  if (!session || session.role !== role) {
    redirectTo("/");
    return null;
  }
  return session;
}

function renderSubjectCards(subjects, containerId) {
  const container = document.getElementById(containerId);

  container.innerHTML = subjects
    .map((subject) => {
      const status = subject.available_seats > 0 ? `${subject.available_seats} seats left` : "Sold out";

      return `
        <article class="glass-card subject-card">
          <h3>${subject.subject}</h3>
          <p class="meta">Registrations: ${subject.registration_count}</p>
          <p class="seat-count">${subject.available_seats}</p>
          <p class="meta">Available out of ${subject.total_seats} total seats</p>
          <p class="meta">Live queue updates: ${subject.live_count}</p>
          <span class="pill ${subject.available_seats === 0 ? "sold-out" : ""}">${status}</span>
        </article>
      `;
    })
    .join("");
}

function fillSubjectSelect(selectId, subjects) {
  const select = document.getElementById(selectId);
  const selectedValue = select.value;

  select.innerHTML = subjects
    .map((item) => `<option value="${item.subject}">${item.subject}</option>`)
    .join("");

  const hasPreviousSelection = subjects.some((item) => item.subject === selectedValue);
  if (hasPreviousSelection) {
    select.value = selectedValue;
  }
}

async function fetchSubjects() {
  const response = await fetch("/subjects");
  return response.json();
}

async function fetchDashboardData() {
  const [subjectsResponse, popularResponse, trendsResponse, liveCountsResponse] =
    await Promise.all([
      fetch("/subjects"),
      fetch("/analytics/popular-subjects"),
      fetch("/analytics/registration-trends"),
      fetch("/analytics/live-counts"),
    ]);

  return {
    subjects: await subjectsResponse.json(),
    popularData: await popularResponse.json(),
    trendsData: await trendsResponse.json(),
    liveCountsData: await liveCountsResponse.json(),
  };
}

async function submitRegistration(payload, messageId, buttonId, onSuccess) {
  const message = document.getElementById(messageId);
  const button = document.getElementById(buttonId);

  message.textContent = "Submitting registration...";
  message.style.color = "rgba(238, 246, 255, 0.9)";

  button.classList.add("button-press");
  setTimeout(() => button.classList.remove("button-press"), 180);

  const response = await fetch("/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    message.textContent = data.detail || "Registration failed.";
    message.style.color = "#fecaca";
    return;
  }

  message.textContent = `Registration saved for ${data.student_name}.`;
  message.style.color = "#86efac";

  if (onSuccess) {
    await onSuccess();
  }
}
