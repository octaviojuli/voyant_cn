import { describe, expect, it } from "vitest"

import { assignDayImages } from "../../src/import/assign-day-images.js"

const img = (index: number) => `<img src="voyant-import-image:${index}" />`

describe("每日配图归位", () => {
  it("图归给它前面最近的那一天", () => {
    const html = [
      "<p>第一天：出发地-乌鲁木齐</p>",
      img(0),
      img(1),
      "<p>第二天：乌鲁木齐-奎屯</p>",
      img(2),
    ].join("")

    const { byDay, cover } = assignDayImages(html)

    expect(cover).toEqual([])
    expect(byDay.get(1)).toEqual([0, 1])
    expect(byDay.get(2)).toEqual([2])
  })

  it("第一天之前的图算作整条线路的封面", () => {
    // 封面、行程总览这类图不属于任何一天,挂到 D1 上就成了第一天的风景照。
    const html = [img(0), "<p>【伊犁奇遇】夏日风光8日游</p>", "<p>第一天：出发地</p>", img(1)].join(
      "",
    )

    const { byDay, cover } = assignDayImages(html)

    expect(cover).toEqual([0])
    expect(byDay.get(1)).toEqual([1])
  })

  it("认 D1 写法", () => {
    const html = ["<p>D1 全国各地✈乌鲁木齐</p>", img(0), "<p>D2 乌鲁木齐-库尔勒</p>", img(1)].join(
      "",
    )

    const { byDay } = assignDayImages(html)

    expect(byDay.get(1)).toEqual([0])
    expect(byDay.get(2)).toEqual([1])
  })

  it("日次标记被标签拆开时仍能认出", () => {
    // mammoth 会把加粗的日次拆成 第<strong>一</strong>天,剥掉标签才看得见。
    const html = ["<p>第<strong>一</strong>天：出发地</p>", img(0)].join("")

    expect(assignDayImages(html).byDay.get(1)).toEqual([0])
  })

  it("剥标签不改变下标,图不会挂错天", () => {
    // 标签换成等长空格,两类标记才在同一条坐标轴上;下标一错图就串位。
    const html = [
      "<p>第一天：甲</p>",
      "<p><em>一段很长很长很长很长很长很长的正文</em></p>",
      img(0),
      "<p>第二天：乙</p>",
      img(1),
    ].join("")

    const { byDay } = assignDayImages(html)

    expect(byDay.get(1)).toEqual([0])
    expect(byDay.get(2)).toEqual([1])
  })

  it("资料含概要与详情两份日程时只认正文那一段", () => {
    const html = [
      "<p>简版行程</p>",
      "<p>第一天：甲</p><p>第二天：乙</p>",
      "<p>详细行程</p>",
      "<p>第一天：甲</p>",
      img(0),
      "<p>第二天：乙</p>",
      img(1),
    ].join("")

    const { byDay, cover } = assignDayImages(html)

    // 概要表在前、跨度小,取跨度最长的那一段;两张图分别属于详情的 D1、D2。
    expect(cover).toEqual([])
    expect(byDay.get(1)).toEqual([0])
    expect(byDay.get(2)).toEqual([1])
  })

  it("没有图片时返回空,不做无谓的扫描", () => {
    const { byDay, cover } = assignDayImages("<p>第一天：甲</p>")
    expect(cover).toEqual([])
    expect(byDay.size).toBe(0)
  })

  it("PDF 没有 HTML,不出错", () => {
    expect(assignDayImages(null).byDay.size).toBe(0)
    expect(assignDayImages(undefined).cover).toEqual([])
  })

  it("认中文数字的两位日次", () => {
    const html = ["<p>第十二天：喀什</p>", img(0)].join("")
    // 单独一段不从 1 起,取不到递增序列,图落到封面而不是挂错天。
    expect(assignDayImages(html).cover).toEqual([0])
  })
})
