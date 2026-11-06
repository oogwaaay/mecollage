# MeCollage

Public source of [mecollage.top](https://www.mecollage.top) — a free, no-signup, browser-based photo collage and image tool suite.

Users can create collages, make square/rounded/vertical crops, blur frames and export high-quality images directly in the browser. All image processing happens locally with Canvas/WASM; **photos are never uploaded to a server**.

## Site structure

- Static, no build step — plain HTML/CSS/JS deployed on Vercel behind Cloudflare.
- 5 language editions: English (`/`), 简体中文 (`/zh/`), 繁體中文 (`/tw/`), 日本語 (`/ja/`), Español (`/es/`).
- Runtime i18n via `i18n/*.json` + `assets/js/i18n.js`; shared design tokens in `assets/css/design-tokens.css`.
- Editor: `assets/js/mecollage-main.js`; 4 standalone tools under `public/tools/`.
- Deployment config: `vercel.json`.

## Repo scope

This repository is the **published website source**. Internal engineering material — design-system documentation, ADRs, lessons learned, runbooks, audit reports and governance rules — is maintained privately and is intentionally **not** part of this repository.

`scripts/` contains the static/visual/functional QA tooling used to validate the site. Some scripts reference internal docs that are not published; that is expected.

## Privacy

- Photos are processed in the browser and never uploaded.
- No account is required.
- See the site's [Privacy Policy](https://www.mecollage.top/privacy) and [Terms](https://www.mecollage.top/terms).

## License

No license is granted for reuse of the code or content unless explicitly stated otherwise. The site, brand and assets remain all rights reserved.
