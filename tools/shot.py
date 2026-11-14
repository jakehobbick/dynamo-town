# Headless screenshot helper for visual QA. Usage: python3 tools/shot.py out.png [js] [w h] [wait]
import sys, asyncio
from playwright.async_api import async_playwright
async def main():
    out = sys.argv[1]; js = sys.argv[2] if len(sys.argv) > 2 else ''
    w = int(sys.argv[3]) if len(sys.argv) > 3 else 1180; h = int(sys.argv[4]) if len(sys.argv) > 4 else 820
    wait = float(sys.argv[5]) if len(sys.argv) > 5 else 2.5
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=2)
        logs = []
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
        await pg.goto('http://localhost:5173/', wait_until='networkidle')
        await pg.wait_for_timeout(1200)
        if js:
            r = await pg.evaluate(js)
            if r is not None: print('JS:', r)
        await pg.wait_for_timeout(int(wait*1000))
        await pg.screenshot(path=out)
        for l in logs:
            if 'error' in l.lower() or 'PAGEERROR' in l: print(l)
        await b.close()
asyncio.run(main())
