document.addEventListener("DOMContentLoaded", () => {
  loadLists();

  document.getElementById("addProdBtn").addEventListener("click", () => addDomain("productiveDomains", "prodInput"));
  document.getElementById("addUnprodBtn").addEventListener("click", () => addDomain("unproductiveDomains", "unprodInput"));
});

function loadLists() {
  chrome.storage.local.get(["productiveDomains", "unproductiveDomains"], (res) => {
    renderList("prodList", res.productiveDomains || [], "productiveDomains");
    renderList("unprodList", res.unproductiveDomains || [], "unproductiveDomains");
  });
}

function renderList(elementId, domains, storageKey) {
  const ul = document.getElementById(elementId);
  ul.innerHTML = "";
  domains.forEach(domain => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${domain}</span> <button class="remove" data-domain="${domain}">Remove</button>`;
    ul.appendChild(li);
  });

  // Attach remove listeners
  ul.querySelectorAll(".remove").forEach(btn => {
    btn.addEventListener("click", (e) => {
      removeDomain(storageKey, e.target.dataset.domain);
    });
  });
}

function addDomain(storageKey, inputId) {
  const input = document.getElementById(inputId);
  const domain = input.value.trim().toLowerCase();
  if (!domain) return;

  chrome.storage.local.get([storageKey], (res) => {
    const domains = res[storageKey] || [];
    if (!domains.includes(domain)) {
      domains.push(domain);
      chrome.storage.local.set({ [storageKey]: domains }, () => {
        input.value = "";
        loadLists();
      });
    }
  });
}

function removeDomain(storageKey, domainToRemove) {
  chrome.storage.local.get([storageKey], (res) => {
    const domains = (res[storageKey] || []).filter(d => d !== domainToRemove);
    chrome.storage.local.set({ [storageKey]: domains }, () => {
      loadLists();
    });
  });
}
