export {
  createLocalChromiumBrochurePrinter,
  type LocalChromiumBrochurePrinterOptions,
  resolveLocalChromiumPrinter,
} from "./brochure-chromium.js"
export {
  type InlineBrochureImagesOptions,
  inlineBrochureImages,
} from "./brochure-images.js"
export {
  BROCHURE_LABELS_EN,
  BROCHURE_LABELS_ZH,
  type BrochureLabels,
  resolveBrochureLabels,
} from "./brochure-labels.js"
export {
  brochureBodyToHtml,
  brochureBodyToHtmlFragment,
  type CloudflareBrowserBrochurePrinterOptions,
  createBasicPdfProductBrochurePrinter,
  createCloudflareBrowserProductBrochurePrinter,
  createCloudflareBrowserProductBrochurePrinterFromEnv,
  isBasicPdfProductBrochurePrinter,
  type PrintedProductBrochureArtifact,
  type ProductBrochurePrinter,
  type ProductBrochurePrinterContext,
} from "./brochure-printers.js"
export {
  createDefaultProductBrochureTemplate,
  loadProductBrochureTemplateContext,
  type ProductBrochureDayContext,
  type ProductBrochureTemplateContext,
  type ProductBrochureTemplateDefinition,
  type RenderedProductBrochureTemplate,
  renderProductBrochureTemplate,
} from "./brochure-templates.js"
export {
  type CreateThemedBrochurePrinterOptions,
  createThemedBrochurePrinter,
  createThemedProductBrochurePrinter,
  defaultThemedBrochureSections,
  type RenderThemedBrochureHtmlOptions,
  renderThemedBrochureHtml,
  type ThemedBrochureRenderInput,
  type ThemedBrochureSection,
  type ThemedBrochureTheme,
} from "./brochure-themed.js"
export {
  type GenerateAndStoreProductBrochureOptions,
  generateAndStoreProductBrochure,
  PRODUCT_BROCHURE_STORAGE_ERROR_MESSAGE,
  ProductBrochureStorageError,
} from "./brochures.js"
export { type GenerateProductPdfResult, generateProductPdf } from "./generate-pdf.js"
