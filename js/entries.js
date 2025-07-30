import { BASE_URL } from "./config.js";

document.addEventListener("DOMContentLoaded", async () => {
  const tableBody = document.getElementById("entriesTable");
  const editModal = document.getElementById("editModal");
  const editForm = document.getElementById("editForm");
  const editTime = document.getElementById("editTime");
  const editWorkout = document.getElementById("editWorkout");
  const editMealGroup = document.getElementById("editMealGroup");
  const addEditMealBtn = document.getElementById("addEditMealBtn");
  const deleteConfirmModal = document.getElementById("deleteConfirmModal");
  const deleteConfirmForm = document.getElementById("deleteConfirmForm");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  const deleteFeedbackArea = document.getElementById("deleteFeedbackArea");

  let currentDeleteId = null;
  let currentEditId = null;

  const token = localStorage.getItem("token");
  if (!token) {
    tableBody.innerHTML = "<tr><td colspan='6'>You must be logged in.</td></tr>";
    return;
  }

  const userId = JSON.parse(atob(token.split(".")[1])).id;

  function formatDateDMY(dateStr) {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  }

  function clearFeedback() {
    const msg = document.querySelector(".form-feedback");
    if (msg) msg.remove();
  }

  function showFeedback(message, isSuccess, parent = editForm) {
    clearFeedback();
    const div = document.createElement("div");
    div.className = `form-feedback ${isSuccess ? "success" : "error"}`;
    div.textContent = message;

    const buttonRow = parent.querySelector(".button-row");
    if (buttonRow) {
      parent.insertBefore(div, buttonRow);
    } else {
      parent.appendChild(div);
    }
    return div;
  }

  function createMealInput(name = "", amount = "", unit = "") {
    const wrapper = document.createElement("div");
    wrapper.className = "meal-wrapper";
    wrapper.innerHTML = `
      <div class="meal-input-group">
        <div class="meal-name-wrapper">
          <input type="text" class="meal-input form-control mb-1" placeholder="Meal name" value="${name}" />
          <ul class="suggestions-list"></ul>
        </div>
        <input type="number" class="amount-input form-control mb-1" placeholder="Amount" value="${amount}" />
        <select class="unit-input form-select mb-1">
          <option value="">Select unit</option>
        </select>
        <button type="button" class="remove-meal-btn" title="Remove">×</button>
        <div class="meal-error text-danger small mt-1" style="display: none;">Please enter all meal details</div>
      </div>
    `;

    const input = wrapper.querySelector(".meal-input");
    const unitSelect = wrapper.querySelector(".unit-input");
    const removeBtn = wrapper.querySelector(".remove-meal-btn");
    const suggestions = wrapper.querySelector(".suggestions-list");

    removeBtn.addEventListener("click", () => wrapper.remove());

    input.addEventListener("input", async () => {
      const query = input.value.trim();
      suggestions.innerHTML = "";
      if (query.length < 2) return;

      try {
        const res = await fetch(`${BASE_URL}/api/entries/ingredients/search?query=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        data.results.slice(0, 5).forEach(item => {
          const li = document.createElement("li");
          li.textContent = item.name;
          li.onclick = async () => {
            input.value = item.name;
            suggestions.innerHTML = "";
            await loadUnits(item.id, unitSelect, unit);
          };
          suggestions.appendChild(li);
        });
      } catch (err) {
        console.error("Autocomplete error:", err);
      }
    });

    input.addEventListener("blur", () => {
      setTimeout(() => suggestions.innerHTML = "", 200);
    });

    editMealGroup.appendChild(wrapper);

    if (name) {
      fetch(`${BASE_URL}/api/entries/ingredients/search?query=${encodeURIComponent(name)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          const match = data.results.find(m => m.name.toLowerCase() === name.toLowerCase());
          if (match) {
            loadUnits(match.id, unitSelect, unit);
          }
        })
        .catch(err => console.error("Failed to preload units:", err));
    }
  }

  async function loadUnits(ingredientId, selectEl, selectedUnit = "") {
    try {
      const res = await fetch(`${BASE_URL}/api/entries/ingredients/${ingredientId}/information?amount=1&unit=piece`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const units = data.possibleUnits || [];

      selectEl.innerHTML = '<option value="">Select unit</option>';
      units.forEach(unit => {
        const opt = document.createElement("option");
        opt.value = unit;
        opt.textContent = unit;
        selectEl.appendChild(opt);
      });

      if (selectedUnit) {
        selectEl.value = selectedUnit;
      }
    } catch (err) {
      console.error("Unit fetch error:", err);
    }
  }

  addEditMealBtn.addEventListener("click", () => {
    createMealInput();
  });

  async function fetchWorkoutOptions() {
    try {
      const res = await fetch(`${BASE_URL}/api/entries/workouts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return await res.json();
    } catch {
      return [];
    }
  }

  async function populateWorkoutSelect(current = "") {
    const workouts = await fetchWorkoutOptions();
    editWorkout.innerHTML = "";

    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.disabled = true;
    defaultOpt.textContent = "Select workout";
    editWorkout.appendChild(defaultOpt);

    workouts.forEach(w => {
      const opt = document.createElement("option");
      opt.value = w.label;
      opt.textContent = w.label;
      editWorkout.appendChild(opt);
    });

    if (current) {
      const found = Array.from(editWorkout.options).find(
        opt => opt.value.toLowerCase().trim() === current.toLowerCase().trim()
      );
      if (found) {
        editWorkout.value = found.value;
      } else {
        const customOpt = document.createElement("option");
        customOpt.value = current;
        customOpt.textContent = current;
        editWorkout.appendChild(customOpt);
        editWorkout.value = current;
      }
    }
  }

  async function loadEntries() {
    try {
      const res = await fetch(`${BASE_URL}/api/entries?traineeId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const entries = await res.json();
      tableBody.innerHTML = "";

      if (!entries.length) {
        tableBody.innerHTML = "<tr><td colspan='6'>No entries found.</td></tr>";
        return;
      }

      entries.forEach(entry => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${formatDateDMY(entry.date)}</td>
          <td>${entry.time}</td>
          <td>${entry.meals.map(m => `${m.name} (${m.calories?.toFixed(0)} kcal)`).join("<br>")}</td>
          <td>${entry.workout}</td>
          <td>${entry.calories?.toFixed(0)} kcal</td>
          <td></td>
        `;

        const actions = row.querySelector("td:last-child");

        const editBtn = document.createElement("button");
        editBtn.textContent = "✏️ Edit";
        editBtn.className = "edit-btn";
        editBtn.onclick = async () => {
          currentEditId = entry._id;
          clearFeedback();
          editTime.value = entry.time || "";
          editMealGroup.innerHTML = "";
          for (const m of entry.meals || []) {
            createMealInput(m.name, m.amount, m.unit);
          }
          await populateWorkoutSelect(entry.workout || "");
          editModal.showModal();
        };

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "🗑 Delete";
        deleteBtn.className = "delete-btn";
        deleteBtn.onclick = () => {
          currentDeleteId = entry._id;
          deleteFeedbackArea.innerHTML = "";
          deleteConfirmModal.showModal();
        };

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        tableBody.appendChild(row);
      });
    } catch (err) {
      console.error("Load error:", err);
    }
  }

  deleteConfirmForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentDeleteId) return;

    deleteFeedbackArea.innerHTML = "";

    try {
      const res = await fetch(`${BASE_URL}/api/entries/${currentDeleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        deleteFeedbackArea.innerHTML = `<div class="form-feedback success">Entry deleted successfully.</div>`;
        await loadEntries();

        setTimeout(() => {
          deleteConfirmModal.close();
          deleteFeedbackArea.innerHTML = "";
        }, 2000);
      } else {
        deleteFeedbackArea.innerHTML = `<div class="form-feedback error">Failed to delete entry.</div>`;
      }
    } catch (err) {
      console.error("Delete error:", err);
      deleteFeedbackArea.innerHTML = `<div class="form-feedback error">Delete request failed.</div>`;
    }
  });

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentEditId) return;

    const meals = Array.from(editMealGroup.querySelectorAll(".meal-input-group")).map(group => {
      return {
        name: group.querySelector(".meal-input").value.trim(),
        amount: parseFloat(group.querySelector(".amount-input").value.trim()),
        unit: group.querySelector(".unit-input").value.trim()
      };
    });

    const body = {
      meals,
      workout: editWorkout.value.trim(),
      time: editTime.value
    };

    try {
      const res = await fetch(`${BASE_URL}/api/entries/${currentEditId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        await loadEntries();
        const msg = showFeedback("Entry updated successfully.", true);
        setTimeout(() => {
          editModal.close();
          msg.remove();
        }, 2000);
      } else {
        const err = await res.json();
        console.error("Update error:", err);
        showFeedback("Failed to update entry.", false);
      }
    } catch (err) {
      console.error("Update request failed:", err);
      showFeedback("Update request failed.", false);
    }
  });

  await loadEntries();
});
