// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const maxSpeedInput = document.getElementById('maxSpeed');
    const toggleBtn = document.getElementById('toggleBtn');
    const statusText = document.getElementById('statusText');

    // Load settings
    chrome.storage.sync.get(['maxSpeed', 'enabled'], (result) => {
        maxSpeedInput.value = result.maxSpeed || 2.0;
        updateStatus(result.enabled !== false); // Default true
    });

    // Save Max Speed - Use 'input' for better responsiveness or just 'change'
    // Using 'change' is standard, but let's ensure it triggers correctly.
    maxSpeedInput.addEventListener('change', saveSpeed);
    maxSpeedInput.addEventListener('input', saveSpeed);

    function saveSpeed() {
        let speed = parseFloat(maxSpeedInput.value);
        // Boundary checks
        if (isNaN(speed)) return;
        if (speed < 0.25) speed = 0.25;
        if (speed > 16.0) speed = 16.0;

        // Debounce saving to storage to allow typing
        // (Actually simpler: just save. Chrome storage quota handles small frequency well enough for manual input)
        chrome.storage.sync.set({ maxSpeed: speed });
    }

    // Toggle Enable/Disable
    toggleBtn.addEventListener('click', () => {
        chrome.storage.sync.get(['enabled'], (result) => {
            const currentState = result.enabled !== false;
            const newState = !currentState;
            chrome.storage.sync.set({ enabled: newState });
            updateStatus(newState);
        });
    });

    function updateStatus(enabled) {
        statusText.textContent = enabled ? '켜짐' : '꺼짐';
        statusText.className = 'status ' + (enabled ? 'on' : 'off');

        toggleBtn.textContent = enabled ? '끄기' : '켜기';
        toggleBtn.className = enabled ? 'btn-on' : 'btn-off';
    }

    // Listen for external updates (e.g. Shortcut toggle)
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.enabled) {
            updateStatus(changes.enabled.newValue);
        }
        if (changes.maxSpeed) {
            maxSpeedInput.value = changes.maxSpeed.newValue;
        }
    });
});
