---
"@voyant-travel/operations": patch
---

释放占位时不再把班期余位加到超过总容量。

`remaining_pax` 本该是班期的一条不变式——`assertSlotTimingAndCapacity` 在建和改
班期时都拒绝 `remaining > initial`——但占位服务的三条释放路径绕开了这个检查，直接
`remaining_pax + paxCount`。只要出现一次没有对应扣减的归还，班期就会声称有并不存在
的名额，这是实打实的超售：容量看着正常、占位照给、出发时人比车多。

线上确实撞见了：一条 `initial_pax = 6` 的班期停在 `remaining_pax = 12`，而它上面
一条存活占位都没有。`place`/`release` 这一对自身是平的（每条路径都带
`released_at IS NULL` 守卫、并在同一事务里标记已释放），多出来的容量来自这个文件
之外。正因如此，这段算术本身就不该算得出不可能的数——加上上限之后，最坏情况是班期
少记一个名额，而不是凭空多出一个。

`initial_pax` 在同一条 UPDATE 语句里从行上读，对并发占位仍然是安全的。
