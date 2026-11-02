# zynth-edu

Shared library for ZynthWav education apps. One script gives any HTML page access to every Texas TEKS standard (stored in Supabase).

## Use it

Add this line to any education HTML:

```html
<script src="https://mcdanieljordan.github.io/zynth-edu/v1/zynth-edu.js"></script>
```

Then, for example:

```js
Teks.forGrade(3, { subject: 'pe' }).then(function (standards) {
  standards.forEach(function (s) { console.log(s.code, s.text); });
});
```

See the comment at the top of `v1/zynth-edu.js` for every function.

## Versions

- `v1/` is stable. Fixes go into v1 so every app gets them automatically.
- Breaking changes go into a new folder (`v2/`) so older apps keep working.

## Test page

`v1/test.html` loads the script and shows 3rd grade PE standards. If it says "Working!", everything is connected.

## Data

TEKS are public domain (Texas Education Agency). The database is read-only to the public key in the script.
