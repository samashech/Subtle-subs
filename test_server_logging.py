import asyncio
import websockets
import logging

logging.getLogger("websockets").setLevel(logging.ERROR)

async def process(ws):
    pass

async def main():
    server = await websockets.serve(process, "localhost", 8766)
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())
