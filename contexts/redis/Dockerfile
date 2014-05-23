# Will maintain record of containers and port numbers.
# Will eventually change to studentId in a cookie, matched to container
FROM        ubuntu:13.04
RUN         apt-get update
RUN         apt-get -y install redis-server
EXPOSE      6379
ENTRYPOINT  ["/usr/bin/redis-server"]
