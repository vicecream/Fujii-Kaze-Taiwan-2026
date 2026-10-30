import { GITHUB_SVG } from "./icons.js";
import { SITE } from "../data.js";
export function siteFooterHtml(build){
  return `<footer class="credits">
    <nav class="credits-links" aria-label="專案連結">
      <p class="credits-copy"><span>Fujii Kaze Prema World Tour · 高雄指南<br>非官方粉絲製作</span><span class="build">${build}</span></p>
      <span class="credits-origin">
        <a class="credits-link credits-repo" href="${SITE.repoUrl}" target="_blank" rel="noopener" aria-label="GitHub 儲存庫">${GITHUB_SVG}</a>
        <a class="credits-fork" href="https://vaundy-seoul-2026.pages.dev/" target="_blank" rel="noopener">程式來源：SEOUL 응원가이드</a>
      </span>
      <a class="credits-fork" href="https://gall.dcinside.com/mgallery/board/view/?id=vaundy0606&no=35550" target="_blank" rel="noopener">原作者：카쿠메.</a>
      <span class="credits-actions">
        <a class="credits-link" href="${SITE.repoUrl}/issues" target="_blank" rel="noopener">意見回饋</a>
        <button class="credits-link changelog-trigger" type="button" data-open-changelog aria-haspopup="dialog" aria-controls="changelog-view">更新日誌</button>
      </span>
    </nav>
  </footer>`;
}
