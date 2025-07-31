import { BASE_URL } from "./config.js";
document.addEventListener("DOMContentLoaded", () => {
  const traineeSelect = document.getElementById("traineeSelect");
  const dateInput = document.getElementById("date");
  const timeInput = document.getElementById("time");
  const traineeDataContent = document.getElementById("traineeDataModalContent");
  const coachForm = document.getElementById("coachForm");
  const showDataBtn = document.getElementById("showTraineeDataBtn");
  const formStatus = document.getElementById("form-status-message");
  const profileCard = document.getElementById("traineeProfileCard");
  const profileUsername = document.getElementById("profileUsername");
  const profileAge = document.getElementById("profileAge");
  const profileGender = document.getElementById("profileGender");
  const profileHeight = document.getElementById("profileHeight");
  let weightChartInstance;
  function getTodayDateISO() {
    const today = new Date();
    return today.toISOString().split("T")[0];
  }
  const traineeMap = new Map();
  async function loadTrainees() {
    try {
      const res = await fetch(`${BASE_URL}/api/users/trainees`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!res.ok) throw new Error("Failed to load trainees");
      const trainees = await res.json();
      trainees.forEach(t => {
        const option = document.createElement("option");
        option.value = t._id;
        option.textContent = t.username;
        traineeMap.set(t._id, t.username);
        traineeSelect.appendChild(option);
      });
    } catch (err) {
      console.error("Error loading trainees:", err);
      alert("Error loading trainees: " + err.message);
    }
  }
  async function loadTraineeData() {
    const traineeId = traineeSelect.value;
    if (!traineeId) {
      traineeDataContent.innerHTML = "Please select a trainee.";
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/api/entries?traineeId=${traineeId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!res.ok) throw new Error("Failed to load trainee data");
      let data = await res.json();

      if (!data.length) {
        traineeDataContent.innerHTML = "No data found for this trainee.";
        return;
      }
      data.sort((a, b) => new Date(b.date + "T" + (b.time || "00:00")) - new Date(a.date + "T" + (a.time || "00:00")));
      traineeDataContent.innerHTML = data.map(entry => `
        <div class="trainee-entry-box">
          <strong>Date:</strong> ${new Date(entry.date).toLocaleDateString('he-IL')}<br/>
          <strong>Time:</strong> ${entry.time || "Unknown"}<br/>
          <strong>Meals:</strong> ${entry.meals.map(m => m.name).join(", ")}<br/>
          <strong>Calories:</strong> ${entry.calories || 0} kcal<br/>
          <strong>Exercise:</strong> ${entry.workout || "No data"}
        </div>
      `).join("");
    } catch (err) {
      traineeDataContent.innerHTML = "Error loading data.";
      console.error("Error loading trainee data:", err);
    }
  }
  async function loadTraineeProfile(traineeId) {
    const token = localStorage.getItem("token");
    const username = traineeMap.get(traineeId);
    if (!username) {
      console.error("Username not found for traineeId", traineeId);
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/api/trainee/profile/${username}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to load trainee profile");
      const data = await res.json();
      const profile = data.trainee;
      profileUsername.textContent = username;
      profileAge.textContent = profile.age;
      profileGender.textContent = profile.gender;
      profileHeight.textContent = profile.height;
      showWeightChart(profile.weightHistory || []);
      profileCard.style.display = "block";
    } catch (err) {
      console.error("Error loading trainee profile:", err);
      alert("Error loading trainee profile.");
    }
  }
  function showWeightChart(weightHistory) {
    const ctx = document.getElementById("weightChart").getContext("2d");
    const sorted = [...weightHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
    const labels = sorted.map(entry => new Date(entry.date).toLocaleDateString('he-IL'));
    const data = sorted.map(entry => entry.weight);
    if (weightChartInstance) {
      weightChartInstance.destroy();
    }
    weightChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Weight (kg)",
          data,
          borderColor: "#198754",
          backgroundColor: "rgba(25,135,84,0.2)",
          tension: 0.2,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { mode: "index", intersect: false }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: { display: true, text: "Kg" }
          },
          x: {
            title: { display: true, text: "Date" }
          }
        }
      }
    });
  }
  loadTrainees();
  traineeSelect.addEventListener("change", () => {
    const traineeId = traineeSelect.value;
    loadTraineeData();
    loadTraineeProfile(traineeId);
  });
  showDataBtn.addEventListener("click", () => {
    if (!traineeSelect.value) {
      alert("Please select a trainee first.");
      return;
    }
    dateInput.value = getTodayDateISO();
    loadTraineeData();
  });
  coachForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    formStatus.innerHTML = "";
    formStatus.className = "text-center fw-bold mt-3 form-status-box";
    coachForm.classList.add("was-validated");
    if (!coachForm.checkValidity()) {
      formStatus.innerHTML = `<i class="bi bi-x-circle-fill"></i> Please complete all required fields.`;
      formStatus.classList.add("text-danger");
      return;
    }
    const traineeId = traineeSelect.value;
    const payload = {
      traineeId,
      datetime: `${dateInput.value}T${timeInput.value}`,
      tips: {
        nutrition: document.getElementById("tipNutrition").value.trim(),
        exercise: document.getElementById("tipExercise").value.trim(),
        general: document.getElementById("tipGeneral").value.trim()
      }
    };
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/coach/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to send feedback");
      formStatus.innerHTML = `<i class="bi bi-check-circle-fill"></i> Feedback sent successfully!`;
      formStatus.className = "text-center fw-bold mt-3 form-status-box text-success";
      coachForm.reset();
      coachForm.classList.remove("was-validated");
      traineeDataContent.innerHTML = "Please select a trainee.";
      profileCard.style.display = "none";
      setTimeout(() => {
        formStatus.innerHTML = "";
        formStatus.className = "text-center fw-bold mt-3 form-status-box";
      }, 5000);
    } catch (err) {
      formStatus.innerHTML = `<i class="bi bi-x-circle-fill"></i> Error sending feedback: ${err.message}`;
      formStatus.className = "text-center fw-bold mt-3 form-status-box text-danger";
      setTimeout(() => {
        formStatus.innerHTML = "";
        formStatus.className = "text-center fw-bold mt-3 form-status-box";
      }, 5000);
      console.error("Feedback submission error:", err);
    }
  });
});
