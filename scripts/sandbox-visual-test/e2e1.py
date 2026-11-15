import sys, json, time; sys.path.insert(0,'/tmp/bs')
from lib import *
def S(pg, expr): return pg.evaluate(expr)
def wait_until(pg, expr, timeout=60, step=500):
    t0=time.time()
    while time.time()-t0<timeout:
        if pg.evaluate(expr): return True
        pg.wait_for_timeout(step)
    return False
with sync_playwright() as p:
    b, pg, logs = open_page(p, 480, 270)
    pg.wait_for_timeout(2500)
    pg.get_by_role('button', name='Skip intro').click()
    assert wait_until(pg, "!!window.__bsPlayer"), 'command scene did not start'
    pg.evaluate("window.__bsGame.act.updateSettings({lowPerformanceMode:true})")
    pg.wait_for_timeout(2000)
    tp(pg, 0, 7.5, 0); pg.wait_for_timeout(1500)
    print('1 prompt:', S(pg,"document.querySelector('.bs-prompt')?.innerText"))
    pg.keyboard.press('KeyE'); pg.wait_for_timeout(1000)
    print('2 dialog:', S(pg,"document.querySelector('[role=dialog]')?.getAttribute('aria-label')"))
    pg.get_by_role('button', name='Launch mission').click()
    ok = wait_until(pg, "window.__bsGame.saveRef.current && document.querySelector('.bs-place h2')?.innerText.includes('Habitat')", 30)
    print('3 habitat place banner:', ok)
    pg.wait_for_timeout(4000)
    F="window.__bsThree.get().gl.info.render.frame"
    f1=S(pg,F); pg.wait_for_timeout(3000); f2=S(pg,F); print('4 habitat frames advancing:', f2>f1)
    # oxygen station
    tp(pg, -7, 3.2, 0+3.1416); pg.wait_for_timeout(1200)
    print('5 prompt:', S(pg,"document.querySelector('.bs-prompt')?.innerText"))
    pg.keyboard.press('KeyE'); pg.wait_for_timeout(800)
    print('6 dialog:', S(pg,"document.querySelector('[role=dialog]')?.getAttribute('aria-label')"))
    pg.get_by_role('button', name='Boost (+10 kW)').click(); pg.wait_for_timeout(500)
    print('7 o2Mode:', S(pg,"window.__bsGame.saveRef.current.simulations.moon.o2Mode"))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(600)
    print('8 dialog closed:', S(pg,"!document.querySelector('[role=dialog]')"))
    # suit rack hold
    tp(pg, 13, 2.2, 0.0); pg.wait_for_timeout(1200)
    # airlock -> surface
    tp(pg, 13, 0, -1.5708); pg.wait_for_timeout(1200)
    print('9 prompt:', S(pg,"document.querySelector('.bs-prompt')?.innerText"))
    pg.keyboard.press('KeyE')
    ok = wait_until(pg, "document.querySelector('.bs-place h2')?.innerText.includes('Shackleton')", 40)
    print('10 on surface:', ok)
    pg.wait_for_timeout(5000)
    f1=S(pg,F); pg.wait_for_timeout(4000); f2=S(pg,F); print('11 SURFACE frames advancing:', f2>f1, f1, f2)
    pg.screenshot(path='/tmp/bs/e1_surface.png')
    # sample station: hold E
    tp(pg, -26, 43.2, 3.1416); pg.wait_for_timeout(1500)
    print('12 prompt:', S(pg,"document.querySelector('.bs-prompt')?.innerText"))
    pg.keyboard.down('KeyE')
    got = wait_until(pg, "window.__bsGame.saveRef.current.field.moon.samples.length>0", 90, 700)
    pg.keyboard.up('KeyE')
    print('13 sample collected by holding E:', got, S(pg,"JSON.stringify(window.__bsGame.saveRef.current.field.moon.samples)"))
    print('LOGS:', '\n'.join(l for l in logs if 'Clock' not in l)[:1500])
    b.close()
