#!/bin/bash
#if [ "$1" == "--hard" ]; then 
#    docker kill controller && docker rm controller
##elif [ "$1" == "--all" ]; then 
    docker ps -a | grep cloud9 | awk '{print $1}' | xargs docker kill
    docker ps -a | grep cloud9 | awk '{print $1}' | xargs docker rm
#    docker ps -a | grep pyrunner | awk '{print $1}' | xargs docker kill
#    docker ps -a | grep pyrunner | awk '{print $1}' | xargs docker rm
#    docker kill controller && docker rm controller
#fi

../../bin/rebuild.sh runner --clean -rm
#docker rmi mpi:runner
#docker build -t="mpi:runner" -rm .
#docker run --link redis:db --link subthalamus:myelin -i -d -v /user_data:/user_data -p 80:2222 --name="controller" mpi:runner
docker run --link gitlab:store --link redis:db -i -d -v /user_data:/user_data -p 80:2222 --name="controller" mpi:runner
