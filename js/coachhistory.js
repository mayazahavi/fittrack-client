import { BASE_URL } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('feedbackTableBody');
  const modal = document.getElementById("editModal");
  const closeModalBtn = document.getElementById("closeEditModal");
  const editForm = document.getElementById("editFeedbackForm");
  const toast = document.getElementById("toast");
  const deleteModal = document.getElementById("deleteConfirmModal");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  const deleteMessageBox = document.getElementById("deleteMessageBox");

  const editDate = document.getElementById("editDate");
  const editTime = document.getElementById("editTime");
  const editNutrition = document.getElementById("editNutrition");
  const editExercise = document.getElementById("editExercise");
  const editGeneral = document.getElementById("editGeneral");

  const traineeFilter = document.getElementById("traineeFilter");

  let currentFeedbackId = null;
  let feedbackRowToDelete = null;

  let allFeedbacks = [];

  async function loadTrainees() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${BASE_URL}/api/users/trainees`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      const trainees = await res.json();
      traineeFilter.innerHTML = `<option value="">All Trainees</option>`;
      trainees.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t._id;
        opt.textContent = t.username;
        traineeFilter.appendChild(opt);
      });
    } catch (err) {
      console.error("Error loading trainees:", err.message);
    }
  }

  async function loadFeedbacks() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Please login to view feedback history.</td></tr>';
        return;
      }

      const res = await fetch(`${BASE_URL}/api/coach/feedback`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) {
        const errText = await res.text();
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Error loading feedback: ${errText}</td></tr>`;
        return;
      }

      allFeedbacks = await res.json();
      renderFeedbacks();
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Error loading feedback: ${err.message}</td></tr>`;
    }
  }

  function renderFeedbacks() {
    const selectedTraineeId = traineeFilter.value;
    const filtered = selectedTraineeId
      ? allFeedbacks.filter(f => f.trainee?._id === selectedTraineeId)
      : allFeedbacks;

    tableBody.innerHTML = '';
    if (!filtered.length) {
      tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No feedback history available.</td></tr>';
      return;
    }

    filtered.forEach(fb => {
      const dateObj = new Date(fb.datetime);
      const dateStr = dateObj.toLocaleDateString('en-GB');
      const timeStr = dateObj.toTimeString().slice(0, 5);
      const traineeName = fb.trainee?.username || fb.trainee || 'Unknown';

      const tipsText =
        `Nutrition: ${fb.tips?.nutrition || "No feedback"}\n` +
        `Exercise: ${fb.tips?.exercise || "No feedback"}\n` +
        `General: ${fb.tips?.general || "No feedback"}`;

      const statusText = fb.readByTrainee
        ? '<span class="text-success">✔ Read</span>'
        : '<span class="text-muted">✖ Unread</span>';

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${traineeName}</td>
        <td>${dateStr}</td>
        <td>${timeStr}</td>
        <td><pre>${tipsText}</pre></td>
        <td>${statusText}</td>
        <td class="actions">
          <button class="edit-btn btn btn-outline-primary btn-sm" data-id="${fb._id}">✏️ Edit</button>
          <button class="delete-btn btn btn-outline-danger btn-sm" data-id="${fb._id}">🗑️ Delete</button>
        </td>
      `;
      tableBody.appendChild(row);

      row.querySelector(".edit-btn").addEventListener("click", () => {
        currentFeedbackId = fb._id;
        editDate.value = dateObj.toISOString().split("T")[0];
        editTime.value = timeStr;
        editNutrition.value = fb.tips?.nutrition || "";
        editExercise.value = fb.tips?.exercise || "";
        editGeneral.value = fb.tips?.general || "";
        clearFormFeedback();
        modal.showModal();
      });

      row.querySelector(".delete-btn").addEventListener("click", () => {
        currentFeedbackId = fb._id;
        feedbackRowToDelete = row;
        clearDeleteMessage();
        deleteModal.showModal();
      });
    });
  }

  traineeFilter.addEventListener("change", renderFeedbacks);
  closeModalBtn.addEventListener("click", () => modal.close());

  confirmDeleteBtn.addEventListener("click", async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/coach/feedback/${currentFeedbackId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });

      if (!res.ok) throw new Error(await res.text());

      showDeleteMessage("✅ Feedback deleted successfully", true);
      await loadFeedbacks();

      setTimeout(() => {
        deleteModal.close();
        clearDeleteMessage();
      }, 2000);

    } catch (err) {
      showDeleteMessage("❌ Failed to delete feedback: " + err.message, false);
      setTimeout(() => {
        deleteModal.close();
        clearDeleteMessage();
      }, 2500);
    }
  });

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    clearFormFeedback();

    let valid = true;

    if (!editDate.value || !editTime.value) {
      showFormFeedback("Please fill in date and time", false);
      valid = false;
    }

    if (!editNutrition.value.trim()) {
      addFieldError(editNutrition, "This field is required");
      valid = false;
    }
    if (!editExercise.value.trim()) {
      addFieldError(editExercise, "This field is required");
      valid = false;
    }
    if (!editGeneral.value.trim()) {
      addFieldError(editGeneral, "This field is required");
      valid = false;
    }

    if (!valid) return;

    const updatedData = {
      datetime: new Date(`${editDate.value}T${editTime.value}`),
      tips: {
        nutrition: editNutrition.value.trim(),
        exercise: editExercise.value.trim(),
        general: editGeneral.value.trim()
      }
    };

    try {
      const res = await fetch(`${BASE_URL}/api/coach/feedback/${currentFeedbackId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updatedData)
      });

      if (!res.ok) throw new Error(await res.text());
      showFormFeedback("✅ Feedback updated successfully!");
      await loadFeedbacks();
      setTimeout(() => modal.close(), 1000);

    } catch (err) {
      showFormFeedback("❌ Failed to update feedback: " + err.message, false);
    }
  });

  function showFormFeedback(msg, success = true) {
    clearFormFeedback();
    const feedback = document.createElement("div");
    feedback.className = "form-feedback " + (success ? "success" : "error");
    feedback.innerText = msg;
    editForm.querySelector("section").insertAdjacentElement("beforebegin", feedback);
  }

  function clearFormFeedback() {
    editForm.querySelectorAll(".form-feedback").forEach(e => e.remove());
    editForm.querySelectorAll(".invalid-feedback").forEach(e => {
      e.style.display = "none";
    });
    editForm.querySelectorAll(".is-invalid").forEach(input => {
      input.classList.remove("is-invalid");
    });
  }

  function addFieldError(input, message) {
    const error = input.parentElement.querySelector(".invalid-feedback");
    input.classList.add("is-invalid");
    if (error) {
      error.innerText = message;
      error.style.display = "block";
    } else {
      const newError = document.createElement("div");
      newError.className = "invalid-feedback";
      newError.innerText = message;
      input.after(newError);
    }
  }

  function showDeleteMessage(msg, success = true) {
    deleteMessageBox.innerText = msg;
    deleteMessageBox.className = "form-feedback mb-2 " + (success ? "success" : "error");
    deleteMessageBox.style.display = "block";
  }

  function clearDeleteMessage() {
    deleteMessageBox.innerText = "";
    deleteMessageBox.className = "form-feedback mb-2";
    deleteMessageBox.style.display = "none";
  }

  function showToast(message) {
    toast.innerText = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  loadTrainees();
  loadFeedbacks();
});
