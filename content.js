// content.js
// 1. Inject the Main World script
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function () {
    this.remove();
};
(document.head || document.documentElement).appendChild(script);

// State
let isEnabled = true;
let maxSpeed = 2.0;
let isMusic = false;
let checkInterval = null;
let musicCheckAttempts = 0;

// Visual Indicator removed as per request
// Listen for status updates FROM inject.js (for debug or future use)
window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data.type === 'YT_SPEED_STATUS_REPORT') {
        // UI removed.
    }
});

// Communication with Injected Script
function postSettings() {
    window.postMessage({
        type: 'YT_SPEED_UPDATE_SETTINGS',
        maxSpeed: maxSpeed,
        enabled: isEnabled
    }, '*');

    // Update Visual Indicator based on local state assumption? 
    // No, content.js doesn't know if it's music anymore accurately.
    // Ideally inject.js should tell content.js 'I detected music'.
    // For now, let's keep the indicator simple: just show "Enabled" or rely on inject.js logs?
    // User liked the indicator. Let's make inject.js send a message BACK to content.js to update the indicator.
}

// Logic
function init() {
    chrome.storage.sync.get(['enabled', 'maxSpeed'], (res) => {
        isEnabled = res.enabled !== false;
        maxSpeed = res.maxSpeed || 2.0;
        postSettings();
    });

    chrome.storage.onChanged.addListener((changes) => {
        if (changes.enabled) isEnabled = changes.enabled.newValue;
        if (changes.maxSpeed) maxSpeed = changes.maxSpeed.newValue;
        postSettings();
    });

    // Re-post settings on nav just in case inject.js reloaded (unlikely in SPA but safe)
    document.addEventListener('yt-navigate-finish', () => {
        postSettings();
    });
}

init();
