#!/bin/bash
# Merges a specific prototype commit into the student branches in the internal course directory, pushes 
# all branches. Eventual behavior = specific student (self-paced), possibly merge from external prototype

# Revisit getops for --all and -s <student-id>, etc

echo "INSIDE BASH SCRIPT"

echo "$#" arguments

[ "$#" -lt 2 ] && echo "Course uuid and commit hash must be provided" && exit 1

#TODO post-receive hook on student repos should force merge on internal working trees
# and send pull requests to professor

source $( dirname $0 )/setenv.sh

COURSE="$1"
# We've moved onto tags, this is ${basetag}-${checkpoint-number} format
# It represents the "next" in line, incremented by Astocyte.  Will return as confirmation
COMMIT="$2"

# Do error handling!
STRATEGY="NONE"
if [ "$#" -gt 2 ]; then
   STUDENT_BRANCH="$NAMESPACE_ST-$3"
   echo "set student branch to $STUDENT_BRANCH"
   STRATEGY="INDIVIDUAL"
else
   STRATEGY="CLASS"
fi

problem=false
folder=""
[ -d "$PRIV_DIR" ] || problem=true && folder="$PRIV_DIR"
[ -d "$PUBLIC_DIR" ] || problem=true && folder="$PUBLIC_DIR"
[ -d "$PROF_DIR" ] || problem=true && folder="$PROF_DIR"
[ -d "$PUBLIC_DIR/$COURSE" ] || problem=true && folder="$COURSE in $PUBLIC_DIR"

# TODO read up on process redirection.  logging from bash may not be best practice
if $problem; then fail "folder $folder not found"; fi;


cd $PROF_DIR/$COURSE


# If we don't do this, filtering branch list with grep
# returns all items in the current branch
# MUST UNDERSTAND THIS BEHAVIOR, MAKES NO SENSE
git checkout $PROTO_BRANCH

# What is the purpose of the internal prototype branch?
#git fetch --tags proto

function merge_from_proto() {
   echo "$1" # verify that this is local only
   the_branch="$1"
   git checkout $the_branch
   echo "updating local: $the_branch"
   git pull
   # consider sqash / no-ff, if we want different commit messages
   echo "merging: $COMMIT int $the_branch"
   # One possible reason to continue merging from branch is to test
   # tutorial additions (pulls from new repos) before merging into
   # student branches.  Fetch / merge should also be used.
   git merge $COMMIT
   echo "pushing, may not always want to."
   git push
}

# if strategy is class
if [ "$STRATEGY" == "CLASS" ]; then
   student_branches=""
   get_student_branch_array student_branches

   for branch in ${student_branches[@]}; do
      merge_from_proto $branch
   done
elif [ "$STRATEGY" == "INDIVIDUAL" ]; then
   merge_from_proto $STUDENT_BRANCH
   # send a confirmation receipt back to Astrocyte
   python ${BIN_DIR}/notify.py $COURSE $3 $COMMIT placeholder --confirm
else fail "Invalid merge strategy, check arguments; exiting script."
fi

git checkout $PROTO_BRANCH
