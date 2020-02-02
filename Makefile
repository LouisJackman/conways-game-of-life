.POSIX:

build:
	npm run build

publish: build
	tar -czf conways-game-of-life.tgz index.htm main.js style.css
