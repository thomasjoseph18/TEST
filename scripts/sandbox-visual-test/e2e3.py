import sys, json, time; sys.path.insert(0,'/tmp/bs')
from lib import *
def S(pg, expr): return pg.evaluate(expr)
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
    # --- rover
    tp(pg, 11, 13.2, 3.1416); pg.wait_for_timeout(1200)
    print('A rover prompt:', S(pg,"document.querySelector('.bs-prompt')?.innerText"))
    pg.keyboard.press('KeyE'); pg.wait_for_timeout(1200)
    print('B driving dash visible:', S(pg,"!!document.querySelector('.bs-roverdash')"))
    pg.keyboard.down('KeyW'); pg.wait_for_timeout(7000)
    spd=S(pg,"document.querySelector('.bs-roverdash big')?.innerText"); print('C speed km/h while holding W:', spd)
    pg.keyboard.up('KeyW'); pg.keyboard.down('Space'); pg.wait_for_timeout(5000); pg.keyboard.up('Space')
    print('D speed after brake:', S(pg,"document.querySelector('.bs-roverdash big')?.innerText"))
    print('E battery after driving:', S(pg, SAVE+".field.moon.rover.battery"))
    pg.keyboard.press('KeyE'); pg.wait_for_timeout(1500)
    print('F exited rover (dash gone):', S(pg,"!document.querySelector('.bs-roverdash')"))
    print('LOGS:', '\n'.join(l for l in logs if 'Clock' not in l)[:1500])
    b.close()
