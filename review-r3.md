# r3 计划复核证据（2026-11-16）

本记录支撑[验证计划](../../../x86-verification-plan.polished.md)中的范围、接口依赖与验收判断。检查了相关 PR 固定 head 相对 merge-base 的改动、main 的实际调用点、审阅正文和相关失败作业。对 #487/#720 等大分支只检查计划相关接口，不表示完成整份 PR 的正确性审计。本轮没有运行本地 Verus、开放分支组合构建或 QEMU。

最终 main 基线为 [032089aa3d4603fa68f3f874cddfc6d61ff81225](https://github.com/asterinas/vostd/commit/032089aa3d4603fa68f3f874cddfc6d61ff81225)。与前一基线 [8e681282d](https://github.com/asterinas/vostd/commit/8e681282d19b29bdc1b6e715930fe9224a0c88dc) 的 `ostd`/`verified_libs` diff 为空；新增的是 #932 的 dv 内置及构建配置。附录 B 的旧提交引用保留各自实际核对范围，不表示所有文件都与最新 main 逐字相同。

## 固定 PR head

表中为本轮计划相关覆盖复核的固定提交；动态状态另见 `pr-snapshot.js`。catalog 中日期为 2026-11-14 的历史说明保持原 head，不因刷新而改写。#909/#915/#918/#922/#924 等历史记录若与最终 head 不同，页面仍提示覆盖说明待复核；main 中实际消费的接口另按上面的 main 基线检查。

| PR | 本轮复核 head（链接含完整 SHA） | 计划相关覆盖 |
|---|---|---|
| [#408](https://github.com/asterinas/vostd/pull/408) | [050a3e3e87](https://github.com/asterinas/vostd/commit/050a3e3e87350315e65c5c43d9d22eadc3f3a858) | 分页 trait 关联常量（已关闭，由 #928 取代） |
| [#487](https://github.com/asterinas/vostd/pull/487) | [e47182cd13](https://github.com/asterinas/vostd/commit/e47182cd1331f2f4ed9fd0e83ac070fbcd2460fe) | 弱内存、RCU、调度模型；按真实消费者协调，不统一阻塞设备配置 |
| [#505](https://github.com/asterinas/vostd/pull/505) | [cb2be5a80a](https://github.com/asterinas/vostd/commit/cb2be5a80af1fa3286752092ec51f6eb9af29d91) | heap/slab 历史分支；当前冲突，注意 #923 已覆盖的 slot 范围 |
| [#570](https://github.com/asterinas/vostd/pull/570) | [5bdb5d2aad](https://github.com/asterinas/vostd/commit/5bdb5d2aad5273f84cc56097ff906e29ebaa46e5) | TLB tracked helper；与 #677 协调并迁移已清理的接口 |
| [#617](https://github.com/asterinas/vostd/pull/617) | [a00a7b6fa9](https://github.com/asterinas/vostd/commit/a00a7b6fa9546f2b2533a8b0560615f19155da12) | DMA stream helper 层删除与 snapshot 接口重构；与 #883 文件重叠 |
| [#677](https://github.com/asterinas/vostd/pull/677) | [c00f702244](https://github.com/asterinas/vostd/commit/c00f702244e205c0f2394979cfabc356a4acc6ce) | 草稿，通用 TLB 请求/逻辑提交；需补硬件刷新与完成确认 |
| [#706](https://github.com/asterinas/vostd/pull/706) | [7c710f060f](https://github.com/asterinas/vostd/commit/7c710f060f7a5ed3330aba64a9f711e6dd5edac9) | 静态/动态 PIO、MMIO 分配/映射与 x86 PCI read32/write32 底座；多个接口前置，尚未验收 |
| [#720](https://github.com/asterinas/vostd/pull/720) | [f3ca1d7d14](https://github.com/asterinas/vostd/commit/f3ca1d7d142e60dfe7f6adf087cc378e2d98e812) | TypeId/Any 与 frame/page table 的工具链及类型接口改动 |
| [#802](https://github.com/asterinas/vostd/pull/802) | [fa3dbab608](https://github.com/asterinas/vostd/commit/fa3dbab608d15cc740c7bc47c979db5235e07428) | early allocator 实例证明；全局创建/分配及 CPU-local 初始化另补 |
| [#855](https://github.com/asterinas/vostd/pull/855) | [4362ee4b67](https://github.com/asterinas/vostd/commit/4362ee4b67601ef58882aa1fcb38a83fac879de7) | 分页布局公理移除与配置义务（已合入 41ccd7463） |
| [#857](https://github.com/asterinas/vostd/pull/857) | [1594702484](https://github.com/asterinas/vostd/commit/159470248472426adc8dea35711de4cb64975aa1) | unmap 边界、等待和所有权辅助；由页表消费者按需复用 |
| [#860](https://github.com/asterinas/vostd/pull/860) | [63d0612b8f](https://github.com/asterinas/vostd/commit/63d0612b8f860c4ccf329c0fc53769807d790ac5) | RCU/CPU core 模型；与 #922 及 IRQ 资源归属协调 |
| [#879](https://github.com/asterinas/vostd/pull/879) | [6cec73d064](https://github.com/asterinas/vostd/commit/6cec73d064e85b04536d6368b3ad6b249aae5676) | IRQ owner 与 guard 构造；资源创建、恢复与 #900 的状态关系待接线 |
| [#883](https://github.com/asterinas/vostd/pull/883) | [2c6a1a2665](https://github.com/asterinas/vostd/commit/2c6a1a26653c9230780eef5ecd97a19ba0522e75) | DMA stream 同步与设备地址；非当前 BSP 中断里程碑前置 |
| [#887](https://github.com/asterinas/vostd/pull/887) | [a47e745320](https://github.com/asterinas/vostd/commit/a47e745320e96a162052ee7d682a243b93359d2c) | 上下文数据和异常分类；异常构造、FPU、用户态运行仍未覆盖 |
| [#895](https://github.com/asterinas/vostd/pull/895) | [b0db47c885](https://github.com/asterinas/vostd/commit/b0db47c885eb9af77bf53233d0d80c5d277bcf9d) | PCI 数据类型/getter/位操作；当前不提供 IRQ/trap 运行路径 |
| [#900](https://github.com/asterinas/vostd/pull/900) | [c8b604c0ec](https://github.com/asterinas/vostd/commit/c8b604c0ec69db3bdf4bac683c04218ea1184432) | 运行 IRQ/Drop 与 CPU core 模型；执行和 proof state 尚未连接 |
| [#916](https://github.com/asterinas/vostd/pull/916) | [2f3bb906fa](https://github.com/asterinas/vostd/commit/2f3bb906faf644b82c16b00654a1b6e603b30eb0) | PE/COFF 头构建验证（pe_header.rs：八个手写函数、368 字节拼接）；已合入 c25ca6f98，自身改动 9 个文件，不含 CI / Verus patch。 |
| [#919](https://github.com/asterinas/vostd/pull/919) | [d14bae0d0f](https://github.com/asterinas/vostd/commit/d14bae0d0f43d03664ab73240f02da30f17737d5) | x86 PCI 编码；协调 #706/#895 的同名函数、数据类型及模块开关 |
| [#920](https://github.com/asterinas/vostd/pull/920) | [24b4932674](https://github.com/asterinas/vostd/commit/24b49326748e8a1488c4f79d4903be657b9c29df) | AVX/AVX-512F 采样检测；收尾后供 CPU 特性启用消费 |
| [#921](https://github.com/asterinas/vostd/pull/921) | [c2b79a99ac](https://github.com/asterinas/vostd/commit/c2b79a99ac026677dcf035233e3a87b36f2c88ed) | task/kernel_stack 栈大小解析（已合入 97963e831）；复用 vstd_extra 数字助手。 |
| [#923](https://github.com/asterinas/vostd/pull/923) | [38f3177997](https://github.com/asterinas/vostd/commit/38f3177997b09129271cbdebbce9c6243c551542) | heap slot/slot_list；与 #505 重叠，不能替代 early_alloc 或全局分配器 |
| [#927](https://github.com/asterinas/vostd/pull/927) | [32635fe1ea](https://github.com/asterinas/vostd/commit/32635fe1eadb80cc31cf81442ef8b256742d7829) | Pod 与 VM I/O 测试；内容相等及部分成功性断言仍缺证明 |
| [#928](https://github.com/asterinas/vostd/pull/928) | [a5c74965dc](https://github.com/asterinas/vostd/commit/a5c74965dc771bac7c7891b8df5d3f9ab0290664) | PageTableConfig 等改为关联常量（已合入 4676a774b，取代 #408） |
| [#929](https://github.com/asterinas/vostd/pull/929) | [6ea25445de](https://github.com/asterinas/vostd/commit/6ea25445de4dfd9e4a71e11e3dd358e1295d3a26) | 页表、映射与链表证明展开的性能优化（已合入 a78d07377） |
| [#930](https://github.com/asterinas/vostd/pull/930) | [5b25275eda](https://github.com/asterinas/vostd/commit/5b25275eda60df30500cc5d2aea70c0e1d0f97bb) | 已合入 main：verified_bitflags 及页表/PE 头调用更新 |
| [#931](https://github.com/asterinas/vostd/pull/931) | [d30c271708](https://github.com/asterinas/vostd/commit/d30c271708585a0ae89b5eafd1dd795bc98281a9) | to_flat_binary 的逐段扩容/覆盖合同；关联 BZ_RANGE 与 ELF 输入规约 |
| [#932](https://github.com/asterinas/vostd/pull/932) | [d164e5596a](https://github.com/asterinas/vostd/commit/d164e5596a1b6de6345051ffc181395c9229c1e3) | dv 内置与 CI/文档调用调整，已合入 032089aa3 |

## #855 的合入与限定验收

最终 head `4362ee4b67601ef58882aa1fcb38a83fac879de7` 与 squash 合入 [41ccd7463](https://github.com/asterinas/vostd/commit/41ccd7463) 的树 diff 为空。该 head 有[第一份批准](https://github.com/asterinas/vostd/pull/855#pullrequestreview-5901703621)和[第二份批准](https://github.com/asterinas/vostd/pull/855#pullrequestreview-5901839719)，CI 成功。

main 的 [PagingConsts 实现](https://github.com/asterinas/vostd/blob/8e681282d19b29bdc1b6e715930fe9224a0c88dc/ostd/src/arch/x86/mm/mod.rs)提供 `lemma_paging_consts_requirements`；[内核配置](https://github.com/asterinas/vostd/blob/8e681282d19b29bdc1b6e715930fe9224a0c88dc/ostd/src/mm/kspace/mod.rs)和[用户配置](https://github.com/asterinas/vostd/blob/8e681282d19b29bdc1b6e715930fe9224a0c88dc/ostd/src/mm/vm_space.rs)建立 `lemma_page_table_config_constant_requirements`；[页表泛型入口](https://github.com/asterinas/vostd/blob/8e681282d19b29bdc1b6e715930fe9224a0c88dc/ostd/src/mm/page_table/mod.rs)的 `highest_level_index_range` 等实际使用这些合同。配置仍限 4 KiB、8 字节 PTE、至多四层。

因此 `PT_CFG` 限定结项。item 原始转换、unmap 溢出假设与 CR3/TLB 硬件效果均没有被该完成状态覆盖；它们分别进入 `MM_PT`、`PT_X86`。同样，#921 只验收解析/大小界限，#916 只验收 PE 字段构造与长度；相关文件已对照最终 head、合入内容及当前消费者，未把整个栈或 builder 标为完成。

## #706 的接口与真实消费者

最后事实快照截止于 2026-11-16 07:59:40 UTC。#706 的 `477db699e → 7c710f060` 合入 main，并将 allocator 的 `PageFlags::RW()` 改为关联常量；IO 合同没有新增变化。#895 的 `738a8122f → b0db47c88` 只合入 main，PCI 代码未变；#883 的 `5d3f34d18 → 2c6a1a266` 合入 main 并对齐 `AnyFrameMeta` import，slice 证明未新增。上述覆盖说明在复核这些增量后更新。

[io_mem/allocator.rs](https://github.com/asterinas/vostd/blob/7c710f060f7a5ed3330aba64a9f711e6dd5edac9/ostd/src/io/io_mem/allocator.rs)中的 `IoMemAllocatorBuilder::new/remove` 是局部窗口资源合同，`remove` 消费 `can_remove`、`state_matches`、`io_mem_range_registered`。[arch/x86/io.rs](https://github.com/asterinas/vostd/blob/7c710f060f7a5ed3330aba64a9f711e6dd5edac9/ostd/src/arch/x86/io.rs)的 `construct_io_mem_allocator_builder` 仍没有引导区域与 registry 相等证明。

[io_port.rs](https://github.com/asterinas/vostd/blob/7c710f060f7a5ed3330aba64a9f711e6dd5edac9/ostd/src/io/io_port.rs)将静态端口合同与动态 acquire/claim/release 区分。硬件全宽上界为 `port + size <= 65536`，`new` 另有端点 `<=65535` 的更强条件。PIC/PIT/PCI 静态访问不消费全局 allocator 的初始化。相关审阅：[宽度模型](https://github.com/asterinas/vostd/pull/706#discussion_r4559437004)、[重叠端口上界](https://github.com/asterinas/vostd/pull/706#discussion_r4560880943)。head 已补条件/说明，尚无新的批准。

[io_mem/mod.rs](https://github.com/asterinas/vostd/blob/7c710f060f7a5ed3330aba64a9f711e6dd5edac9/ostd/src/io/io_mem/mod.rs)的 `IoMem::new` 使用 `KVirtArea::map_untracked_frames`，形式 requires 没有 registry 条件；unsafe 设备区域合法性仍需来源。设备读写的 `obeys_vmio_*` 为 false，new/acquire 与访问仍有外部边界；Drop 不回收 MMIO。#706 没修改 BAR 主体，所以 `PCI_BAR` 只复用它。

固定 head 的 x86 验证成功；[失败作业一](https://github.com/asterinas/vostd/actions/runs/43826147600/job/133160348725)和[失败作业二](https://github.com/asterinas/vostd/actions/runs/43826147600/job/133160348840)均报 `ostd/src/cpu/set.rs:300 assert(bit_at(seq,j))`。仅确认日志位置，未做根因隔离实验。非 x86 失败不改变本次范围。

## 依赖纠正的源码位置

| 消费者 | 已核对接口/行为 | 固定来源 |
|---|---|---|
| APIC | probe 只读 CPUID；xAPIC init 保留窗口再发布；寄存器用物理线性映射 | [apic/mod.rs](https://github.com/asterinas/vostd/blob/8e681282d19b29bdc1b6e715930fe9224a0c88dc/ostd/src/arch/x86/kernel/apic/mod.rs) |
| IRQ 回调锁 | `WriteIrqDisabled` 读侧禁抢占、写侧禁 IRQ | [sync/guard.rs](https://github.com/asterinas/vostd/blob/8e681282d19b29bdc1b6e715930fe9224a0c88dc/ostd/src/sync/guard.rs)、[trap/irq.rs](https://github.com/asterinas/vostd/blob/8e681282d19b29bdc1b6e715930fe9224a0c88dc/ostd/src/trap/irq.rs) |
| CPU-local | `get_with`、`get_on_cpu` 与 `CpuLocalCell` 合同不同，不能统一等待同一 guard | [cpu/local](https://github.com/asterinas/vostd/tree/8e681282d19b29bdc1b6e715930fe9224a0c88dc/ostd/src/cpu/local) |
| KernelStack | `flush_tlb` 明确调用 `tlb_flush_addr_range(&self.kvirt_area.range())` | [kernel_stack.rs](https://github.com/asterinas/vostd/blob/8e681282d19b29bdc1b6e715930fe9224a0c88dc/ostd/src/task/kernel_stack.rs) |
| processor | current/previous Task 的 Arc、独占运行权、延迟释放、RCU；调度 hook 由客户注入 | [processor.rs](https://github.com/asterinas/vostd/blob/8e681282d19b29bdc1b6e715930fe9224a0c88dc/ostd/src/task/processor.rs) |
| SMP | CALL_QUEUES 跨核访问；API 注释允许不执行；init 消费硬件 CPU-ID 映射 | [smp.rs](https://github.com/asterinas/vostd/blob/8e681282d19b29bdc1b6e715930fe9224a0c88dc/ostd/src/smp.rs)、[boot/smp.rs](https://github.com/asterinas/vostd/blob/8e681282d19b29bdc1b6e715930fe9224a0c88dc/ostd/src/boot/smp.rs) |
| PCI | new 初始化 BAR/capability；MSI-X 使用 IoMem 和 IrqLine；普通 capability 无环检测 | [common_device.rs](https://github.com/asterinas/vostd/blob/8e681282d19b29bdc1b6e715930fe9224a0c88dc/ostd/src/bus/pci/common_device.rs)、[capability](https://github.com/asterinas/vostd/tree/8e681282d19b29bdc1b6e715930fe9224a0c88dc/ostd/src/bus/pci/capability) |
| HPET | 直接 VolatileRef/paddr_to_vaddr；new 调 map_isa_pin_to(irq,0)，带 FIXME | [hpet.rs](https://github.com/asterinas/vostd/blob/8e681282d19b29bdc1b6e715930fe9224a0c88dc/ostd/src/arch/x86/timer/hpet.rs) |
| DMA | map/coherent/registry 有被注释执行动作；protect_flush_tlb 只做本地 range.start 刷新 | [dma](https://github.com/asterinas/vostd/tree/8e681282d19b29bdc1b6e715930fe9224a0c88dc/ostd/src/mm/dma)、[page_table/mod.rs](https://github.com/asterinas/vostd/blob/8e681282d19b29bdc1b6e715930fe9224a0c88dc/ostd/src/mm/page_table/mod.rs) |

这些源码含关闭或注释的执行路径；计划将其恢复、合同和实际接线列为待完成工作，未当成已经可执行的验证结果。每条边的详细 `need/ev/missing` 保存在计划附录 B。

## 审阅、CI 与新增 head

#802 的 [Layout 评论](https://github.com/asterinas/vostd/pull/802#discussion_r4520760944)及[后续解释](https://github.com/asterinas/vostd/pull/802#discussion_r4520877758)对应 head 已把 valid_layout 放入 exec `Layout::size` 后置条件，旧 proof 公理已去除；尚缺审阅者接受。#879 已处理 owner/coherence 的部分历史意见，#900 已撤回 IRQ guard 禁抢占 fallback；不能把被撤回的实现保留在路线里。#887 的重复 cpu_count/returns 意见已修改，accessor 取舍仍缺审阅确认。

#860 的 [IRC11 作业](https://github.com/asterinas/vostd/actions/runs/43140246165/job/130925206177)报 `irc11.rs:38 E0432`，缺失 `NonNullPtrRef`。GitHub 的 DIRTY 是另外的合并冲突事实。#487 的 `Task::current` 返回空 CurrentTask、禁抢占带 unsound 标记，无法供应实际运行合同。

#927 的 `bb524ccfad → 32635fe1ea` 增量含合入 main，以及 [dv/src/doc.rs 的包名环境变量修复](https://github.com/asterinas/vostd/commit/32635fe1eadb80cc31cf81442ef8b256742d7829)；`mm/test.rs`、Pod 测试及 Vec 规约未增加证明。最新 [x86 CI](https://github.com/asterinas/vostd/actions/runs/43824466981/job/133154857239)通过，注释断言/ktest 的缺口仍在。

#931 的 [to_flat_binary](https://github.com/asterinas/vostd/blob/d30c271708585a0ae89b5eafd1dd795bc98281a9/ostd/libs/linux-bzimage/builder/src/lib.rs)保证 `ret@ == flat_binary_spec`，输入和结果规格当前私有，`make_bzimage` 尚未验证；[ELF 外部规约](https://github.com/asterinas/vostd/blob/d30c271708585a0ae89b5eafd1dd795bc98281a9/verified_libs/vstd_extra/src/external/xmas_elf.rs)仍为可信解析。算法的新扩展部分清零，重叠段 memory-only tail 保留旧字节。

`e3f13f01d → d30c27170` 只恢复了[审阅要求的原注释](https://github.com/asterinas/vostd/pull/931#discussion_r4582797497)，无新批准。[与 #927 重复 Vec::index_mut 的评论](https://github.com/asterinas/vostd/pull/931#discussion_r4582813072)明确说“only a comment, not a change request”。因此只记录外部规约协调，不增加整份 PR 的阻塞边。

#932 的 dv/CI/Makefile/README 改动在最终 head 与合入提交一致，主仓库从此包含 dv；默认验证仍选择 ostd。#930 的关联常量改动也已检查 PE 头消费者。两者是集成基线变化，均不提供新的硬件正确性合同。

三条待确认边缺少的证据分别是客户调度 hook、编码 payload 的外部构建链、DMA cache-policy 的并发/平台条件。平台接线、NMI/错误码、最终 ELF/linker/启动配置和开放分支组合结果另列为验收问题，不补造依赖。

任务范围补充：main 的 [task/mod.rs](https://github.com/asterinas/vostd/blob/8e681282d19b29bdc1b6e715930fe9224a0c88dc/ostd/src/task/mod.rs)::TaskBuilder::build 分配 KernelStack、复制 UserContext TLS 并设定 `end_vaddr()-16` 的 SP；kernel_task_entry 调用 after_switching_to 和退出路径。[scheduler/mod.rs](https://github.com/asterinas/vostd/blob/8e681282d19b29bdc1b6e715930fe9224a0c88dc/ostd/src/task/scheduler/mod.rs)::set_need_preempt 的远端分支调用 inter_processor_call；[fifo_scheduler.rs](https://github.com/asterinas/vostd/blob/8e681282d19b29bdc1b6e715930fe9224a0c88dc/ostd/src/task/scheduler/fifo_scheduler.rs) 通过禁抢占/禁 IRQ guard 选择和锁定队列。这些实际执行组合归 TASK_COMPOSE，TASK_RUNTIME 继续独立提供 current-task/park 状态合同。
