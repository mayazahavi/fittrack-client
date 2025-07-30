import { BASE_URL } from "./config.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");

  const roleSelect = document.getElementById("role");
  const coachCodeContainer = document.getElementById("coach-code-container");
  const coachCodeInput = document.getElementById("coachCode");

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");

  const roleError = document.getElementById("role-error");
  const usernameError = document.getElementById("username-error");
  const passwordError = document.getElementById("password-error");
  const confirmPasswordError = document.getElementById("confirm-password-error");
  const coachCodeError = document.getElementById("coachcode-error");

  const registerMessage = document.getElementById("register-message");

  function showMessage(text, isSuccess = true) {
    registerMessage.textContent = text;
    registerMessage.className = "feedback-msg " + (isSuccess ? "feedback-success" : "feedback-error");
    registerMessage.style.display = "block";
    setTimeout(() => {
      registerMessage.style.display = "none";
    }, 4000);
  }

  // 🟢 טען תפקידים מהשרת
  fetch(`${BASE_URL}/api/users/roles`)
    .then(res => {
      if (!res.ok) throw new Error("Failed to fetch roles");
      return res.json();
    })
    .then(roles => {
      roleSelect.innerHTML = `<option value="" disabled selected>Select Role</option>`;
      roles.forEach(role => {
        const opt = document.createElement("option");
        opt.value = role;
        opt.textContent = role.charAt(0).toUpperCase() + role.slice(1);
        roleSelect.appendChild(opt);
      });
    })
    .catch(err => {
      console.error("Error loading roles:", err);
      roleError.textContent = "Unable to load roles. Please refresh.";
      roleError.style.display = "block";
    });

  roleSelect.addEventListener("change", () => {
    coachCodeContainer.style.display = roleSelect.value === "coach" ? "block" : "none";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // איפוס הודעות
    [
      roleError,
      usernameError,
      passwordError,
      confirmPasswordError,
      coachCodeError
    ].forEach(el => {
      el.textContent = "";
      el.style.display = "none";
    });

    registerMessage.style.display = "none";

    const role = roleSelect.value.trim();
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();
    const coachCode = coachCodeInput?.value.trim();

    let hasError = false;

    if (!role) {
      roleError.textContent = "Please select a role.";
      roleError.style.display = "block";
      hasError = true;
    }

    if (!username) {
      usernameError.textContent = "Username is required.";
      usernameError.style.display = "block";
      hasError = true;
    }

    if (!password) {
      passwordError.textContent = "Password is required.";
      passwordError.style.display = "block";
      hasError = true;
    } else if (password.length < 6) {
      passwordError.textContent = "Password must be at least 6 characters.";
      passwordError.style.display = "block";
      hasError = true;
    }

    if (!confirmPassword) {
      confirmPasswordError.textContent = "Please confirm your password.";
      confirmPasswordError.style.display = "block";
      hasError = true;
    } else if (password !== confirmPassword) {
      confirmPasswordError.textContent = "Passwords do not match.";
      confirmPasswordError.style.display = "block";
      hasError = true;
    }

    if (role === "coach" && coachCode !== "123") {
      coachCodeError.textContent = "Invalid coach code.";
      coachCodeError.style.display = "block";
      hasError = true;
    }

    if (hasError) return;

    try {
      const res = await fetch(`${BASE_URL}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role, secretCode: coachCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error && data.error.toLowerCase().includes("username")) {
          usernameError.textContent = "Username already exists for this role. Please choose another.";
          usernameError.style.display = "block";
        } else {
          showMessage("Registration failed: " + (data.error || "Unknown error"), false);
        }
        return;
      }

      showMessage("Registration successful! Redirecting...", true);
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    } catch (err) {
      console.error("Register error:", err);
      showMessage("Registration failed: " + err.message, false);
    }
  });
});
