# Always Use Curly Braces for Bodies (JS/TS)

In TypeScript and JavaScript, always wrap `if` / `else` / `for` /
`while` / `do-while` / `switch` `case` / `default` bodies in curly
braces, even single statements.

```ts
// NO
if (shouldRunWineTests) setupWineHooks();

// YES
if (shouldRunWineTests) {
  setupWineHooks();
}

// NO
switch (x) {
  case 1:
    doThing();
    break;
}

// YES
switch (x) {
  case 1: {
    doThing();
    break;
  }
}
```

Only enforce on lines you're already touching; don't reformat unrelated code.
