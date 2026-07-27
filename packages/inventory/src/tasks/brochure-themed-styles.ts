/**
 * 宣传册样式。写给**打印**,不是写给屏幕:
 *
 * - 长度单位一律用 `mm`/`pt`。`vh` 在打印时按纸张高度算,一改纸型就跑位;
 *   `rem` 受浏览器默认字号影响,不同机器出来的册子会不一样厚。
 * - 每一天、每张表格行都禁止跨页断开。行程被腰斩成「第 5 天(下页续)」
 *   是纸质册子最露怯的地方。
 * - 章节标题带 `break-after: avoid`,不让标题孤零零留在页底。
 */

type ThemedBrochureStyleTheme = {
  primaryColor: string
  accentColor: string
  backgroundColor: string
  surfaceColor: string
  textColor: string
  mutedTextColor: string
  borderColor: string
  fontFamily: string
}

export function renderThemedBrochureStyles(theme: ThemedBrochureStyleTheme) {
  return `
    @page {
      size: A4;
      margin: 16mm 14mm 18mm;
    }
    :root {
      --brand-primary: ${theme.primaryColor};
      --brand-accent: ${theme.accentColor};
      --page-bg: ${theme.backgroundColor};
      --surface: ${theme.surfaceColor};
      --text: ${theme.textColor};
      --muted: ${theme.mutedTextColor};
      --border: ${theme.borderColor};
      --font: ${theme.fontFamily};
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--text);
      background: var(--surface);
      font-family: var(--font);
      font-size: 10.5pt;
      line-height: 1.7;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    img { max-width: 100%; }

    /* 封面独占一页。整页背景交给内容,不铺色块——打印时大面积底色既费墨
       又容易在廉价打印机上出现条纹。 */
    .brochure-cover {
      display: flex;
      flex-direction: column;
      min-height: 245mm;
      break-after: page;
    }
    .cover-image {
      width: 100%;
      height: 118mm;
      object-fit: cover;
      border-radius: 3mm;
    }
    .cover-placeholder {
      background: linear-gradient(140deg, var(--brand-primary), var(--brand-accent));
    }
    /* 封面撑满整页,关键信息压在页脚一侧。不撑开的话正文全部挤在上半页,
       下面留一大片空白,看着像内容没排完。 */
    .cover-copy {
      flex: 1;
      padding-top: 10mm;
      display: flex;
      flex-direction: column;
      gap: 4mm;
    }
    .brand-row {
      display: flex;
      align-items: center;
      gap: 3mm;
      color: var(--brand-accent);
      font-size: 10pt;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .brand-logo { height: 9mm; width: auto; }
    .brochure-cover h1 {
      margin: 0;
      font-size: 26pt;
      line-height: 1.3;
      color: var(--brand-primary);
    }
    .cover-duration {
      margin: 0;
      font-size: 13pt;
      color: var(--brand-accent);
      font-weight: 600;
    }
    .cover-facts {
      /* auto 把这一栏顶到封面底部,标题与图之间的空白因此收在中段,
         而不是全部堆在页脚。 */
      margin: auto 0 0;
      display: flex;
      width: 100%;
      flex-wrap: wrap;
      gap: 8mm;
      border-top: 0.4mm solid var(--border);
      padding-top: 4mm;
    }
    .cover-facts dt {
      margin: 0;
      font-size: 9pt;
      color: var(--muted);
    }
    .cover-facts dd {
      margin: 0;
      font-size: 12pt;
      font-weight: 600;
    }

    .brochure-section { margin: 0 0 9mm; }
    .brochure-section h2 {
      margin: 0 0 4mm;
      padding-bottom: 2mm;
      font-size: 15pt;
      color: var(--brand-primary);
      border-bottom: 0.6mm solid var(--brand-accent);
      break-after: avoid;
    }
    .rich-body p { margin: 0 0 2.5mm; }
    .rich-body ul, .rich-body ol { margin: 0 0 2.5mm; padding-left: 6mm; }
    .rich-body li { margin: 0 0 1mm; }

    .route-map-canvas { text-align: center; break-inside: avoid; }
    .route-map-canvas svg { max-width: 100%; height: auto; }

    table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
    th, td {
      border: 0.3mm solid var(--border);
      padding: 2mm 2.5mm;
      text-align: left;
      vertical-align: top;
    }
    thead th {
      background: var(--page-bg);
      color: var(--brand-primary);
      font-weight: 600;
      white-space: nowrap;
    }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    .overview-table td:first-child { white-space: nowrap; font-weight: 600; }

    .day {
      display: grid;
      grid-template-columns: 22mm minmax(0, 1fr);
      gap: 4mm;
      padding: 4mm 0;
      border-top: 0.3mm solid var(--border);
      break-inside: avoid;
    }
    .day:first-of-type { border-top: none; }
    .day-number {
      font-size: 10pt;
      font-weight: 700;
      color: var(--brand-accent);
    }
    .day-content h3 { margin: 0 0 1mm; font-size: 12pt; }
    .day-content .muted { margin: 0 0 2mm; color: var(--muted); font-size: 9.5pt; }
    .day-body { margin: 0 0 2.5mm; }
    .day-chips { display: flex; flex-wrap: wrap; gap: 2mm; margin-bottom: 2.5mm; }
    .chip {
      display: inline-block;
      padding: 1mm 2.5mm;
      border: 0.3mm solid var(--border);
      border-radius: 2mm;
      background: var(--page-bg);
      font-size: 9pt;
    }
    .chip b { margin-right: 1.5mm; color: var(--muted); font-weight: 600; }
    .day-images {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 2.5mm;
    }
    .day-images img {
      width: 100%;
      height: 42mm;
      object-fit: cover;
      border-radius: 2mm;
    }

    .media-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 3mm;
    }
    .media-grid figure { margin: 0; break-inside: avoid; }
    .media-grid img {
      width: 100%;
      height: 38mm;
      object-fit: cover;
      border-radius: 2mm;
    }

    /* 费用包含/不含用左边一道色条区分,客人扫一眼就知道哪段是「不含」。 */
    .policy .rich-body {
      border-left: 1mm solid var(--border);
      padding-left: 4mm;
    }
    .inclusions .rich-body { border-left-color: var(--brand-accent); }
    .exclusions .rich-body { border-left-color: var(--muted); }
    .terms .rich-body { border-left-color: var(--brand-primary); }

    .brochure-footer {
      margin-top: 6mm;
      padding-top: 3mm;
      border-top: 0.3mm solid var(--border);
      color: var(--muted);
      font-size: 9pt;
      text-align: center;
    }
  `
}
