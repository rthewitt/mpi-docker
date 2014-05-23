FROM codewars:nvmnode
MAINTAINER Ryan Hewitt "rthewitt.devel@gmail.com"

# Is this more or less secure?
USER root

VOLUME ["/user_data"]

ADD . /opt/docker-runner
ADD env.sh /usr/local/bin/run

ENV RUNNER runner

# Permissions issue, temporarily freezing deps
#RUN /opt/apps/docker-runner/install-deps.sh

# Runs in current shell context
WORKDIR /opt/docker-runner
CMD ["/usr/local/bin/run"]
ENTRYPOINT ["/bin/bash"]
