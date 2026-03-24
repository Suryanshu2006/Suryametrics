// Default classifications
const defaultProductive = ["github.com", "stackoverflow.com", "developer.mozilla.org", "leetcode.com"];
const defaultUnproductive = ["facebook.com", "twitter.com", "instagram.com", "youtube.com", "reddit.com"];

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["productiveDomains", "unproductiveDomains", "activityLog"], (res) => {
    if (!res.productiveDomains) chrome.storage.local.set({ productiveDomains: defaultProductive });
    if (!res.unproductiveDomains) chrome.storage.local.set({ unproductiveDomains: defaultUnproductive });
    if (!res.activityLog) chrome.storage.local.set({ activityLog: {} });
    chrome.storage.local.set({ activeDomain: null, startTime: null, activeTabId: null });
  });
});

chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, tab => {
    handleTabChange(tab);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.url) {
    handleTabChange(tab);
  }
});

// Set idle detection interval to 5 minutes so it doesn't artificially pause too often during testing
chrome.idle.setDetectionInterval(300);

chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === "idle" || state === "locked") {
    await logActivity();
    await chrome.storage.local.set({ activeDomain: null, startTime: null });
  } else if (state === "active") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) handleTabChange(tabs[0]);
    });
  }
});

async function handleTabChange(tab) {
  if (!tab) return;
  
  let newDomain = null;
  try {
    if (tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("edge://")) {
      newDomain = new URL(tab.url).hostname.replace('www.', '');
    }
  } catch(e) {}

  const state = await chrome.storage.local.get(["activeDomain"]);
  if (state.activeDomain !== newDomain) {
    await logActivity();
    await chrome.storage.local.set({
      activeDomain: newDomain,
      startTime: newDomain ? Date.now() : null,
      activeTabId: tab.id
    });
  }
}

async function logActivity() {
  const state = await chrome.storage.local.get(["activeDomain", "startTime"]);
  const activeDomain = state.activeDomain;
  const startTime = state.startTime;
  
  if (!activeDomain || !startTime) return;
  
  const now = Date.now();
  const timeSpentMs = now - startTime;
  const timeSpentSec = Math.floor(timeSpentMs / 1000);
  
  if (timeSpentSec > 0) {
    // Preserve fractional seconds for the next flush precisely!
    await chrome.storage.local.set({ startTime: now - (timeSpentMs % 1000) });
    
    // Update logs
    const res = await chrome.storage.local.get(["activityLog"]);
    let log = res.activityLog || {};
    const today = new Date().toISOString().split('T')[0];
    
    if (!log[today]) log[today] = {};
    if (!log[today][activeDomain]) log[today][activeDomain] = 0;
    
    log[today][activeDomain] += timeSpentSec;
    await chrome.storage.local.set({ activityLog: log });
    
    syncToBackend(activeDomain, timeSpentSec);
  }
}

async function syncToBackend(domain, durationSeconds) {
  try {
    const userId = "user123";
    const res = await chrome.storage.local.get(["productiveDomains", "unproductiveDomains"]);
    let classification = "neutral";
    if (res.productiveDomains?.includes(domain)) classification = "productive";
    else if (res.unproductiveDomains?.includes(domain)) classification = "unproductive";

    await fetch("http://localhost:5000/api/activity/log-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        domain,
        durationSeconds,
        classification,
        timestamp: new Date().toISOString()
      })
    });
  } catch (err) {
    console.error("Failed to sync activity to backend:", err);
  }
}

chrome.alarms.create("syncPulse", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "syncPulse") {
    logActivity(); 
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "flushActivity") {
    logActivity().then(() => sendResponse({ success: true }));
    return true; // Keep channel open for async response
  }
});
