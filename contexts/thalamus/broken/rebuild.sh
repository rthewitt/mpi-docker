docker kill broke && docker rm broke
docker build -t mpi:broken .
docker run -i -d --name=broke -p 80:2222 mpi:broken
