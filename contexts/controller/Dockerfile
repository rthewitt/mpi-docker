FROM mpi:node
MAINTAINER Ryan Hewitt "rthewitt.devel@gmail.com"

# Is this more or less secure?
USER root

VOLUME ["/user_data"]

ADD . /opt/docker-runner

ENV RUNNER runner

# Permissions issue, temporarily freezing deps
#RUN /opt/apps/docker-runner/install-deps.sh

# Runs in current shell context
WORKDIR /opt/docker-runner
CMD ["node", "/opt/docker-runner/server.js"]
