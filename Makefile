.POSIX:

build:
	npm run build

publish: build
	tar -czf conways-game-of-life.tgz index.html main.js style.css
