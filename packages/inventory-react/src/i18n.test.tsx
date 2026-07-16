import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  getProductsUiI18n,
  ProductsUiMessagesProvider,
  resolveProductsUiMessages,
  useProductsUiMessagesOrDefault,
} from "./i18n/provider.js"

describe("products-ui i18n", () => {
  it("resolves romanian messages with english fallback", () => {
    const messages = getProductsUiI18n({ locale: "ro" }).messages

    expect(messages.common.cancel).toBe("Anuleaza")
    expect(messages.productCategoryDialog.titles.create).toBe("Categorie noua de produs")
  })

  it("applies overrides", () => {
    const messages = resolveProductsUiMessages({
      locale: "ro",
      overrides: {
        locales: {
          ro: {
            productCategoryList: {
              addCategory: "Categorie noua",
            },
          },
        },
      },
    })

    expect(messages.productCategoryList.addCategory).toBe("Categorie noua")
  })

  it("falls back to english outside a provider", () => {
    function ReadMessage() {
      const messages = useProductsUiMessagesOrDefault()
      return <span>{messages.common.cancel}</span>
    }

    expect(renderToStaticMarkup(<ReadMessage />)).toContain("Cancel")
  })

  it("provides romanian messages through the provider", () => {
    function ReadMessage() {
      const messages = useProductsUiMessagesOrDefault()
      return <span>{messages.productCategoryForm.fields.parentCategory}</span>
    }

    const html = renderToStaticMarkup(
      <ProductsUiMessagesProvider locale="ro">
        <ReadMessage />
      </ProductsUiMessagesProvider>,
    )

    expect(html).toContain("Categorie parinte")
  })

  it("provides chinese messages through the provider via region fallback", () => {
    function ReadMessage() {
      const messages = useProductsUiMessagesOrDefault()
      return <span>{messages.productCategoryForm.fields.parentCategory}</span>
    }

    const html = renderToStaticMarkup(
      <ProductsUiMessagesProvider locale="zh-CN">
        <ReadMessage />
      </ProductsUiMessagesProvider>,
    )

    expect(html).toContain("上级类目")
  })
})
