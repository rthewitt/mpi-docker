# We only want the service to run
FROM ubuntu:13.04

RUN apt-get update
RUN apt-get install -y git-core curl python

VOLUME ["/home/myelin/professor-bot"]
VOLUME ["/home/myelin/internal-myelin"]
VOLUME ["/home/myelin/git-directories"]

CMD ["/bin/bash"]
