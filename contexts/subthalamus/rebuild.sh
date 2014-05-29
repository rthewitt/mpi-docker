docker kill subthalamus && docker rm subthalamus
docker build -t mpi:subthalamus .
docker run -i -d -v /user_data:/user_data --name="subthalamus" mpi:subthalamus
