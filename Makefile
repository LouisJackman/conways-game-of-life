.POSIX:

build:
	@echo 'No build steps required; run `make publish` to compress the result '
	@echo 'into a tarball for uploading.'

publish: build
	tar -cJf conways-game-of-life.tar.xz index.html main.js style.css
