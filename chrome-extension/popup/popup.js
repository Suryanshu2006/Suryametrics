document.addEventListener("DOMContentLoaded", () => {
  const statsContainer = document.getElementById("statsContainer");
  
  chrome.runtime.sendMessage({ action: "flushActivity" }, () => {
    chrome.storage.local.get(["activityLog", "productiveDomains", "unproductiveDomains"], (res) => {
    const today = new Date().toISOString().split('T')[0];
    const log = (res.activityLog && res.activityLog[today]) ? res.activityLog[today] : {};
    
    let prodTime = 0;
    let unprodTime = 0;
    let otherTime = 0;

    for (const [domain, timeSec] of Object.entries(log)) {
      if (res.productiveDomains?.includes(domain)) prodTime += timeSec;
      else if (res.unproductiveDomains?.includes(domain)) unprodTime += timeSec;
      else otherTime += timeSec;
    }

    statsContainer.innerHTML = `
      <div class="stat-row">
        <span>Productive:</span>
        <span class="productive">${formatTime(prodTime)}</span>
      </div>
      <div class="stat-row">
        <span>Unproductive:</span>
        <span class="unproductive">${formatTime(unprodTime)}</span>
      </div>
      <div class="stat-row">
        <span>Neutral:</span>
        <span>${formatTime(otherTime)}</span>
      </div>
    `;
    });
  });

  document.getElementById("dashboardBtn").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html") });
  });

  document.getElementById("optionsBtn").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
});

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}
