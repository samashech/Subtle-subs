import asyncio
import websockets

async def test():
    async with websockets.connect("ws://localhost:8765") as websocket:
        await websocket.send(b"fake audio data")
        # see if server errors
        await asyncio.sleep(2)

asyncio.run(test())
