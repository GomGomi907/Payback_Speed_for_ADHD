// background.js
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-speed') {
    chrome.storage.sync.get(['enabled'], (result) => {
      // Default to true if undefined
      const currentState = result.enabled !== false;
      const newState = !currentState;
      
      chrome.storage.sync.set({ enabled: newState }, () => {
        console.log(`Speed Controller: ${newState ? 'ON' : 'OFF'}`);
      });
    });
  }
});

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['maxSpeed', 'enabled'], (result) => {
    if (result.maxSpeed === undefined) chrome.storage.sync.set({ maxSpeed: 2.0 });
    if (result.enabled === undefined) chrome.storage.sync.set({ enabled: true });
  });
});
