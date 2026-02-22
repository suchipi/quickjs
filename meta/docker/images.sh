IMAGES=()
for dir in "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"/*/; do
  IMAGES+=("$(basename "$dir")")
done
