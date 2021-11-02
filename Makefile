.POSIX:

build:
	npm run build

publish: build
	tar -cJf conways-game-of-life.tar.xz index.html main.js style.css
