IMAGES=()
for dir in "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"/*/; do
  name="$(basename "$dir")"
  if [[ "$name" != "imitation-ci-image" ]]; then
    IMAGES+=("$name")
  fi
done
