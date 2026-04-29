// ==UserScript==
// @name         Universal Subtitles
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Generate real-time subtitles for any HTML5 video using a local Python backend.
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    const WS_URL = 'ws://localhost:8765';
    const CHUNK_DURATION_MS = 2000; // Send audio chunks every 2 seconds

    let ws = null;
    let isConnected = false;
    let activeVideo = null;
    let mediaRecorder = null;
    let subtitleContainer = null;
    let clearSubtitleTimeout = null;
    let chunkInterval = null;

    console.log('[Universal Subtitles] Script injected into page:', window.location.href);

    // Connect to local WebSocket server
    function connectWebSocket() {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            console.log('[Universal Subtitles] Connected to local server.');
            isConnected = true;
            ws.send(JSON.stringify({debug: `Connected from URL: ${window.location.href}`}));
            // Once connected, check if a video is already playing
            checkAlreadyPlaying();
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.text) {
                    displaySubtitle(data.text);
                }
            } catch (e) {
                console.error('[Universal Subtitles] Error parsing message:', e);
            }
        };

        ws.onclose = () => {
            console.log('[Universal Subtitles] Disconnected from local server. Retrying in 5s...');
            isConnected = false;
            setTimeout(connectWebSocket, 5000);
        };

        ws.onerror = (err) => {
            console.error('[Universal Subtitles] WebSocket error:', err);
        };
    }

    // Initialize UI container for subtitles
    function createSubtitleContainer(videoElement) {
        if (subtitleContainer) {
            subtitleContainer.remove();
        }

        subtitleContainer = document.createElement('div');
        subtitleContainer.style.position = 'absolute';
        subtitleContainer.style.bottom = '10%';
        subtitleContainer.style.left = '50%';
        subtitleContainer.style.transform = 'translateX(-50%)';
        subtitleContainer.style.color = 'white';
        subtitleContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        subtitleContainer.style.padding = '10px 20px';
        subtitleContainer.style.borderRadius = '5px';
        subtitleContainer.style.fontFamily = 'Arial, sans-serif';
        subtitleContainer.style.fontSize = '24px';
        subtitleContainer.style.fontWeight = 'bold';
        subtitleContainer.style.textAlign = 'center';
        subtitleContainer.style.pointerEvents = 'none'; // Click through the subtitles
        subtitleContainer.style.zIndex = '2147483647'; // Max z-index
        subtitleContainer.style.transition = 'opacity 0.3s';
        subtitleContainer.style.opacity = '0';
        subtitleContainer.style.maxWidth = '80%';
        subtitleContainer.style.textShadow = '2px 2px 2px #000';

        // Append to the body by default for universal visibility above other elements
        document.body.appendChild(subtitleContainer);
        subtitleContainer.style.position = 'fixed';
        console.log('[Universal Subtitles] Subtitle UI attached to body.');
    }

    // Global listener for fullscreen changes to move the subtitle container inside the fullscreen element
    // so it doesn't get hidden behind the video when in fullscreen mode.
    document.addEventListener('fullscreenchange', () => {
        if (!subtitleContainer) return;
        const fsElement = document.fullscreenElement;
        if (fsElement) {
            fsElement.appendChild(subtitleContainer);
            subtitleContainer.style.position = 'absolute'; // Relative to the fullscreen element
        } else {
            document.body.appendChild(subtitleContainer);
            subtitleContainer.style.position = 'fixed'; // Relative to the viewport
        }
    });

    // Display subtitle text and fade out after a delay
    function displaySubtitle(text) {
        if (!subtitleContainer) return;

        subtitleContainer.textContent = text;
        subtitleContainer.style.opacity = '1';

        if (clearSubtitleTimeout) {
            clearTimeout(clearSubtitleTimeout);
        }

        clearSubtitleTimeout = setTimeout(() => {
            if (subtitleContainer) {
                subtitleContainer.style.opacity = '0';
            }
        }, 3000);
    }

    let audioCtx = null;
    let mediaSource = null;
    let mediaDestination = null;

    // Start capturing audio from the video
    function startAudioCapture(videoElement) {
        if (!isConnected) {
            console.log('[Universal Subtitles] Waiting for server connection before capturing audio...');
            return;
        }
        if (mediaRecorder) return;

        console.log('[Universal Subtitles] Starting audio capture...');

        try {
            let stream;
            
            // Use AudioContext for reliable audio extraction (works on YouTube)
            if (!audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                audioCtx = new AudioContext();
            }
            
            if (!mediaSource) {
                try {
                    mediaSource = audioCtx.createMediaElementSource(videoElement);
                    mediaDestination = audioCtx.createMediaStreamDestination();
                    mediaSource.connect(mediaDestination);
                    mediaSource.connect(audioCtx.destination); // Route back to speakers
                } catch (err) {
                    // Ignore InvalidStateError if already connected
                    console.warn('[Universal Subtitles] MediaElementSource issue:', err);
                }
            }
            
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            stream = mediaDestination.stream;
            
            if (!stream || stream.getAudioTracks().length === 0) {
                // Fallback to captureStream if AudioContext failed somehow
                const captureStream = videoElement.captureStream || videoElement.mozCaptureStream;
                if (captureStream) {
                    stream = captureStream.call(videoElement);
                }
            }

            if (!stream || stream.getAudioTracks().length === 0) {
                const msg = 'No audio tracks found. Video might not be ready or is restricted.';
                console.warn('[Universal Subtitles]', msg);
                if (isConnected) ws.send(JSON.stringify({debug: msg}));
                // Retry after a short delay as YouTube buffers asynchronously
                setTimeout(() => { if (activeVideo === videoElement) startAudioCapture(videoElement); }, 2000);
                return;
            }

            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

            mediaRecorder.ondataavailable = (event) => {
                if (isConnected) {
                    ws.send(JSON.stringify({debug: `dataavailable fired, size: ${event.data.size}`}));
                }
                if (event.data.size > 0 && isConnected) {
                    ws.send(event.data);
                }
            };

            mediaRecorder.onerror = (event) => {
                if (isConnected) {
                    ws.send(JSON.stringify({debug: `mediaRecorder error: ${event.error}`}));
                }
                console.error('[Universal Subtitles] MediaRecorder error:', event.error);
            };

            mediaRecorder.start();
            console.log('[Universal Subtitles] Audio is now being sent to the server!');
            if (isConnected) {
                 ws.send(JSON.stringify({debug: "Audio capture started"}));
            }

            chunkInterval = setInterval(() => {
                try {
                    if (mediaRecorder && mediaRecorder.state === 'recording') {
                        mediaRecorder.stop();
                        mediaRecorder.start();
                    }
                } catch (e) {
                    if (isConnected) {
                        ws.send(JSON.stringify({debug: `chunkInterval error: ${e.message}`}));
                    }
                    console.error('[Universal Subtitles] chunkInterval error:', e);
                }
            }, CHUNK_DURATION_MS);

        } catch (e) {
            console.error('[Universal Subtitles] Failed to capture audio:', e);
            if (isConnected) ws.send(JSON.stringify({debug: `Failed to capture audio: ${e.message}`}));
        }
    }

    function stopAudioCapture() {
        if (mediaRecorder) {
            mediaRecorder.stop();
            mediaRecorder = null;
            if (chunkInterval) {
                clearInterval(chunkInterval);
                chunkInterval = null;
            }
            console.log('[Universal Subtitles] Stopped audio capture.');
        }
    }

    function handleVideoStart(videoElement) {
        // If it's the same video and we are already recording, do nothing.
        if (activeVideo === videoElement && mediaRecorder) return;
        
        const msg = '[Universal Subtitles] Intercepting video playback.';
        console.log(msg);
        if (isConnected) ws.send(JSON.stringify({debug: msg}));
        
        activeVideo = videoElement;
        createSubtitleContainer(activeVideo);
        startAudioCapture(activeVideo);
    }

    // Monitor for video elements playing
    function setupVideoListener() {
        document.addEventListener('play', (event) => {
            const target = event.target;
            if (target && target.tagName === 'VIDEO') {
                handleVideoStart(target);
            }
        }, true);

        document.addEventListener('pause', (event) => {
            const target = event.target;
            if (target && target.tagName === 'VIDEO' && target === activeVideo) {
                console.log('[Universal Subtitles] Video paused.');
                stopAudioCapture();
            }
        }, true);
    }

    // Check if a video is already playing right now (e.g. autoplay)
    function checkAlreadyPlaying() {
        const videos = document.querySelectorAll('video');
        for (let i = 0; i < videos.length; i++) {
            if (!videos[i].paused && !videos[i].ended) {
                console.log('[Universal Subtitles] Found an already playing video on load.');
                handleVideoStart(videos[i]);
                break;
            }
        }
    }

    // Initialize
    setupVideoListener();
    connectWebSocket();
    
    // Fallback check periodically just in case video dynamically loads late
    setInterval(checkAlreadyPlaying, 3000);

})();
