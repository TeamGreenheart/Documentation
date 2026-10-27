# Greenheart Documentation

User manual for the Greenheart Exchange, Greenheart International and Greenheart Travel WordPress sites.

## Editing and building

Content lives in `src/`. The pages themselves (`index.html` and the page folders) are generated, not stored in git. **Pushing to `main` builds and publishes the site automatically** (see [Publishing](#publishing)).

```
src/layout.html              page shell (header, menu, scripts)
src/sections/<id>.html       one manual section per file
build.js                     generates the pages
```

To build locally, for preview or to check for errors before pushing:

```
node build.js
```

No dependencies to install. The build stops with an error on duplicate ids and warns about links to ids that don't exist. The generated files are ignored by git, so there's nothing to commit after building.

Which sections appear on which page is set in the `PAGES` list at the top of `build.js`. When you add a page, add its folder to `.gitignore` too. Links between sections are written as plain `#id` in the source; the build turns them into `../<page>/#id` when the target is on another page.

To preview locally, serve the folder (folder URLs like `/customizer/` need a web server):

```
python3 -m http.server 8000
```

## Publishing

Every push to `main` runs `.github/workflows/pages.yml`, which runs `node build.js _site` and publishes `_site/` to GitHub Pages at https://teamgreenheart.github.io/Documentation/. Only the built pages and `assets/` are published; `src/`, `build.js` and this README are not.

- Progress and errors: the repository's **Actions** tab. If the build fails (for example on a duplicate id), the live site stays as it was.
- To republish without a new commit: **Actions › Publish docs › Run workflow**.
- One-time setup: **Settings › Pages › Source** must be set to **GitHub Actions**.

## Pages

| URL | Contains |
|---|---|
| `/` | The full manual on one page |
| `/introduction/` | Introduction |
| `/content-types/` | Content Types |
| `/editor/` | Adding & Editing Content, Block Library |
| `/customizer/` | Customizing Theme |
| `/features/` | Special Features |
| `/support/` | Reporting Issues, Requesting Features |

## Linking from WordPress (contextual help)

Any page can be opened at a specific entry using the WordPress handle as the hash:

| Context in WordPress | URL | Handle |
|---|---|---|
| A block in the editor | `/editor/#faq` | Block name without the namespace: `rbt/faq` → `faq`, `rbt/latest-posts-cta-layout` → `latest-posts-cta-layout` |
| A Customizer panel or section | `/customizer/#theme_footer_panel` | The panel or section id, e.g. `theme_address`, `homepage_slider`, `form_pre_footer` |
| Appearance › Menus | `/customizer/#nav-menus` | `nav-menus` (also `nav_menus`, the Customizer's menus panel) |
| Editing a post type | `/content-types/#tusa_positions` | The post type slug, e.g. `page`, `program`, `news_items` |

Query parameters:

- `?site=exchange|org|travel` shows only that site's content. Always pass it: some handles exist on more than one site (`news_items` exists on both Exchange and International, and they work differently), and the site decides which entry opens.
- `?embed=1` hides the header and menu for use in an iframe, and shows an "Open in full documentation" link that opens the same spot in a new tab.

Example: `/customizer/?site=travel&embed=1#form_pre_footer`

Embedded pages don't overwrite the reader's remembered site choice. If the docs are served from a different domain than the sites, make sure the docs server doesn't send `X-Frame-Options: DENY` or a `frame-ancestors` policy that blocks the WordPress admin.

## Adding anchors

Give any entry a `data-anchor` attribute with one or more space-separated handles:

```html
<div class="type-entry" id="cz-theme_pre_footer" data-anchor="theme_pre_footer form_pre_footer">
```

`id` is for links inside the manual; `data-anchor` is for links from WordPress. A hash matches an element's `id` or any of its `data-anchor` names. When several elements match, the first one visible under the current site filter wins.

## Site-specific content

Add `data-sites="exchange org travel"` (any combination) to a sub-section, entry or table row. It then gets site badges, is hidden when the reader filters to another site, and (for `.block-entry`) feeds the block availability table.
