cd /home/claude/proj/Junior-Astronaut-Mission-Trainer
/opt/npm-tools/node_modules/.bin/esbuild src/main.tsx --bundle --outfile=/tmp/bs/app.js --format=iife --jsx=automatic \
  --define:process.env.NODE_ENV='"production"' --alias:tailwindcss=/tmp/bs/empty.css --loader:.png=dataurl --loader:.svg=dataurl --log-level=warning 2>&1 | tail -20
ls -la /tmp/bs/app.js /tmp/bs/app.css 2>&1
