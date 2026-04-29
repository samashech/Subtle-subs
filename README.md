# Universal Subtitles

A cross-platform tool to generate real-time subtitles for any HTML5 video using a local Python backend (faster-whisper).

## Prerequisites

1.  **Python 3.8+**: Ensure you have Python installed on your system.
    *   **Windows:** Download from python.org. Check "Add Python to PATH" during installation.
    *   **Linux:** Usually pre-installed. You may need `python3-venv`.
2.  **Tampermonkey**: Install the [Tampermonkey extension](https://www.tampermonkey.net/) for your browser.

## Step 1: Start the Backend Server

This project uses a local Python server to do the speech-to-text processing offline. It must be running while you watch videos.

*   **On Windows:** Double-click the `start.bat` file.
*   **On Linux:** Run `./start.sh` in the terminal. (Make sure it's executable: `chmod +x start.sh`)

The first time you run this, it will automatically create a virtual environment, install the necessary libraries (`faster-whisper`, `websockets`), and download the AI model. This might take a few minutes depending on your internet connection.

You will see `WebSocket Server started on ws://localhost:8765` when it is ready.

## Step 2: Install the Tampermonkey Script

1.  Open the Tampermonkey dashboard in your browser.
2.  Click the `+` tab to create a new script.
3.  Copy all the text from the `subtitles.user.js` file in this folder.
4.  Paste it into the Tampermonkey editor, replacing the default template.
5.  Click `File` -> `Save` (or Ctrl+S / Cmd+S).

## Usage

1.  Make sure the local Python server is running in the background.
2.  Go to any website with an HTML5 video (e.g., YouTube, local HTML file, etc.).
3.  Play the video.
4.  The Tampermonkey script will automatically detect the video playing, connect to the local server, start capturing the audio, and overlay the generated subtitles over the video!

## Troubleshooting

*   **No subtitles appearing:** Check the Python server console to see if it's receiving data (`Transcribed: ...`).
*   **WebSocket Error:** Open the browser's Developer Tools (F12) -> Console. If it says connection refused, ensure the Python script is running and listening on port `8765`.
*   **CORS / Security limitations:** Some highly secured websites might block the `captureStream()` API. You might need to use a browser extension that allows screen capturing if standard audio capture fails.
