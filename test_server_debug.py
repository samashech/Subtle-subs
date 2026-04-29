import asyncio
import websockets
import logging
import tempfile
import os

logging.getLogger("websockets").setLevel(logging.CRITICAL)
logging.getLogger("websockets.server").setLevel(logging.CRITICAL)

async def process_audio(websocket):
    print(f"Client connected: {websocket.remote_address}")
    try:
        async for message in websocket:
            print(f"Received message of type {type(message)}, length {len(message)}")
    except Exception as e:
        print(f"Error: {e}")

async def main():
    server = await websockets.serve(process_audio, "localhost", 8767)
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())
