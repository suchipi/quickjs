# Comment Clarity

Write comments for a reader with none of your context.

- When a comment explains something the code avoids, open with "We don't use X because...".
- Give every "would" its condition, as in "If we used X, ...".
- Don't let "only" or "just" imply an expectation you never state. Say what the thing does and what it doesn't.
- Make each comment stand alone. "Either", "also", and "as above" break when the other comment moves or goes away.
- Write whole sentences. Don't splice clauses with a comma, colon, dash, or emdash.
- Take two or three sentences if clarity needs them, but give only the reason and its consequences.

Good:

```c
// We don't use CURLOPT_CUSTOMREQUEST for HEAD or POST because it changes
// the method name libcurl sends without changing how libcurl handles the
// request. If we used CURLOPT_CUSTOMREQUEST, libcurl would wait for a
// HEAD's body, and would keep sending POST after a redirect instead of
// switching to GET.
```

Not good enough (DON'T do this):

```c
// CUSTOMREQUEST only renames the method (even after redirects), so HEAD/POST use NOBODY/POSTFIELDS instead
```
