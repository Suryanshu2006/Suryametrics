document.addEventListener("DOMContentLoaded", async () => {
  const userId = "user123"; // Retrieve dynamically if auth is implemented
  
  chrome.runtime.sendMessage({ action: "flushActivity" }, async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/activity/weekly-report?userId=${userId}`);
    const data = await res.json();
    
    renderSummary(data);
    renderCharts(data);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      document.querySelector(".container").innerHTML += `<p style="color:red; text-align:center;">Failed to connect to backend server. Ensure the Node API is running.</p>`;
    }
  });
});

function renderSummary(data) {
  const totalSec = data.summary.productive + data.summary.unproductive + data.summary.neutral;
  const prodSec = data.summary.productive;
  
  // Format Time
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  document.getElementById("totalTime").innerText = `${h}h ${m}m`;
  
  // Calculate Score
  const score = totalSec > 0 ? ((prodSec / totalSec) * 100).toFixed(1) : 0;
  document.getElementById("prodScore").innerText = `${score}%`;
}

function renderCharts(data) {
  // Configure Chart.js for Dark Mode
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
  
  const s = data.summary;
  
  // Pie Chart: Productive vs Unproductive vs Neutral
  const pieCtx = document.getElementById('pieChart').getContext('2d');
  new Chart(pieCtx, {
    type: 'pie',
    data: {
      labels: ['Productive', 'Unproductive', 'Neutral'],
      datasets: [{
        data: [s.productive, s.unproductive, s.neutral],
        backgroundColor: ['#28a745', '#dc3545', '#ffc107']
      }]
    },
    options: { plugins: { title: { display: true, text: 'Time Distribution' } } }
  });

  // Bar Chart: Top Sites
  const barCtx = document.getElementById('barChart').getContext('2d');
  const domains = data.domainStats.slice(0, 10); // Top 10 sites
  const labels = domains.map(d => d._id);
  const chartData = domains.map(d => (d.totalTime / 3600).toFixed(2)); // in hours

  new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Hours Spent',
        data: chartData,
        backgroundColor: '#007bff'
      }]
    },
    options: { 
      plugins: { title: { display: true, text: 'Top Sites Visited (Hours)' } },
      scales: { y: { beginAtZero: true } }
    }
  });
}
