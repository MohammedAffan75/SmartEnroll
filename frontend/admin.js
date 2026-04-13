let popularityChart;
let trendsChart;
let animatedCounterValues = {};
let previousEventKeys = new Set();

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

function animateCounter(elementId, nextValue, suffix = "") {
  const element = document.getElementById(elementId);
  const startValue = animatedCounterValues[elementId] ?? 0;
  const endValue = Number(nextValue) || 0;
  const duration = 700;
  const startTime = performance.now();

  function frame(currentTime) {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(startValue + (endValue - startValue) * eased);
    element.textContent = `${value}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  }

  animatedCounterValues[elementId] = endValue;
  requestAnimationFrame(frame);
}

function setProgressBar(id, ratioPercent) {
  const bar = document.getElementById(id);
  bar.style.width = `${Math.max(0, Math.min(100, ratioPercent))}%`;
}

function renderSummaryCards(popularData, trendsData) {
  const totalRegistrations = trendsData.total_registrations || 0;
  const topSubjectCount = popularData.most_popular_subject?.registration_count || 0;
  const peakCount = trendsData.peak_registration_time?.registration_count || 0;
  const popularityRatio = totalRegistrations ? (topSubjectCount / totalRegistrations) * 100 : 0;
  const peakRatio = totalRegistrations ? (peakCount / totalRegistrations) * 100 : 0;

  document.getElementById("popular-subject").textContent =
    popularData.most_popular_subject
      ? `${popularData.most_popular_subject.subject} (${popularData.most_popular_subject.registration_count})`
      : "No data yet";

  document.getElementById("peak-time").textContent =
    trendsData.peak_registration_time
      ? `${trendsData.peak_registration_time.time} (${trendsData.peak_registration_time.registration_count})`
      : "No data yet";

  animateCounter("total-registrations", totalRegistrations);
  document.getElementById("popular-support").textContent = `${Math.round(popularityRatio)}% of all registrations belong to the top subject.`;
  document.getElementById("peak-support").textContent = `${Math.round(peakRatio)}% of registrations happened during the busiest hour.`;
  document.getElementById("registration-support").textContent = `${totalRegistrations} total registration records are currently stored.`;
  setProgressBar("popular-progress", popularityRatio);
  setProgressBar("peak-progress", peakRatio);
  setProgressBar("registration-progress", Math.min(100, totalRegistrations));
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
  const nextEventKeys = new Set(
    events.map((event) => `${event.student_id}-${event.subject}-${event.timestamp}`)
  );

  if (!events.length) {
    container.innerHTML = "<p class='meta'>No recent events yet. Submit a registration to see live updates.</p>";
    previousEventKeys = nextEventKeys;
    return;
  }

  container.innerHTML = events
    .map(
      (event) => {
        const eventKey = `${event.student_id}-${event.subject}-${event.timestamp}`;
        const isFresh = !previousEventKeys.has(eventKey);

        return `
        <article class="glass-card event-card ${isFresh ? "event-fresh" : ""}">
          <h3>${event.student_name}</h3>
          <p class="meta">Student ID: ${event.student_id}</p>
          <p class="meta">Subject: ${event.subject}</p>
          <p class="meta">Time: ${new Date(event.timestamp).toLocaleString()}</p>
        </article>
      `;
      }
    )
    .join("");

  previousEventKeys = nextEventKeys;
}

function renderSeatDistribution(subjects) {
  const totalSeats = subjects.reduce((sum, subject) => sum + subject.total_seats, 0);
  const totalAvailableSeats = subjects.reduce((sum, subject) => sum + subject.available_seats, 0);
  const filledPercent = totalSeats ? ((totalSeats - totalAvailableSeats) / totalSeats) * 100 : 0;
  const list = document.getElementById("seat-distribution-list");

  animateCounter("total-live-seats", totalAvailableSeats);
  animateCounter("sidebar-live-seats", totalAvailableSeats);
  animateCounter("counter-subjects", subjects.length);
  document.getElementById("seat-support").textContent = `${totalAvailableSeats} seats remain from ${totalSeats} total seats.`;
  setProgressBar("seat-progress", (totalAvailableSeats / Math.max(totalSeats, 1)) * 100);

  document.getElementById("seat-ring").style.background = `conic-gradient(var(--accent-green) ${filledPercent * 3.6}deg, rgba(255, 255, 255, 0.08) 0deg)`;
  document.getElementById("seat-ring-value").textContent = `${Math.round(filledPercent)}%`;

  list.innerHTML = subjects
    .map((subject) => {
      const filledRatio = subject.total_seats
        ? (subject.registration_count / subject.total_seats) * 100
        : 0;

      return `
        <article class="distribution-item">
          <div class="distribution-top">
            <strong>${subject.subject}</strong>
            <span class="meta">${subject.available_seats} left</span>
          </div>
          <div class="distribution-bar">
            <span style="width: ${filledRatio}%"></span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderOperationalCounters(subjects, liveCountsData, trendsData) {
  animateCounter("counter-total-registrations", trendsData.total_registrations || 0);
  animateCounter("counter-live-events", (liveCountsData.recent_events || []).length);
}

async function renderAdminDashboard() {
  const session = requireRole("admin");
  if (!session) {
    return;
  }

  const { subjects, popularData, trendsData, liveCountsData } = await fetchDashboardData();
  fillSubjectSelect("admin_subject", subjects);
  renderSubjectCards(subjects, "admin-subject-cards");
  renderSummaryCards(popularData, trendsData);
  renderSeatDistribution(subjects);
  renderOperationalCounters(subjects, liveCountsData, trendsData);
  renderPopularityChart(popularData.registrations_per_subject || []);
  renderTrendsChart(trendsData.registration_trends || []);
  renderRecentEvents(liveCountsData.recent_events || []);
}

function handleAdminLogout() {
  clearSession();
  redirectTo("/");
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
    "admin-submit-button",
    renderAdminDashboard
  );
}

function toggleRegistrationForm() {
  const wrapper = document.getElementById("registration-form-wrapper");
  const button = document.getElementById("collapse-registration-button");
  const topButton = document.getElementById("toggle-registration-form");
  const isExpanded = wrapper.classList.toggle("expanded");

  button.textContent = isExpanded ? "Hide Form" : "Show Form";
  button.setAttribute("aria-expanded", String(isExpanded));
  topButton.textContent = isExpanded ? "Collapse Registration" : "Register a Student";
}

async function bootstrapAdminPage() {
  const session = requireRole("admin");
  if (!session) {
    return;
  }

  document.getElementById("admin-registration-form").addEventListener("submit", handleAdminRegistration);
  document.getElementById("admin-logout").addEventListener("click", handleAdminLogout);
  document.getElementById("collapse-registration-button").addEventListener("click", toggleRegistrationForm);
  document.getElementById("toggle-registration-form").addEventListener("click", toggleRegistrationForm);
  document.getElementById("toggle-registration-form").textContent = "Collapse Registration";
  await renderAdminDashboard();
  setInterval(renderAdminDashboard, 5000);
}

bootstrapAdminPage();
