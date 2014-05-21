# usage example: script <base> <current>
# This is to compare.  In most circumstances current checkpoint will be in output, e.g.
# check-1 (**)
# check-2
# But if a tag exists in between commits, only the next tag will be returned, e.g.
# check-2
[ "$#" -lt 2 ] && echo "Base of checkpoint tags and current checkpoint must be provided" && exit 1

cd /home/myelin/professor-bot/CS101

checkpoint_base=$1
current=$2

#for line in `git tag -l ${checkpoint_base}-* --contains $(git describe --abbrev=0)`
#do
#echo "commit: $line"
#done

commit_array=
commit=""
while read line; do
   commit="$line"
   [ "$current" == "$commit" ] && continue
   break # not the best solution, but works for now.  No parsing, should work
done < <(git tag -l ${checkpoint_base}-* --contains $(git describe --abbrev=0))

echo "$commit"
