async function renderStudentDashboard() {
  const session = requireRole("student");
  if (!session) {
    return;
  }

  const subjects = await fetchSubjects();
  document.getElementById("student_name").value = session.student_name;
  document.getElementById("student_id").value = session.student_id;
  document.getElementById("student-welcome").textContent = `Welcome, ${session.student_name}`;
  fillSubjectSelect("student_subject", subjects);
  renderSubjectCards(subjects, "student-subject-cards");
}

function handleStudentLogout() {
  clearSession();
  redirectTo("/");
}

function handleStudentRegistration(event) {
  event.preventDefault();

  const session = requireRole("student");
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
    "student-submit-button",
    renderStudentDashboard
  );
}

async function bootstrapStudentPage() {
  const session = requireRole("student");
  if (!session) {
    return;
  }

  document.getElementById("student-registration-form").addEventListener("submit", handleStudentRegistration);
  document.getElementById("student-logout").addEventListener("click", handleStudentLogout);
  await renderStudentDashboard();
  setInterval(renderStudentDashboard, 5000);
}

bootstrapStudentPage();
