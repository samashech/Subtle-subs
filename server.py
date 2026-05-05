import http.server
import socketserver
import json
import tempfile
import os
from faster_whisper import WhisperModel

print("Loading Whisper model...")
model = WhisperModel("base", device="cpu", compute_type="int8")
print("Model loaded successfully.")

class AudioHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path == '/transcribe':
            content_length = int(self.headers['Content-Length'])
            audio_data = self.rfile.read(content_length)
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
                temp_audio.write(audio_data)
                temp_audio_path = temp_audio.name
                
            try:
                print(f"Received audio chunk of size {len(audio_data)} bytes. Transcribing...")
                segments, info = model.transcribe(temp_audio_path, beam_size=5)
                
                segments_data = []
                for segment in segments:
                    segments_data.append({
                        "text": segment.text.strip(),
                        "start": segment.start,
                        "end": segment.end
                    })
                
                print(f"Transcription finished. Segments: {len(segments_data)}")
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"segments": segments_data}).encode())
            except Exception as e:
                print(f"Error transcribing: {e}")
                self.send_response(500)
                self.end_headers()
            finally:
                if os.path.exists(temp_audio_path):
                    os.remove(temp_audio_path)
        else:
            self.send_response(404)
            self.end_headers()

# Prevent logging every single request to stdout to keep it clean
    def log_message(self, format, *args):
        pass

PORT = 8765
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), AudioHandler) as httpd:
    print(f"HTTP Server started on http://localhost:{PORT}")
    print("Waiting for POST requests to /transcribe...")
    httpd.serve_forever()