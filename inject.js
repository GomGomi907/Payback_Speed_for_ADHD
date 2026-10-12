// inject.js
(function () {
    const PLAYER_ID = 'movie_player';
    let configMaxSpeed = 2.0;
    let isExtensionEnabled = true;

    // State
    let currentVideoType = 'video'; // 'video', 'music', 'live'
    let hasAppliedForThisVideo = false;

    // Listen for settings from content.js
    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        if (!event.data.type || event.data.type !== 'YT_SPEED_UPDATE_SETTINGS') return;

        configMaxSpeed = event.data.maxSpeed;
        isExtensionEnabled = event.data.enabled;

        // Apply immediately upon setting change
        if (isExtensionEnabled) {
            checkContentAndApply(true); // Force re-apply logic
        } else {
            // If toggled OFF, immediately revert to 1.0x
            const player = getPlayer();
            if (player && typeof player.setPlaybackRate === 'function') {
                player.setPlaybackRate(1.0);
                console.log('[SpeedController] Extension Disabled -> Reverted to 1.0x');
            }
        }
    });

    function getPlayer() {
        return document.getElementById(PLAYER_ID);
    }

    // 1. Check Content Type (Dynamic)
    function detectContentType() {
        try {
            const player = getPlayer();
            // Critical: Use getPlayerResponse() for the CURRENT video data.
            // window.ytInitialPlayerResponse is stale after navigation.
            const data = player && player.getPlayerResponse ? player.getPlayerResponse() : null;

            if (!data) return 'video'; // Not ready yet

            // A. Live Stream Check
            if (data.videoDetails?.isLive) {
                console.log('[SpeedController] Detected: Live Stream');
                return 'live';
            }

            // B. Native Category Check
            const category = data.microformat?.playerMicroformatRenderer?.category;
            if (category === 'Music') {
                // EXCEPTION: Check for "BGM" / "background music" usage in description.
                // Many YouTubers use background music and credit it in the description,
                // causing YouTube to categorize the video as "Music".
                // We want to skip these unless it's a real music video.
                const description = (data.videoDetails?.shortDescription || '').toLowerCase();
                const bgmKeywords = [
                    'music provided by', '브금대통령',
                    '배경음악', 'bgm',
                    'music by'
                ];

                const isBgmUsage = bgmKeywords.some(k => description.includes(k));

                if (isBgmUsage) {
                    console.log('[SpeedController] Detected: Category is Music, BUT found BGM credits. Treating as VIDEO.');
                    return 'video';
                }

                console.log('[SpeedController] Detected: Native Music Category');
                return 'music';
            }

            // C. Mix / Playlist Signal Check (DOM)
            // We check the SIDEBAR DOM for the "Mix" element because internal data might be complex path.
            // <ytd-compact-radio-renderer> is the component for Mixes in the sidebar.
            if (document.querySelector('ytd-compact-radio-renderer')) {
                console.log('[SpeedController] Detected: Music Mix (Sidebar DOM)');
                return 'music';
            }

            // D. Keyword Fallback (Title)
            const title = data.videoDetails?.title || '';
            const musicKeywords = [
                'Cover',
                'MV', 'M/V', 'Music Video', '뮤직비디오',
                'Official Audio',
                'Lyrics', '가사',
                'Playlist', '플레이리스트',
                'Album', '앨범',
                'Concert', 'Live Performance'
            ];
            if (musicKeywords.some(k => title.toLowerCase().includes(k.toLowerCase()))) {
                console.log(`[SpeedController] Detected: Keyword Match (${title})`);
                return 'music';
            }

        } catch (e) {
            console.error('[SpeedController] Error checking category', e);
        }
        return 'video'; // Default
    }

    // 2. Logic to Apply Speed
    // We allow re-application if the previous State was 'video' (default) but we found 'music'/'live' now.
    // We do NOT re-apply if we already found 'music'/'live' (locked), unless force=true.
    function checkContentAndApply(force = false) {
        // If force is true, we always run and can overwrite anything.
        // If force is false:
        //   If we already detected 'music' or 'live' before, we stop (don't overwrite special with default).
        //   If we only detected 'video' before, we can overwrite it if we found something new (music/live).

        if (!force && currentVideoType !== 'video') {
            return;
        }

        const newType = detectContentType();

        // If nothing changed (Video -> Video), and we already applied once, do nothing
        if (!force && hasAppliedForThisVideo && newType === currentVideoType) {
            return;
        }

        currentVideoType = newType;

        // Reporting status to UI
        reportStatus();

        if (!isExtensionEnabled) return;

        const player = getPlayer();
        if (!player || typeof player.setPlaybackRate !== 'function') return;

        let targetSpeed = configMaxSpeed;
        if (currentVideoType === 'music' || currentVideoType === 'live') {
            targetSpeed = 1.0;
        }

        // Apply Speed
        player.setPlaybackRate(targetSpeed);
        console.log(`[SpeedController] Applied ${targetSpeed}x (Type: ${currentVideoType})`);

        hasAppliedForThisVideo = true;
    }

    function reportStatus() {
        let statusText = '';
        let isSpecial = false;

        if (currentVideoType === 'live') {
            statusText = 'Live Stream';
            isSpecial = true;
        } else if (currentVideoType === 'music') {
            statusText = 'Music';
            isSpecial = true;
        }

        window.postMessage({
            type: 'YT_SPEED_STATUS_REPORT',
            videoType: currentVideoType,
            text: statusText,
            enabled: isExtensionEnabled,
            targetSpeed: isSpecial ? 1.0 : configMaxSpeed
        }, '*');
    }

    // Navigation Handling
    function handleNavigation() {
        hasAppliedForThisVideo = false;
        currentVideoType = 'video'; // Reset to default state

        // Polling to catch late-loading title/metadata
        checkContentAndApply();
        setTimeout(() => checkContentAndApply(), 500);
        setTimeout(() => checkContentAndApply(), 1500);
        setTimeout(() => checkContentAndApply(), 3000);
    }

    window.addEventListener('yt-navigate-finish', handleNavigation);
    window.addEventListener('yt-page-data-updated', handleNavigation); // Extra safety for SPA updates

    // Initial Load
    setTimeout(() => checkContentAndApply(), 500);
    setTimeout(() => checkContentAndApply(), 1500);

    console.log('[SpeedController-Inject] v5 Loaded (Dynamic Player API + DOM)');

})();
