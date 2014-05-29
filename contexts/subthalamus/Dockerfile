# We only want the service to run
FROM mpi:node

RUN apt-get update
RUN apt-get install -y git-core curl python

ADD . /opt/subthalamus

VOLUME ["/myelin/professor-bot"]
VOLUME ["/myelin/internal-myelin"]
VOLUME ["/myelin/user_data"]

EXPOSE 7777

CMD ["/opt/subthalamus/server.js"]
ENTRYPOINT ["node"]
