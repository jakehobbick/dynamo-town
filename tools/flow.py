# Scripted UI flow: steps are "js:<code>" | "wait:<sec>" | "shot:<file>" | "click:<selector>"
import sys, asyncio
from playwright.async_api import async_playwright
async def main():
    steps = sys.argv[1:]
    w, h = 1180, 820
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2)
        pg = await ctx.new_page()
        logs = []
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
        await pg.goto('http://localhost:5173/', wait_until='networkidle')
        await pg.wait_for_timeout(1000)
        for s in steps:
            k, v = s.split(':', 1)
            if k == 'js':
                r = await pg.evaluate(v)
                if r is not None: print('JS:', r)
            elif k == 'wait': await pg.wait_for_timeout(int(float(v)*1000))
            elif k == 'shot': await pg.screenshot(path=v)
            elif k == 'click': await pg.click(v)
            elif k == 'reload':
                await pg.reload(wait_until='networkidle'); await pg.wait_for_timeout(1000)
        for l in logs:
            if 'rror' in l: print(l)
        await b.close()
asyncio.run(main())
