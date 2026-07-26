import { describe, expect, it } from "vitest"

import { isFamilyNameFirstLocale, orderNameFields, personDisplayName } from "./person-name.js"

// Booking surfaces used to render every name as `[firstName, lastName].join(" ")`,
// so a correctly-stored Chinese contact (firstName "伟", lastName "张") showed up
// reversed and space-separated as "伟 张" throughout the journey and the detail
// pages. Capture/storage were never wrong — only the rendering was.
describe("personDisplayName", () => {
  it("renders a CJK name family-name-first with no separator under zh", () => {
    expect(personDisplayName({ firstName: "伟", lastName: "张" }, "zh-CN")).toBe("张伟")
  })

  it("renders a western name given-name-first under en", () => {
    expect(personDisplayName({ firstName: "Ana", lastName: "Pop" }, "en-GB")).toBe("Ana Pop")
  })

  it("keeps western order for a latin name even under zh", () => {
    expect(personDisplayName({ firstName: "Ana", lastName: "Pop" }, "zh-CN")).toBe("Ana Pop")
  })

  it("returns an empty string for a missing record so callers can fall back", () => {
    expect(personDisplayName(undefined, "zh-CN")).toBe("")
    expect(personDisplayName({ firstName: "", lastName: null }, "zh-CN")).toBe("")
  })

  it("falls back to western order when no locale is supplied", () => {
    expect(personDisplayName({ firstName: "Ana", lastName: "Pop" })).toBe("Ana Pop")
  })
})

// Field ORDER is a property of the reader, not of the data: the boxes must be
// 姓 then 名 for a zh operator even before anything has been typed, otherwise a
// left-to-right reader types 张 into the 名 box and corrupts the record.
describe("name field order", () => {
  it("puts the family-name control first for zh / ja / ko", () => {
    for (const locale of ["zh", "zh-CN", "ja-JP", "ko-KR"]) {
      expect(isFamilyNameFirstLocale(locale)).toBe(true)
      expect(orderNameFields(locale, "given", "family")).toEqual(["family", "given"])
    }
  })

  it("keeps the given-name control first everywhere else", () => {
    for (const locale of ["en", "en-US", "ro-RO", undefined]) {
      expect(isFamilyNameFirstLocale(locale)).toBe(false)
      expect(orderNameFields(locale, "given", "family")).toEqual(["given", "family"])
    }
  })
})
