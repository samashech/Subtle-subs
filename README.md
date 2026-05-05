# Universal Subtitles (Powered by VOT)

A userscript that translates videos in real-time by leveraging Yandex Browser's robust Voice Over Translation (VOT) technology. It adds high-quality, cloud-based voice-over translation and subtitle rendering to almost any web video player without requiring a local backend.

## Prerequisites

1.  **Tampermonkey**: Install the [Tampermonkey extension](https://www.tampermonkey.net/) for your browser.

## Installation

1.  Open the Tampermonkey dashboard in your browser.
2.  Click the `+` tab to create a new script.
3.  Copy all the text from the `vot.user.js` file in this folder.
4.  Paste it into the Tampermonkey editor, replacing the default template.
5.  Click `File` -> `Save` (or Ctrl+S / Cmd+S).

## Usage

1.  Navigate to a supported video platform (e.g., YouTube, Twitch, Vimeo).
2.  Play a video in a foreign language.
3.  The script will automatically detect the video. Look for the translation UI over the video player.
4.  Click the translation button to begin streaming translated voice-over and subtitles directly from Yandex servers.

## Features

- No local server required (100% cloud-based processing).
- Polished, native-feeling UI overlaid on the video player.
- Support for complex platforms (e.g., YouTube, Twitch, etc.).
- Advanced audio extraction and translation via Yandex's API.
