import { BASE_URL } from "./config.js";

document.addEventListener("DOMContentLoaded", async () => {
  const feedbackList = document.getElementById("feedbackList");
  feedbackList.innerHTML = "Loading feedback...";

  // מודל לאישור הסרה
  const confirmModal = document.getElementById("confirmRemoveModal");
  let confirmRemoveBtn = document.getElementById("confirmRemoveBtn");
  const modalInstance = new bootstrap.Modal(confirmModal);

  let cardToRemove = null;

  function parseJwt(token) {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
  }

  const token = localStorage.getItem("token");
  if (!token) {
    feedbackList.innerHTML = "<p>No token found, please login first.</p>";
    return;
  }

  const decoded = parseJwt(token);
  const traineeId = decoded?.id;
  if (!traineeId) {
    feedbackList.innerHTML = "<p>Invalid token: trainee ID missing.</p>";
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/api/coach/feedback/by-trainee?traineeId=${traineeId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error("Failed to load feedback");
    const feedbacks = await res.json();

    if (feedbacks.length === 0) {
      feedbackList.innerHTML = "<p>No feedback found for this trainee.</p>";
      return;
    }

    feedbackList.innerHTML = "";

    feedbacks.forEach(fb => {
      const card = document.createElement("article");
      card.className = "feedback-card";
      card.setAttribute("data-id", fb._id);

      const dateStr = new Date(fb.datetime).toLocaleDateString();

      card.innerHTML = `
        <h3>Feedback from ${dateStr}</h3>
        <p><strong>Nutrition:</strong> ${fb.tips.nutrition || "No feedback"}</p>
        <p><strong>Exercise:</strong> ${fb.tips.exercise || "No feedback"}</p>
        <p><strong>General:</strong> ${fb.tips.general || "No feedback"}</p>
        ${
          fb.readByTrainee
            ? '<p class="text-success"><strong>✅ Marked as read</strong></p>'
            : `<button class="btn btn-sm mark-read-btn mt-2" data-id="${fb._id}">✔ Mark as Read</button>`
        }
      `;

      feedbackList.appendChild(card);
    });

    // מאזין לכל כפתורי סימון קריאה
    document.querySelectorAll(".mark-read-btn").forEach(button => {
      button.addEventListener("click", async () => {
        const feedbackId = button.getAttribute("data-id");

        if (!feedbackId || feedbackId.length !== 24) {
          console.error("❌ Invalid Feedback ID:", feedbackId);
          alert("Invalid feedback ID, cannot mark as read.");
          return;
        }

        const url = `${BASE_URL}/api/coach/feedback/${feedbackId}/mark-read`;
        console.log("📡 Sending PATCH to:", url);

        try {
          const markRes = await fetch(url, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          const resultText = await markRes.text();
          console.log("📥 Server response:", markRes.status, resultText);

          if (!markRes.ok) {
            throw new Error(resultText || "Failed to mark feedback as read");
          }

          // סימון כנקרא ב־DOM
          const card = document.querySelector(`[data-id="${feedbackId}"]`);
          if (card) {
            const markBtn = card.querySelector(".mark-read-btn");
            if (markBtn) {
              markBtn.remove();
              const readText = document.createElement("p");
              readText.className = "text-success fw-bold";
              readText.innerHTML = "✅ Marked as read";
              card.appendChild(readText);
            }

            // הצעה למחיקה מהתצוגה בלבד
            cardToRemove = card;
            modalInstance.show();

            // מסיר מאזין קודם ומוסיף חדש
            const oldBtn = confirmRemoveBtn;
            const newBtn = oldBtn.cloneNode(true);
            oldBtn.replaceWith(newBtn);
            confirmRemoveBtn = newBtn;

            confirmRemoveBtn.onclick = () => {
              if (!cardToRemove) return;

              console.log("🧹 Removing card:", cardToRemove);

              cardToRemove.classList.add("fade-out");
              setTimeout(() => {
                cardToRemove.remove();
                modalInstance.hide();
              }, 400);

              const msg = document.createElement("div");
              msg.className = "alert alert-success mt-3";
              msg.innerText = "✅ Feedback marked as read and removed from your view.";
              feedbackList.prepend(msg);
              setTimeout(() => msg.remove(), 4000);
            };
          }

        } catch (err) {
          console.error("❌ Failed to mark feedback as read:", err);
          alert("❌ Failed to mark feedback as read");
        }
      });
    });

  } catch (err) {
    console.error("❌ Error loading feedback list:", err);
    feedbackList.innerHTML = "<p>Error loading feedback.</p>";
  }
});
