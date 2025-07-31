import { BASE_URL } from "./config.js";
document.addEventListener("DOMContentLoaded", () => {
  const profileForm = document.getElementById("profileForm");
  const usernameInput = document.getElementById("username");
  const ageInput = document.getElementById("age");
  const genderSelect = document.getElementById("gender");
  const heightInput = document.getElementById("height");
  const weightInput = document.getElementById("weight");
  const statusMessage = document.getElementById("profile-status-message");
  const savedUsername = localStorage.getItem("username");
  const token = localStorage.getItem("token");
  fetch(`${BASE_URL}/api/trainee/profile/genders`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch genders");
      return res.json();
    })
    .then((genders) => {
      genderSelect.innerHTML = `<option value="">Select</option>`;
      genders.forEach((g) => {
        const option = document.createElement("option");
        option.value = g;
        option.textContent = g.charAt(0).toUpperCase() + g.slice(1);
        genderSelect.appendChild(option);
      });
    })
    .catch((err) => {
      console.error("Error loading gender list:", err);
    });
  if (savedUsername && usernameInput) {
    usernameInput.value = savedUsername;
    usernameInput.readOnly = true;
  }
  if (token && savedUsername) {
    fetch(`${BASE_URL}/api/trainee/profile/${savedUsername}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch profile");
        return res.json();
      })
      .then((data) => {
        const trainee = data.trainee;
        if (!trainee) return;
        if (trainee.age) ageInput.value = trainee.age;
        if (trainee.gender) genderSelect.value = trainee.gender;
        if (trainee.height) heightInput.value = trainee.height;
        const lastWeightEntry = trainee.weightHistory?.at(-1);
        if (lastWeightEntry) weightInput.value = lastWeightEntry.weight;
      })
      .catch((err) => {
        console.error("Error loading profile:", err);
      });
  }
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearValidation();
    const data = {
      username: savedUsername,
      age: ageInput.value.trim(),
      gender: genderSelect.value,
      height: heightInput.value.trim(),
      weight: weightInput.value.trim(),
    };
    let valid = true;
    if (!data.age) {
      markInvalid(ageInput);
      valid = false;
    }
    if (!data.gender) {
      markInvalid(genderSelect);
      valid = false;
    }
    if (!data.height) {
      markInvalid(heightInput);
      valid = false;
    }
    if (!data.weight) {
      markInvalid(weightInput);
      valid = false;
    }
    if (!valid) {
      showMessage("Please fill out all required fields.", "error");
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/api/trainee/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Profile update failed");
      showMessage("Profile saved successfully!", "success");
    } catch (err) {
      showMessage("Error saving profile: " + err.message, "error");
    }
  });
  function showMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = "";
    statusMessage.classList.add(type === "success" ? "success" : "error");
    statusMessage.id = "profile-status-message";
    statusMessage.style.display = "block";
    setTimeout(() => {
      statusMessage.style.display = "none";
    }, 5000);
  }
  function markInvalid(input) {
    input.classList.add("is-invalid");
    const error = document.createElement("div");
    error.className = "invalid-feedback";
    error.textContent = "This field is required";
    if (!input.parentElement.querySelector(".invalid-feedback")) {
      input.parentElement.appendChild(error);
    }
  }
  function clearValidation() {
    const invalids = profileForm.querySelectorAll(".is-invalid");
    invalids.forEach((el) => el.classList.remove("is-invalid"));
    const feedbacks = profileForm.querySelectorAll(".invalid-feedback");
    feedbacks.forEach((el) => el.remove());
  }
});
