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
    S(pg,"window.__bsGame.dispatch({type:'ENTER_HABITAT'})"); pg.wait_for_timeout(3000)
    for i in range(8):
        S(pg,"window.__bsGame.act.fastForward(5)"); pg.wait_for_timeout(400)
        if S(pg,"[...document.querySelectorAll('button')].some(b=>b.innerText==='Open the debrief')"):
            pg.get_by_role('button', name='Open the debrief').click(); break
        if S(pg,"[...document.querySelectorAll('button')].some(b=>b.innerText==='Start the day')"):
            pg.get_by_role('button', name='Start the day').click()
    wait_until(pg,"!!document.querySelector('[aria-label=\"Mission debrief\"]')", 30)
    pg.wait_for_timeout(1500)
    pg.screenshot(path='/tmp/bs/debrief.png')
    print('stars/xp:', S(pg,"document.querySelector('.bs-stars')?.getAttribute('aria-label')"), S(pg, SAVE+".game.xp"), 'missionsCompleted', S(pg, "JSON.stringify("+SAVE+".game.missionsCompleted)"))
    pg.get_by_role('button', name='Continue').first.click()
    wait_until(pg,"!!window.__bsPlayer && document.querySelector('.bs-place h2')?.innerText.includes('Command')", 30)
    pg.wait_for_timeout(2000)
    tp(pg, 0, 7.5, 0); pg.wait_for_timeout(1500)
    pg.keyboard.press('KeyE'); pg.wait_for_timeout(1000)
    mars_disabled = S(pg,"[...document.querySelectorAll('.bs-dest')][1].innerText")
    print('Mars card:', mars_disabled.replace('\n',' | '))
    S(pg,"[...document.querySelectorAll('.bs-dest')][1].click()"); pg.wait_for_timeout(600)
    print('selected card text:', S(pg,"document.querySelector('.bs-dest.is-sel')?.innerText.replace(/\\n/g,' | ')"))
    pg.get_by_role('button', name='Launch mission').click()
    print('Mars habitat:', wait_until(pg,"document.querySelector('.bs-place h2')?.innerText.includes('Mars Habitat')", 40))
    print('LOGS:', '\n'.join(l for l in logs if 'Clock' not in l)[:800])
    b.close()
