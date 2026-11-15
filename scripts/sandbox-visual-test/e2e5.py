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
    S(pg,"window.__bsGame.dispatch({type:'SELECT_DESTINATION', destination:'mars', unlocks:{moonTrainingComplete:true}})"); pg.wait_for_timeout(400)
    S(pg,SAVE+".progress.moonTrainingComplete=true")
    S(pg,"window.__bsGame.dispatch({type:'ENTER_HABITAT'})"); pg.wait_for_timeout(2500)
    S(pg,"window.__bsGame.dispatch({type:'ENTER_SURFACE'})")
    wait_until(pg,"document.querySelector('.bs-place h2')?.innerText.includes('Jezero')",40); pg.wait_for_timeout(3000)
    print('dest:', S(pg,"window.__bsGame.api.destination"))
    # Mars MOXIE task by holding E
    tp(pg, 52, 55.2, 3.1416); pg.wait_for_timeout(1500)
    print('1 prompt:', S(pg,"document.querySelector('.bs-prompt')?.innerText.replace(/\\n/g,' ')"))
    pg.keyboard.down('KeyE')
    wait_until(pg,"!!document.querySelector('[role=dialog]')",60,500); pg.keyboard.up('KeyE')
    print('2 dialog:', S(pg,"document.querySelector('[role=dialog]')?.getAttribute('aria-label')"))
    pg.get_by_role('button', name='Carbon dioxide').click(); pg.wait_for_timeout(500)
    print('3 mars sites/quiz:', S(pg,"JSON.stringify({s:"+SAVE+".completedSites,q:"+SAVE+".game.quizCorrect})"))
    pg.get_by_role('button', name='Continue exploring').click(); pg.wait_for_timeout(300)
    # emergency recovery
    S(pg,SAVE+".field.mars.suitO2=0; "+SAVE+".field.mars.suitHealth=1")
    ok=wait_until(pg,SAVE+".field.mars.recoveries>=1",40)
    pg.wait_for_timeout(1500)
    print('4 recovery:', ok, 'player z', S(pg,"window.__bsPlayer.current.z"), 'suitO2 after', round(S(pg,SAVE+".field.mars.suitO2")))
    # restart mars from pause menu
    pg.keyboard.press('Escape'); pg.wait_for_timeout(600)
    print('5 pause dialog:', S(pg,"document.querySelector('[role=dialog]')?.getAttribute('aria-label')"))
    pg.get_by_role('button', name='Restart this mission').click()
    pg.get_by_role('button', name='Yes, restart').click(); pg.wait_for_timeout(2500)
    print('6 after restart:', S(pg,"JSON.stringify({sol:"+SAVE+".simulations.mars.currentSol, sites:"+SAVE+".completedSites, mars:"+SAVE+".field.mars.recoveries, moonDone:"+SAVE+".game.missionsCompleted.moon})"), S(pg,"document.querySelector('.bs-place h2')?.innerText"))
    # classic switch
    pg.keyboard.press('Escape'); pg.wait_for_timeout(600)
    pg.get_by_role('button', name='Switch to Classic Mode').click(); pg.wait_for_timeout(2500)
    print('7 classic UI:', S(pg,"!document.querySelector('.bs-root') && document.body.innerText.slice(0,60).replace(/\\n/g,' ')"))
    print('LOGS:', '\n'.join(l for l in logs if 'Clock' not in l)[:1000])
    b.close()
