const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "0507_@Rtbda";
const STUDENT_ID_PATTERN = /^\dSI\d{2}[A-Z]{2}\d{3}$/;

let popularityChart;
let trendsChart;
let currentRole = null;

function setLoginMessage(text, color = "rgba(238, 246, 255, 0.9)") {
  const message = document.getElementById("login-message");
  message.textContent = text;
  message.style.color = color;
}

function switchLoginTab(role) {
  const studentForm = document.getElementById("student-login-form");
  const adminForm = document.getElementById("admin-login-form");
  const studentTab = document.getElementById("student-tab");
  const adminTab = document.getElementById("admin-tab");

  if (role === "student") {
    studentForm.classList.remove("hidden");
    adminForm.classList.add("hidden");
    studentTab.classList.add("active-tab");
    adminTab.classList.remove("active-tab");
  } else {
    adminForm.classList.remove("hidden");
    studentForm.classList.add("hidden");
    adminTab.classList.add("active-tab");
    studentTab.classList.remove("active-tab");
  }

  setLoginMessage("");
}

function showView(role) {
  currentRole = role;

  document.getElementById("login-view").classList.toggle("hidden", role !== null);
  document.getElementById("student-view").classList.toggle("hidden", role !== "student");
  document.getElementById("admin-view").classList.toggle("hidden", role !== "admin");
}

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

function fillStudentForm(session) {
  document.getElementById("student_name").value = session.student_name;
  document.getElementById("student_id").value = session.student_id;
  document.getElementById("student-welcome").textContent = `Welcome, ${session.student_name}`;
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

function fillSubjectSelect(selectId, subjects) {
  const select = document.getElementById(selectId);
  select.innerHTML = subjects
    .map((item) => `<option value="${item.subject}">${item.subject}</option>`)
    .join("");
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

function renderSummaryCards(popularData, trendsData) {
  document.getElementById("popular-subject").textContent =
    popularData.most_popular_subject
      ? `${popularData.most_popular_subject.subject} (${popularData.most_popular_subject.registration_count})`
      : "No data yet";

  document.getElementById("peak-time").textContent =
    trendsData.peak_registration_time
      ? `${trendsData.peak_registration_time.time} (${trendsData.peak_registration_time.registration_count})`
      : "No data yet";

  document.getElementById("total-registrations").textContent = String(trendsData.total_registrations || 0);
}

function chartOptions(showLegend) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        labels: {
          color: "#eef6ff",
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "rgba(238, 246, 255, 0.8)",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.08)",
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: "rgba(238, 246, 255, 0.8)",
          precision: 0,
        },
        grid: {
          color: "rgba(255, 255, 255, 0.08)",
        },
      },
    },
  };
}

function renderPopularityChart(items) {
  const context = document.getElementById("popularity-chart");

  if (popularityChart) {
    popularityChart.destroy();
  }

  popularityChart = new Chart(context, {
    type: "bar",
    data: {
      labels: items.map((item) => item.subject),
      datasets: [
        {
          label: "Registrations",
          data: items.map((item) => item.registration_count),
          borderRadius: 12,
          backgroundColor: ["#7dd3fc", "#38bdf8", "#60a5fa", "#f59e0b", "#34d399"],
        },
      ],
    },
    options: chartOptions(false),
  });
}

