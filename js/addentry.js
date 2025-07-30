import { BASE_URL } from "./config.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("entryForm");
  const mealGroup = document.getElementById("meal-group");
  const addMealBtn = document.getElementById("add-meal-btn");
  const caloriesDisplay = document.getElementById("calories-display");
  const feedbackMsg = document.getElementById("form-feedback");

  const mealError = document.getElementById("meal-error");
  const workoutError = document.getElementById("workout-error");
  const dateError = document.getElementById("date-error");
  const timeError = document.getElementById("time-error");

  function clearFieldErrors() {
    mealError.textContent = "";
    workoutError.textContent = "";
    dateError.textContent = "";
    timeError.textContent = "";
    document.querySelectorAll(".is-invalid").forEach(el => el.classList.remove("is-invalid"));
    feedbackMsg.textContent = "";
    feedbackMsg.className = "feedback-msg";
  }

  function showFeedback(message, type) {
    feedbackMsg.textContent = message;
    feedbackMsg.className = `feedback-msg ${type === "error" ? "feedback-error" : "feedback-success"}`;
    feedbackMsg.style.display = "block";
    setTimeout(() => {
      feedbackMsg.textContent = "";
      feedbackMsg.style.display = "none";
    }, 5000);
  }

  function createMealInput() {
    const wrapper = document.createElement("div");
    wrapper.className = "meal-wrapper position-relative mb-2 d-flex flex-wrap align-items-center gap-2";

    wrapper.innerHTML = `
      <input type="text" class="meal-input form-control" placeholder="Type a meal..." required style="flex: 2;" />
      <ul class="suggestions-list"></ul>
      <input type="number" class="form-control amount-input" placeholder="Amount" min="1" required style="width: 100px;" />
      <select class="form-select unit-select" required style="width: 140px;">
        <option value="" disabled selected>Select unit</option>
      </select>
      <button type="button" class="btn-close remove-meal-btn" aria-label="Remove"></button>
    `;

    mealGroup.appendChild(wrapper);

    const removeBtn = wrapper.querySelector(".remove-meal-btn");
    removeBtn.addEventListener("click", () => {
      wrapper.remove();
    });

    // Autocomplete listener
    const input = wrapper.querySelector(".meal-input");
    const list = wrapper.querySelector(".suggestions-list");
    const unitSelect = wrapper.querySelector(".unit-select");

    input.addEventListener("input", async () => {
      const query = input.value.trim();
      list.innerHTML = "";

      if (query.length < 2) return;

      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${BASE_URL}/api/entries/ingredients/search?query=${encodeURIComponent(query)}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        const data = await res.json();
        if (!res.ok || !data.results) throw new Error("No results");

        data.results.slice(0, 5).forEach(item => {
          const li = document.createElement("li");
          li.textContent = item.name;
          li.addEventListener("click", async () => {
            input.value = item.name;
            list.innerHTML = "";

            // Fetch units for the selected item
            try {
              const unitRes = await fetch(`${BASE_URL}/api/entries/ingredients/${item.id}/information`, {
                headers: { "Authorization": `Bearer ${token}` }
              });

              const unitData = await unitRes.json();
              if (!unitRes.ok || !unitData.possibleUnits) throw new Error("No units");

              unitSelect.innerHTML = '<option disabled selected>Select unit</option>';
              unitData.possibleUnits.forEach(unit => {
                const opt = document.createElement("option");
                opt.value = unit;
                opt.textContent = unit;
                unitSelect.appendChild(opt);
              });
            } catch (err) {
              console.error("Failed to load units:", err);
              unitSelect.innerHTML = '<option value="" disabled selected>No units</option>';
            }
          });
          list.appendChild(li);
        });
      } catch (err) {
        console.error("Autocomplete error:", err);
      }
    });
  }

  async function populateWorkoutOptions() {
    const select = document.getElementById("workout");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/api/entries/workouts`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      const workouts = await response.json();
      if (!response.ok) throw new Error("Error fetching workouts");

      workouts.forEach(w => {
        const option = document.createElement("option");
        option.value = w.value;
        option.textContent = w.label;
        select.appendChild(option);
      });
    } catch (err) {
      console.error("❌ Failed to load workout options:", err);
      const errorOption = document.createElement("option");
      errorOption.value = "";
      errorOption.textContent = "Error loading workouts";
      errorOption.disabled = true;
      select.appendChild(errorOption);
    }
  }

  addMealBtn.addEventListener("click", () => {
    createMealInput();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors();
    caloriesDisplay.textContent = "";

    const mealWrappers = document.querySelectorAll(".meal-wrapper");
    const workoutSelect = document.getElementById("workout");
    const dateInput = document.getElementById("date");
    const timeInput = document.getElementById("time");

    const date = dateInput.value;
    const time = timeInput.value;
    const workout = workoutSelect.value.trim();

    let hasError = false;

    const meals = [...mealWrappers].map(wrapper => {
      return {
        name: wrapper.querySelector(".meal-input")?.value.trim(),
        amount: parseFloat(wrapper.querySelector(".amount-input")?.value),
        unit: wrapper.querySelector(".unit-select")?.value
      };
    });

    if (meals.length === 0 || meals.some(m => !m.name || !m.amount || !m.unit)) {
      mealError.textContent = "❌ Please complete all meal fields (name, amount, unit).";
      hasError = true;
    }

    if (!workout) {
      workoutError.textContent = "❌ Please select a workout.";
      workoutSelect.classList.add("is-invalid");
      hasError = true;
    } else {
      workoutSelect.classList.remove("is-invalid");
    }

    if (!date) {
      dateError.textContent = "❌ Date is required.";
      dateInput.classList.add("is-invalid");
      hasError = true;
    } else {
      const today = new Date().toISOString().split("T")[0];
      if (date !== today) {
        dateError.textContent = "❌ Date must be today.";
        dateInput.classList.add("is-invalid");
        hasError = true;
      } else {
        dateInput.classList.remove("is-invalid");
      }
    }

    if (!time) {
      timeError.textContent = "❌ Time is required.";
      timeInput.classList.add("is-invalid");
      hasError = true;
    } else {
      timeInput.classList.remove("is-invalid");
    }

    if (hasError) return;

    try {
      const entryData = { meals, workout, date, time };
      const token = localStorage.getItem("token");

      const response = await fetch(`${BASE_URL}/api/entries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(entryData)
      });

      const result = await response.json();

      if (response.ok) {
        showFeedback("✅ Entry saved successfully!", "success");
        form.reset();
        mealGroup.innerHTML = "";
        createMealInput();
        caloriesDisplay.textContent = "";
      } else {
        showFeedback(`❌ Failed to save entry: ${result.error || 'Unknown error'}`, "error");
      }
    } catch (err) {
      console.error(err);
      showFeedback("❌ Error submitting the form. Please try again.", "error");
    }
  });

  createMealInput();
  populateWorkoutOptions();
});
