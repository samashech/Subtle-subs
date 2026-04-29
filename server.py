import asyncio
import websockets
import json
import tempfile
import os
import logging
from faster_whisper import WhisperModel

# Suppress noisy websocket handshake errors
logging.getLogger("websockets").setLevel(logging.CRITICAL)
logging.getLogger("websockets.server").setLevel(logging.CRITICAL)

# Initialize the Whisper model
# "base" provides a good balance between speed and accuracy. 
# You can change to "tiny" for faster, less accurate results, or "small" for slower, more accurate results.
print("Loading Whisper model...")
model_size = "base"
# Using CPU by default for maximum compatibility. Change device="cuda" if you have an NVIDIA GPU.
model = WhisperModel(model_size, device="cpu", compute_type="int8")
print("Model loaded successfully.")

async def process_audio(websocket):
    print(f"Client connected: {websocket.remote_address}")
    try:
        async for message in websocket:
            if isinstance(message, str):
                try:
                    data = json.loads(message)
                    if "debug" in data:
                        print(f"Client debug: {data['debug']}")
                except json.JSONDecodeError:
                    pass

            # We expect binary audio data from the client
            if isinstance(message, bytes):
                print(f"Received audio chunk of size {len(message)} bytes")
                # Write the binary chunk to a temporary file
                # The browser will typically send WebM or Ogg Opus data
                with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
                    temp_audio.write(message)
                    temp_audio_path = temp_audio.name

                try:
                    # Transcribe the audio chunk
                    # We set language to None to auto-detect, or you can hardcode it (e.g., language="en")
                    print(f"Transcribing {temp_audio_path}...")
                    segments, info = model.transcribe(temp_audio_path, beam_size=5)
                    
                    text_output = ""
                    for segment in segments:
                        text_output += segment.text + " "

                    # Send the transcribed text back to the client
                    print(f"Transcription finished. Output: '{text_output.strip()}'")
                    if text_output.strip():
                        await websocket.send(json.dumps({"text": text_output.strip()}))
                except Exception as e:
                    print(f"Error transcribing audio: {e}")
                finally:
                    # Clean up the temporary file
                    if os.path.exists(temp_audio_path):
                        os.remove(temp_audio_path)
    except websockets.exceptions.ConnectionClosed as e:
        print(f"Client disconnected: {e}")

async def main():
    # Start the WebSocket server on port 8765
    server = await websockets.serve(process_audio, "localhost", 8765)
    print("WebSocket Server started on ws://localhost:8765")
    print("Waiting for connections...")
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())
