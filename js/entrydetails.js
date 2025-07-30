import { BASE_URL } from "./config.js";

document.addEventListener("DOMContentLoaded", async () => {
  const ctx = document.getElementById("caloriesChart").getContext("2d");
  const noDataMsg = document.getElementById("noDataMessage");
  const totalDisplay = document.getElementById("totalCalories");

  function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    return JSON.parse(jsonPayload);
  }
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      noDataMsg.textContent = "You must be logged in to see the chart.";
      return;
    }

    const userData = parseJwt(token);
    const traineeId = userData.id;

    const res = await fetch(`${BASE_URL}/api/entries?traineeId=${traineeId}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const allEntries = await res.json();
    const today = new Date().toISOString().split("T")[0];
    const todayEntries = allEntries.filter(e => e.date === today);

    if (todayEntries.length === 0) {
      noDataMsg.textContent = "No meal data available for today.";
      return;
    }

    const caloriesByMeal = {};
    todayEntries.forEach(entry => {
      if (entry.meals && Array.isArray(entry.meals)) {
        entry.meals.forEach(meal => {
          const name = meal.name || "Unknown";
          const cal = Number(meal.calories || 0);
          caloriesByMeal[name] = (caloriesByMeal[name] || 0) + cal;
        });
      }
    });

    const labels = Object.keys(caloriesByMeal);
    const data = Object.values(caloriesByMeal);
    const totalCalories = data.reduce((sum, val) => sum + val, 0);
    totalDisplay.textContent = `Total Calories: ${totalCalories.toFixed(2)} cal`;

    new Chart(ctx, {
      type: "pie",
      data: {
        labels,
        datasets: [{
          label: "Calories",
          data,
          backgroundColor: [
            "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0",
            "#9966FF", "#FF9F40", "#E7E9ED", "#76B041",
            "#A9DEF9", "#F6BD60", "#84A59D", "#F28482"
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: {
                size: 14
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.label}: ${context.parsed.toFixed(2)} cal`;
              }
            }
          }
        }
      }
    });

  } catch (err) {
    console.error("Error fetching or displaying data:", err);
    noDataMsg.textContent = "Error loading data.";
  }
});
