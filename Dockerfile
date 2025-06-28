# syntax=docker/dockerfile:1.4.1

FROM debian:trixie-20250407

SHELL ["/bin/bash", "-o", "errexit", "-o", "pipefail", "-o", "nounset", "-c"]

ENV LANG=C.UTF-8

# Modify this in case the default UID/GIDs cause permission problems when
# working inside bind-mounted volumes.
ARG USER_UID_GID=1000


#
# Install a JVM, then drop root.
#

ARG JDK_VERSION=25

RUN <<-EOF
    export DEBIAN_FRONTEND=noninteractive
    apt-get update
    apt-get install --yes --no-install-recommends \
        ca-certificates \
        curl \
        "openjdk-$JDK_VERSION"-jre-headless

    rm -fr /var/lib/apt/lists/*

    update-ca-certificates
EOF

RUN groupadd -g "$USER_UID_GID" user \
    && useradd --create-home --uid "$USER_UID_GID" --gid "$USER_UID_GID" user
USER user

RUN umask 077

RUN mkdir -p ~/.local/bin
ENV PATH=/home/user/.local/bin:$PATH

VOLUME /home/user/workspace
WORKDIR /home/user/workspace


#
# Install Clojure from the instructions here:
# https://clojure.org/guides/install_clojure
#
# While a `clojure` package exists in Debian's repositories, it is incomplete,
# e.g. missing the `clj` command.
#

RUN <<-EOF
    curl -LOSfs https://github.com/clojure/brew-install/releases/latest/download/linux-install.sh
    chmod +x linux-install.sh
    mkdir -p ~/.local/clojure
    ./linux-install.sh --prefix "$HOME/.local/clojure"
    rm linux-install.sh
EOF

ENV PATH="$PATH:/home/user/.local/clojure/bin"


#
# Now base Clojure is installed, build the site, indirectly installing
# ClojureScript.
#

ENTRYPOINT ["clojure", "-M", "-m", "cljs.main"]
CMD ["--optimizations", "advanced", "-c", "louis-jackman.conways-game-of-life"]

