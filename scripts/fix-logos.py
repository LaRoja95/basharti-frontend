# -*- coding: utf-8 -*-
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1] / "assets" / "brand"

files = {
    ROOT / "logo-wordmark.svg": """<svg viewBox="0 0 280 80" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="بشرتي">
  <defs>
    <linearGradient id="v4text" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9e4a58"/>
      <stop offset="0.5" stop-color="#d1717f"/>
      <stop offset="1" stop-color="#e8a0ac"/>
    </linearGradient>
    <linearGradient id="v4line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7eb8b0"/>
      <stop offset="1" stop-color="#d4a574"/>
    </linearGradient>
  </defs>
  <text x="140" y="52" text-anchor="middle" font-family="'Tajawal', 'Segoe UI', sans-serif" font-size="44" font-weight="900" fill="url(#v4text)">بشرتي</text>
  <path d="M40 68 Q140 58, 240 68" fill="none" stroke="url(#v4line)" stroke-width="3" stroke-linecap="round"/>
  <circle cx="218" cy="30" r="4" fill="#e8a0ac"/>
</svg>
""",
    ROOT / "logo-lockup.svg": """<svg viewBox="0 0 320 72" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="بشرتي">
  <defs>
    <linearGradient id="lu4t" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9e4a58"/>
      <stop offset="1" stop-color="#d1717f"/>
    </linearGradient>
    <linearGradient id="lu4l" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7eb8b0"/>
      <stop offset="1" stop-color="#d4a574"/>
    </linearGradient>
  </defs>
  <text x="24" y="48" font-family="'Tajawal', 'Segoe UI', sans-serif" font-size="42" font-weight="900" fill="url(#lu4t)">بشرتي</text>
  <path d="M24 58 Q160 48, 296 58" fill="none" stroke="url(#lu4l)" stroke-width="3" stroke-linecap="round"/>
  <text x="24" y="68" font-family="'Tajawal', 'Segoe UI', sans-serif" font-size="12" font-weight="700" fill="#8a7679">عناية بالبشرة · السعودية</text>
</svg>
""",
    ROOT / "logo-lockup-light.svg": """<svg viewBox="0 0 320 72" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="بشرتي">
  <defs>
    <linearGradient id="lu4lw" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#f5c4cc"/>
      <stop offset="1" stop-color="#ffffff"/>
    </linearGradient>
    <linearGradient id="lu4ll" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7eb8b0"/>
      <stop offset="1" stop-color="#d4a574"/>
    </linearGradient>
  </defs>
  <text x="24" y="48" font-family="'Tajawal', 'Segoe UI', sans-serif" font-size="42" font-weight="900" fill="url(#lu4lw)">بشرتي</text>
  <path d="M24 58 Q160 48, 296 58" fill="none" stroke="url(#lu4ll)" stroke-width="3" stroke-linecap="round"/>
  <text x="24" y="68" font-family="'Tajawal', 'Segoe UI', sans-serif" font-size="12" font-weight="700" fill="rgba(255,255,255,0.75)">عناية بالبشرة · السعودية</text>
</svg>
""",
    ROOT.parent / "favicon.svg": """<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="f4t" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e8a0ac"/>
      <stop offset="1" stop-color="#9e4a58"/>
    </linearGradient>
    <linearGradient id="f4l" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7eb8b0"/>
      <stop offset="1" stop-color="#d4a574"/>
    </linearGradient>
  </defs>
  <rect width="48" height="48" rx="12" fill="#fbf3ee"/>
  <text x="24" y="30" text-anchor="middle" font-family="'Tajawal', 'Segoe UI', sans-serif" font-size="22" font-weight="900" fill="url(#f4t)">ب</text>
  <path d="M10 38 Q24 34, 38 38" fill="none" stroke="url(#f4l)" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="36" cy="14" r="2.5" fill="#e8a0ac"/>
</svg>
""",
}

for path, content in files.items():
    path.write_text(content, encoding="utf-8")
    print("wrote", path)

for name in ("logo-mark.svg",):
    src = ROOT / "logo-wordmark.svg"
    dst = ROOT / name
    dst.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")

logos = ROOT / "logos"
(logos / "logo-v4-wordmark.svg").write_text((ROOT / "logo-wordmark.svg").read_text(encoding="utf-8"), encoding="utf-8")
(logos / "lockup-v4.svg").write_text((ROOT / "logo-lockup.svg").read_text(encoding="utf-8"), encoding="utf-8")
