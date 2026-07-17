import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { useWorkflowRunsUiMessagesOrDefault, WorkflowRunsUiMessagesProvider } from "./i18n/index.js"

describe("workflows-ui i18n", () => {
  it("renders Chinese copy with the package provider via region fallback", () => {
    const html = renderToStaticMarkup(
      <WorkflowRunsUiMessagesProvider locale="zh-CN">
        <TitleProbe />
      </WorkflowRunsUiMessagesProvider>,
    )

    expect(html).toContain("工作流运行记录")
  })
})

function TitleProbe() {
  const messages = useWorkflowRunsUiMessagesOrDefault()
  return <span>{messages.page.title}</span>
}
