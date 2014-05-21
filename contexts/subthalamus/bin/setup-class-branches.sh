#!/bin/bash
# Sets up a course using the branching model, as opposed to git submodules in v0.1

[ "$#" -lt 3 ] && echo "Course name, prototype and member list URI must be provided." && exit 1


source $( dirname $0 )/setenv.sh

COURSE="$1"
PROTO="$2"
shift
shift
names=($1)
NUM_STUDENTS=${#names[@]}

[ -d "$PRIV_DIR" ] || mkdir -p "$PRIV_DIR"
[ -d "$PUBLIC_DIR" ] || mkdir -p "$PUBLIC_DIR"
[ -d "$PROF_DIR" ] || mkdir -p "$PROF_DIR"
[ -d "$PUBLIC_DIR/$COURSE" ] || mkdir $PUBLIC_DIR/$COURSE
[ -d "$PRIV_DIR/$COURSE-studentx" ] || mkdir "$PRIV_DIR/$COURSE-studentx"

# TODO perform this check in python
# f_yesno "Course already exists, do you want to overwrite?" && echo "Too bad, not allowed" && exit 1 || exit 0

m_log "Creating class repository for $COURSE"

cd $PRIV_DIR

# Create isolated repository so bare clone will not contain sensitive information
cd "$COURSE-studentx"
git init
git remote add proto $PROTO
git fetch --tags proto
#TODO abstract prototype information (tag names, etc)
git checkout -b master INIT


# Clone bare into public student directory
x=0
while [ "$x" -lt $NUM_STUDENTS ]; do
   reponame=${names[$x]}
   git clone --bare . $PUBLIC_DIR/$COURSE/$reponame.git 
   cp $BIN_DIR/hooks/student-hooks/* $PUBLIC_DIR/$COURSE/$reponame.git/hooks/
   let "x++"
done


# create the professor-bot master repo (currently for verification)
# For class version, this will likely be handled by glial:professor
cd $PROF_DIR

mkdir $COURSE
cd $COURSE
git init
git remote add -t master proto $PROTO 
git fetch --tags proto
git checkout -b $PROTO_BRANCH INIT

i=0
while [ "$i" -lt $NUM_STUDENTS ]; do
   reponame=${names[$i]}
   git remote add -t master $reponame $PUBLIC_DIR/$COURSE/$reponame.git
   let "i++"
done

# TODO test
git fetch --all

i=0
while [ "$i" -lt $NUM_STUDENTS ]; do
   reponame=${names[$i]}
   git checkout -b "$NAMESPACE_ST-$reponame" $reponame/master 
   let "i++"
done

# otherwise branches push to nonexistent remotes
git config push.default tracking

#========= TEST CLONE BEHAVIOR, OTHERWISE CLIENT MUST CREATE =============
   #git clone --bare . $PUBLIC_DIR/$COURSE.git
   #git remote add origin $PUBLIC_DIR/$COURSE.git
#=========================================================================

# Uncomment below to add dumb transport.
#make_server_ready "$PUBLIC_DIR/$COURSE.git"

git checkout $PROTO_BRANCH
git pull proto
