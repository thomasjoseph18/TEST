from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=["--disable-gpu","--disable-3d-apis","--disable-webgl","--disable-software-rasterizer"])
    pg = b.new_page(viewport={'width':900,'height':600}); pg.set_default_timeout(60000)
    pg.goto('http://localhost:8765/index.html'); pg.wait_for_timeout(3000)
    print('webgl available:', pg.evaluate("!!document.createElement('canvas').getContext('webgl2') || !!document.createElement('canvas').getContext('webgl')"))
    pg.get_by_role('button', name='Skip intro').click(); pg.wait_for_timeout(2500)
    print(pg.evaluate("document.body.innerText.slice(0,500).replace(/\\n/g,' | ')"))
    pg.get_by_role('button', name='Open Classic Mode').click(); pg.wait_for_timeout(2500)
    print('classic:', pg.evaluate("document.body.innerText.slice(0,80).replace(/\\n/g,' | ')"))
    b.close()
