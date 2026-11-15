import sys, time; sys.path.insert(0,'/tmp/bs')
from lib import *
def S(pg, e): return pg.evaluate(e)
def wait_until(pg, expr, timeout=60, step=400):
    t0=time.time()
    while time.time()-t0<timeout:
        if pg.evaluate(expr): return True
        pg.wait_for_timeout(step)
    return False
SAVE="window.__bsGame.saveRef.current"
with sync_playwright() as p:
    b, pg, logs = open_page(p, 480, 270)
    pg.wait_for_timeout(2500)
    pg.get_by_role('button', name='Skip intro').click(); pg.wait_for_timeout(3000)
    S(pg,"window.__bsGame.act.updateSettings({lowPerformanceMode:true})")
    S(pg,"window.__bsGame.dispatch({type:'OPEN_NAVIGATION'})"); pg.wait_for_timeout(400)
    S(pg,"window.__bsGame.dispatch({type:'ENTER_HABITAT'})"); pg.wait_for_timeout(2500)
    S(pg,"window.__bsGame.dispatch({type:'ENTER_SURFACE'})")
    wait_until(pg,"document.querySelector('.bs-place h2')?.innerText.includes('Shackleton')",40); pg.wait_for_timeout(3000)
    for sid,(x,z) in {'moon-psr-cold-trap':(-150,-250),'moon-shackleton-rim':(92,262),'moon-lunar-rover':(-196,152)}.items():
        tp(pg, x, z+2, 3.1416); pg.wait_for_timeout(2500)
        chip=S(pg,"document.querySelector('.bs-chips')?.innerText.replace(/\\n/g,' | ')")
        print(sid,'prompt:', S(pg,"document.querySelector('.bs-prompt')?.innerText.replace(/\\n/g,' ')"), '| y', round(S(pg,"window.__bsPlayer.current.y"),1), '|', chip)
        pg.keyboard.down('KeyE')
        wait_until(pg,"!!document.querySelector('[role=dialog]')",80,500); pg.keyboard.up('KeyE')
        print('   done:', S(pg,SAVE+".completedSites.includes('"+sid+"')"))
        pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
        if S(pg,"!!document.querySelector('[role=dialog]')"): pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
    print('suitPower', round(S(pg,SAVE+".field.moon.suitPower")), 'suitO2', round(S(pg,SAVE+".field.moon.suitO2")), 'rad', round(S(pg,SAVE+".field.moon.radiationDose"),1))
    print('LOGS:', '\n'.join(l for l in logs if 'Clock' not in l)[:600])
    b.close()
# WebGL fallback
with sync_playwright() as p:
    b = p.chromium.launch(args=["--disable-gpu","--disable-3d-apis","--disable-webgl","--disable-software-rasterizer"])
    pg = b.new_page(viewport={'width':900,'height':600}); pg.set_default_timeout(60000)
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html'); pg.wait_for_timeout(4000)
    print('NO-WEBGL text:', pg.evaluate("document.body.innerText.slice(0,260).replace(/\\n/g,' | ')"), errs)
    b.close()
