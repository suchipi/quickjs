const raw = String.raw`C:\Program Files (x86)\Steam\steamapps\common`;
const cooked = String.cooked`C:\Program Files (x86)\Steam\steamapps\common`;

function myUpperCaseTag(strings, ...keys) {
  return String.cooked(
    strings.map((str) => str.toUpperCase()),
    ...keys.map((k) => String(k).toUpperCase())
  );
}

const upperCased = myUpperCaseTag`hello \there ${"yeah!!"} yay ${{}} woo`;

console.log(
  inspect({
    raw,
    cooked,
    upperCased,
  })
);