function renderTrendsChart(items) {
  const context = document.getElementById("trends-chart");

  if (trendsChart) {
    trendsChart.destroy();
  }

  trendsChart = new Chart(context, {
    type: "line",
    data: {
      labels: items.map((item) => item.trend_label),
      datasets: [
        {
          label: "Registrations over time",
          data: items.map((item) => item.registration_count),
          borderColor: "#7dd3fc",
          backgroundColor: "rgba(125, 211, 252, 0.18)",
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: chartOptions(true),
  });
}

function renderRecentEvents(events) {
  const container = document.getElementById("recent-events");

  if (!events.length) {
    container.innerHTML = "<p class='meta'>No recent events yet. Submit a registration to see live updates.</p>";
    return;
  }

  container.innerHTML = events
    .map(
      (event) => `
        <article class="glass-card event-card">
          <h3>${event.student_name}</h3>
          <p class="meta">Student ID: ${event.student_id}</p>
          <p class="meta">Subject: ${event.subject}</p>
          <p class="meta">Time: ${new Date(event.timestamp).toLocaleString()}</p>
        </article>
      `
    )
    .join("");
}

async function renderStudentDashboard(session) {
  const subjects = await fetchSubjects();
  fillStudentForm(session);
  fillSubjectSelect("student_subject", subjects);
  renderSubjectCards(subjects, "student-subject-cards");
}

async function renderAdminDashboard() {
  const { subjects, popularData, trendsData, liveCountsData } = await fetchDashboardData();
  fillSubjectSelect("admin_subject", subjects);
  renderSubjectCards(subjects, "admin-subject-cards");
  renderSummaryCards(popularData, trendsData);
  renderPopularityChart(popularData.registrations_per_subject || []);
  renderTrendsChart(trendsData.registration_trends || []);
  renderRecentEvents(liveCountsData.recent_events || []);
}

async function refreshCurrentView() {
  const session = loadSession();

  if (!session) {
    return;
  }

  if (session.role === "student") {
    await renderStudentDashboard(session);
  }

  if (session.role === "admin") {
    await renderAdminDashboard();
  }
}

async function submitRegistration(payload, messageId, buttonId) {
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
  await refreshCurrentView();
}

function handleStudentLogin(event) {
  event.preventDefault();

  const studentName = document.getElementById("login_student_name").value.trim();
  const studentId = document.getElementById("login_student_id").value.trim();

  if (!STUDENT_ID_PATTERN.test(studentId)) {
    setLoginMessage("Student ID must follow the format 1SI23AD001.", "#fecaca");
    return;
  }

  const session = {
    role: "student",
    student_name: studentName,
    student_id: studentId,
  };

  saveSession(session);
  showView("student");
  renderStudentDashboard(session);
}

function handleAdminLogin(event) {
  event.preventDefault();

  const username = document.getElementById("admin_username").value.trim();
  const password = document.getElementById("admin_password").value;

  if (username !== ADMIN_USERNAME) {
    setLoginMessage("Only the admin username is allowed for admin access.", "#fecaca");
    return;
  }

  if (password !== ADMIN_PASSWORD) {
    setLoginMessage("Incorrect admin password.", "#fecaca");
    return;
  }

  saveSession({ role: "admin" });
  showView("admin");
  renderAdminDashboard();
}

function handleLogout() {
  clearSession();
  showView(null);
  switchLoginTab("student");
  document.getElementById("student-login-form").reset();
  document.getElementById("admin-login-form").reset();
}

function handleStudentRegistration(event) {
  event.preventDefault();

  const session = loadSession();
  if (!session) {
    return;
  }

  submitRegistration(
    {
      student_id: session.student_id,
      student_name: session.student_name,
      subject: document.getElementById("student_subject").value,
    },
    "student-form-message",
    "student-submit-button"
  );
}

function handleAdminRegistration(event) {
  event.preventDefault();

  const studentId = document.getElementById("admin_student_id").value.trim();
  if (!STUDENT_ID_PATTERN.test(studentId)) {
    const message = document.getElementById("admin-form-message");
    message.textContent = "Student ID must follow the format 1SI23AD001.";
    message.style.color = "#fecaca";
    return;
  }

  submitRegistration(
    {
      student_id: studentId,
      student_name: document.getElementById("admin_student_name").value.trim(),
      subject: document.getElementById("admin_subject").value,
    },
    "admin-form-message",
    "admin-submit-button"
  );
}

async function bootstrap() {
  document.getElementById("student-tab").addEventListener("click", () => switchLoginTab("student"));
  document.getElementById("admin-tab").addEventListener("click", () => switchLoginTab("admin"));
  document.getElementById("student-login-form").addEventListener("submit", handleStudentLogin);
  document.getElementById("admin-login-form").addEventListener("submit", handleAdminLogin);
  document.getElementById("student-registration-form").addEventListener("submit", handleStudentRegistration);
  document.getElementById("admin-registration-form").addEventListener("submit", handleAdminRegistration);
  document.getElementById("student-logout").addEventListener("click", handleLogout);
  document.getElementById("admin-logout").addEventListener("click", handleLogout);

  const session = loadSession();
  if (session?.role === "student") {
    showView("student");
    await renderStudentDashboard(session);
  } else if (session?.role === "admin") {
    showView("admin");
    await renderAdminDashboard();
  } else {
    showView(null);
    switchLoginTab("student");
  }

  setInterval(async () => {
    if (currentRole) {
      await refreshCurrentView();
    }
  }, 5000);
}

bootstrap();
