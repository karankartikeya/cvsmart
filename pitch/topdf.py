"""Render deck.html to a 13.333x7.5in PDF via Chrome DevTools Protocol.

Chrome's --print-to-pdf CLI flag ignores @page size and reflows the slides
onto Letter pages. Page.printToPDF takes explicit dimensions, so one slide
lands on exactly one page.
"""
import asyncio, base64, json, pathlib, shutil, socket, subprocess, sys, time, urllib.request

import websockets

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
HERE = pathlib.Path(__file__).parent
DECK = HERE / "deck.html"
SRC = HERE / ".deck-inlined.html"
OUT = HERE / "Coverit-Pitch-Deck.pdf"


def inline_assets() -> None:
    """Chrome's PDF renderer is unreliable with external image files, so the
    screenshots are embedded as data URIs before printing."""
    html = DECK.read_text()
    for img in sorted((HERE / "assets").glob("*.png")):
        b64 = base64.b64encode(img.read_bytes()).decode()
        html = html.replace(f'src="assets/{img.name}"',
                            f'src="data:image/png;base64,{b64}"')
    SRC.write_text(html)


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


async def render() -> None:
    inline_assets()
    port = free_port()
    proc = subprocess.Popen(
        [CHROME, "--headless", "--disable-gpu", f"--remote-debugging-port={port}",
         "--no-first-run", "--user-data-dir=" + str(HERE / ".chrome-profile"),
         "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    try:
        ws_url = None
        for _ in range(60):
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{port}/json/version") as r:
                    ws_url = json.load(r)["webSocketDebuggerUrl"]
                break
            except Exception:
                time.sleep(0.25)
        if not ws_url:
            sys.exit("chrome devtools endpoint never came up")

        async with websockets.connect(ws_url, max_size=200 * 1024 * 1024) as ws:
            n = 0

            async def cmd(method, params=None, sid=None):
                nonlocal n
                n += 1
                msg = {"id": n, "method": method, "params": params or {}}
                if sid:
                    msg["sessionId"] = sid
                await ws.send(json.dumps(msg))
                while True:
                    res = json.loads(await ws.recv())
                    if res.get("id") == n:
                        if "error" in res:
                            sys.exit(f"{method} failed: {res['error']}")
                        return res.get("result", {})

            target = await cmd("Target.createTarget", {"url": "about:blank"})
            sid = (await cmd("Target.attachToTarget",
                             {"targetId": target["targetId"], "flatten": True}))["sessionId"]
            await cmd("Page.enable", {}, sid)
            await cmd("Page.navigate", {"url": SRC.resolve().as_uri()}, sid)

            # let fonts, layout and the inlined images settle
            await asyncio.sleep(4)

            pdf = await cmd("Page.printToPDF", {
                "printBackground": True,
                "paperWidth": 13.333,
                "paperHeight": 7.5,
                "marginTop": 0, "marginBottom": 0,
                "marginLeft": 0, "marginRight": 0,
                "preferCSSPageSize": True,
                "scale": 1,
            }, sid)

            OUT.write_bytes(base64.b64decode(pdf["data"]))
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
        SRC.unlink(missing_ok=True)
        shutil.rmtree(HERE / ".chrome-profile", ignore_errors=True)


asyncio.run(render())
print(f"wrote {OUT} ({OUT.stat().st_size / 1048576:.2f} MB)")
