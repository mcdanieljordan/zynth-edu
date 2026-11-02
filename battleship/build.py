#!/usr/bin/env python3
"""Assemble battleship/index.html from src/. Run: python3 build.py"""
import pathlib

root = pathlib.Path(__file__).parent
src = root / "src"
read = lambda n: (src / n).read_text(encoding="utf-8")

shell = read("shell.html")
css = read("style.css") + "\n" + read("holo.css")
# voice.js must come before app.js: app.js start-up code uses Voice
js = "\n".join(read(n) for n in ("legacy-engine.js", "legacy-helpers.js", "voice.js", "app.js"))
# keep a literal </script> from ever ending the inline script early
js = js.replace("</script", "<\\/script")

out = shell.replace("/*CSS*/", css).replace("/*JS*/", js)
(root / "index.html").write_text(out, encoding="utf-8")
print(f"wrote {root / 'index.html'} ({len(out):,} bytes)")
