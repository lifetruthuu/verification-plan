# VOSTD x86 验证计划

<!-- BEGIN GENERATED:meta -->
计划版本 r4（2026-11-16）· 源码基线 main [`032089aa3`](https://github.com/asterinas/vostd/commit/032089aa3d4603fa68f3f874cddfc6d61ff81225) · 仪表盘快照 2026-11-13 17:44（北京时间）（`90087275e`）· 104 个工作项、194 条依赖
<!-- END GENERATED:meta -->

本次范围是先完成 x86 验证，按 x86 平台、独立的 bzImage、OSTD 公共模块三条路线推进。RISC-V、LoongArch 适配与多架构迁移不纳入本次计划。bzImage 只在最终镜像、运行与范围验收处连接 x86；它的解析、格式、压缩与 setup 局部证明可以独立开展。

复核日期为 2026-11-16，main 固定在 `032089aa3d4603fa68f3f874cddfc6d61ff81225`。该提交合入 #932，将 dv 纳入主仓库；与此前审查基线 `8e681282d` 相比，`ostd` 和 `verified_libs` 没有变化。依赖表保留实际核对的旧提交，固定源码和审阅链接见[复核证据](review-r3.md)。PR 状态由独立快照提供，历史覆盖说明绑定各自的 `reviewedHead`。本轮执行固定源码、PR 增量、审阅和 CI 证据核对，没有重跑本地 Verus、组合构建开放分支或启动内核；已有 CI 结果不代表这些分支已经组合成功。

## 0. 本次修订（r4，沿用 r3 源码复核）

r4 修正前置交付与页面状态的联动。此前将所有可局部证明的工作显示为“可开始”，掩盖了尚未交付的确认前置。现在这些工作显示“前置待交付”；全部确认前置都有显式验收记录或无确认前置时才显示“前置就绪”。开放 PR 继续显示所缺合同。本版调整状态规则，源码与 PR 覆盖依据仍为 r3 的复核记录。

#855 已合入 `41ccd7463`。复核最终 head、合入内容和 main 的实际消费者后，`PT_CFG` 按分页配置合同限定结项；#928 的关联常量和 #929 的证明展开也已核对。原始 item 转换、通用页表操作、CR3 和 TLB 效果分别由 `MM_PT`、`PT_X86` 等项承担。#921 的栈大小解析、#916 的 PE 头字段与长度构造也按各自限定交付结项，可信输入在附录 C 登记。

#706 确实是多项验证的接口底座。原来单一的“IO 分配器”已区分 `IO_PIO`（静态端口）、`IO_PIO_ALLOC`（动态分配与释放）、`IO_ALLOC`（MMIO 窗口资源）、`IO_MMIO`（映射与访问）、`IO_GLOBAL`（全局初始化）；`IO_WIN` 负责引导窗口的来源。PIC、PIT、PCI 配置访问只消费静态 PIO 合同，APIC 探测只消费 CPUID。xAPIC/IOAPIC 的窗口保留、PCI BAR 映射才分别消费它们实际需要的资源合同。

依赖已按消费者接口重写。移除 `PT_CFG → PT_X86`，将 `TASK_RUNTIME → TASK_SW`、`PT_X86 → TASK_STACK_ALLOC` 核实为验收前置；CPU-local 拆出本地借用、远端共享和单指令 Cell，AP 初始化拆出 CPU 特性启用，deadline timer 拆出频率值合同。组合项也可提前准备合同和测试，因此本版没有证据充分的“局部工作完全不能开始”关系。所有确认边约束最终验收，三条待确认关系不算开工阻塞。

范围补齐了 MM frame/页表/KVirtArea/初始化、内核线性映射缺页、动态 CPU-local、锁 guardian 与等待接口、任务资源交接、PCI 完整设备构造、DMA coherent/映射登记和公共 API 清单。r2 放到后续的七项工作保留 ID 迁回当前范围。`PITIRQ` 只表示首个 BSP 外部中断闭环；新增 `ACC_SCOPE` 验收整个当前范围，不能用这个阶段目标代替 x86 完成。

## 1. 路线与依赖口径

| 路线 | 主要交付 | 跨路线接口与最终验收 |
|---|---|---|
| x86 平台 | APIC/IOAPIC/PIC/PIT/HPET、ACPI、IRQ/描述符表/陷阱、CPU 身份、时间、SMP、FPU/syscall/context switch、页表硬件操作 | 消费公共 IO、存储、guard、任务、TLB 接口；形成中断、故障恢复、AP 与用户态场景 |
| bzImage | ELF/映射输入、PE 头、flat binary、输出、编码、setup/BootParams | 最终产物检查消费 x86 汇编符号、入口与 ExTable；独立验证 builder 与 setup |
| OSTD 公共模块 | IO、PCI、MM、CPU-local、task、sync、DMA/heap、通用 boot 和残留 API | 按实际调用者交付可组合合同；硬件、固件及客户回调输入明确登记 |

确认一条关系，必须指出消费者需要哪个接口合同、资源或状态，以及固定源码中的使用位置。共同涉及一个模块、普通函数调用和运行时初始化顺序都不足以证明开工阻塞。局部证明可把必要条件写成 `requires`；最终验收必须交代这些条件由哪个真实调用者、前置合同或明确可信输入建立。

`gate=accept` 表示验收前置；`gate=start` 仅用于缺少前置便连局部工作也无法开始的情形，本版没有使用。`needsInf` 表示推断或待确认，须写缺失证据。图的“关系层”包含这些未确认关系，仅用于布局，不是排期，也不限制 PR 合并顺序。不同层仍可并行。

页面状态依次判定为：显式 `done` 则已完成；有开放实施 PR 则 PR 进行中，同时列出未交付前置；其余工作有未交付的开工前置则开工受阻，只有未交付的验收前置则前置待交付，全部确认前置已验收或无确认前置才前置就绪。前置待交付可以先做条件证明，但组合验收仍须等待合同交付。待确认关系始终另列，不能据推断认定确定阻塞；前置就绪只针对已确认关系。

`IO_PIO` 尚未验收，因此 `PIC`、`PIT_CFG` 等待其交付；记录静态 PIO 合同的完成证据后才转为就绪。`PCI_CFG` 有开放 PR，但仍缺 `IO_PIO` 和 `PCI_ENC`，其中一个交付不能解除另一个。#855 的 `PT_CFG` 已按配置合同验收，其消费者无需再等这一合同；`MM_PT` 仍需 `MM_FRAME`。PR 审阅、CI 和合并冲突独立展示；`UNKNOWN` 保持未知，`BLOCKED` 只是 GitHub 门禁汇总。PR 合并不自动填写 `done`，也不自动解除消费者依赖。

## 2. 范围与完成条件

每项适用附录 A 的具体交付和公共验收规则：真实执行 API 的前后置、成功/失败与释放效果、至少一个实际消费者的使用证据、固定提交及相应验证结果，并记录剩余可信输入。注释掉的执行代码、`unimplemented!()`、仅描述结构有效的后置条件和未说明的外部体不能算完成。局部已有证明直接复用，不要求整个模块从头验证。

架构专属 `arch/<arch>/boot`、`arch/<arch>/iommu`、`arch/x86/tdx_guest.rs` 和 `ostd-macros` 沿用明确可信边界；引导内存、初始 CPU 状态、IRT、TDX 与宏生成接口必须写出消费条件。通用 `ostd/src/boot`、`mm/dma`、`cpu/local` 和 `linux-bzimage/setup` 仍在当前范围。固件真实性、硬件指令效果和用户提供 allocator/调度回调可作为具体外部输入，OSTD 的软件包装、权限交接和占位代码不能整块豁免。

`MM_FRAME` 负责 frame/segment 元数据与所有权，`MM_PT` 负责 map/unmap/protect/query 和原始转换，`MM_KVA` 负责区间与映射生命周期，`MM_BOOT` 建立全局分配、页表和线性映射。`paddr_to_vaddr` 的加法结果不足以说明地址可解引用。内核线性映射缺页归 `KFAULT_MAP`，用户可失败复制的 ExTable 恢复归 `F_RECOVER`，两条分支分别验收。

PCI 按类型、编码、配置事务、location 枚举、BAR、capability、MSI-X、完整设备构造和中断组合划分。`PciCommonDevice::new` 实际会初始化 BAR/capability/MSI-X，因此枚举循环可先使用给定构造合同，完整设备验收交给 `PCI_DEVICE`。capability 原代码没有环检测，须给出设备链无环前提或另行决定行为修复。MSI 目前只有标记；不能把 MSI-X 编码等同于完整 MSI 或 IOMMU 生命周期。

`DMA_MAP` 补上 coherent、registry、cache policy、映射与释放。main 仍注释了 mapping-set 插入和部分硬件映射动作，`dma_type` 仍是占位；这些是明确的工作缺口。`SA_DMA` 保留 stream slice 同步与地址合同。对 CPU/设备一致性和设备完成的条件须分别说明，返回 `Ok(())` 不足以证明设备已经完成访问。

`COMMON_AUDIT` 覆盖尚未单列的 `cpu/set`、`user::UserMode`、timer/jiffies、console/logger/panic、util 与辅助库入口。它必须把缺口归属到可执行工作项并关闭，不能仅提交一张清单便验收。`ACC_SCOPE` 在同一集成提交核对所有当前项、启用路径、验证命令和运行产物。仪表盘仍使用 2026-11-13 的 LOC 基线，仅辅助估量，不能据颜色认定 API 已完成。

## 3. 并行推进与近期投入

P0 优先收敛 #706 的各个最小接口、#879/#900 的 IRQ 权限连接、#802 的实例到全局内存交接，以及 #887 的数据合同。现有 #919/#920 的编码和特性检测可按限定范围独立收尾；不设置“这些 PR 全合入后才启动 x86”的门槛。

PIC、PIT 配置和 PCI 配置访问可以并行，分别使用同一份静态 PIO 合同。APIC 模式探测、IDT 构表、ACPI 表读取、FPU 布局、低层 context-switch ABI、页表硬件包装和 bzImage 各入口也可独立开展。IOAPIC 寄存器证明可从给定窗口出发，MADT 与实际窗口的一致性在 `ROUTE_MAP` 验收；BAR 探测从给定 location 出发，无需完整 PCI 枚举。

P1 的 `PITIRQ` 验收实际 PIT 编程产生 IRQ0，到路由、IDT/汇编入口、回调、EOI、恢复与解除映射的完整路径，限定非 TDX BSP 平台。P2 的时间与故障恢复链、P3 的 AP/IPI/TLB/用户态组合可以同步准备条件证明和运行工具；这些优先级是投入建议，不是额外依赖。bzImage 的工作量也不由这些阶段排序。

## 4. PR 与实际覆盖

| PR | 本轮核对的事实 | 对计划的影响 |
|---|---|---|
| #855 / #928 / #929 | #855 已合入，配置义务和泛型消费者接通；后两项分别为关联常量和证明展开 | `PT_CFG` 限定完成；原始 item 转换、unmap、寄存器与失效另项验收 |
| #706 | builder 局部 new/remove 已证；全局登记、IoMem 访问与生命周期仍有可信缺口；静态 PIO 与动态 allocator 不同 | 多个真实接口前置；PCI BAR 仅复用该 PR，不计作已实施 BAR 证明 |
| #879 / #900 | owner/new 有局部证明，公开入口、owner 来源、Drop 和 trap 连接仍缺；#900 已撤回禁抢占 fallback | IRQ 模型/创建/恢复与 `PREEMPT_PIN` 分别交付，不能据旧 PR 标题安排 |
| #802 | 实例 alloc/allocated_regions 已证，Layout 条件已移到 exec `Layout::size` 合同；未获得新的批准 | 拆分 `LOC_ALLOC` 与 `LOC_EARLY_GLOBAL`，全局独占可写内存另证 |
| #887 | 上下文数据/异常分类；FPU、异常构造、分派、UserMode 未覆盖 | `TRAP_DATA` 单独交付；accessor 意见仍缺审阅者确认 |
| #921 / #916 | 栈大小解析、PE 字段及 368 字节长度合同已合入并复核消费者 | `TASK_STACK`、`BZ_PE` 限定完成；分配/映射和完整 builder 另验收 |
| #677 / #570 | 请求/逻辑提交模型；`TlbFlusher::new` 已证，具体可信构造器为 `OpsStack::new` | 不依赖整个 PageTableConfig；真实刷新、完成确认与保留 frame 分项 |
| #860 / #487 | RCU context/回收模型尚缺运行连接；#487 有禁抢占 unsound 标记及 current-task 桩 | 可作模型参考，不能当作可用调度运行时；#860 的 CI 失败与冲突分别记录 |
| #927 | 最新 `32635fe1e` 合入 main，并为直接 rustdoc 设置包名；测试证明范围未新增 | 内容/成功/复制量断言及 ktest 属性仍未完整恢复；CI 通过不代表故障恢复闭环 |
| #931 | 最新 `d30c27170` 恢复原注释，局部 flat-binary 合同不变，尚无新批准 | 关联 `BZ_RANGE`/`BZ_ELF`；与 #927 只协调重复 Vec 规约，不形成整个测试 PR 的依赖 |
| #930 / #932 | bitflags 关联常量更新；dv 内置及构建/CI 配置调整 | 已体现在 main 基线；保持消费者与工具入口一致，不增加模块间开工依赖 |

#706 的最新 head `7c710f060` 合入 main 并对齐关联常量，接口合同未变；x86 作业通过，两个非 x86 目标仍失败于 `cpu/set.rs:300` 的 `assert(bit_at(seq,j))`。这只是日志定位，根因尚未实验确认。宽度/重叠端口审阅已有代码回应，但 GitHub 仍为要求修改。#895/#883 也已核对合入 main 后的最新 head，分别保持 PCI/slice 证明范围。#860 的 IRC11 作业失败于 `irc11.rs:38` 导入不存在的 `NonNullPtrRef`，同时存在合并冲突，两者各自需要处理。上述 CI 事实不把多架构适配纳入本计划。

## 5. x86 工作包与组合验收

阶段 A 交付资源与 CPU 状态接口。IRQ 模型先确定 IF、嵌套深度与恢复权，公开 guard 入口要能取得 owner；CPU-local 存储先以早期独占内存初始化，再建立 GS/CPU 身份。本地 `get_with`、跨核 `get_on_cpu`、单指令 `CpuLocalCell` 消费不同合同，不能统一等待一个大型 accessor 证明。`WriteIrqDisabled` 写侧禁 IRQ、读侧禁抢占，`SYNC_GUARD` 负责把锁证明与真实 guard 生命周期连接。

阶段 B 组合设备与中断。APIC 探测独立，xAPIC 发布分支须先保留窗口，x2APIC 不消费这个条件。IOAPIC 寄存器、重定向项和固件路由分开验收。IDT 构表、发布/lidt、GDT/TSS、异常构造与 trap 分派分别给出合同。`IrqLine` 必须覆盖回调注册、clone、注销、最后句柄释放及并发存活，才能供应 timer、IPI 和 PCI。HPET 使用 `VolatileRef + paddr_to_vaddr`，不经 IoMem；完整构造调用 ISA 路由且源码有接线 FIXME。

阶段 C 组合时间、故障恢复、多核与任务。deadline 消费 `TSC_VALUE`，完整 PIT 回退留在 `CAL_FREQ`；AP 特性启用归 `CPU_ENABLE`，无需等待全部 FPU save/load。IPI API 本身允许异步且可能不执行，TLB shootdown 必须另证完成协议与进展，不能从函数名推得 ACK。任务低层 ABI 归 `TASK_CTX`，processor 组合消费 task 存活/唯一运行权、栈刷新、RCU 和 IRQ 权限；注入的调度 hook 是否切换地址空间仍待具体客户证据。

## 6. bzImage 独立路线

`BZ_ELF` 建立解析与 program-header 条件来源，`BZ_RANGE` 处理 VA/文件偏移和 flat binary，`BZ_OUT` 证明实际 `make_bzimage` 输出，`BZ_IMG` 检查产物区间、加载地址和 setup 协议。#931 的算法按源段顺序扩容/覆盖：新追加字节清零，重叠段的 memory-only tail 可以保留旧字节。原注释、单个后置条件或一般 ELF 常识不能替代选定链接布局的非重叠证据，也不能擅改算法以符合计划。

`make_bzimage` 只读取已链接 setup ELF，没有调用 `encode_kernel`。Raw/Gzip/Zlib 的编码合同独立交付，编码结果如何进入 setup payload 的外部构建链仍待确认。`BZ_SETUP` 纳入当前范围，验证所选启动模式的加载、清零、入口与 BootParams；EFI/固件/解压库条件逐项登记。最终 ExTable/ABI 检查只要求实际汇编符号和内核链接产物，不要求 `F_RECOVER` 先证明完成。

## 7. 公共模块与 PR 复用

页表常量、栈解析、heap slot、RCU token、VM I/O 边界等已有合同按固定版本复用。CPU-local 初始化仍需要全局 early allocator 提供跨次不重叠的可写区域；heap slot 不能替代它。Box/Vec 的局部消费者可以使用明确 alloc 外部规约，OSTD 全局 heap/frame 包装仍在范围内。

任务的 current-task/调度注入/park-unpark、`WaitQueue`、Mutex/RwMutex/RwArc 分别验收。局部等待证明可采用给定的切换合同，最终资源交接在 `TASK_SW` 组合。`TASK_COMPOSE` 另验收 TaskBuilder 的栈/SP/TLS、首次执行与退出、内置 FIFO 和实际调度；远端 `set_need_preempt` 消费 SMP IPI 的回调合同，因此保留真实跨路线关系，同时不让 current-task 的消费者等待完整调度路径。RCU `finish_grace_period` 的实际调用属于任务切换验收，不要求所有设备配置先完成 RCU。

逐 PR 的固定 head、差异与审阅证据见[复核记录](review-r3.md)，动态状态见 `pr-snapshot.js`。未重新检查对应 head 的历史覆盖说明保留原文，并显示待复核；本地旧分支不能作为完成证据。

已检查但未关联为工作项的历史记录：

<!-- BEGIN GENERATED:candidates -->
- [#930](https://github.com/asterinas/vostd/pull/930)（2026-11-16 复核，head 5b25275eda60df30500cc5d2aea70c0e1d0f97bb，未关联）：已合入 main 8e681282d19b29bdc1b6e715930fe9224a0c88dc；verified_bitflags 宏及 x86 页表/PE 头调用改为关联常量，移除旧 lint 与标注；pe_header 的长度/字段合同保留。该实现更新不增加依赖；涉及 flags 的开放分支需对齐本基线。
<!-- END GENERATED:candidates -->

## 8. 验证与维护

后续证明提交先用 `cargo dv focus --package ostd -- --verify-only-module <module_path>` 迭代，再按仓库要求运行 `make`。builder 独立使用 `cargo dv verify -p linux-bzimage-builder --target x86_64-unknown-linux-gnu`；默认 make 和现有 verify action 选择 `ostd`，不能将其 CI 结果当作 builder/setup 验证结果。setup 还需选定启动模式和对应构建/验证入口。#932 后 dv 已内置，`make fmt` 同时格式化 dv。

最终交付记录固定集成提交、工具链、目标平台和验证命令，并提供实际内核 ELF、链接脚本、镜像 manifest 与可复现运行目标。仓库尚无现成 QEMU 启动验收目标，`ACC_RUN` 负责建立；形式证明和运行观测分别记录。新增 external_body/assume/admit 仍遵守仓库约束，本计划对现存边界的登记不构成新增可信代码授权。

计划数据维护见 [README](README.md)（含 PR 变化、验收、调整依赖链、新增或拆分工作项的操作步骤）。数据按变化频率分文件：工作项内容、依赖表、验收记录、PR 目录与变更记录；PR 事实来自快照。保留稳定 ID，调整计划时用 `plan.mjs` 修改依赖并自动写入变更记录，常用命令：

```sh
node plan.mjs sync   # 刷新 PR 快照、重新生成文档块、校验，并列出需要人来判断的事项
node plan.mjs check  # 校验数据、依赖依据、变更记录与本文件的一致性
node plan.mjs help   # 其余命令：show / impact / edge / accept / pr / rev / log
```

## 9. 仍待确认

图中保留三条待确认关系：`PT_X86 → TASK_SW` 缺少实际客户调度 hook 的地址空间切换合同；`BZ_ENCODE → BZ_IMG` 缺少外部编码、链接与 payload manifest；`TLB_SHOOT → DMA_MAP` 缺少 DMA 非一致性 cache-policy 路径的并发访问及平台一致性条件。现存 `protect_flush_tlb` 注释实现只做本地 `tlb_flush_addr(range.start)`，不能推定已有远端完成协议。这些关系均不限制局部开工。

平台证据仍缺实际 MADT、PIT IRQ0/HPET 接线、极性与触发模式、NMI 与现代异常错误码/栈布局、CPU/设备进展条件；最终内核 ELF、ExTable 链接、启动模式和 QEMU 配置也待确定。IO 全局资源、early allocator 的线性权限及 IRQ owner 来源是明确待交付的证明义务，不能作为已提供的输入使用。

#802 的 Layout 修复、#887 的 accessor 取舍和 #931 的注释恢复尚缺新的审阅确认；#706 的失败根因、各开放分支在当前 main 上的组合验证也尚未完成。这些是 PR 审阅/CI 或集成问题，分别跟踪，不转换成没有源码依据的模块依赖。

## 附录 A：工作项与验收

以下条目与页面共用 `plan-data.js`；公共验收规则和每项限定条件一起适用。

<!-- BEGIN GENERATED:items -->
每项交付 todo 指定的真实执行 API/合同、至少一个实际调用者的前置建立与结果使用证据、固定提交和适用验证命令结果；成功/失败/资源释放与剩余可信输入逐项记录。requires 可支持局部证明，最终验收须说明其来源。只写纯规格、保留未说明的注释/桩、PR 合并或 CI 通过均不自动结项。已完成项按其明确限定交付评定。

#### x86 平台

**IO_WIN** — 引导 MMIO 窗口 → 登记权限

- 实施 PR：—；复用 / 协调：#706；模块：boot/memory_region、arch/x86/io
- 要做什么：construct_io_mem_allocator_builder 从 EARLY_INFO.memory_regions 筛选区域并计算低、高 MMIO 窗口；目前未被验证，也没有建立与 registered_io_mem_windows() 的相等关系（arch/x86/io.rs，#706 head 44061a4945）。 #706 对 x86 builder 构造函数本身的改动不足以建立这条端到端关系；MemoryRegion 的局部证明补不出固件布局的真实性。
- 验收 / 限定：交付：builder 返回的权限与实际引导 MMIO 窗口一一对应的证明。窗口列表来自未纳入计划的 arch/x86/boot，属可信边界 TB_BOOT_INPUT；动态显式释放资格仍须逐消费者验收。
- 前置：IO_ALLOC（确认 · 验收前置）

**IRQ_MODEL** — 统一 IRQ 状态模型

- 实施 PR：#879、#900；复用 / 协调：—；模块：trap/irq、arch/x86/irq
- 要做什么：确定同一 CPU 的 IF 状态、IRQ 嵌套和恢复权限由谁拥有。 #879 用 LocalIrqGuardOwner / CpuLocalAuth<bool>（specs/task/irq.rs @6cec73d064），#900 用 CpuCoreOwner / LocalIrqGuardToken（specs/task/cpu_core.rs @c8b604c0ec）：两者没有相互转换的不变式，需选统一状态或建立显式关联不变式。
- 验收 / 限定：交付统一的 IF/嵌套深度/恢复权限状态及 #879 owner 与 #900 CpuCoreOwner 的关联不变式，供 IRQ_GUARD、IRQ_DROP 和 trap 入口建立转换。逐个状态转移验证一致性，不能只保留互不相关的两个模型；初始 CPU 状态与硬件 IF 指令分别由 TB_BOOT_INPUT/TB_HW_OPS 记录。#900 已撤回禁抢占 fallback，不能据旧标题计入交付。
- 前置：无

**IRQ_GUARD** — IRQ guard 创建与嵌套

- 实施 PR：#879、#900；复用 / 协调：—；模块：trap/irq
- 要做什么：验证 guard 的创建与嵌套。main 的 new 是 external_body；#879 已证明私有 new 的保存 IF / 深度更新，公开 disable_local 仍 external，owner 没有构造器。
- 验收 / 限定：交付真实 disable_local 入口的 owner 来源、保存 IF、增加嵌套深度和 guard 唯一权限，供 CPU-local/锁调用者使用；构造失败及重复禁用不能伪造恢复权。私有 new 已证不足以关闭公开 external 入口；硬件 IF 操作属 TB_HW_OPS。
- 前置：IRQ_MODEL（确认 · 验收前置）

**IRQ_DROP** — guard 转移、释放与恢复原 IF

- 实施 PR：#900；复用 / 协调：—；模块：trap/irq、arch/x86/irq
- 要做什么：验证 guard 的转移、释放，并恢复原 IF 状态。main 的 Drop 被注释，transfer_to 的布尔后置条件不能证明恢复权限转移；#900 恢复运行层执行体，但未把它连接到 proof token。
- 验收 / 限定：阶段 A 验收样例之一：同一 CPU 创建 IRQ guard、获取本地资源、完成转移或正常释放并恢复原 IF 状态。
- 前置：IRQ_GUARD（确认 · 验收前置）

**LOC_ID** — GS 基址与逻辑 CPU 身份

- 实施 PR：—；复用 / 协调：#900；模块：arch/x86/cpu、cpu/local
- 要做什么：GS 基址指向本 CPU 的存储，并给出逻辑 CPU 身份。main 已证明 CpuId 范围、转换与 all_cpus；num_cpus 仍可信，current_racy / set_this_cpu_id / init_on_bsp / init_on_ap 在注释里。 NMI 和 bootstrap 例外在 #900 中尚未建模，应单列为边界条件。
- 验收 / 限定：交付 GS 基址、逻辑 CpuId 与正在执行 CPU 的对应关系，供本地访问、GDT 和 APIC 实例使用；核对 BSP/AP 设置与读取及有效索引。num_cpus、引导 GS/CPU 状态属 TB_BOOT_INPUT，NMI/bootstrap 例外须在入口条件中明确。
- 前置：LOC_STORE（确认 · 验收前置）

**PT_X86** — x86 页表寄存器与刷新效果

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/mm
- 要做什么：PTE 编码已有证明；CR3 激活 / 读取、按地址及非全局刷新是 external_body + unimplemented!()，全局刷新函数体只剩注释，都没有硬件效果后置条件。
- 验收 / 限定：交付 CR3 根页激活/读取、单页/范围/全局刷新效果，供栈、MM_BOOT、TLB_SHOOT 使用；范围循环证明可独立开展。验收恢复执行包装并将地址对齐/有效根页前置接到消费者，硬件指令效果逐条列入 TB_HW_OPS。
- 前置：无

**ACPI_TABLES** — ACPI 表来源与访问有效性

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/kernel
- 要做什么：建立 RSDP / RSDT / XSDT 来源、物理映射、表长度及访问有效性：get_acpi_tables 是普通 Rust，消费 EARLY_INFO.acpi_arg，支持 BIOS 搜索，解析失败多处 unwrap，BIOS 搜索失败返回 None。 覆盖 NotProvided 时的 BIOS 搜索与失败路径；保留原 unwrap 的条件或 panic 行为，不默认为可恢复错误。
- 验收 / 限定：交付 MADT 等消费者可用的表来源、长度、物理访问和结果存活合同；覆盖 NotProvided/BIOS 搜索失败，保留原 unwrap 所需条件或 panic 行为。RSDP/固件真实性属 TB_BOOT_INPUT，外部 ACPI parser 的具体条件须登记；DMAR 子树局部已有证明不代表该入口完成。
- 前置：无

**ACPI_MADT** — MADT：IOAPIC 地址 · GSI 范围 · ISA override

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/kernel
- 要做什么：MADT 消费合同给出 IOAPIC 地址、GSI base 范围和 ISA override；验收要区分 MADT 给出的 GSI base 与寄存器给出的容量（IoApicAccess::max_redirection_entry），仅解析 MADT 不能建立完整 GSI 覆盖。
- 验收 / 限定：交付给 ROUTE_MAP 的 IOAPIC 地址、GSI base 与 ISA override，并建立表长度/条目类型/极性触发标志条件。实际 GSI 容量还须消费 IOAPIC 寄存器合同；固件描述与真实接线的一致性属于待提供的平台证据。
- 前置：ACPI_TABLES（确认 · 验收前置）

**PIC** — PIC：init_and_disable / set_mask

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/kernel
- 要做什么：证明端口、向量偏移、级联参数与写入参数；init_and_disable 调用 set_mask(0xff, 0xff)，需补“写入序列使 PIC 处于全屏蔽”的协议合同。irq 模块在 main 未启用，文件是普通 Rust。
- 验收 / 限定：交付 init_and_disable 的端口访问序列与全屏蔽设备状态，供 ROUTE_MAP 的 PCAT_COMPAT 分支使用；核对向量偏移和级联参数。无需等待 MMIO allocator；端口写入到设备状态的协议依赖 TB_HW_OPS。
- 前置：IO_PIO（确认 · 验收前置）

**IOAPIC_REG** — IOAPIC：寄存器访问

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/kernel
- 要做什么：间接寄存器选择 / 数据访问互斥。基地址可作为参数，寄存器级证明不必等 MADT；MADT 提供基址属于 irq::init 的组合（见 ROUTE_MAP）。
- 验收 / 限定：交付给 IOAPIC_ENTRY 的间接寄存器读写合同：选择/数据事务互斥、偏移有界、max_redirection_entry 的含义及映射存活。以给定合法窗口证明，固件地址到该窗口的对应由 ROUTE_MAP 组合；寄存器效果属 TB_HW_OPS。
- 前置：IO_ALLOC（确认 · 验收前置）

**IOAPIC_ENTRY** — IOAPIC：重定向项 enable / disable

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/kernel
- 要做什么：重定向项 enable / disable 的效果与失败合同。当前代码未启用且没有规格。
- 验收 / 限定：交付给 ROUTE_MAP 的 enable/disable 表项效果、向量/remapping 编码、屏蔽与句柄存活合同；核对索引边界及失败时权限保持。设备投递语义属 TB_HW_OPS，IRT 状态属 TB_IOMMU。
- 前置：IOAPIC_REG（确认 · 验收前置）、IRQLINE（确认 · 验收前置）

**PIT_CFG** — PIT 配置（pit::init）

- 实施 PR：—；复用 / 协调：#706；模块：arch/x86/timer
- 要做什么：pit::init 写 0x43 命令字，再向 0x40 写低、高字节；TIMER_FREQ = 1000，分频值 1193（1193182 / 1000），字节 0xA9、0x04——已按 main 源码核对。pit 模块在 main 注释，x86 timer 只启用 TIMER_FREQ。 证明挂到实际执行函数上，可先在 #706 上独立交付。
- 验收 / 限定：交付 pit::init 的 0x43 命令与 0x40 低/高字节写入合同、1000 Hz 目标下 divisor=1193 的计算，供 PITIRQ/CAL_FREQ 使用；参数证明及硬件协议输入均需记录。真实产生中断的进展由 PITIRQ 在选定平台验收。
- 前置：IO_PIO（确认 · 验收前置）

**APIC_PROBE** — APIC 模式探测（x2APIC 优先 / xAPIC 回退）

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/kernel
- 要做什么：交付 CPUID 采样到候选模式/NoApic 的分支合同；可独立证明，实际 init 的发布由 APIC_PUB 组合窗口保留结果。
- 验收 / 限定：探测只消费 CPUID，不消费 IO 窗口；xAPIC 窗口保留已拆为 APIC_RESERVE，因此不再等待 IO 分配器。
- 前置：无

**APIC_RESERVE** — xAPIC 寄存器窗口保留

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/kernel、io/io_mem
- 要做什么：xAPIC 从实际 MSR 采样取地址，保留对应 1024 字节范围，其他窗口权限不变。 XApic::new 用 mm::paddr_to_vaddr(get_xapic_base_address()) 取寄存器指针，且是 external_body；寄存器读写用无分配权限的 volatile wrapper，不经 IoMem，因此这一项才是 APIC 与 IO 分配器的唯一接点。
- 验收 / 限定：MSR 地址对齐与上界只是局部事实，还需证明该地址属于登记窗口。x2APIC 分支不消费窗口。
- 前置：IO_ALLOC（确认 · 验收前置）、IO_WIN（确认 · 验收前置）

**APIC_PUB** — APIC 发布模式与 ApicId

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/kernel
- 要做什么：发布模式与 ApicId::from 一致，保留 xAPIC 八位截断。ApicId::from 与发布入口在 main 都被注释。
- 验收 / 限定：完成条件：init 成功后 Once 发布的模式与探测一致；xAPIC 分支已保留寄存器窗口，失败不伪造已发布状态；ApicId::from 与模式匹配并保留八位截断。硬件采样属 TB_HW_OPS。
- 前置：APIC_PROBE（确认 · 验收前置）、APIC_RESERVE（确认 · 验收前置）

**LAPIC_INST** — 每核 APIC 实例（get_or_init）

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/kernel
- 要做什么：证明 get_or_init 返回的实例对应执行 CPU，引用在许可的生命周期内有效。 说明初始化重入条件。get_or_init 在 main 整体注释，ForceSyncSend 的安全理由尚无形式连接。
- 验收 / 限定：交付 get_or_init 返回实例与执行 CPU 的对应关系、有效引用、一次初始化及重入条件，供 EOI/timer/IPI 使用；!Send/!Sync 或逻辑 CpuId 不能单独建立该关系。GS/CPU 输入与 ForceSyncSend 的安全前提逐条登记。
- 前置：APIC_PUB（确认 · 验收前置）、LOC_ID（确认 · 验收前置）、LOC_REMOTE（确认 · 验收前置）

**LAPIC_DEV** — APIC / ApicTimer 设备状态与 EOI

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/kernel
- 要做什么：为 Apic / ApicTimer 接口补设备状态后置条件并覆盖 EOI；xAPIC 与 x2APIC 两个后端都要覆盖。ICR / ID 编码与后端计算已在 main（#819），可直接复用。 send_ipi 在两个后端都是 external_body。
- 验收 / 限定：交付 xAPIC/x2APIC 的 EOI、timer 配置和 send_ipi 状态合同，供陷阱、timer、SMP_IPI 使用；验证参数编码、CPU 归属和访问权限。硬件效果按 TB_HW_OPS 登记，send_ipi 不自动保证对方执行或 ACK。
- 前置：LAPIC_INST（确认 · 验收前置）、PREEMPT_PIN（确认 · 验收前置）

**GDT** — GDT / TSS 与栈

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/trap
- 要做什么：证明选择子、描述符及栈布局：栈证明须覆盖 .cpu_local_tss 首部布局，不能只证明选择子常量。gdt.rs 在 main 未启用，普通 Rust。
- 验收 / 限定：还消费 boot 建立的 CS == KERNEL_CS（TB_BOOT_INPUT）；TSS 描述符 limit 未包含 I/O bitmap；当前没有配置专用 IST。完整 trap::init 还调用 syscall 初始化，应按原执行顺序（gdt::init → idt::init → syscall::init）接入。
- 前置：LOC_ID（确认 · 验收前置）

**IDT_TABLE** — IDT 构表（256 个向量）

- 实施 PR：—；复用 / 协调：#887；模块：arch/x86/trap
- 要做什么：256 个向量对应各自入口；仅 3 / 4 号向量设为 Ring3，其余保持原权限；正确构造描述符表长度。 实际用到：Box::new / Box::leak 的分配合同、spin::Once、Entry::missing / set_handler_addr、VirtAddr::new 与外部 VECTORS（没有 Vec）；这些都需要具体合同，不能把现有源码当作已验证外部规格。
- 验收 / 限定：trap 模块在 main 未启用，须与 #887 的模块开关协调（#887 启用 trap 后仍注释 mod idt）；若只完成构表，应标注尚未恢复整个入口。Box 只消费 alloc 的外部规约，不等待 heap slot 证明（SA_HEAP）；用户全局 allocator 属 TB_ALLOC。
- 前置：无

**IDT_LOAD** — IDT 全局发布与每 CPU lidt

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/trap
- 要做什么：验证全局发布（GLOBAL_IDT Once）与每 CPU 的 lidt 加载；入口地址规范性、当前代码选择子、表的永久生命周期与汇编 ABI 另须落实。
- 验收 / 限定：交付 GLOBAL_IDT Once 发布和每核 lidt 后的 IDTR/表生命周期合同，供 TRAP_DISP 使用；核对规范入口地址、代码选择子和 ABI。硬件 lidt 与 VECTORS 地址是明确外部输入；函数不消费 CpuId，不增加 LOC_ID 前置。
- 前置：IDT_TABLE（确认 · 验收前置）

**TRAP_DATA** — 上下文数据与异常分类（#887）

- 实施 PR：#887；复用 / 协调：—；模块：arch/x86/cpu、arch/x86/trap
- 要做什么：#887：寄存器 / TLS / 指针更新的字段保持、take_exception 与异常分类；启用 CPU / context、trap 数据与 user trait，继续停用 GS local、GDT / IDT / syscall、分派、异常构造、FPU 与 UserMode。activate_tls_pointer 仍是 external_body，没有硬件状态后置条件。
- 验收 / 限定：交付给 TRAP_EXC/用户上下文调用者的寄存器字段保持、TLS/指针更新、take_exception 与分类合同；以实际构造/读取案例核对。activate_tls_pointer 的硬件效果仍可信；异常构造、FPU 和 UserMode 另项验收。
- 前置：无

**TRAP_EXC** — CpuException::new：异常构造

- 实施 PR：—；复用 / 协调：#887；模块：arch/x86/cpu、arch/x86/trap
- 要做什么：向量映射、错误码保留、GP 零 / 非零分支与 CR2 采样。 明确双重故障零错误码与页错误码合法位等输入条件：现有 debug_assert_eq! 与 from_bits(..).unwrap() 不能提供这些输入来源。
- 验收 / 限定：交付 TRAP_DISP 可用的向量到异常映射、错误码保留、GP 分支及 CR2 采样合同；核对双重故障零错误码和页错误码合法位输入。debug_assert/unwrap 的前置必须有来源，CR2 与入口错误码属 TB_HW_OPS。
- 前置：TRAP_DATA（确认 · 验收前置）

**TRAP_DISP** — 陷阱入口 → TrapFrame → 分派

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/trap、trap/handler
- 要做什么：IDT 汇编入口进入，经 TrapFrame 分派到 IRQ 回调 / 异常处理；把原 trap::init 的 gdt::init → idt::init → syscall::init 顺序接回。 补 bottom-half、嵌套上界与 IRQ 恢复合同；NMI 返回 / 嵌套与 TSS 栈安全须明确验收。
- 验收 / 限定：#900 尚未建立执行 guard、trap 入口和 proof state 的完整连接；main 的 handler 与架构 trap 均未启用。汇编栈布局与现代异常错误码约定是否一致待确认：DEF_HANDLER 只对 8、10..14、17 号向量使用 CPU 错误码分支。
- 前置：IDT_LOAD（确认 · 验收前置）、GDT（确认 · 验收前置）、IRQ_GUARD（确认 · 验收前置）、TRAP_EXC（确认 · 验收前置）、IRQLINE（确认 · 验收前置）、LOC_CELL（确认 · 验收前置）

**IRQLINE** — IrqLine 分配、回调注册与释放

- 实施 PR：—；复用 / 协调：—；模块：trap/irq、arch/x86/kernel
- 要做什么：IrqLine 分配与回调注册；MappedIrqLine 释放；覆盖分配 / 映射失败与资源保留、clone 保留、最后句柄释放与回调注销。 main 的 IrqLine / InnerHandle / CallbackHandle / ALLOCATOR 与回调执行整体在注释里（源码名是 CallbackHandle、ALLOCATOR）。
- 验收 / 限定：交付分配/注册/clone/最后句柄释放与回调注销的资源合同，供路由、IPI、timer、PCI 使用；覆盖分配失败、注销与回调并发、MappedIrqLine 释放。锁硬件状态由 SYNC_GUARD 提供，remapping 项按 TB_IOMMU 登记。
- 前置：SYNC_GUARD（确认 · 验收前置）

**ROUTE_MAP** — ISA → GSI 映射与 IOAPIC 配置

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/kernel
- 要做什么：依据 MADT 的 ISA override 把中断映射到 GSI，并配置 IOAPIC 重定向项。 IRQ0 对应关系：没有任何 override 时 irq::init 硬编码补 0→2；有其他 override 但没有 IRQ0 项时 map_isa_pin_to 回退 0→0。IRQ0 验收必须证明选定平台的实际对应关系。
- 验收 / 限定：待确认：选定 BSP 平台的实际 MADT、IRQ0 接线、重定向极性 / 触发模式。ACPI / PIC / IOAPIC 局部验证通过后，若陷阱分派或 EOI 尚未接线，只能记为设备配置完成。
- 前置：ACPI_MADT（确认 · 验收前置）、IOAPIC_ENTRY（确认 · 验收前置）、IRQLINE（确认 · 验收前置）、PIC（确认 · 验收前置）、IO_WIN（确认 · 验收前置）

**PITIRQ** — PIT IRQ0 完整处理（首个中断闭环）（里程碑）

- 实施 PR：—；复用 / 协调：—；模块：—
- 要做什么：IrqLine 分配与回调注册（经 ROUTE_MAP 的 IRQLINE）→ ISA / GSI 映射 → IOAPIC 配置 → IDT / 汇编进入 → TrapFrame → IRQ 嵌套状态 → 回调 → EOI → 恢复 → MappedIrqLine 释放。 覆盖分配 / 映射失败与资源保留；范围是非 TDX 的 BSP 路径（TB_TDX）。
- 验收 / 限定：验收选定非 TDX BSP 平台上 PIT 实际产生 IRQ0、注册/路由/进入/回调/EOI/恢复/解除映射全链及失败保留。可先写组合合同和测试骨架；各前置是验收门槛。平台 IRQ0 接线与进展仍需实际证据。
- 前置：ROUTE_MAP（确认 · 验收前置）、TRAP_DISP（确认 · 验收前置）、LAPIC_DEV（确认 · 验收前置）、PIT_CFG（确认 · 验收前置）

**CAL_FREQ** — PIT 校准与完整 init_tsc_freq

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/kernel、arch/x86/timer
- 要做什么：PIT 校准，再接完整 init_tsc_freq。main 已证明 CPUID 采样计算（#905），但保留两个乘积上界 assume；PIT 校准、init_tsc_freq、TSC_FREQ 发布均在注释里。 整数截断、采样边界、频率发布、CONFIG / Once 状态、临时 PIT 映射释放与原模式选择。
- 验收 / 限定：频率为零、计数减法的边界不能由“频率初始化完成”这一名称隐含保证。局部证明可先假定 IRQ0 回调合同；最终接线才需要 PITIRQ 完成。
- 前置：PITIRQ（确认 · 验收前置）、PIT_CFG（确认 · 验收前置）、TSC_VALUE（确认 · 验收前置）

**TMR_DEADLINE** — APIC timer：deadline 模式

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/timer、timer/mod
- 要做什么：deadline 模式消费已发布的频率；回调里 tsc_interval + tsc_value 的 deadline 加法边界尚无证明。该文件因父模块注释而未编译。
- 验收 / 限定：交付给 BSP/AP timer 调用者的 deadline 选择、频率到间隔转换、加法不溢出、回调重装与资源释放合同；保持原模式选择并建立非零频率来源。时钟推进和 MSR 效果属 TB_HW_OPS，不能从 CPUID 检测直接推得。
- 前置：LAPIC_DEV（确认 · 验收前置）、IRQLINE（确认 · 验收前置）、PREEMPT_PIN（确认 · 验收前置）、TSC_VALUE（确认 · 验收前置）

**TMR_PERIODIC** — APIC timer：periodic 模式

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/timer、timer/mod
- 要做什么：periodic 校准直接消费 PIT 中断与每核 APIC；须证明计数差、Once 发布与映射释放；等待中断与 enable_local_and_halt 的进展条件应明确。
- 验收 / 限定：交付 PIT 校准的计数差、周期分频、Once 发布与 IRQ 映射释放合同，供 BSP/AP 初始化消费；保留无 APIC 分支并核对其可达条件。halt 等待和设备计时进展列为 TB_HW_OPS 的明确前提。
- 前置：PITIRQ（确认 · 验收前置）、LAPIC_DEV（确认 · 验收前置）、PREEMPT_PIN（确认 · 验收前置）

**F_ASM** — 可失败汇编：memcpy / memset_fallible

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/ex_table、arch/x86/mm
- 要做什么：x86 的 memcpy_fallible.S、memset_fallible.S 文件缺失（已核对），两处 global_asm! 注释，只留 __memcpy_fallible / __memset_fallible 的外部声明。 恢复来源、ABI、链接段、表项与生命周期是必要交付。
- 验收 / 限定：没有这些汇编，故障恢复链无从接通，最终镜像里的 ExTable 链接检查也无对象。
- 前置：无

**F_RECOVER** — 缺页 → 查表 → 恢复 RIP → 返回未完成字节数

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/ex_table、arch/x86/mm
- 要做什么：按“复制 / 填充 → 缺页 → 查表 → 修改恢复 RIP → 返回未完成字节数”的实际链验证，分别表达成功、部分完成与故障结果。ExTable 首匹配 / 无匹配证明已在 main（#886）；read_table 是链接可信边界（external_body）。 用户缺页回调成功时重试、失败才查 ExTable；回调由 OSTD 使用者提供（TB_CLIENT_HOOKS）。内核线性映射缺页另由 KFAULT_MAP 验收，不混入用户复制的局部恢复前置。
- 验收 / 限定：__ex_table / __ex_table_end 在仓库里只有声明、没有定义，由最终内核链接产物提供（TB_EXTABLE_LINK）；须在最终镜像里检查 ABI、入口与 ExTable 链接（ACC_IMG）。
- 前置：TRAP_DISP（确认 · 验收前置）、F_ASM（确认 · 验收前置）

**SMP_AP** — AP 启动与初始化

- 实施 PR：—；复用 / 协调：—；模块：boot/smp、arch/x86/irq
- 要做什么：AP 初始化：boot::smp 与根 smp 在 main 都未启用，源文件是普通 Rust。还消费 boot 页表根、AP 栈分配与 activate_kernel_page_table 的输入合同。
- 验收 / 限定：bringup_all_aps 的汇编启动与初始页表 / CPU 状态属可信边界（TB_BOOT_INPUT）。编排与发布可见性的验收拆为 SMP_COMPOSE。
- 前置：LAPIC_INST（确认 · 验收前置）、LOC_STORE（确认 · 验收前置）、PREEMPT_PIN（确认 · 验收前置）、MM_FRAME（确认 · 验收前置）、MM_BOOT（确认 · 验收前置）

**SMP_COMPOSE** — BSP / AP 初始化编排与发布可见性（里程碑）

- 实施 PR：—；复用 / 协调：—；模块：boot/smp、arch/x86/mod
- 要做什么：验收每项初始化的先后条件和发布可见性；局部包逐步接回原调用方。 根 BSP 路径对 APIC 初始化用 expect，timer::init_bsp 保留无 APIC 分支，集成时核对这些分支在选定平台上的可达条件，保持原行为。
- 验收 / 限定：交付 BSP/AP 调用点合同闭合与发布可见性记录，区分 bootstrap、首个 IRQ 和多核运行状态；可先核对组合义务，不等待局部证明全部完成才开工。原启动汇编属 TB_BOOT_INPUT。
- 前置：SMP_AP（确认 · 验收前置）、SYSCALL（确认 · 验收前置）、TRAP_DISP（确认 · 验收前置）、CPU_ENABLE（确认 · 验收前置）、TMR_DEADLINE（确认 · 验收前置）、TMR_PERIODIC（确认 · 验收前置）、TASK_RUNTIME（确认 · 验收前置）

**SMP_IPI** — IPI 异步发送与目标回调执行

- 实施 PR：—；复用 / 协调：—；模块：smp/smp、arch/x86/kernel
- 要做什么：交付目标核身份、队列保留、同核同步/远端异步分支和回调安全合同；原 API 明说可能不执行，不增造无条件完成 ACK。TLB 协议所需的确认/公平投递条件在 TLB_SHOOT 中补。
- 验收 / 限定：验收发送与回调的资源/CPU 对应关系；不承诺现有 API 没有的必达或同步完成。硬件投递属 TB_HW_OPS，进展假设由消费者明确。
- 前置：LAPIC_DEV（确认 · 验收前置）、TRAP_DISP（确认 · 验收前置）、IRQLINE（确认 · 验收前置）、LOC_REMOTE（确认 · 验收前置）、SYNC_GUARD（确认 · 验收前置）、SMP_AP（确认 · 验收前置）

**CPU_FEAT** — CPU 特性位检测（AVX / AVX-512F）

- 实施 PR：#920；复用 / 协调：—；模块：arch/x86/mod
- 要做什么：#920：以每次调用的 ghost 采样表达叶支持与特性位；改用已有规约的 native_cpuid::cpuid_count。main 的 has_avx / has_avx512 / enable_cpu_features 均在注释里。
- 验收 / 限定：交付 has_avx/has_avx512 的采样位与返回值合同，供 CPU_ENABLE 使用；按 #920 的限定函数收尾验收。OSXSAVE/XCR0 配置归 CPU_ENABLE，跨次/跨核 CPUID 一致性按 TB_HW_OPS 单列。
- 前置：无

**FPU_REPR** — FPU 表示、有效长度与 clone

- 实施 PR：—；复用 / 协调：#927；模块：arch/x86/cpu
- 要做什么：布局、area_size、扩展区长度与 clone 下溢边界；原实现是未启用模块中的普通 Rust，#887 继续注释 FPU。
- 验收 / 限定：交付 XSAVE 可使用的 XSaveArea/FxSaveArea 布局、对齐、容量、area_size 与 clone 边界合同；核对扩展区长度和减法无下溢。与 TRAP_DATA 可并行；Pod/原始内存转换所需外部条件逐条登记。
- 前置：无

**XSAVE** — CPU_FEATURES / XSAVE 初始化与保存恢复

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/cpu
- 要做什么：FPU save/load 的对齐、mask、容量、已启用模式与状态保存恢复合同；每核特性初始化拆至 CPU_ENABLE。
- 验收 / 限定：交付用户/任务调用者可用的 FPU save/load 前置及状态保存恢复关系，核对对齐、mask、容量和已启用模式；用实际调用场景建立条件。指令语义属 TB_HW_OPS，CPU 特性初始化由 CPU_ENABLE 提供。
- 前置：FPU_REPR（确认 · 验收前置）、CPU_ENABLE（确认 · 验收前置）

**SYSCALL** — syscall 与用户态返回

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/trap、user/user
- 要做什么：syscall 入口与用户态返回；syscall、UserMode 执行路径在 main 未启用。
- 验收 / 限定：交付 syscall 入口、RawUserContext::run 与返回的寄存器/栈/权限合同，供 UserMode 和运行验收消费；核对 GDT 选择子、MSR 配置和异常返回。硬件与汇编输入逐条记录，无需把 FPU 保存恢复作为整个入口的前置。
- 前置：TRAP_DISP（确认 · 验收前置）、GDT（确认 · 验收前置）

**TASK_SW** — processor 任务切换资源交接

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/task、task/processor
- 要做什么：任务切换的资源交接与地址空间切换。main 已有 #870 的寄存器数据证明；汇编 context_switch 与 processor 执行路径未证明。
- 验收 / 限定：验证上下文独占、当前/前一任务交接、栈刷新、RCU 静止点与 IRQ 权限恢复。PRE/POST_SCHEDULE_HANDLER 是注入接口，当前源码不能证明它实际切换 VmSpace；地址空间效果作为 TB_CLIENT_HOOKS 的具体调用者合同待核对，不强制绑定整个 PT_X86。
- 前置：TASK_STACK_ALLOC（确认 · 验收前置）、SA_RCU（确认 · 验收前置）、TASK_RUNTIME（确认 · 验收前置）、TASK_CTX（确认 · 验收前置）、IRQ_DROP（确认 · 验收前置）、PT_X86（待确认）

**PCI_ENC** — x86 PCI 配置端口编码（#919）

- 实施 PR：#919；复用 / 协调：—；模块：arch/x86/pci、bus/pci
- 要做什么：#919：has_pci_bus() 恒真、配置地址编码与字段恢复、MSI-X remapping 地址构造及低 16 位恢复；硬件读写仍被注释。
- 验收 / 限定：硬件读写和总线探测仍未启用；编码证明不能计为 PCI 配置事务或中断重映射完成。#706 已内含同名编码函数，需保留 #919 较强的字段恢复后置条件。
- 前置：无

**ACC_RUN** — 平台启动 · 中断 · 故障恢复运行测试（里程碑）

- 实施 PR：—；复用 / 协调：—；模块：—
- 要做什么：先建立可复现的运行目标：仓库里没有 QEMU 启动目标或 CI 运行步骤（Makefile 默认只验证 ostd，CI action 显式选择 ostd）。 在选定平台运行启动、中断与故障恢复测试；形式证明与运行证据分别记录。
- 验收 / 限定：开放 PR 的历史 CI 不能替代基于最新 head 的组合验证。运行目标可先于各项形式证明建立。
- 前置：ACC_IMG（确认 · 验收前置）、PITIRQ（确认 · 验收前置）、F_BYTES（确认 · 验收前置）

**KFAULT_MAP** — 内核线性映射缺页处理

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/trap
- 要做什么：单列 handle_kernel_page_fault：合法缺页范围/error code、对齐、Untracked(paddr,1,prop) 映射与返回；这条分支不同于用户可失败复制的 ExTable 恢复。
- 验收 / 限定：交付完整陷阱组合可使用的内核缺页合同，错误码/越界仍保留原 panic 条件。MMIO 设备区真实性属 TB_BOOT_INPUT/TB_HW_OPS；不能把用户 fault recovery 的完成替代本项。
- 前置：MM_BOOT（确认 · 验收前置）、MM_PT（确认 · 验收前置）、PREEMPT_PIN（确认 · 验收前置）

**TASK_CTX** — TaskContext 切换汇编 ABI

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/task
- 要做什么：在有效的 cur/nxt 上下文、独占资源和栈输入条件下建立保存恢复寄存器、RSP/RIP/FSBASE 与返回约定；复用 #870 的数据方法证明。
- 验收 / 限定：交付 processor::switch_to_task 可调用的 context_switch 边界合同和汇编/布局检查。局部证明不等待 scheduler/RCU/syscall；汇编指令效果属 TB_HW_OPS。
- 前置：无

**CPU_ENABLE** — 每核 CPU 控制寄存器与特性初始化

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/mod、arch/x86/cpu
- 要做什么：从 XSAVE 拆出 enable_cpu_features/enable_essential_features 的 CR0/CR4/EFER/XCR0、XSAVE 区大小与 Once 发布合同。
- 验收 / 限定：供 BSP/AP 初始化和 FPU save/load 使用：特性采样到启用寄存器的条件闭合；同核/跨核 CPUID 一致性不能从两个布尔检测推得，硬件效果属 TB_HW_OPS。
- 前置：CPU_FEAT（确认 · 验收前置）

**TSC_VALUE** — tsc_freq 采样结果与发布合同

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/kernel
- 要做什么：从 CAL_FREQ 拆出采样频率的 Hz 单位、非零/范围以及 TSC_FREQ Once 发布/读取合同；给定合格采样即可证明消费者。
- 验收 / 限定：供 deadline timer 使用。已合入 #905 可能返回 Some(0)，需保留原输入边界并证明选定平台的非零来源；物理时钟精度和 CPUID 输入属 TB_HW_OPS。完整回退仍在 CAL_FREQ 验收。
- 前置：无

**HPET** — HPET 计时接口

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/timer
- 要做什么：交付寄存器 getter 与 Hpet::new/init 的 ACPI 基址、VolatileRef 范围/生命周期、计数器容量解析和 IRQ 映射合同；当前没有实现完整计时服务。
- 验收 / 限定：寄存器级证明可在给定映射地址下独立进行；完整 new 需要 IrqLine/ISA 映射，源码把 HPET 接 ISA 0 且有 FIXME，平台正确接线待确认。通过 paddr_to_vaddr 构造 VolatileRef，不消费 IoMem；线性映射有效性由 MM_BOOT 的组合证据核对，硬件效果属 TB_HW_OPS。
- 前置：ACPI_TABLES（确认 · 验收前置）、ROUTE_MAP（确认 · 验收前置）

**SERIAL_QEMU_CMOS** — 串口 · QEMU 出口 · CMOS

- 实施 PR：—；复用 / 协调：—；模块：arch/x86/serial、arch/x86/qemu、arch/x86/device
- 要做什么：覆盖串口初始化/轮询、exit_qemu 与 CMOS 读取；逐接口说明端口与 ACPI/FADT 世纪字段条件。
- 验收 / 限定：交付 x86 基础设备的访问/转换合同；轮询终止需显式硬件进展假设，exit_qemu 非返回结果由目标平台记录，CMOS 输入真实性属 TB_HW_OPS。不等待 PIT/APIC 完成。
- 前置：IO_PIO（确认 · 验收前置）、ACPI_TABLES（确认 · 验收前置）

**ACC_SCOPE** — x86 当前范围最终验收（里程碑、汇总验收）

- 实施 PR：—；复用 / 协调：—；模块：—
- 要做什么：在一个固定集成提交上启用计划内执行路径，分别验证 OSTD 与 bzImage，逐 API 对照清单；记录构建产物、运行结果、剩余可信输入与尚未证明的性质。
- 验收 / 限定：完成条件：所有当前工作项交付均有固定提交/消费者证据；x86 make 验证与 builder 验证通过，ABI/ExTable 和选定 BSP/AP、用户态、TLB/PCI 运行场景有记录；占位/注释执行路径不得计为证明。硬件/架构 boot/IOMMU/TDX/用户回调等剩余边界逐项获明确记录。
- 前置：LOC_ACC（确认 · 验收前置）、VM_POD（确认 · 验收前置）、TLB_FREE（确认 · 验收前置）、CAL_FREQ（确认 · 验收前置）、SMP_COMPOSE（确认 · 验收前置）、XSAVE（确认 · 验收前置）、TASK_SW（确认 · 验收前置）、PCI_IRQ（确认 · 验收前置）、SA_DMA（确认 · 验收前置）、BZ_TRUST（确认 · 验收前置）、BZ_ENCODE（确认 · 验收前置）、ACC_RUN（确认 · 验收前置）、IO_GLOBAL（确认 · 验收前置）、KFAULT_MAP（确认 · 验收前置）、LOC_DYNAMIC（确认 · 验收前置）、SYNC_API（确认 · 验收前置）、PCI_DEVICE（确认 · 验收前置）、HPET（确认 · 验收前置）、SERIAL_QEMU_CMOS（确认 · 验收前置）、HEAP_GLOBAL（确认 · 验收前置）、BZ_SETUP（确认 · 验收前置）、BOOT_COMMON（确认 · 验收前置）、COMMON_AUDIT（确认 · 验收前置）、TASK_COMPOSE（确认 · 验收前置）

#### bzImage 启动链

**BZ_PE** — PE/COFF 头构建

- 实施 PR：#916；复用 / 协调：—；模块：libs/linux-bzimage
- 要做什么：#916（已合入 c25ca6f98）：验证 PE/COFF 头的八个手写函数与 368 字节拼接；解析、bytes_of 与 opaque 外部类型仍可信，packed 字段的逐字节小端编码尚未证明。
- 验收 / 限定：限定交付为 valid_setup_elf 下头字段构造与 len==368，足够供应 BZ_OUT 的长度界限；解析、bytes_of、packed 小端表示列为 TB_ELF_RANGE。全 builder 输入满足性与启动兼容性另验收。
- 已完成依据：2026-11-16 对照 #916 head 2f3bb906faf644b82c16b00654a1b6e603b30eb0 与合入 c25ca6f98，main @8e681282d19b29bdc1b6e715930fe9224a0c88dc 的 pe_header::make_pe_coff_header 有 len==368 及字段构造合同；最终 head APPROVED、CI 成功，BZ_OUT 只需的长度合同已满足。parser/bytes_of 的可信边界已登记；未重跑本地 Verus。
- 前置：无

**BZ_TRUST** — 把 ELF 范围的 assume 登记为可信边界

- 实施 PR：—；复用 / 协调：—；模块：libs/linux-bzimage
- 要做什么：登记 mapping.rs 中 From<SetupVA> / From<SetupFileOffset> 的两处 assume（VA 范围与 offset 上界）及全部消费者；来源注释已有，但没有独立检查器。 From<usize> 接受任意值，转换内部再假定范围，调用者没有承担相应 requires。
- 验收 / 限定：对源文件、ELF 等 Verus 无法直接证明的事实，逐项记录来源、消费者依赖与可运行检查（TB_ELF_RANGE）。
- 前置：无

**BZ_ELF** — 收窄边界：ELF 解析合同 · 链接断言

- 实施 PR：#931；复用 / 协调：—；模块：libs/linux-bzimage
- 要做什么：通过 ELF parser 合同、链接断言或可独立检查的构建前置缩小边界；ELF / program-header 来源条件。#916（已合入）增加可信解析合同，但仍用 uninterpreted 的 elf_parse_result / elf_program_headers，没有从输入字节证明段内容。 #931 扩展 xmas_elf 的 program_header_type/program_load_bytes 等可信规约；解析语义仍未从原始字节证明，需校验器或明确输入来源。
- 验收 / 限定：交付 BZ_RANGE/BZ_PE 所需 ELF 字节保持、段表类型、file_size<=mem_size 与地址/偏移界限的来源证据或可运行检查器。parser/uninterpreted 规约仍属 TB_ELF_RANGE；登记边界本身不构成 BZ_TRUST 到本项的阻塞。
- 前置：无

**BZ_RANGE** — setup / protected-mode 区间、对齐与算术边界

- 实施 PR：#931；复用 / 协调：—；模块：libs/linux-bzimage
- 要做什么：#931 在 to_flat_binary 上证明 ret@ == flat_binary_spec：按 program header 顺序扩容/复制，file_size <= mem_size 与地址上界作为 requires。新追加区间填零；重叠段的 memory-only 尾部保留旧字节，并非整段重新清零。make_bzimage 的尾部对齐与全链输入前置尚未覆盖。
- 验收 / 限定：固定 head @d30c271708585a0ae89b5eafd1dd795bc98281a9 的 flat binary 局部合同可供 BZ_OUT 使用；输入谓词/结果 spec 当前私有，实际 make_bzimage 调用点未证明、外部 parser/get_data 仍可信。验收须补调用者可建立条件和输出区域合同，不把 #931 当完整 builder 已完成。
- 前置：BZ_ELF（确认 · 验收前置）

**BZ_ENCODE** — 压缩 / 未压缩 payload 路径

- 实施 PR：—；复用 / 协调：—；模块：libs/linux-bzimage
- 要做什么：encoder.rs::encode_kernel 的 Raw / Gzip / Zlib 结果与失败行为；PayloadEncoding 参数转换。
- 验收 / 限定：交付 encode_kernel 的 Raw/Gzip/Zlib 输出对应、参数转换和失败合同，供外部构建工具使用；解压对应关系需有库合同或产物检查。与 make_bzimage 的实际连接尚待构建 manifest 证据，不能推定调用。
- 前置：无

**BZ_OUT** — 输出区间不重叠与失败行为

- 实施 PR：—；复用 / 协调：—；模块：libs/linux-bzimage
- 要做什么：交付 make_bzimage 的 PE/header 与已链接 setup（含 payload）的区间、seek/write 输出与失败行为；to_flat_binary 按源顺序覆盖重叠段，只有选定链接布局有非重叠证据时才声明不交叠。不得为证明修改原覆盖语义。
- 验收 / 限定：交付 make_bzimage 的输入条件、PE/header/setup 输出区域、seek/write 顺序及失败结果，供 BZ_IMG 使用；真实调用点须建立 BZ_RANGE/BZ_PE 前置。文件系统 I/O 与 ELF 来源逐项登记，builder 单元合同不足以证明启动兼容性。
- 前置：BZ_RANGE（确认 · 验收前置）、BZ_PE（确认 · 验收前置）

**BZ_IMG** — 核对生成镜像的区域范围与加载地址

- 实施 PR：—；复用 / 协调：—；模块：libs/linux-bzimage
- 要做什么：最终集成验收：核对生成镜像的区域范围和实际加载地址。
- 验收 / 限定：交付实际产物 manifest、PT_LOAD/entry/加载地址匹配、压缩解码和 setup 协议检查。静态检查器可以先编写，不等待 builder 或 setup 全部证明；最终范围验收 ACC_SCOPE 汇合形式证明与产物证据。
- 前置：BZ_OUT（确认 · 验收前置）、BZ_ELF（确认 · 验收前置）、BZ_ENCODE（待确认）

**ACC_IMG** — 最终镜像：ABI · 入口 · ExTable 链接检查（里程碑）

- 实施 PR：—；复用 / 协调：—；模块：—
- 要做什么：检查最终镜像的 ABI、入口与 ExTable 链接：新增入口符号、表项尺寸 / 边界、目标地址所属可执行段，以及打包前后内容保持检查。
- 验收 / 限定：交付实际内核/镜像 ABI、入口与 ExTable 符号/段的检查脚本和固定产物结果，供 ACC_RUN 使用。仓库尚无该脚本；setup 链接布局不能替代内核 ExTable（TB_EXTABLE_LINK）。bzImage 仅在最终镜像及范围验收处与 x86 汇合；无需等待 F_RECOVER 完成才检查汇编符号。
- 前置：BZ_IMG（确认 · 验收前置）、F_ASM（确认 · 验收前置）

**BZ_SETUP** — x86 setup / loader / BootParams

- 实施 PR：—；复用 / 协调：—；模块：libs/linux-bzimage
- 要做什么：纳入 linux-bzimage/setup 与 boot-params 的 x86 legacy/EFI 入口、loader、Raw/Gzip/Zlib decoder、内存分配和 BootParams 传递；架构 boot 目录排除不等于 setup 排除。
- 验收 / 限定：交付所选启动模式的段加载/清零/入口与 BootParams 合同；EFI 服务、firmware 内存与压缩库是逐项记录的外部边界。入口固定地址与 kernel ELF 的吻合在 BZ_IMG 检查；运行所需模式配置仍待提供。
- 前置：无

#### OSTD 公共模块

**IO_ALLOC** — MMIO 窗口分配与 remove 资源合同

- 实施 PR：#706；复用 / 协调：—；模块：util/range_alloc、io/io_mem
- 要做什么：#706 的 builder new/remove、窗口状态与 RangeAllocator 权限转移；局部分配不等于全局窗口登记。new 给出 state_matches，remove 消费 can_remove 与 io_mem_range_registered。IoMem 映射/访问、全局初始化另由 IO_MMIO / IO_GLOBAL 交付。
- 验收 / 限定：交付可供 IO_WIN、APIC_RESERVE、IOAPIC_REG 使用的局部窗口和权限合同；以给定合法窗口证明范围移除、互不重叠、失败状态保持及回收资格即可验收。不能要求下游 APIC/IOAPIC 已全部完成才关闭本项。固件区域真实性属 TB_BOOT_INPUT。
- 前置：无

**IO_PIO** — 静态 PIO 端口构造与访问合同

- 实施 PR：#706；复用 / 协调：—；模块：io/io_port
- 要做什么：#706 的 IoPort::new/read/write 与外部 PortRead/PortWrite 规格供 PIC、PIT、PCI 配置访问使用。硬件全宽边界是 port + size <= 65536；new 的可表示释放端点更严格，为 <= u16::MAX。动态权限与显式释放拆为 IO_PIO_ALLOC。
- 验收 / 限定：完成条件：u8/u16/u32 的宽度、读写权限、端口不越界与静态调用点可证明；PIC/PIT/PCI 的静态端口无需等全局 allocator 初始化。端口读值及写设备效果仍属 TB_HW_OPS，由消费者补协议合同。
- 前置：无

**LOC_ALLOC** — early allocator 实例

- 实施 PR：#802；复用 / 协调：—；模块：boot/mod、mm/frame
- 要做什么：#802：实例 alloc 的对齐、尾指针单调、失败保持与 allocated_regions 已证；new 与全局 early_alloc 仍 external，axiom_early_regions_wf 未被消费。 全局 early_alloc 没有返回线性内存资源，也未形式化跨次不重叠。main 里 EarlyFrameAllocator / early_alloc 整段在注释中，实现路径是 mm/frame/allocator.rs，不是 boot/mod.rs。
- 验收 / 限定：交付实例 alloc 的对齐、容量、单调、失败保持及 allocated_regions 合同；给定有效实例可验收。new 的区域来源与全局线性内存交接归 LOC_EARLY_GLOBAL，不能由 heap slot 证明替代。
- 前置：无

**LOC_STORE** — BSP / AP 的 CPU-local 存储初始化

- 实施 PR：—；复用 / 协调：—；模块：cpu/local、arch/x86/cpu
- 要做什么：用 early allocator 的结果初始化 BSP / AP 存储；还需链接区间有效、复制前未使用、BSP 源与目标不重叠（#802 的单次数值合同不足以关闭这些义务）。 区分引导阶段的 CPU / IRQ 初始资源与运行阶段 guard，明确交接点。
- 验收 / 限定：交付 BSP/AP 已分配、已复制、已发布的存储区域及生命周期，供 LOC_ID/LOC_REMOTE 建立访问前置；核对源目标不重叠、每核分配互异和复制前未使用。不能用尚未初始化的 CPU-local 建立自身初始化前置；链接区间及早期 CPU 状态属 TB_BOOT_INPUT。
- 前置：LOC_EARLY_GLOBAL（确认 · 验收前置）

**LOC_ACC** — guard / pin 约束下访问 CPU-local

- 实施 PR：—；复用 / 协调：—；模块：cpu/local、cpu/mod
- 要做什么：在持有 IRQ guard 的前提下访问 CPU-local；远端访问 get_on_cpu 要求 T: Sync，存储要求 S: AnyStorage<T>。PinCurrentCpu 是独立的 unsafe trait。
- 验收 / 限定：交付 get_with 在有效存储及 PinCurrentCpu/IRQ guard 生命周期内的借用合同；用实际本地资源访问证明前置可建立、借用不逃逸及 guard 释放后权限恢复。远端共享和单指令 Cell 分别归 LOC_REMOTE/LOC_CELL；GS/链接输入属 TB_BOOT_INPUT。
- 前置：LOC_ID（确认 · 验收前置）、IRQ_GUARD（确认 · 验收前置）

**PT_CFG** — 分页布局与 PageTableConfig 常量合同（已验收）

- 实施 PR：#855；复用 / 协调：#720、#857、#928、#929；模块：mm/page_table、mm/kspace、arch/x86/mm
- 要做什么：#855（已合入 41ccd7463）：删除 axiom_current_paging_consts_hardcoded；x86 的常量义务由 lemma_paging_consts_requirements 证明（arch/x86/mm/mod.rs）；Kernel / User 配置证明 PTE 大小与顶层范围，泛型 cursor 消费这些合同。#928（4676a774b，取代已关闭的 #408）把 TOP_LEVEL_CAN_UNMAP 等改为关联常量，#929 做证明展开的性能优化。 仍限制 4 KiB 页、8 字节 PTE、最多四层；KernelPtConfig / UserPtConfig 的 item_into_raw / item_from_raw 仍可信；VmSpace::unmap 保留溢出 assume。
- 验收 / 限定：限定验收：布局公理删除、x86 PagingConstsTrait 和 Kernel/User 配置常量义务有证明，泛型 cursor/页大小消费者已使用这些引理。4 KiB、8 字节 PTE、最多四层是当前配置限制；item 原始转换与 unmap 溢出债务归 MM_PT，不再阻塞本项。寄存器与硬件失效归 PT_X86。
- 已完成依据：2026-11-16 复核 #855 head 4362ee4b67601ef58882aa1fcb38a83fac879de7 与合入 41ccd7463 内容相同，最终 head 两次 APPROVED、CI 成功；main @8e681282d19b29bdc1b6e715930fe9224a0c88dc 的 arch/x86/mm::lemma_paging_consts_requirements、mm/{kspace,vm_space}::lemma_page_table_config_constant_requirements、mm/page_table::highest_level_index_range 已接通。#928 关联常量与 #929 展开改动已对照 main；这里只验收配置合同，本轮未重跑 Verus。
- 前置：无

**VM_POD** — Pod · 切片 · 可失败 VM I/O 测试

- 实施 PR：#927；复用 / 协调：—；模块：mm/io、mm/test
- 要做什么：#927：Pod derive、切片与可失败 VM I/O 测试；恢复 Pod derive、补 cursor 合同及可信 Vec 可变索引规约。main 已有 VM I/O 边界、失败保持与 limit 合同（#924）。
- 验收 / 限定：以 VM_REPR 合同恢复内容相等、成功返回和精确复制量断言，并明确恢复哪些运行期 ktest；测试须调用实际 Pod/VM I/O API。测试通过只验收这些例子，成功/部分故障全链由 F_BYTES 验收；原始转换/Vec 外部规约逐条记录。
- 前置：VM_REPR（确认 · 验收前置）

**VM_CONTENT** — read_val 返回值与字节内容的关系

- 实施 PR：—；复用 / 协调：—；模块：mm/io
- 要做什么：连接 read_val 的返回值与底层字节：目前返回值与实际字节内容没有关系。 补齐关闭内容相等断言所需的关系。
- 验收 / 限定：交付 read_val/write_val、reader/writer 拷贝的值与底层字节关系，供 F_BYTES 和 Pod 调用者证明内容相等；覆盖边界、失败状态和游标推进。以实际调用实例建立前置，Pod 表示与底层内存操作按 VM_REPR 的边界记录。
- 前置：VM_REPR（确认 · 验收前置）

**TLB_REQ** — TLB 请求与逻辑提交

- 实施 PR：#570、#677；复用 / 协调：—；模块：mm/tlb
- 要做什么：#677：OpsStack 不变式、push / merge / clear、请求覆盖与逻辑提交；OpsStack::new、硬件刷新、dispatch、sync 仍可信，CPU locality 与 frame 保留未建模。#570：tracked update / flush 规格，须与 #677 的模型协调（main 仍有对应公理，不能称已被取代）。 main 的 issue / dispatch 仍可信；逻辑 dispatch 只取最后一项，Range 只处理 range.start，不能代表整队硬件刷新。#838 的通用 TLB 基础与 #903 的模型清理纳入旧分支迁移。
- 验收 / 限定：交付请求集合覆盖、队列 push/merge/clear 和 tracked 映射更新合同，供 TLB_SHOOT/TLB_FREE 使用；验证零请求、Range 全范围和队列所有请求，协调 #677/#570 与 main 的模型。逻辑提交不代表远端完成；OpsStack::new 的可信构造与硬件操作分开登记。
- 前置：无

**TLB_SHOOT** — TLB shootdown：远端刷新与完成确认

- 实施 PR：—；复用 / 协调：—；模块：mm/tlb、arch/x86/mm
- 要做什么：证明请求目标、实际刷新与完成确认；还需当前 CPU 固定、每核队列与目标集合发布合同。main 的队列 / ACK 在注释里，dispatch、sync、remote handler 是桩。
- 验收 / 限定：发送 IPI 成功、逻辑请求入队或单核 invlpg 包装均不足以证明远端刷新完成；原 ACK 在实际刷新之前，须证明期间无法返回用户态。逻辑请求部分已由 TLB_REQ 单独承担，可先于 IPI 开展。
- 前置：TLB_REQ（确认 · 验收前置）、SMP_IPI（确认 · 验收前置）、PT_X86（确认 · 验收前置）

**TLB_FREE** — 待释放页面保留；释放在确认之后

- 实施 PR：—；复用 / 协调：—；模块：mm/tlb、mm/frame
- 要做什么：证明待释放页面的保留义务：page_keeper 的 push / extend / clear 在 main 都在注释里，#677 也未恢复。 页框释放必须在所需确认之后。
- 验收 / 限定：验收跨 CPU 完成与资源释放；传入 frame 不能据接口名算作已保留。
- 前置：TLB_SHOOT（确认 · 验收前置）、MM_FRAME（确认 · 验收前置）

**F_BYTES** — VM I/O 内容相等与完整复制断言

- 实施 PR：—；复用 / 协调：#927；模块：mm/io
- 要做什么：把底层内存视图与原 Rust buffer 的字节关系连接起来，才能关闭内容相等与完整复制断言。 底层目前只保证 r <= len；宏保证游标按返回量移动，但没有声明 Ok(n) 的精确复制量。内容相等、成功返回、复制量三类断言要分别补合同，不能全部归因于故障恢复缺失。
- 验收 / 限定：这是 #927 里仍被注释的断言的最终归宿。局部合同可先假定汇编 / 恢复合同，最终验收才需要 F_RECOVER 完成。
- 前置：F_RECOVER（确认 · 验收前置）、VM_CONTENT（确认 · 验收前置）

**TASK_STACK** — 内核栈大小解析（#921，已合入）

- 实施 PR：#921；复用 / 协调：—；模块：task/kernel_stack
- 要做什么：#921（已合入 97963e831）：main 已证明十进制解析与 KERNEL_STACK_SIZE 的上界 / 页对齐（复用 EndianNat<Base10>、Seq::all 的 vstd_extra 数字助手）；configured_stack_size_in_pages 仍是 external_body 的可信静态初始化。
- 验收 / 限定：限定交付为合法十进制输入的精确解析，以及 KERNEL_STACK_SIZE 上界/页对齐；静态环境输入由 configured_stack_size_in_pages 的 external_body 承接（TB_STACK_CONFIG）。分配/映射/非零栈要求由 TASK_STACK_ALLOC 另证。
- 已完成依据：2026-11-16 对照 #921 head c2b79a99ac026677dcf035233e3a87b36f2c88ed 与合入 97963e831、当前 main @8e681282d19b29bdc1b6e715930fe9224a0c88dc：parse_u32[_or_default] 的 requires/returns 和 KERNEL_STACK_SIZE ensures 已存在，限定交付已满足；PR CI 成功，环境配置边界记入 TB_STACK_CONFIG。本轮未重跑 Verus。
- 前置：无

**TASK_STACK_ALLOC** — 内核栈分配、映射与 TLB 一致性

- 实施 PR：—；复用 / 协调：—；模块：task/kernel_stack
- 要做什么：KernelStack::new_with_guard_page：FrameAllocOptions 分配、KVirtArea::map_frames 映射、4 页 guard page；tlb_coherent: AtomicCpuSet 与 flush_tlb。main 里这一段整体在注释中。 FrameAllocOptions 和 KVirtArea 的接口分别由 MM_FRAME、MM_KVA 供给；全局初始化在 MM_BOOT 验收。
- 验收 / 限定：交付 KernelStack 分配/映射、存活、初始 SP、guard page 和 flush_tlb 合同，供 TASK_SW 使用；核对非零大小、加法界限、失败资源保持和释放。大小来源属 TB_STACK_CONFIG，映射与刷新分别消费 MM_KVA/PT_X86。
- 前置：IRQ_GUARD（确认 · 验收前置）、TASK_STACK（确认 · 验收前置）、MM_FRAME（确认 · 验收前置）、MM_KVA（确认 · 验收前置）、PT_X86（确认 · 验收前置）

**PREEMPT_PIN** — 禁抢占 guard 与 PinCurrentCpu 合同

- 实施 PR：—；复用 / 协调：#900；模块：task/preempt、task/atomic_mode
- 要做什么：main 与 #900 head 的 disable_preempt() 都是 external_body + unimplemented!()；DisabledPreemptGuard 仍是占位结构（_private: ()）；PinCurrentCpu 的 blanket impl 也关闭。 x86 路径上的实际使用：EOI（arch/x86/mod.rs::interrupts_ack）、APIC timer（timer/apic.rs 三处）、AP 启动（boot/smp.rs）与缺页路径（arch/x86/trap/mod.rs）。
- 验收 / 限定：交付：禁抢占 guard 的创建 / 释放与 PinCurrentCpu 的“不迁移”合同。原设计用 CPU-local 计数器；#900 曾尝试用 IRQ guard 作后备，评审后已撤回，计划不再按“IRQ guard 作禁抢占后备”安排。源码注释（interrupts_ack）自称中断上下文里 disable_preempt() 并非必要。
- 前置：LOC_CELL（确认 · 验收前置）

**TASK_RUNTIME** — Task / current-task / park-unpark 局部状态合同

- 实施 PR：—；复用 / 协调：—；模块：task/mod、task/scheduler、task/processor
- 要做什么：current-task 的有效引用、调度器注入与队列状态、唯一运行权和 park/unpark 局部合同；以给定切换 hook 合同验证接口。main 的 Task 字段与 processor 接线关闭；TaskBuilder、内置 FIFO 和实际调度组合另由 TASK_COMPOSE 验收。
- 验收 / 限定：交付 Task/CurrentTask 有效引用、唯一运行权、调度器注入、park/unpark 状态与丢失唤醒排除；供 SYNC_WAIT 和 TASK_SW 消费。局部模型以给定切换 hook 合同证明，processor 的真实资源交接在 TASK_SW 组合，避免相互等待。用户调度策略与回调进展属 TB_CLIENT_HOOKS。
- 前置：LOC_CELL（确认 · 验收前置）

**PCI_TYPES** — PCI 数据类型 · getter · 位操作（#895）

- 实施 PR：#895；复用 / 协调：—；模块：bus/pci
- 要做什么：#895：PCI 数据类型、IoBar getter、vendor len、set_bit(offset < 16)；枚举、BAR、capability / MSI-X 主体继续注释。
- 验收 / 限定：交付 location/设备 ID 字段、zero、IoBar getter、vendor 长度与位操作合同，供 PCI_ENUM/PCI_DEVICE 使用；all() 的完整枚举归 PCI_ENUM。与 #706/#919 协调同名类型和模块开关；设备读写状态仍属 TB_HW_OPS。
- 前置：无

**PCI_CFG** — 配置空间读写（地址 · 宽度 · 对齐 · 失败）

- 实施 PR：#706；复用 / 协调：—；模块：bus/pci、arch/x86/pci
- 要做什么：配置空间访问的地址、宽度、对齐与失败行为；畸形 / 截断输入、未发现设备的合同。 #706 只保证架构 read / write 返回 Ok，没有描述设备配置状态；通用 read8 / read16 / write8 / write16 没有已验证合同，也没有名为 PciSegment 的接口。补 CF8 / CFC 成对事务互斥、偏移合法范围、子宽度读改写与设备状态合同。
- 验收 / 限定：交付给 BAR/capability/枚举的 read8/16/32、write8/16/32 地址、宽度、对齐与配置状态合同；核对 CF8/CFC 成对互斥和子宽度读改写。保留原返回/错误行为，#706 的恒 Ok 规格不足以说明设备状态；硬件值与访问效果属 TB_HW_OPS。
- 前置：IO_PIO（确认 · 验收前置）、PCI_ENC（确认 · 验收前置）

**PCI_ENUM** — 总线枚举与设备 / 功能遍历

- 实施 PR：—；复用 / 协调：#895；模块：bus/pci
- 要做什么：总线枚举与设备 / 功能号遍历的边界；畸形 / 截断输入与未发现设备的合同。
- 验收 / 限定：交付 location/all() 的有界、完整、无重复遍历与 vendor 不存在分支；以给定设备构造合同证明循环。实际 PciCommonDevice::new 同时初始化 BAR/capability，完整总线 init 由 PCI_DEVICE 验收。
- 前置：PCI_CFG（确认 · 验收前置）、PCI_TYPES（确认 · 验收前置）

**PCI_BAR** — BAR 探测与 MMIO / PIO 映射

- 实施 PR：—；复用 / 协调：#706；模块：bus/pci、io/io_mem、io/io_port
- 要做什么：BAR 尺寸探测与 MMIO / PIO 映射的所有权与释放；分配失败、映射失败与正常释放的合同。计划里的“分配”并不对应现有 x86 执行路径。
- 验收 / 限定：验收 BAR 尺寸/类型、64 位 BAR 成对处理、原值恢复、映射边界与别名存活；#706 没有修改 cfg_space 的 BAR 实现，只供应 IO 底座，记为复用。IoBar 直接调用 PortRead/PortWrite，端口宽度/范围效果属 TB_HW_OPS，不虚构 allocator 所有权。
- 前置：PCI_CFG（确认 · 验收前置）、IO_MMIO（确认 · 验收前置）

**PCI_CAP** — capability 链遍历与 MSI 标记

- 实施 PR：—；复用 / 协调：#895；模块：bus/pci
- 要做什么：capability 链遍历：目前没有环检测；MSI 只有 CapabilityData::Msi 标记。
- 验收 / 限定：交付 capability 指针对齐/边界、类型分派和终止条件。原代码无环检测，需真实设备链无环前提或单独授权行为修复；MSI 当前只有标记，不添加未实现的 MSI 生命周期。构造 MSI-X 的组合归 PCI_DEVICE。
- 前置：PCI_CFG（确认 · 验收前置）

**PCI_MSIX** — MSI-X 表项配置与启停

- 实施 PR：—；复用 / 协调：#895、#919；模块：bus/pci、io/io_mem
- 要做什么：MSI-X 构造存在 BAR 类型 / 缺失与访问失败的 panic / unwrap；表项启用 / 屏蔽与启停。当前 API 没有完整关闭 / 排空生命周期。
- 验收 / 限定：交付给 PCI_DEVICE/PCI_IRQ 的表项定位、启用/屏蔽、消息地址和 IrqLine 存活合同；核对 BAR 类型/长度、PBA、访问失败与原 unwrap 条件。当前缺失的关闭/排空支持须明确处理或登记客户义务，IRT 语义属 TB_IOMMU。
- 前置：PCI_CAP（确认 · 验收前置）、PCI_BAR（确认 · 验收前置）、PCI_ENC（确认 · 验收前置）、IO_MMIO（确认 · 验收前置）、IRQLINE（确认 · 验收前置）

**PCI_IRQ** — PCI 中断：IRQ 注册 · EOI · 关闭

- 实施 PR：—；复用 / 协调：—；模块：bus/pci、trap/irq
- 要做什么：IRQ 注册、EOI 与关闭。MSI-X 的投递不经过 ISA → GSI → IOAPIC 路由，已移除对 ROUTE_MAP 的依赖；remapping 地址来自 IrqLine::remapping_index。
- 验收 / 限定：交付选定 PCI 设备从注册、MSI-X 投递、trap 回调/EOI 到屏蔽/注销的组合证据，核对关闭期间资源存活和迟到中断。MSI 当前只有标记，不虚构完整实现；硬件进展与 IRT 分别属 TB_HW_OPS/TB_IOMMU。
- 前置：PCI_MSIX（确认 · 验收前置）、IRQLINE（确认 · 验收前置）、TRAP_DISP（确认 · 验收前置）

**SA_HEAP** — heap slot / slot_list

- 实施 PR：#923；复用 / 协调：#505；模块：mm/heap
- 要做什么：#923：空表、LIFO、剩余链接保持、独占内存转移、slot getter 与物理地址转换；Send / Sync 仍为 verifier::external。main 的 heap 模块关闭，内部是普通 Rust。
- 验收 / 限定：交付 slot/slot_list 的空表、LIFO、剩余链保持与独占内存转移合同，供 HEAP_GLOBAL 的 slab 包装使用；核对真实调用者和 Send/Sync 外部条件。与 #505 协调重叠；Box 的局部证明使用 TB_ALLOC，无需等待本项。
- 前置：无

**SA_DMA** — DMA stream 同步 · 对齐

- 实施 PR：#617、#883；复用 / 协调：—；模块：mm/dma
- 要做什么：#883：加强 slice 算术前置与 is_valid_daddr，验证 DmaStreamSlice::sync / daddr，后置主要是保持不变式，没有证明设备完成同步；内层 DmaStream::sync 仍可信，构造保留地址加法 assume。#617：删除 helper 层并让 getter 返回锁内读出的 snapshot。
- 验收 / 限定：交付 DmaStreamSlice 的边界/设备地址与 CPU/设备同步条件，供真实 DMA 客户使用；现有 x86 sync 返回 Ok 不证明设备已经完成，须明确一致性与设备完成输入。完整 map/registry/coherent 路径由 DMA_MAP 提供；#883/#617 只覆盖 stream 部分并有重叠，IOMMU/TDX/硬件一致性分别登记。
- 前置：DMA_MAP（确认 · 验收前置）

**SA_RCU** — RCU 宽限期 / 静止点合同

- 实施 PR：#487、#860；复用 / 协调：—；模块：sync/rcu
- 要做什么：#860：显式 context 下的读保护、retirement、宽限期与回收，含 owning-link 与负例验收；scheduler / preemption 接线仍缺，callback allocation / type erasure / dispatch 保留 external_body。#487 是更早的大范围弱内存模型分支，disable_preempt 仍标“unsound”。二者都要迁移 #922 的 pool registry。
- 验收 / 限定：交付读保护、retirement、宽限期和回收合同，供 switch_to_task::finish_grace_period 与 RCU 客户使用；迁移 #922 registry 并用真实 context/负例核对权限。scheduler/preemption 与 callback 分配/dispatch 的未连接部分必须说明，不能把 #487 的 unsound/桩作为运行证据。
- 前置：无

**IO_PIO_ALLOC** — 动态 PIO 分配、保留与显式释放

- 实施 PR：#706；复用 / 协调：—；模块：io/io_port
- 要做什么：#706 的 acquire/acquire_overlapping、reserve_io_port_range、动态 claim 和 consuming drop(self)；核对自动 Drop 改写后的真实调用者。
- 验收 / 限定：供动态 IoPort 消费者使用：冲突/越界失败不丢权限，释放只能消费本 allocator 发出的 claim。硬件可访问范围与 allocator 的 u16 排他端点分别证明；硬件效果属 TB_HW_OPS。
- 前置：IO_PIO（确认 · 验收前置）

**IO_MMIO** — IoMem 映射、切片与设备访问合同

- 实施 PR：#706；复用 / 协调：—；模块：io/io_mem
- 要做什么：#706 的 IoMem::new/acquire/slice、VmIo/VmIoOnce 与映射存活；当前 new/acquire/设备访问仍 external，obeys_vmio_* 为 false，不能向设备调用者提供完整访问保证。
- 验收 / 限定：供 PCI BAR、MSI-X 消费地址/长度、访问边界和映射生命周期。new 的形式 requires 目前没有 registered-window 条件；其 unsafe 设备区域合法性须另交证据。Drop 当前不回收 MMIO，不能宣称释放回 allocator；设备寄存器效果属 TB_HW_OPS。HPET 直接使用 VolatileRef，另按其真实路径验收。
- 前置：MM_KVA（确认 · 验收前置）

**IO_GLOBAL** — PIO/MMIO 全局初始化与权限交接

- 实施 PR：#706；复用 / 协调：—；模块：io/mod
- 要做什么：把局部 builder/PIO allocator 与 io::init 的 Once 状态、注册窗口和动态分配权限相连，验证全局入口能获得所需资源。
- 验收 / 限定：交付 io_mem_allocator_initialized/io_port_allocator_initialized 的真实来源以及初始化一次、系统设备保留与失败合同；设备调用者仅在使用全局 acquire 时消费它。不能把 IO_GLOBAL 当静态 PIO 或 unsafe IoMem::new 的统一前置。
- 前置：IO_ALLOC（确认 · 验收前置）、IO_WIN（确认 · 验收前置）、IO_PIO_ALLOC（确认 · 验收前置）

**MM_FRAME** — Frame / Segment 分配、元数据与释放

- 实施 PR：—；复用 / 协调：#720；模块：mm/frame
- 要做什么：补 FrameAllocOptions、Frame/Segment 元数据初始化、引用计数/类型转换、所有权移交和释放合同；#720 的类型接口仅按实际调用复用。
- 验收 / 限定：供栈、动态 CPU-local、页表和 DMA 使用：分配失败不伪造内存，成功给出对齐、存活、互不重叠和元数据权限。用户 GlobalFrameAllocator 实现属 TB_ALLOC；OSTD 包装与元数据义务仍在本项。
- 前置：无

**MM_PT** — 通用页表与 VmSpace 映射接口补齐

- 实施 PR：—；复用 / 协调：#720、#857；模块：mm/page_table、mm/vm_space
- 要做什么：覆盖 cursor map/unmap/protect/query、item 原始转换和 frame 所有权往返，消解或逐项登记现存 external/admit/assume；#855 的常量证明不覆盖这些接口。
- 验收 / 限定：交付 MM_KVA、内核缺页和用户地址空间可用的映射变化、失败保持、释放义务；VmSpace::unmap 溢出 assume 不能以配置 PR 已合入关闭。局部逻辑映射可先行，最终回收由 TLB_FREE 接线，底层原子/PTE 操作属逐条核对的 TB_MM_RAW。
- 前置：PT_CFG（确认 · 验收前置）、MM_FRAME（确认 · 验收前置）

**MM_KVA** — KVirtArea 映射、存活与解除映射

- 实施 PR：—；复用 / 协调：—；模块：mm/kspace
- 要做什么：交付 map_frames/map_untracked_frames、区间分配、range 与 Drop 的局部映射合同；显式区分指针算术、映射已生效和远端 TLB 安全释放。
- 验收 / 限定：供 KernelStack 与 IoMem 使用：保留区间、guard-page 空洞、映射权限、引用存活和失败资源保持可由调用者建立。局部接口使用给定 kernel table/allocator；全局初始化归 MM_BOOT，跨 CPU 释放归 TLB_FREE。
- 前置：MM_PT（确认 · 验收前置）

**MM_BOOT** — 通用 MM 引导初始化与内核页表发布

- 实施 PR：—；复用 / 协调：—；模块：mm/kspace、mm/frame、mm/page_table
- 要做什么：恢复 boot_pt、frame allocator init、init_kernel_page_table/activate_kernel_page_table，建立线性映射有效区间和 KERNEL_PAGE_TABLE 的发布合同。
- 验收 / 限定：交付 AP 启动、内核缺页、MMIO 指针消费者的可用页表/线性映射与全局分配状态。初始 boot 页表及固件区域是 TB_BOOT_INPUT；不能用 paddr_to_vaddr 的加法合同代替可解引用的映射证明。
- 前置：MM_PT（确认 · 验收前置）、PT_X86（确认 · 验收前置）、MM_FRAME（确认 · 验收前置）、LOC_EARLY_GLOBAL（确认 · 验收前置）

**LOC_EARLY_GLOBAL** — 全局 early_alloc 内存权限与交接

- 实施 PR：—；复用 / 协调：#802；模块：mm/frame
- 要做什么：把 #802 的实例数值证明接到全局 early_alloc/init_early_allocator，给出每次分配的可写区域与跨次不重叠、既有分配保留合同。
- 验收 / 限定：供 copy_bsp_for_ap 与 MM 引导消费；实例 alloc 成功数值不足以生成线性内存权限。固件 memory_regions 来源属 TB_BOOT_INPUT，global new 的 external 需记录/缩小。
- 前置：LOC_ALLOC（确认 · 验收前置）

**LOC_REMOTE** — CPU-local 目标核访问与存储索引

- 实施 PR：—；复用 / 协调：—；模块：cpu/local
- 要做什么：交付 CpuLocal::get_on_cpu、StaticStorage::get_ptr_on_target 的索引、存活与 T: Sync 共享合同；无需 get_with 的 IRQ guard。
- 验收 / 限定：供 LAPIC 槽和 IPI CALL_QUEUES 使用；目标 CpuId 有效，存储已发布且借用不越生命周期。GS/链接布局属 TB_BOOT_INPUT，当前核稳定由各调用方的 guard 另证。
- 前置：LOC_ID（确认 · 验收前置）

**LOC_CELL** — CpuLocalCell 单指令操作与原始指针

- 实施 PR：—；复用 / 协调：—；模块：cpu/local
- 要做什么：覆盖 load/store、加减/位操作的单指令 CPU 归属、环绕算术与 as_mut_ptr 的借用条件；不能由 CpuLocal::get_with 证明替代。
- 验收 / 限定：供抢占计数、陷阱嵌套计数、CURRENT/PREVIOUS_TASK_PTR 使用；多次操作需同核时由调用者提供 pin/IRQ 条件。单指令汇编是 TB_HW_OPS，GS 和链接布局属 TB_BOOT_INPUT。
- 前置：LOC_ID（确认 · 验收前置）

**LOC_DYNAMIC** — 动态 CPU-local 存储（DynCpuLocalChunk）

- 实施 PR：—；复用 / 协调：—；模块：cpu/local
- 要做什么：覆盖 new/alloc/try_dealloc 的 frame 分配、bitmap、逐 CPU 初始化、析构与错误 chunk 行为。
- 验收 / 限定：交付 DynamicStorage 的 AnyStorage 合同及显式回收；供动态 CpuLocal 调用者，不能因静态 CPU-local 验收而关闭本项。分配器实现/位图库合同属 TB_ALLOC/外部库边界。
- 前置：MM_FRAME（确认 · 验收前置）

**SYNC_GUARD** — 锁 guardian 与 IRQ/抢占资源连接

- 实施 PR：—；复用 / 协调：—；模块：sync/guard、sync/spin、sync/rwlock
- 要做什么：连接 SpinGuardian、GuardTransfer、PreemptDisabled、LocalIrqDisabled、WriteIrqDisabled 与实际 guard 生命周期；已有锁内存不变式证明不能代替硬件禁中断/不迁移状态。
- 验收 / 限定：交付锁持有期间的原子模式、guard transfer 无间隙与 Drop 恢复合同。供 IrqLine 回调表、IPI 队列和运行时锁使用；WriteIrqDisabled 读侧消费禁抢占、写侧消费禁 IRQ。外部原子操作按既有模型登记。
- 前置：IRQ_DROP（确认 · 验收前置）、PREEMPT_PIN（确认 · 验收前置）

**SYNC_WAIT** — WaitQueue / Waiter / Waker 执行连接

- 实施 PR：—；复用 / 协调：#857；模块：sync/wait
- 要做什么：恢复 do_wait/wake_up 的 park/unpark 调用，处理循环 admit、计数上界 assume 与唤醒竞争。
- 验收 / 限定：供 Mutex/RwMutex 使用的条件复查、入队/唤醒、取消与无丢失唤醒合同；调度公平性须显式列条件，不能由 WaitQueue 名称保证终止。
- 前置：TASK_RUNTIME（确认 · 验收前置）

**SYNC_API** — Mutex / RwMutex / RwArc 公共接口验收

- 实施 PR：—；复用 / 协调：—；模块：sync/mutex、sync/rwmutex、sync/rwarc
- 要做什么：核对阻塞锁、升级/降级、借用及解锁 API 与 WaitQueue 的执行合同，登记 RwArc 外部体；不把 LOC 已验证比例当 API 组合完成。
- 验收 / 限定：供 task 与 OSTD 客户使用：竞争/等待/唤醒时资源保持和权限转移成立；已有局部锁证明直接复用。调度公平性和底层原子模型属于显式前提，硬件执行资源由 SYNC_GUARD 接入。
- 前置：SYNC_WAIT（确认 · 验收前置）、SYNC_GUARD（确认 · 验收前置）

**VM_REPR** — Pod / buffer 与字节视图桥接

- 实施 PR：—；复用 / 协调：#927；模块：libs/ostd-pod、mm/io
- 要做什么：建立 Pod 位表示、Rust slice 与 VmIoOwner/MemView 的字节对应及布局合同；测试用例本身不能作为 read_val 证明的前置。
- 验收 / 限定：供 VM_CONTENT、VM_POD 和 F_BYTES 证明值/字节相等；derive 宏产物、原始转换和未建模 Rust 内存连接逐项登记，不能仅恢复测试属性结项。
- 前置：无

**PCI_DEVICE** — PCI 设备构造、能力初始化与总线登记

- 实施 PR：—；复用 / 协调：—；模块：bus/pci
- 要做什么：把 PciCommonDevice::new 的 command 设置、BAR 管理器、capability/MSI-X 构造与总线登记组合；枚举循环本身可以先证明。
- 验收 / 限定：交付真实发现设备的初始化/失败/panic 合同，核对未发现 vendor=0xffff、缺失 BAR、capability 环和 MSI-X 初始化。硬件配置值与 IRT 语义属 TB_HW_OPS/TB_IOMMU；不擅自添加原 API 没有的错误恢复。
- 前置：PCI_ENUM（确认 · 验收前置）、PCI_BAR（确认 · 验收前置）、PCI_CAP（确认 · 验收前置）、PCI_MSIX（确认 · 验收前置）

**HEAP_GLOBAL** — 堆 slab / 全局分配器包装

- 实施 PR：#505；复用 / 协调：—；模块：mm/heap
- 要做什么：恢复 AllocDispatch、GlobalHeapAllocator 与 slab 分配/释放，复用 SA_HEAP 的 slot 链；#505 中关闭的路径不能算完成。
- 验收 / 限定：交付 OSTD 堆包装的布局、分配失败和回收资源合同；Box/Vec 的局部消费者仍可使用 alloc 外部规约，无需等待本项。用户提供 allocator 的实现属于 TB_ALLOC。
- 前置：SA_HEAP（确认 · 验收前置）、MM_FRAME（确认 · 验收前置）

**BOOT_COMMON** — 通用 BootInfo 与 OSTD 入口编排

- 实施 PR：—；复用 / 协调：—；模块：boot/mod、lib/lib
- 要做什么：验证 BootInfo 发布/访问、init_after_heap 对 command-line/memory-region 的保存和 call_ostd_main 的入口条件；纳入普通 lib 初始化关闭路径的清单。
- 验收 / 限定：交付 EARLY_INFO 到 BOOT_INFO 的值/生命周期合同与 OSTD 客户入口前提；架构 boot 输入属 TB_BOOT_INPUT，用户 ostd_main 属 TB_CLIENT_HOOKS。全平台初始化组合由 SMP_COMPOSE/ACC_SCOPE 记录。
- 前置：无

**DMA_MAP** — DMA 映射、coherent 与全局登记

- 实施 PR：—；复用 / 协调：#617、#883；模块：mm/dma
- 要做什么：补全 mod.rs::init/dma_type/check_and_insert_dma_mapping、DmaCoherent/DmaStream::map、reader/writer 与释放的执行资源合同。main 的 mapping_set.insert、cache policy、IOMMU map 等仍有注释路径，dma_type 为 external + unimplemented，不能按现有 wf 后置条件视为映射完成。
- 验收 / 限定：交付实际 DMA 客户与 SA_DMA 可用的重复映射拒绝、设备地址/CPU 访问对应、Segment 存活、失败保持与最终注销合同；逐条处理被注释的执行动作。IOMMU/TDX 实现属 TB_IOMMU/TB_TDX，缓存一致性和设备完成属 TB_HW_OPS；软件 wrapper/registry 不由这些边界自动豁免。
- 前置：SYNC_GUARD（确认 · 验收前置）、MM_PT（确认 · 验收前置）、PT_X86（确认 · 验收前置）、TLB_SHOOT（待确认）

**TASK_COMPOSE** — 任务创建、默认调度与远端通知组合

- 实施 PR：—；复用 / 协调：—；模块：task/mod、task/scheduler、task/processor
- 要做什么：验证 TaskBuilder::build/spawn、kernel_task_entry 与退出、内置 FIFO 队列、reschedule 和 set_need_preempt 的真实组合；局部 current-task/park 状态合同仍由 TASK_RUNTIME 独立供给。
- 验收 / 限定：交付实际创建、首次执行、调度/等待/唤醒和退出的资源证据，覆盖分配失败、无 scheduler 时的 FIFO fallback、CPU 选择与远端通知。客户调度策略/回调进展属 TB_CLIENT_HOOKS；内置 FIFO 和软件通知包装在本项范围内，不能由注入接口的可信边界豁免。
- 前置：TASK_RUNTIME（确认 · 验收前置）、TASK_SW（确认 · 验收前置）、TASK_STACK_ALLOC（确认 · 验收前置）、PREEMPT_PIN（确认 · 验收前置）、SMP_IPI（确认 · 验收前置）、SYNC_GUARD（确认 · 验收前置）、TRAP_DATA（确认 · 验收前置）

**COMMON_AUDIT** — 公共 API 与残留占位清单验收

- 实施 PR：—；复用 / 协调：—；模块：cpu/set、user/user、timer/mod、util/ops、console/console、logger/logger、panic/panic
- 要做什么：逐模块盘点未被工作项覆盖的 cpu/set、user::UserMode、timer/jiffies、console/logger/panic、util、ostd-pod/ostd-test、辅助库入口；每个未启用函数/占位/可信体必须有归属，不以 LOC 颜色推断完整性。
- 验收 / 限定：交付固定 main 上的 API/模块开关清单，引用本计划工作项或逐条可信边界；对剩余缺口形成可执行子任务并关闭，不能仅做清单就宣布 x86 完成。console/logger 的格式化与内核回调可保留明确外部条件，其他公共执行代码不隐含排除。
- 前置：无
<!-- END GENERATED:items -->

## 附录 B：依赖依据

每条确认关系给出所需接口/资源和固定源码，未确认关系说明缺什么证据。`ACC_SCOPE` 的边表示范围交付验收，不能据此推导运行时顺序。

<!-- BEGIN GENERATED:deps -->
#### x86 平台

| 工作项 | 前置 | 类型 | 用到前置的什么 / 缺少的证据 | 依据（文件::符号 @固定提交） |
|---|---|---|---|---|
| IO_WIN | IO_ALLOC（跨路线） | 确认 · 验收前置 | IoMemAllocatorBuilder::new 返回的窗口视图与 RangeAllocatorPermits 合同，以及 registered_io_mem_windows / state_matches 的规格 | ostd/src/io/io_mem/allocator.rs::new,state_matches,has_registered_windows @7c710f060f7a5ed3330aba64a9f711e6dd5edac9 |
| IRQ_GUARD | IRQ_MODEL | 确认 · 验收前置 | 同 CPU 的 inv / coherent、匹配的 authority、保存的 IF 与嵌套权限合同 | ostd/src/trap/irq.rs::DisabledLocalIrqGuard::new; ostd/specs/task/irq.rs::LocalIrqGuardOwner @6cec73d064 |
| IRQ_DROP | IRQ_GUARD | 确认 · 验收前置 | 创建产生的保存 IF、CPU、嵌套深度与线性恢复权限 | ostd/specs/task/irq.rs::IrqRestorePermission,tracked_restore @6cec73d064 |
| LOC_ID | LOC_STORE（跨路线） | 确认 · 验收前置 | AP 存储基址、索引有效性与发布合同（get_ap）；BSP 的静态 GS 基址不依赖 AP 分配完成 | ostd/src/cpu/local/mod.rs::get_ap; ostd/src/arch/x86/boot/ap_boot.S::GS.base @97963e831 |
| ACPI_MADT | ACPI_TABLES | 确认 · 验收前置 | 有效的 AcpiTables、find_table::<Madt>、表长度与条目访问合同 | ostd/src/arch/x86/kernel/irq/mod.rs::init @97963e831 |
| PIC | IO_PIO（跨路线） | 确认 · 验收前置 | 敏感 PIO 端口 IoPort<u8, WriteOnlyAccess>::write 的权限与写入合同；端口 0x20 / 0x21 / 0xA0 / 0xA1 | ostd/src/arch/x86/kernel/irq/pic.rs::MASTER_CMD,MASTER_DATA,SLAVE_CMD,SLAVE_DATA,set_mask @97963e831 |
| IOAPIC_REG | IO_ALLOC（跨路线） | 确认 · 验收前置 | IoApicAccess::new 保留 [base,base+0x20) 时的 remove 权限合同 | ostd/src/arch/x86/kernel/irq/ioapic.rs::IoApicAccess::new @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| IOAPIC_ENTRY | IOAPIC_REG | 确认 · 验收前置 | 寄存器选择 / 数据访问合同 | ostd/src/arch/x86/kernel/irq/ioapic.rs::IoApic::enable,disable @97963e831 |
| IOAPIC_ENTRY | IRQLINE | 确认 · 验收前置 | IrqLine::num / remapping_index，以及重定向项被禁用前 IRQ 不被释放的生命周期合同 | ostd/src/arch/x86/kernel/irq/ioapic.rs::IoApic::enable; ostd/src/trap/irq.rs::IrqLine @97963e831 |
| PIT_CFG | IO_PIO（跨路线） | 确认 · 验收前置 | 0x43 / 0x40 敏感 PIO 的写权限与写合同 | ostd/src/arch/x86/timer/pit.rs::MODE_COMMAND_PORT,CHANNEL0_PORT,init @97963e831 |
| APIC_RESERVE | IO_ALLOC（跨路线） | 确认 · 验收前置 | IoMemAllocatorBuilder::remove 的 requires 与 ensures | ostd/src/arch/x86/kernel/apic/mod.rs::init（io_mem_builder.remove(base..base + 1024)） @97963e831 |
| APIC_RESERVE | IO_WIN | 确认 · 验收前置 | 该 1024 字节范围属于登记窗口，且权限尚未被其他设备占用 | ostd/src/arch/x86/kernel/apic/mod.rs::init @97963e831 |
| APIC_PUB | APIC_PROBE | 确认 · 验收前置 | ApicId::from 读取 APIC_TYPE，须与 init 发布的模式一致，并保留 xAPIC 八位截断（value as u8） | ostd/src/arch/x86/kernel/apic/mod.rs::init,APIC_TYPE,ApicId::from @97963e831 |
| APIC_PUB | APIC_RESERVE | 确认 · 验收前置 | xAPIC 分支只有 remove 成功后发布 APIC_TYPE；x2APIC 分支不消费该条件 | ostd/src/arch/x86/kernel/apic/mod.rs::init @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| LAPIC_INST | APIC_PUB | 确认 · 验收前置 | get_or_init 消费 APIC_TYPE.get().unwrap() 的已发布模式 | ostd/src/arch/x86/kernel/apic/mod.rs::get_or_init @97963e831 |
| LAPIC_INST | LOC_ID | 确认 · 验收前置 | CpuId::current_racy 与 CPU-local 槽归属，以及 PinCurrentCpu 的不迁移合同 | ostd/src/arch/x86/kernel/apic/mod.rs::get_or_init @97963e831 |
| LAPIC_INST | LOC_REMOTE（跨路线） | 确认 · 验收前置 | APIC_INSTANCE.get_on_cpu(current_racy()) 的槽存活和共享访问合同 | ostd/src/arch/x86/kernel/apic/mod.rs::get_or_init @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| LAPIC_DEV | LAPIC_INST | 确认 · 验收前置 | 调用方取得当前 CPU 的已启用后端；后端寄存器证明本身不必等实例管理 | ostd/src/arch/x86/kernel/apic/mod.rs::Apic,ApicTimer; xapic.rs::XApic::eoi; x2apic.rs::X2Apic::eoi @97963e831 |
| LAPIC_DEV | PREEMPT_PIN（跨路线） | 确认 · 验收前置 | EOI 路径 interrupts_ack 先用 disable_preempt() 取得 PinCurrentCpu，再调用 get_or_init(..).eoi() | ostd/src/arch/x86/mod.rs::interrupts_ack @97963e831 |
| GDT | LOC_ID | 确认 · 验收前置 | LOCAL_TSS.as_ptr() 指向当前 CPU 的永久 TSS，且执行期间不迁移 | ostd/src/arch/x86/trap/gdt.rs::init,LOCAL_TSS @97963e831 |
| IDT_LOAD | IDT_TABLE | 确认 · 验收前置 | 有效、永久（'static）的 IDT 切片与表界限合同 | ostd/src/arch/x86/trap/idt.rs::init（GLOBAL_IDT、lidt） @97963e831 |
| TRAP_EXC | TRAP_DATA | 确认 · 验收前置 | 异常数据类型与 PageFaultErrorCode::from_bits 合同；无需等全部 UserContext getter | ostd/src/arch/x86/cpu/context/mod.rs::CpuException::new @a47e745320 |
| TRAP_DISP | IDT_LOAD | 确认 · 验收前置 | 入口已安装、有效的代码选择子与表项 | ostd/src/arch/x86/trap/trap.S::trap_common; arch/x86/trap/mod.rs::trap_handler @97963e831 |
| TRAP_DISP | GDT | 确认 · 验收前置 | 有效的 TSS / 栈布局合同 | ostd/src/arch/x86/trap/gdt.rs::LOCAL_TSS; trap.S::trap_common @97963e831 |
| TRAP_DISP | IRQ_GUARD | 确认 · 验收前置 | IF、嵌套、bottom-half guard 交接及返回时禁中断合同 | ostd/src/trap/handler.rs::process_bottom_half,call_irq_callback_functions @97963e831 |
| TRAP_DISP | TRAP_EXC | 确认 · 验收前置 | CpuException::new 的分类与载荷合同：trap_handler 第 166 行调用 CpuException::new(f.trap_num, f.error_code) | ostd/src/arch/x86/trap/mod.rs::trap_handler @97963e831 |
| TRAP_DISP | IRQLINE | 确认 · 验收前置 | 回调表有效性、IRQ 索引范围与回调执行合同 | ostd/src/trap/irq.rs::process_top_half; trap/handler.rs::call_irq_callback_functions @97963e831 |
| TRAP_DISP | LOC_CELL（跨路线） | 确认 · 验收前置 | KERNEL_INTERRUPT_NESTED_LEVEL 的同核单指令加减与恢复 | ostd/src/arch/x86/trap/mod.rs::trap_handler @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| IRQLINE | SYNC_GUARD（跨路线） | 确认 · 验收前置 | Inner.callbacks 的读/写 guardian 及 guard 转移恢复合同 | ostd/src/trap/irq.rs::Inner,process_top_half; ostd/src/sync/guard.rs::WriteIrqDisabled @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ROUTE_MAP | ACPI_MADT | 确认 · 验收前置 | ISA override 与 IOAPIC 控制器清单 | ostd/src/arch/x86/kernel/irq/mod.rs::init,IrqChip::map_isa_pin_to @97963e831 |
| ROUTE_MAP | IOAPIC_ENTRY | 确认 · 验收前置 | 重定向项 enable / disable 的效果与失败合同 | ostd/src/arch/x86/kernel/irq/mod.rs::IrqChip::map_gsi_pin_to; ioapic.rs::IoApic::enable @97963e831 |
| ROUTE_MAP | IRQLINE | 确认 · 验收前置 | IRQ vector 与保留期合同 | ostd/src/arch/x86/kernel/irq/mod.rs::MappedIrqLine::drop @97963e831 |
| ROUTE_MAP | PIC | 确认 · 验收前置 | PCAT_COMPAT 平台上 PIC 已被 init_and_disable 屏蔽，IOAPIC 才是唯一投递路径 | ostd/src/arch/x86/kernel/irq/mod.rs::init（PCAT_COMPAT → pic::init_and_disable） @97963e831 |
| ROUTE_MAP | IO_WIN | 确认 · 验收前置 | irq::init 将 MADT 的 IOAPIC 地址对应到可保留窗口；须证明地址落在登记窗口且未分配 | ostd/src/arch/x86/kernel/irq/mod.rs::init; ioapic.rs::IoApicAccess::new @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| PITIRQ | ROUTE_MAP | 确认 · 验收前置 | 最终组合：ISA / GSI 映射与 IOAPIC 配置（本项就是这些合同的组合验收） | ostd/src/arch/x86/timer/pit.rs::enable_interrupt; ostd/src/arch/x86/kernel/irq/mod.rs::init @97963e831 |
| PITIRQ | TRAP_DISP | 确认 · 验收前置 | 最终组合：IDT / 汇编进入、TrapFrame、IRQ 嵌套状态、回调执行 | ostd/src/trap/handler.rs::call_irq_callback_functions @97963e831 |
| PITIRQ | LAPIC_DEV | 确认 · 验收前置 | 最终组合：回调后的 EOI（interrupts_ack 通过当前 LAPIC 的 eoi） | ostd/src/arch/x86/mod.rs::interrupts_ack @97963e831 |
| PITIRQ | PIT_CFG | 确认 · 验收前置 | 本里程碑明确验收实际 PIT 产生 IRQ0：必须给出 RateGenerator 编程与周期来源，不能只假定中断出现 | ostd/src/arch/x86/timer/pit.rs::init,enable_interrupt; arch/x86/kernel/tsc.rs::determine_tsc_freq_via_pit @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| CAL_FREQ | PITIRQ | 确认 · 验收前置 | IRQ0 周期回调、EOI 与等待进展合同：determine_tsc_freq_via_pit 用 IrqLine::alloc + on_active(pit_callback) 注册回调，再用 enable_local_and_halt 等待，不是端口轮询 | ostd/src/arch/x86/kernel/tsc.rs::determine_tsc_freq_via_pit（第 180–194 行） @97963e831 |
| CAL_FREQ | PIT_CFG | 确认 · 验收前置 | pit::init(RateGenerator) 的周期合同 | ostd/src/arch/x86/kernel/tsc.rs::determine_tsc_freq_via_pit @97963e831 |
| CAL_FREQ | TSC_VALUE | 确认 · 验收前置 | CPUID/PIT 选择后发布的频率值合同 | ostd/src/arch/x86/kernel/tsc.rs::init_tsc_freq @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| TMR_DEADLINE | LAPIC_DEV | 确认 · 验收前置 | Apic::set_lvt_timer 与 deadline MSR 的效果 | ostd/src/arch/x86/timer/apic.rs::init_deadline_mode @97963e831 |
| TMR_DEADLINE | IRQLINE | 确认 · 验收前置 | IrqLine 分配与回调注册 | ostd/src/arch/x86/timer/apic.rs::init_bsp,init_timer @97963e831 |
| TMR_DEADLINE | PREEMPT_PIN（跨路线） | 确认 · 验收前置 | init 与回调中 disable_preempt() 取得的 PinCurrentCpu guard（第 64、117、146 行） | ostd/src/arch/x86/timer/apic.rs @97963e831 |
| TMR_DEADLINE | TSC_VALUE | 确认 · 验收前置 | init_deadline_mode_config 消费 tsc_freq() 并计算间隔 | ostd/src/arch/x86/timer/apic.rs::init_deadline_mode_config @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| TMR_PERIODIC | PITIRQ | 确认 · 验收前置 | periodic 校准注册 PIT 回调并等待 CONFIG，完成后 drop(irq)：周期采样回调与中断进展 | ostd/src/arch/x86/timer/apic.rs::init_periodic_mode_config,pit_callback @97963e831 |
| TMR_PERIODIC | LAPIC_DEV | 确认 · 验收前置 | 计数器、分频与 LVT 状态合同 | ostd/src/arch/x86/timer/apic.rs::init_periodic_mode_config @97963e831 |
| TMR_PERIODIC | PREEMPT_PIN（跨路线） | 确认 · 验收前置 | init 与回调中 disable_preempt() 取得的 PinCurrentCpu guard | ostd/src/arch/x86/timer/apic.rs @97963e831 |
| F_RECOVER | TRAP_DISP | 确认 · 验收前置 | 页错误分支提供的 TrapFrame.rip、异常数据与用户缺页处理失败合同：缺页处理成功就直接返回重试，失败才查表改 RIP | ostd/src/arch/x86/trap/mod.rs::trap_handler,handle_user_page_fault（ExTable::find_recovery_inst_addr 在第 231 行） @97963e831 |
| F_RECOVER | F_ASM | 确认 · 验收前置 | 汇编提供的恢复地址、剩余字节返回 ABI 与 ExTable 表项 | ostd/src/arch/x86/mm/util.rs::__memcpy_fallible,__memset_fallible; ostd/src/arch/x86/ex_table.rs::ExTable::find_recovery_inst_addr @97963e831 |
| SMP_AP | LAPIC_INST | 确认 · 验收前置 | 当前核 HwCpuId::read_current 的归属合同（read_current 调用 apic::get_or_init(guard)） | ostd/src/boot/smp.rs::report_online_and_hw_cpu_id; ostd/src/arch/x86/irq.rs::HwCpuId::read_current @97963e831 |
| SMP_AP | LOC_STORE（跨路线） | 确认 · 验收前置 | get_ap 返回存活且独占的 CPU-local 区域 | ostd/src/boot/smp.rs::boot_all_aps @97963e831 |
| SMP_AP | PREEMPT_PIN（跨路线） | 确认 · 验收前置 | boot/smp.rs 第 159 行用 disable_preempt() 取得的 PinCurrentCpu guard | ostd/src/boot/smp.rs::report_online_and_hw_cpu_id @97963e831 |
| SMP_AP | MM_FRAME（跨路线） | 确认 · 验收前置 | AP_BOOT_STACK_SIZE 的连续 Segment 存活到 AP 使用结束 | ostd/src/boot/smp.rs::boot_all_aps @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| SMP_AP | MM_BOOT（跨路线） | 确认 · 验收前置 | boot_pt::with_borrow 的根页、线性映射栈地址与 activate_kernel_page_table 效果 | ostd/src/boot/smp.rs::boot_all_aps,ap_early_entry @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| SMP_COMPOSE | SMP_AP | 确认 · 验收前置 | 本项的验收内容就是在 AP 启动合同之上组合每项初始化的先后条件与发布可见性（计划称其为最终集成入口） | ostd/src/boot/smp.rs::boot_all_aps,ap_early_entry @97963e831 |
| SMP_COMPOSE | SYSCALL | 确认 · 验收前置 | ap_early_entry 的 trap::init 消费 GDT/IDT/syscall 初始化结果 | ostd/src/boot/smp.rs::ap_early_entry; ostd/src/arch/x86/trap/mod.rs::init @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| SMP_COMPOSE | TRAP_DISP | 确认 · 验收前置 | 开中断前已安装入口并能安全分派 | ostd/src/boot/smp.rs::ap_early_entry @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| SMP_COMPOSE | CPU_ENABLE | 确认 · 验收前置 | enable_cpu_features 的每核控制寄存器已配置状态 | ostd/src/boot/smp.rs::ap_early_entry @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| SMP_COMPOSE | TMR_DEADLINE | 确认 · 验收前置 | init_on_ap 的 deadline 分支配置和回调就绪状态 | ostd/src/arch/x86/mod.rs::init_on_ap @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| SMP_COMPOSE | TMR_PERIODIC | 确认 · 验收前置 | init_on_ap 的 periodic 分支配置和回调就绪状态 | ostd/src/arch/x86/mod.rs::init_on_ap @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| SMP_COMPOSE | TASK_RUNTIME（跨路线） | 确认 · 验收前置 | AP late entry 后 yield_now 的调度输入与 bootstrap 不返回条件 | ostd/src/boot/smp.rs::ap_early_entry @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| SMP_IPI | LAPIC_DEV | 确认 · 验收前置 | arch::irq::send_ipi 的目标 / vector 效果 | ostd/src/smp.rs::inter_processor_call,do_inter_processor_call; ostd/src/arch/x86/irq.rs::send_ipi @97963e831 |
| SMP_IPI | TRAP_DISP | 确认 · 验收前置 | 注册回调在目标核上执行的合同 | ostd/src/smp.rs::do_inter_processor_call @97963e831 |
| SMP_IPI | IRQLINE | 确认 · 验收前置 | IrqLine 注册：smp::init 用 IrqLine::alloc().on_active(do_inter_processor_call) | ostd/src/smp.rs::init @97963e831 |
| SMP_IPI | LOC_REMOTE（跨路线） | 确认 · 验收前置 | 目标 CPU 队列索引、T: Sync 与存储生命周期 | ostd/src/smp.rs::CALL_QUEUES,inter_processor_call @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| SMP_IPI | SYNC_GUARD（跨路线） | 确认 · 验收前置 | CALL_QUEUES 的 SpinLock 保持原子模式、队列互斥和释放合同 | ostd/src/smp.rs::inter_processor_call,do_inter_processor_call @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| SMP_IPI | SMP_AP | 确认 · 验收前置 | construct_hw_cpu_id_mapping 给出 CpuId 索引到在线 HwCpuId 的完整映射 | ostd/src/smp.rs::init; ostd/src/boot/smp.rs::construct_hw_cpu_id_mapping @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| XSAVE | FPU_REPR | 确认 · 验收前置 | 保存区对齐、容量与初始化有效性 | ostd/src/arch/x86/cpu/context/mod.rs::FpuContext::save,load @97963e831 |
| XSAVE | CPU_ENABLE | 确认 · 验收前置 | 已启用控制寄存器和保存区掩码/长度合同 | ostd/src/arch/x86/cpu/context/mod.rs::FpuContext::save,load @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| SYSCALL | TRAP_DISP | 确认 · 验收前置 | 用户返回的寄存器 ABI 与异常 / IRQ 返回合同 | ostd/src/arch/x86/trap/syscall.rs::RawUserContext::run; ostd/src/arch/x86/cpu/context/mod.rs::UserContextApiInternal::execute @97963e831 |
| SYSCALL | GDT | 确认 · 验收前置 | syscall::init 的安全条件要求 GDT 已初始化：选择子合同 | ostd/src/arch/x86/trap/syscall.rs::init @97963e831 |
| TASK_SW | TASK_STACK_ALLOC（跨路线） | 确认 · 验收前置 | 栈存活、映射、初始 SP 与 KernelStack::flush_tlb；仅有大小解析不够 | ostd/src/task/processor.rs::switch_to_task,before_switching_to @97963e831 |
| TASK_SW | SA_RCU（跨路线） | 确认 · 验收前置 | switch_to_task 调用 crate::sync::finish_grace_period()：当前 CPU 不处于读侧临界区与宽限期完成合同 | ostd/src/task/processor.rs::switch_to_task（第 42 行） @97963e831 |
| TASK_SW | TASK_RUNTIME（跨路线） | 确认 · 验收前置 | CURRENT/PREVIOUS_TASK_PTR 的 Arc 存活、switched_to_cpu 独占运行权及 after_switching_to 延迟释放 | ostd/src/task/processor.rs::switch_to_task,before_switching_to,after_switching_to @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| TASK_SW | TASK_CTX | 确认 · 验收前置 | cur/nxt 独占上下文和有效栈满足 context_switch 的 ABI/恢复合同 | ostd/src/task/processor.rs::switch_to_task; arch/x86/task/mod.rs::context_switch @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| TASK_SW | IRQ_DROP | 确认 · 验收前置 | forget(irq_guard) 到 after_switching_to 的跨栈恢复权限；末尾 enable_local 的前提 | ostd/src/task/processor.rs::switch_to_task,after_switching_to @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| TASK_SW | PT_X86 | 待确认 | 只有选定 OSTD 客户的 PRE/POST_SCHEDULE_HANDLER 真正调用 VmSpace 激活时才建立地址空间切换依赖；缺具体回调实现和效果合同。现有 processor 只调用注入 handler。 | 尚无 |
| ACC_RUN | ACC_IMG（跨路线） | 确认 · 验收前置 | 可启动产物与平台配置；运行消费产物，不消费静态检查证明，最终验收同时记录二者 | ostd/libs/linux-bzimage/setup/src/x86/legacy_i386/mod.rs::main_legacy32 @97963e831 |
| ACC_RUN | PITIRQ | 确认 · 验收前置 | 可执行的注册、路由、回调与 EOI 路径，不要求形式证明先完成 | ostd/src/trap/irq.rs::IrqLine::on_active,process_top_half @97963e831 |
| ACC_RUN | F_BYTES（跨路线） | 确认 · 验收前置 | 成功、部分复制与故障结果可观察 | ostd/src/mm/io.rs::VmReader::read_fallible @97963e831 |
| KFAULT_MAP | MM_BOOT（跨路线） | 确认 · 验收前置 | KERNEL_PAGE_TABLE 已发布与线性映射区间/物理地址对应合同 | ostd/src/arch/x86/trap/mod.rs::handle_kernel_page_fault @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| KFAULT_MAP | MM_PT（跨路线） | 确认 · 验收前置 | cursor_mut/map(Untracked) 的映射与失败合同 | ostd/src/arch/x86/trap/mod.rs::handle_kernel_page_fault @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| KFAULT_MAP | PREEMPT_PIN（跨路线） | 确认 · 验收前置 | 创建 cursor 时保持当前 CPU 的 pin 与释放合同 | ostd/src/arch/x86/trap/mod.rs::handle_kernel_page_fault @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| CPU_ENABLE | CPU_FEAT | 确认 · 验收前置 | 特性采样的叶支持与位判断合同 | ostd/src/arch/x86/mod.rs::has_avx,has_avx512,enable_cpu_features @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| HPET | ACPI_TABLES | 确认 · 验收前置 | ACPI HPET 表发现、基址和字段可读合同 | ostd/src/arch/x86/timer/hpet.rs::Hpet::new @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| HPET | ROUTE_MAP | 确认 · 验收前置 | Hpet::new 调用 IRQ_CHIP.map_isa_pin_to(irq,0)，需映射句柄与释放合同；仅约束完整构造，getter 可先证明 | ostd/src/arch/x86/timer/hpet.rs::Hpet::new @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| SERIAL_QEMU_CMOS | IO_PIO（跨路线） | 确认 · 验收前置 | 串口/QEMU/CMOS 静态端口访问宽度与权限合同 | ostd/src/arch/x86/serial.rs; qemu.rs; device/cmos.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| SERIAL_QEMU_CMOS | ACPI_TABLES | 确认 · 验收前置 | CMOS 的 FADT 世纪寄存器编号来源，仅约束 CMOS 子项 | ostd/src/arch/x86/device/cmos.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | LOC_ACC（跨路线） | 确认 · 验收前置 | 当前范围的 LOC_ACC 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | VM_POD（跨路线） | 确认 · 验收前置 | 当前范围的 VM_POD 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | TLB_FREE（跨路线） | 确认 · 验收前置 | 当前范围的 TLB_FREE 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | CAL_FREQ | 确认 · 验收前置 | 当前范围的 CAL_FREQ 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | SMP_COMPOSE | 确认 · 验收前置 | 当前范围的 SMP_COMPOSE 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | XSAVE | 确认 · 验收前置 | 当前范围的 XSAVE 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | TASK_SW | 确认 · 验收前置 | 当前范围的 TASK_SW 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | PCI_IRQ（跨路线） | 确认 · 验收前置 | 当前范围的 PCI_IRQ 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | SA_DMA（跨路线） | 确认 · 验收前置 | 当前范围的 SA_DMA 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | BZ_TRUST（跨路线） | 确认 · 验收前置 | 当前范围的 BZ_TRUST 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | BZ_ENCODE（跨路线） | 确认 · 验收前置 | 当前范围的 BZ_ENCODE 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | ACC_RUN | 确认 · 验收前置 | 当前范围的 ACC_RUN 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | IO_GLOBAL（跨路线） | 确认 · 验收前置 | 当前范围的 IO_GLOBAL 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | KFAULT_MAP | 确认 · 验收前置 | 当前范围的 KFAULT_MAP 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | LOC_DYNAMIC（跨路线） | 确认 · 验收前置 | 当前范围的 LOC_DYNAMIC 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | SYNC_API（跨路线） | 确认 · 验收前置 | 当前范围的 SYNC_API 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | PCI_DEVICE（跨路线） | 确认 · 验收前置 | 当前范围的 PCI_DEVICE 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | HPET | 确认 · 验收前置 | 当前范围的 HPET 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | SERIAL_QEMU_CMOS | 确认 · 验收前置 | 当前范围的 SERIAL_QEMU_CMOS 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | HEAP_GLOBAL（跨路线） | 确认 · 验收前置 | 当前范围的 HEAP_GLOBAL 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | BZ_SETUP（跨路线） | 确认 · 验收前置 | 当前范围的 BZ_SETUP 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | BOOT_COMMON（跨路线） | 确认 · 验收前置 | 当前范围的 BOOT_COMMON 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | COMMON_AUDIT（跨路线） | 确认 · 验收前置 | 当前范围的 COMMON_AUDIT 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序 | ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| ACC_SCOPE | TASK_COMPOSE（跨路线） | 确认 · 验收前置 | 任务创建、内置 FIFO 与远端通知的实际组合和可信输入记录 | ostd/src/task/{mod,processor}.rs; task/scheduler/{mod,fifo_scheduler}.rs（最终范围验收） @8e681282d19b29bdc1b6e715930fe9224a0c88dc |

#### bzImage 启动链

| 工作项 | 前置 | 类型 | 用到前置的什么 / 缺少的证据 | 依据（文件::符号 @固定提交） |
|---|---|---|---|---|
| BZ_RANGE | BZ_ELF | 确认 · 验收前置 | file_size <= mem_size、源切片长度与目标区间有界；可先作为 requires | ostd/libs/linux-bzimage/builder/src/lib.rs::to_flat_binary @97963e831 |
| BZ_OUT | BZ_RANGE | 确认 · 验收前置 | 每个 PT_LOAD 的目标区间与逐段覆盖语义；非重叠是选定产物的独立条件，不是当前 to_flat_binary 的保证 | ostd/libs/linux-bzimage/builder/src/lib.rs::to_flat_binary,flat_load_step @d30c271708585a0ae89b5eafd1dd795bc98281a9 |
| BZ_OUT | BZ_PE | 确认 · 验收前置 | 覆盖保护只需 PE 头长度 <= 0x1f1；#916 的 len == 368 足够，不必依赖全部字段证明 | ostd/libs/linux-bzimage/builder/src/lib.rs::make_bzimage @97963e831; builder/src/pe_header.rs::make_pe_coff_header @c25ca6f98 |
| BZ_IMG | BZ_OUT | 确认 · 验收前置 | 产物检查消费生成文件与期望区间；只有验收同时承诺 builder 正确性时才需要输出合同已证明 | ostd/libs/linux-bzimage/builder/src/lib.rs::make_bzimage,to_flat_binary @97963e831 |
| BZ_IMG | BZ_ELF | 确认 · 验收前置 | 核对实际 PT_LOAD、entry、文件偏移与加载地址；setup loader 按 physical_addr 装载而入口采用固定地址，二者必须核对。静态检查不要求解析器先被形式证明 | ostd/libs/linux-bzimage/setup/src/loader.rs::load_segment; setup/src/x86/legacy_i386/mod.rs::ASTER_ENTRY_POINT @97963e831 |
| BZ_IMG | BZ_ENCODE | 待确认 | make_bzimage 只读取已链接的 setup ELF，不调用 encode_kernel。编码结果如何经外部构建工具进入 setup payload 尚缺具体构建调用链和产物 manifest；只在该证据补齐后确定组合关系。 | 尚无 |
| ACC_IMG | BZ_IMG | 确认 · 验收前置 | 依赖选定镜像及其内核 ELF 的身份与加载布局；该检查不消费 builder 的 Verus 证明 | ostd/libs/linux-bzimage/builder/src/lib.rs::make_bzimage @97963e831 |
| ACC_IMG | F_ASM（跨路线） | 确认 · 验收前置 | ABI、恢复目标与 ExTable 表项的链接检查需要汇编符号与段存在；不要求缺页恢复路径先证明 | ostd/src/arch/x86/ex_table.rs::ExTable::init; ostd/src/arch/x86/mm/util.rs::memcpy_fallible @97963e831 |

#### OSTD 公共模块

| 工作项 | 前置 | 类型 | 用到前置的什么 / 缺少的证据 | 依据（文件::符号 @固定提交） |
|---|---|---|---|---|
| LOC_STORE | LOC_EARLY_GLOBAL | 确认 · 验收前置 | AP 地址数组和各 CPU 存储的两个 early_alloc 调用需要跨次不重叠可写资源 | ostd/src/cpu/local/mod.rs::copy_bsp_for_ap @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| LOC_ACC | LOC_ID（跨路线） | 确认 · 验收前置 | AnyStorage::get_ptr_on_current / get_ptr_on_target 的归属、有效性与生命周期合同 | ostd/src/cpu/local/mod.rs::AnyStorage,CpuLocalDerefGuard::deref @97963e831 |
| LOC_ACC | IRQ_GUARD（跨路线） | 确认 · 验收前置 | 借用期间禁 IRQ 且不迁移：get_with 的参数是 &DisabledLocalIrqGuard，没有接受任意 PinCurrentCpu 的泛型接口 | ostd/src/cpu/local/mod.rs::get_with（第 112–114 行） @97963e831 |
| VM_POD | VM_REPR | 确认 · 验收前置 | 内容断言消费 Pod/切片的实际字节桥接合同 | ostd/src/mm/test.rs; ostd/libs/ostd-pod/tests/derive_test.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| VM_CONTENT | VM_REPR | 确认 · 验收前置 | read_val 的 Pod 值和实际读取字节之间的关系 | ostd/src/mm/io.rs::VmReader::read_val; ostd/specs/mm/io.rs::VmIoOwner @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| TLB_SHOOT | TLB_REQ | 确认 · 验收前置 | 入队不丢失与全刷覆盖合同 | ostd/src/mm/tlb.rs::dispatch_tlb_flush,do_remote_flush @97963e831 |
| TLB_SHOOT | SMP_IPI（跨路线） | 确认 · 验收前置 | 目标核/队列/回调安全合同；完成 ACK 与投递进展由本项协议补充，不能从 inter_processor_call 名称推得 | ostd/src/mm/tlb.rs::dispatch_tlb_flush,do_remote_flush; ostd/src/smp.rs::inter_processor_call @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| TLB_SHOOT | PT_X86（跨路线） | 确认 · 验收前置 | 当前核的失效效果 | ostd/src/mm/tlb.rs::do_remote_flush; ostd/src/arch/x86/mm/mod.rs::tlb_flush_addr_range @97963e831 |
| TLB_FREE | TLB_SHOOT | 确认 · 验收前置 | frame 保留到安全完成点：dispatch 明说异步，入队不够 | ostd/src/mm/tlb.rs::issue_tlb_flush_with,dispatch_tlb_flush,sync_tlb_flush; OpsStack::push,push_from,clear_without_flush @97963e831 |
| TLB_FREE | MM_FRAME | 确认 · 验收前置 | page_keeper 持有 Frame 所有权并延迟最终释放，不能仅传入 frame 就视为保留 | ostd/src/mm/tlb.rs::issue_tlb_flush_with; OpsStack::push,clear_without_flush @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| F_BYTES | F_RECOVER（跨路线） | 确认 · 验收前置 | 成功 / 部分完成 / 故障三种结果的最终行为 | ostd/src/mm/io.rs::memcpy_fallible,impl_read_fallible @97963e831 |
| F_BYTES | VM_CONTENT | 确认 · 验收前置 | 原 Rust buffer、VirtPtr / MemView 与 Pod 值的字节关系 | ostd/src/mm/io.rs::read_val,memcpy_fallible @97963e831 |
| TASK_STACK_ALLOC | IRQ_GUARD（跨路线） | 确认 · 验收前置 | flush_tlb 的参数是 &DisabledLocalIrqGuard | ostd/src/task/kernel_stack.rs::KernelStack::flush_tlb（注释中） @97963e831 |
| TASK_STACK_ALLOC | TASK_STACK | 确认 · 验收前置 | KERNEL_STACK_SIZE 的页面倍数与上界；零长度和加上 guard pages 的溢出仍须另证 | ostd/src/task/kernel_stack.rs::KernelStack::new_with_guard_page @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| TASK_STACK_ALLOC | MM_FRAME | 确认 · 验收前置 | alloc_segment_with 返回连续、存活的栈 frames 与失败资源保持 | ostd/src/task/kernel_stack.rs::KernelStack::new_with_guard_page @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| TASK_STACK_ALLOC | MM_KVA | 确认 · 验收前置 | map_frames 保留 4 页 guard 区间及有效栈映射，初始 SP 在映射末端 | ostd/src/task/kernel_stack.rs::KernelStack::new_with_guard_page @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| TASK_STACK_ALLOC | PT_X86（跨路线） | 确认 · 验收前置 | flush_tlb 明确调用 tlb_flush_addr_range(&self.kvirt_area.range())；刷新后标记当前 CPU coherent | ostd/src/task/kernel_stack.rs::KernelStack::flush_tlb @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| PREEMPT_PIN | LOC_CELL | 确认 · 验收前置 | inc_guard_count/dec_guard_count 的单指令计数合同；避免依赖需要本 guard 的高级锁接口 | ostd/src/task/preempt/{guard,cpu_local}.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| TASK_RUNTIME | LOC_CELL | 确认 · 验收前置 | CURRENT_TASK_PTR 的同核读取、Arc 来源和有效引用条件 | ostd/src/task/mod.rs::Task::current; task/processor.rs::current_task @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| PCI_CFG | IO_PIO | 确认 · 验收前置 | 0xCF8 / 0xCFC 的静态 PIO 端口访问合同 | ostd/src/arch/x86/pci.rs::PCI_ADDRESS_PORT,PCI_DATA_PORT,read32,write32 @7c710f060f7a5ed3330aba64a9f711e6dd5edac9 |
| PCI_CFG | PCI_ENC（跨路线） | 确认 · 验收前置 | encode_as_port 的精确结果；#706 已内含同名函数，不必等 #919 整体完成 | ostd/src/arch/x86/pci.rs::encode_as_port @7c710f060f7a5ed3330aba64a9f711e6dd5edac9 |
| PCI_ENUM | PCI_CFG | 确认 · 验收前置 | 配置读取语义：vendor ID 0xFFFF 表示设备不存在 | ostd/src/bus/pci/common_device.rs::new; bus/pci/mod.rs::init @97963e831 |
| PCI_ENUM | PCI_TYPES | 确认 · 验收前置 | PciDeviceLocation/设备 ID 的字段范围和读取合同；all() 完整性与无重复由本项 PCI_ENUM 证明 | ostd/src/bus/pci/device_info.rs::PciDeviceLocation,all @b0db47c885eb9af77bf53233d0d80c5d277bcf9d |
| PCI_BAR | PCI_CFG | 确认 · 验收前置 | 写全一、读尺寸、恢复原值的配置访问合同；给定 location 即可探测，不消费完整枚举结果 | ostd/src/bus/pci/cfg_space.rs::MemoryBar::new,IoBar::new @97963e831 |
| PCI_BAR | IO_MMIO | 确认 · 验收前置 | MemoryBar::new 消费 IoMem::new 的映射范围、存活和 cache/flags 合同 | ostd/src/bus/pci/cfg_space.rs::MemoryBar::new @8e681282d19b29bdc1b6e715930fe9224a0c88dc; ostd/src/io/io_mem/mod.rs::new @477db699e56654e7813a910b9a25b747d80b6370 |
| PCI_CAP | PCI_CFG | 确认 · 验收前置 | capability 链只需配置空间读取 | ostd/src/bus/pci/capability/mod.rs::device_capabilities @97963e831 |
| PCI_MSIX | PCI_CAP | 确认 · 验收前置 | 定位 MSI-X capability 与配置写入 | ostd/src/bus/pci/capability/msix.rs::new,set_interrupt_vector @97963e831 |
| PCI_MSIX | PCI_BAR | 确认 · 验收前置 | MSI-X table / PBA 所在 MemoryBar 与 IoMem 的合同 | ostd/src/bus/pci/capability/msix.rs::new @97963e831 |
| PCI_MSIX | PCI_ENC（跨路线） | 确认 · 验收前置 | remapping 分支的 construct_remappable_msix_address | ostd/src/bus/pci/capability/msix.rs::set_interrupt_vector @97963e831; ostd/src/arch/x86/pci.rs::construct_remappable_msix_address @d14bae0d0f |
| PCI_MSIX | IO_MMIO | 确认 · 验收前置 | 表项 write_once/read_once 的有效范围与设备可见写入；仅有 BAR 地址合同不够 | ostd/src/bus/pci/capability/msix.rs::new,set_interrupt_vector @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| PCI_MSIX | IRQLINE（跨路线） | 确认 · 验收前置 | set_interrupt_vector 取 num/remapping_index 并持有 IrqLine，克隆/替换须保留生命周期 | ostd/src/bus/pci/capability/msix.rs::set_interrupt_vector,clone @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| PCI_IRQ | PCI_MSIX | 确认 · 验收前置 | MSI-X 表项启用 / 屏蔽合同 | ostd/src/bus/pci/capability/msix.rs::set_interrupt_vector,irq_mut @97963e831 |
| PCI_IRQ | IRQLINE（跨路线） | 确认 · 验收前置 | IrqLine::num / remapping_index / on_active 与句柄保留 / 释放 | ostd/src/bus/pci/capability/msix.rs::irq_mut @97963e831 |
| PCI_IRQ | TRAP_DISP（跨路线） | 确认 · 验收前置 | 回调执行与 EOI 的最终验收合同 | ostd/src/trap/irq.rs::process_top_half @97963e831 |
| SA_DMA | DMA_MAP | 确认 · 验收前置 | DmaStream map 建立设备地址、存活与缓存一致性条件；slice 只使用其中合同 | ostd/src/mm/dma/dma_stream.rs::DmaStream::map,sync,DmaStreamSlice::sync @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| IO_PIO_ALLOC | IO_PIO | 确认 · 验收前置 | typed port 的 valid_io_port_access、宽度与构造合同 | ostd/src/io/io_port/{mod,allocator}.rs::acquire,new_overlapping @477db699e56654e7813a910b9a25b747d80b6370 |
| IO_MMIO | MM_KVA | 确认 · 验收前置 | IoMem::new 的 KVirtArea::map_untracked_frames 结果、映射存活与范围合同 | ostd/src/io/io_mem/mod.rs::IoMem::new @477db699e56654e7813a910b9a25b747d80b6370 |
| IO_GLOBAL | IO_ALLOC | 确认 · 验收前置 | 已登记窗口的 builder 与保留状态 | ostd/src/io/io_mem/allocator.rs::init @477db699e56654e7813a910b9a25b747d80b6370 |
| IO_GLOBAL | IO_WIN（跨路线） | 确认 · 验收前置 | builder.has_registered_windows() 的引导来源 | ostd/src/arch/x86/io.rs::construct_io_mem_allocator_builder; ostd/src/io/mod.rs::init @477db699e56654e7813a910b9a25b747d80b6370 |
| IO_GLOBAL | IO_PIO_ALLOC | 确认 · 验收前置 | 敏感端口保留后发布全局 allocator 的权限状态 | ostd/src/io/io_port/allocator.rs::init @477db699e56654e7813a910b9a25b747d80b6370 |
| MM_PT | PT_CFG | 确认 · 验收前置 | PageTableConfig 布局/顶层范围引理与当前 x86 PagingConstsTrait | ostd/src/mm/page_table/mod.rs::PageTableConfig; cursor/mod.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| MM_PT | MM_FRAME | 确认 · 验收前置 | 页表节点和映射 frame 的有效元数据、引用计数及所有权转移合同 | ostd/src/mm/page_table/node/mod.rs; ostd/src/mm/vm_space.rs::UserPtConfig @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| MM_KVA | MM_PT | 确认 · 验收前置 | map_frames/map_untracked_frames 消费 cursor 映射与所有权保持合同 | ostd/src/mm/kspace/kvirt_area.rs::KVirtArea::map_frames,map_untracked_frames @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| MM_BOOT | MM_PT | 确认 · 验收前置 | 构造内核映射与 boot_pt 接管的页表合同 | ostd/src/mm/kspace/mod.rs::init_kernel_page_table; ostd/src/mm/page_table/boot_pt.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| MM_BOOT | PT_X86（跨路线） | 确认 · 验收前置 | 激活已构造根页、读取 boot 根页的 CR3 效果合同 | ostd/src/mm/kspace/mod.rs::activate_kernel_page_table; ostd/src/mm/page_table/boot_pt.rs::with_borrow @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| MM_BOOT | MM_FRAME | 确认 · 验收前置 | 元数据 pages 与全局 frame allocator 的初始化/可用区间合同 | ostd/src/mm/frame/allocator.rs::init; ostd/src/mm/kspace/mod.rs::init_kernel_page_table @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| MM_BOOT | LOC_EARLY_GLOBAL | 确认 · 验收前置 | frame allocator 初始化排除 early 阶段已经分配的范围 | ostd/src/mm/frame/allocator.rs::init,EarlyFrameAllocator::allocated_regions @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| LOC_EARLY_GLOBAL | LOC_ALLOC | 确认 · 验收前置 | 实例 allocated_regions 与 alloc 的边界和保留合同 | ostd/src/mm/frame/allocator.rs::early_alloc,EarlyFrameAllocator::alloc @fa3dbab608d15cc740c7bc47c979db5235e07428 |
| LOC_REMOTE | LOC_ID（跨路线） | 确认 · 验收前置 | 逻辑 CPU 索引与 get_ap/静态存储地址的对应关系 | ostd/src/cpu/local/static_cpu_local.rs::get_ptr_on_target; cpu/local/mod.rs::get_on_cpu @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| LOC_CELL | LOC_ID（跨路线） | 确认 · 验收前置 | 单次指令使用当前 GS 存储、offset 布局和逻辑 CPU 对应 | ostd/src/cpu/local/cell.rs; ostd/src/cpu/local/single_instr.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| LOC_DYNAMIC | MM_FRAME | 确认 · 验收前置 | 每 CPU chunk 的连续 Segment、元数据与独占内存 | ostd/src/cpu/local/dyn_cpu_local.rs::DynCpuLocalChunk::new @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| SYNC_GUARD | IRQ_DROP（跨路线） | 确认 · 验收前置 | LocalIrqDisabled/WriteIrqDisabled 写侧的创建、转移与 IF 恢复 | ostd/src/sync/guard.rs::SpinGuardian,GuardTransfer @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| SYNC_GUARD | PREEMPT_PIN | 确认 · 验收前置 | PreemptDisabled 与 WriteIrqDisabled 读侧的不迁移/释放合同 | ostd/src/sync/guard.rs::WriteIrqDisabled::read_guard @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| SYNC_WAIT | TASK_RUNTIME | 确认 · 验收前置 | 当前 Task 的有效引用、park_current/unpark_target 的状态转换与唤醒合同 | ostd/src/sync/wait.rs::Waiter::new_pair,do_wait,Waker::wake_up @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| SYNC_API | SYNC_WAIT | 确认 · 验收前置 | Mutex/RwMutex 的 WaitQueue 等待及唤醒保证 | ostd/src/sync/{mutex,rwmutex}.rs::lock,unlock @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| SYNC_API | SYNC_GUARD | 确认 · 验收前置 | 读写锁/RwArc 持锁期间的运行模式与释放合同 | ostd/src/sync/rwarc.rs; ostd/src/sync/guard.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| PCI_DEVICE | PCI_ENUM | 确认 · 验收前置 | 有效 location 遍历与无设备判断 | ostd/src/bus/pci/common_device.rs::PciCommonDevice::new; ostd/src/bus/pci/capability/mod.rs::device_capabilities @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| PCI_DEVICE | PCI_BAR | 确认 · 验收前置 | BarManager 的六槽/桥接类型与映射合同 | ostd/src/bus/pci/common_device.rs::PciCommonDevice::new; ostd/src/bus/pci/capability/mod.rs::device_capabilities @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| PCI_DEVICE | PCI_CAP | 确认 · 验收前置 | capability 链有界遍历与结果 | ostd/src/bus/pci/common_device.rs::PciCommonDevice::new; ostd/src/bus/pci/capability/mod.rs::device_capabilities @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| PCI_DEVICE | PCI_MSIX | 确认 · 验收前置 | 遇到 MSI-X capability 时的构造和启用合同 | ostd/src/bus/pci/common_device.rs::PciCommonDevice::new; ostd/src/bus/pci/capability/mod.rs::device_capabilities @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| HEAP_GLOBAL | SA_HEAP | 确认 · 验收前置 | slab 自由槽的 LIFO、独占内存与布局合同 | ostd/src/mm/heap/slab.rs; ostd/src/mm/heap/mod.rs::AllocDispatch @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| HEAP_GLOBAL | MM_FRAME | 确认 · 验收前置 | slab/大分配使用 frame/Segment 的存活与回收合同 | ostd/src/mm/heap/mod.rs; ostd/src/mm/heap/slab.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| DMA_MAP | SYNC_GUARD | 确认 · 验收前置 | DMA_MAPPING_SET 的 SpinLock 与 DmaCoherent/DmaStream 的 RwArc 使用 PreemptDisabled，需真实 guard 生命周期 | ostd/src/mm/dma/{mod,dma_coherent,dma_stream}.rs::init,map,read_inner @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| DMA_MAP | MM_PT | 确认 · 验收前置 | 非一致性 coherent 路径的 cache policy 修改需要 protect_next 的映射保持合同；当前调用在注释中 | ostd/src/mm/dma/dma_coherent.rs::DmaCoherent::map; mm/page_table/mod.rs::protect_flush_tlb @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| DMA_MAP | PT_X86（跨路线） | 确认 · 验收前置 | protect_flush_tlb 的现存注释实现逐次调用 tlb_flush_addr(range.start)，只确认本地失效接口 | ostd/src/mm/page_table/mod.rs::protect_flush_tlb @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| DMA_MAP | TLB_SHOOT | 待确认 | DMA 非一致性 cache policy 路径的并发 CPU 访问和平台一致性条件尚缺；protect_flush_tlb 现存注释实现只调用本地 tlb_flush_addr，不能声称它已有远端完成协议。 | 尚无 |
| TASK_COMPOSE | TASK_RUNTIME | 确认 · 验收前置 | 当前任务引用、唯一运行权、park/unpark 和调度器注入合同 | ostd/src/task/mod.rs::TaskBuilder::build; task/scheduler/mod.rs::reschedule,park_current,exit_current @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| TASK_COMPOSE | TASK_SW（跨路线） | 确认 · 验收前置 | reschedule 的实际切换与首次 kernel_task_entry::after_switching_to 资源交接 | ostd/src/task/{mod,processor}.rs; task/scheduler/mod.rs::reschedule @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| TASK_COMPOSE | TASK_STACK_ALLOC | 确认 · 验收前置 | TaskBuilder::build 的有效栈和 end_vaddr()-16 的初始 SP/ABI 对齐 | ostd/src/task/mod.rs::TaskBuilder::build @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| TASK_COMPOSE | PREEMPT_PIN | 确认 · 验收前置 | set_need_preempt 与 FIFO 队列选择使用 guard.current_cpu 的同核合同 | ostd/src/task/scheduler/mod.rs::set_need_preempt; task/scheduler/fifo_scheduler.rs::local_rq_with,mut_local_rq_with @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| TASK_COMPOSE | SMP_IPI（跨路线） | 确认 · 验收前置 | 远端 set_need_preempt 在目标 CPU 执行回调的安全合同；异步通知不等于必达或同步完成 | ostd/src/task/scheduler/mod.rs::set_need_preempt @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| TASK_COMPOSE | SYNC_GUARD | 确认 · 验收前置 | 默认 FIFO 通过 disable_irq().lock() 保护 run queue 的权限和恢复合同 | ostd/src/task/scheduler/fifo_scheduler.rs::enqueue,local_rq_with,mut_local_rq_with @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
| TASK_COMPOSE | TRAP_DATA（跨路线） | 确认 · 验收前置 | TaskBuilder::build 用 UserContext::tls_pointer 初始化 TaskContext TLS 字段 | ostd/src/task/mod.rs::TaskBuilder::build; arch/x86/cpu/context.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc |
<!-- END GENERATED:deps -->

## 附录 C：后续工作与可信边界

<!-- BEGIN GENERATED:later -->
r2 的七项后续工作已保留 ID 纳入当前范围（见 r3 变更记录）。多架构迁移仍在 outOfScope；不因某项不在首个 BSP 中断路径上就将其排除。
<!-- END GENERATED:later -->

可信输入需有来源与调用条件，既有软件占位不能凭边界名称自动豁免。

<!-- BEGIN GENERATED:trusted -->
| 编号 | 提供者 | 计划内代码消费的输入 | 消费者 | 记录方式 |
|---|---|---|---|---|
| TB_BOOT_INPUT | arch/x86/boot（未纳入计划） | 固件内存区域（EARLY_INFO.memory_regions）、ACPI RSDP 来源、初始 CS == KERNEL_CS、GS.base 初值与 CPU 数量、AP 汇编启动输入与初始页表 / CPU 状态。 | IO_WIN、ACPI_TABLES、GDT、LOC_ID、SMP_AP、LOC_EARLY_GLOBAL、MM_BOOT、BOOT_COMMON | 每个消费者的 requires 写明该输入；不能证明固件布局的真实性。 |
| TB_IOMMU | arch/x86/iommu（未纳入计划） | IrqRemapping::init 分配的 IRT 项与 remapping index，以及 DMA 设备地址映射/解除的硬件条件。 | PCI_ENC、PCI_MSIX、IRQLINE、IOAPIC_ENTRY、SA_DMA、DMA_MAP | #919 的 remapping 地址编码不等于 IOMMU / remapping 已验证。 |
| TB_TDX | arch/x86/tdx_guest.rs（未纳入计划） | TDX 路径的初始化、中断语义与 DMA unprotect/reprotect 的输入条件。 | PITIRQ、DMA_MAP | 首个中断闭环限定为非 TDX 的 BSP 路径。 |
| TB_HW_OPS | CPUID / MSR / volatile / 汇编的外部规约 | has_xapic_spec 等 uninterp 的 spec、#905 的两条乘积上界 assume、CR3 与 invlpg 的 external_body。 | APIC_PROBE、LAPIC_DEV、CPU_FEAT、CAL_FREQ、PT_X86、IO_PIO、IO_MMIO、LOC_CELL、TASK_CTX、HPET、SERIAL_QEMU_CMOS、SA_DMA、DMA_MAP | 按具体操作记录；每个消费者只补自己需要的合同，不先建立没有执行调用方的完整硬件模型。 |
| TB_ELF_RANGE | ELF 与链接产物 | mapping.rs 里 From<SetupVA> / From<SetupFileOffset> 的 VA 范围与 offset 上界 assume。 #916/#931 的 parser、get_data、opaque ELF 类型和 bytes_of 的字节布局假设。 | BZ_TRUST、BZ_ELF、BZ_RANGE、BZ_PE | 通过 ELF parser 合同、链接断言或可独立检查的构建前置逐步缩小。 |
| TB_EXTABLE_LINK | 最终内核链接产物 | __ex_table / __ex_table_end 符号与表项：仓库里只有声明，没有定义。 | F_RECOVER、ACC_IMG | 用镜像链接检查记录，不能由缺页恢复证明替代。 |
| TB_ALLOC | 用户提供的全局 heap/frame allocator 与 alloc 外部规约 | __GLOBAL_HEAP_ALLOCATOR_REF 宏生成的接口与 alloc 的外部规约。 GlobalFrameAllocator 的可用区域、对齐和唯一性承诺；OSTD 元数据/包装不在此边界中。 | IDT_TABLE、SA_HEAP、MM_FRAME、HEAP_GLOBAL、LOC_DYNAMIC | x86 链上的 Box::new / Box::leak 只消费这份外部规约。 |
| TB_STACK_CONFIG | 编译期 OSTD_TASK_STACK_SIZE_IN_PAGES 与 configured_stack_size_in_pages | 合法十进制输入由调用者/构建环境提供；该静态初始化仍 external_body。KERNEL_STACK_SIZE 已证上界/页对齐不保证非零。 | TASK_STACK、TASK_STACK_ALLOC | ostd/src/task/kernel_stack.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc；栈分配验收补非零与 guard-page 加法条件。 |
| TB_CLIENT_HOOKS | OSTD 使用者的调度器、PRE/POST_SCHEDULE_HANDLER、用户缺页处理和 ostd_main | 注入回调的状态变化、进展及地址空间选择；当前源码没有具体客户可证明 handler 必定执行 CR3 切换。 | TASK_RUNTIME、TASK_COMPOSE、TASK_SW、F_RECOVER、BOOT_COMMON | ostd/src/task/{mod,processor}.rs; arch/x86/trap/mod.rs::handle_user_page_fault @8e681282d19b29bdc1b6e715930fe9224a0c88dc。按具体客户合同验收，不能凭调用关系臆定效果。 |
| TB_MM_RAW | 现有原始内存/原子/PTE 外部规格 | item_into_raw/item_from_raw、frame 类型与引用计数、页表底层读写等现存可信操作；软件 wrapper 未证明部分仍是 MM_FRAME/MM_PT 工作。 | MM_FRAME、MM_PT、MM_KVA | ostd/src/mm/{frame,page_table,kspace,vm_space} @8e681282d19b29bdc1b6e715930fe9224a0c88dc；逐条登记/缩小，不把整个 MM 标为可信。 |
| TB_SETUP_ENV | EFI/legacy 固件服务、解压库与链接布局 | setup 所需服务返回内存、BootParams 输入、解压正确性和起始 CPU 状态。 | BZ_SETUP、BZ_IMG | ostd/libs/linux-bzimage/setup/src @8e681282d19b29bdc1b6e715930fe9224a0c88dc；选择启动模式和产物后补可运行检查。 |
<!-- END GENERATED:trusted -->

## 附录 D：变更记录

下列记录保留历史判断，当前关系以最新版本决定为准。

<!-- BEGIN GENERATED:changes -->
- **r4 · 2026-11-16**：修正依赖验收与页面就绪状态的联动：仅有未交付验收前置的工作由“可开始”改为“前置待交付”，可做条件证明但须等待组合验收；所有确认前置显式验收后才“前置就绪”。开放 PR 继续单列未交付合同，PR 合并不解除依赖。基于本版快照，原 79 项可开始分为 15 项就绪、64 项待交付；22 项 PR 进行中有 10 项缺前置，3 项已有验收记录，0 项有已确认的开工阻塞。工作项 ID、依赖关系和历史验收依据沿用 r3；本版调整状态规则，未新增源码或 PR head 复核。补充 #706 跨路线消费者、#855 限定完成及合并不解锁的回归校验。
- **r3 · 2026-11-16**：复核当前 main、相关 PR 的固定 head、审阅及 CI；期间追踪 #927/#931 新 head 与 #932 合入。按接口粒度拆分前置，补回完成 x86 所需的公共模块、DMA coherent/登记与最终范围验收。首个 BSP 中断里程碑不再代表整个 x86 范围；已复核的配置合同独立结项，验收依赖不再显示为无法开工。
  - 拆分 TASK_RUNTIME → TASK_RUNTIME + TASK_COMPOSE：current-task/park-unpark 的局部状态合同与 TaskBuilder、默认 FIFO、实际切换及远端抢占通知的组合分开，避免所有消费者都等待完整调度路径。
  - 拆分 SA_DMA → SA_DMA + DMA_MAP：stream slice 同步不覆盖 coherent、全局映射登记、cache policy 和释放；main 的 registry 插入与硬件映射调用仍有注释路径。
  - 拆分 IO_ALLOC → IO_ALLOC + IO_MMIO + IO_GLOBAL：窗口资源算法、映射/访问和全局初始化是不同消费者合同。
  - 拆分 IO_PIO → IO_PIO + IO_PIO_ALLOC：静态端口消费者不需要动态 allocator/显式释放完成。
  - 拆分 LOC_ALLOC → LOC_ALLOC + LOC_EARLY_GLOBAL：#802 实例 alloc 已证明不等于全局分配返回可写独占内存。
  - 拆分 LOC_ACC → LOC_ACC + LOC_REMOTE + LOC_CELL：get_with、跨核共享 get_on_cpu 和单指令 CpuLocalCell 不消费相同 guard。
  - 拆分 TASK_SW → TASK_SW + TASK_CTX：低层 context_switch ABI 可独立推进；processor 的资源交接另行组合。
  - 拆分 XSAVE → XSAVE + CPU_ENABLE：AP 初始化只需要控制寄存器/特性启用，不等待 FPU clone/save/load 全部证明。
  - 拆分 VM_POD → VM_POD + VM_REPR：桥接合同与测试验收拆开，read_val 不等待整个测试 PR。
  - 拆分 CAL_FREQ → CAL_FREQ + TSC_VALUE：deadline 消费频率值/发布合同，不需要 PIT 回退校准整体完成。
  - 拆分 PCI_ENUM → PCI_ENUM + PCI_DEVICE：location 遍历与完整设备构造分别验收，避免枚举和 BAR/capability 相互等待。
  - 范围调整 MM_BOOT（later → nodes，保留 ID）：不在首个 BSP 中断路径不等于不在完成 x86 的当前范围。ostd/src/mm/kspace/mod.rs::init_kernel_page_table,activate_kernel_page_table; ostd/src/mm/frame/allocator.rs::init @97963e831
  - 范围调整 LOC_DYNAMIC（later → nodes，保留 ID）：不在首个 BSP 中断路径不等于不在完成 x86 的当前范围。ostd/src/cpu/local/dyn_cpu_local.rs @97963e831
  - 范围调整 SYNC_WAIT（later → nodes，保留 ID）：不在首个 BSP 中断路径不等于不在完成 x86 的当前范围。ostd/src/sync/wait.rs::WaitQueue,Waker @97963e831
  - 范围调整 HPET（later → nodes，保留 ID）：不在首个 BSP 中断路径不等于不在完成 x86 的当前范围。ostd/src/arch/x86/timer/hpet.rs::Hpet::new @97963e831
  - 范围调整 SERIAL_QEMU_CMOS（later → nodes，保留 ID）：不在首个 BSP 中断路径不等于不在完成 x86 的当前范围。ostd/src/arch/x86/serial.rs::init; qemu.rs::exit_qemu; device/cmos.rs @97963e831
  - 范围调整 HEAP_GLOBAL（later → nodes，保留 ID）：不在首个 BSP 中断路径不等于不在完成 x86 的当前范围。ostd/src/mm/heap/mod.rs::AllocDispatch,GlobalHeapAllocator @97963e831
  - 范围调整 BZ_SETUP（later → nodes，保留 ID）：不在首个 BSP 中断路径不等于不在完成 x86 的当前范围。ostd/libs/linux-bzimage/setup/src/loader.rs::load_elf; setup/src/main.rs @97963e831
  - 新增 IO_PIO_ALLOC：#706 的 acquire/acquire_overlapping、reserve_io_port_range、动态 claim 和 consuming drop(self)；核对自动 Drop 改写后的真实调用者。
  - 新增 IO_MMIO：#706 的 IoMem::new/acquire/slice、VmIo/VmIoOnce 与映射存活；当前 new/acquire/设备访问仍 external，obeys_vmio_* 为 false，不能向设备调用者提供完整访问保证。
  - 新增 IO_GLOBAL：把局部 builder/PIO allocator 与 io::init 的 Once 状态、注册窗口和动态分配权限相连，验证全局入口能获得所需资源。
  - 新增 MM_FRAME：补 FrameAllocOptions、Frame/Segment 元数据初始化、引用计数/类型转换、所有权移交和释放合同；#720 的类型接口仅按实际调用复用。
  - 新增 MM_PT：覆盖 cursor map/unmap/protect/query、item 原始转换和 frame 所有权往返，消解或逐项登记现存 external/admit/assume；#855 的常量证明不覆盖这些接口。
  - 新增 MM_KVA：交付 map_frames/map_untracked_frames、区间分配、range 与 Drop 的局部映射合同；显式区分指针算术、映射已生效和远端 TLB 安全释放。
  - 新增 KFAULT_MAP：单列 handle_kernel_page_fault：合法缺页范围/error code、对齐、Untracked(paddr,1,prop) 映射与返回；这条分支不同于用户可失败复制的 ExTable 恢复。
  - 新增 LOC_EARLY_GLOBAL：把 #802 的实例数值证明接到全局 early_alloc/init_early_allocator，给出每次分配的可写区域与跨次不重叠、既有分配保留合同。
  - 新增 LOC_REMOTE：交付 CpuLocal::get_on_cpu、StaticStorage::get_ptr_on_target 的索引、存活与 T: Sync 共享合同；无需 get_with 的 IRQ guard。
  - 新增 LOC_CELL：覆盖 load/store、加减/位操作的单指令 CPU 归属、环绕算术与 as_mut_ptr 的借用条件；不能由 CpuLocal::get_with 证明替代。
  - 新增 SYNC_GUARD：连接 SpinGuardian、GuardTransfer、PreemptDisabled、LocalIrqDisabled、WriteIrqDisabled 与实际 guard 生命周期；已有锁内存不变式证明不能代替硬件禁中断/不迁移状态。
  - 新增 SYNC_API：核对阻塞锁、升级/降级、借用及解锁 API 与 WaitQueue 的执行合同，登记 RwArc 外部体；不把 LOC 已验证比例当 API 组合完成。
  - 新增 TASK_CTX：在有效的 cur/nxt 上下文、独占资源和栈输入条件下建立保存恢复寄存器、RSP/RIP/FSBASE 与返回约定；复用 #870 的数据方法证明。
  - 新增 CPU_ENABLE：从 XSAVE 拆出 enable_cpu_features/enable_essential_features 的 CR0/CR4/EFER/XCR0、XSAVE 区大小与 Once 发布合同。
  - 新增 VM_REPR：建立 Pod 位表示、Rust slice 与 VmIoOwner/MemView 的字节对应及布局合同；测试用例本身不能作为 read_val 证明的前置。
  - 新增 TSC_VALUE：从 CAL_FREQ 拆出采样频率的 Hz 单位、非零/范围以及 TSC_FREQ Once 发布/读取合同；给定合格采样即可证明消费者。
  - 新增 PCI_DEVICE：把 PciCommonDevice::new 的 command 设置、BAR 管理器、capability/MSI-X 构造与总线登记组合；枚举循环本身可以先证明。
  - 新增 BOOT_COMMON：验证 BootInfo 发布/访问、init_after_heap 对 command-line/memory-region 的保存和 call_ostd_main 的入口条件；纳入普通 lib 初始化关闭路径的清单。
  - 新增 COMMON_AUDIT：逐模块盘点未被工作项覆盖的 cpu/set、user::UserMode、timer/jiffies、console/logger/panic、util、ostd-pod/ostd-test、辅助库入口；每个未启用函数/占位/可信体必须有归属，不以 LOC 颜色推断完整性。
  - 新增 ACC_SCOPE：在一个固定集成提交上启用计划内执行路径，分别验证 OSTD 与 bzImage，逐 API 对照清单；记录构建产物、运行结果、剩余可信输入与尚未证明的性质。
  - 移除依赖 PT_CFG → PT_X86：CR3/INVLPG 与范围刷新用 x86 的 PAGE_SIZE 和根页输入条件；不需要重新完成整个 PageTableConfig。常量合同已经可用。
  - 移除依赖 IO_WIN → IOAPIC_REG：给定基址与窗口权限可证明寄存器访问；固件地址对应窗口的组合归 ROUTE_MAP。
  - 移除依赖 LOC_ALLOC → LOC_STORE：实例数值合同不能供应 copy_bsp_for_ap 所需全局独占可写内存，替换为 LOC_EARLY_GLOBAL。
  - 移除依赖 LOC_ACC → SMP_IPI：CALL_QUEUES 用 get_on_cpu，不消费 get_with 的 IRQ guard 接口。
  - 移除依赖 IRQ_DROP → IRQLINE：只覆盖 WriteIrqDisabled 的写侧；读侧还消费禁抢占，改为 SYNC_GUARD 合同。
  - 移除依赖 CPU_FEAT → XSAVE：采样到控制寄存器效果先由 CPU_ENABLE 交付。
  - 移除依赖 VM_POD → VM_CONTENT：测试包未提供 read_val 所需的 Pod/buffer 字节桥接合同，替换为 VM_REPR。
  - 移除依赖 CAL_FREQ → TMR_DEADLINE：deadline 只需要 tsc_freq 的 Hz/非零/发布合同；替换为 TSC_VALUE。
  - 移除依赖 IO_ALLOC → PCI_BAR：MemoryBar::new 使用 unsafe IoMem::new，不调用窗口 allocator；改为 IO_MMIO 映射接口。
  - 移除依赖 IO_WIN → PCI_BAR：固定 #706 head 的 IoMem::new requires 不含窗口登记；unsafe MMIO 区域合法性仍须证明，但不能臆造 IO_WIN 阻塞。
  - 新增依赖 TASK_RUNTIME → TASK_COMPOSE：组合使用当前任务引用、运行权和 park/unpark 的状态合同。
  - 新增依赖 TASK_SW → TASK_COMPOSE：reschedule 和 kernel_task_entry 消费实际切换及 after_switching_to 的资源交接。
  - 新增依赖 TASK_STACK_ALLOC → TASK_COMPOSE：TaskBuilder::build 建立栈存活和 end_vaddr()-16 的初始 SP。
  - 新增依赖 PREEMPT_PIN → TASK_COMPOSE：set_need_preempt 和 FIFO local_rq_with 用 guard.current_cpu 选择当前核分支和队列。
  - 新增依赖 SMP_IPI → TASK_COMPOSE：set_need_preempt 的远端分支以 inter_processor_call 调用目标 CPU 的 cpu_local::set_need_preempt；不承诺该 API 未提供的必达。
  - 新增依赖 SYNC_GUARD → TASK_COMPOSE：默认 FIFO 通过 disable_irq().lock() 保护 run queue；不能仅信任注入调度器而漏掉内置实现。
  - 新增依赖 TRAP_DATA → TASK_COMPOSE：TaskBuilder::build 从 UserContext::tls_pointer 初始化 TaskContext 的 TLS 字段。
  - 新增依赖 TASK_COMPOSE → ACC_SCOPE：将任务创建、默认调度和远端通知纳入最终当前范围验收。
  - 新增依赖 DMA_MAP → SA_DMA：stream 同步最终使用 map 建立的设备地址、存活与一致性条件；slice 局部证明可先行。
  - 新增依赖 SYNC_GUARD → DMA_MAP：DMA_MAPPING_SET 的 SpinLock 及 DmaCoherent/DmaStream 的 RwArc 消费 PreemptDisabled guard 合同。
  - 新增依赖 MM_PT → DMA_MAP：待恢复的非一致性 coherent 分支消费 protect_flush_tlb 的 cache policy 映射更新合同。
  - 新增依赖 PT_X86 → DMA_MAP：protect_flush_tlb 的现存注释实现调用 tlb_flush_addr(range.start)，只能确认本地刷新合同。
  - 新增依赖 TLB_SHOOT → DMA_MAP：待确认：原 cache policy 路径仅本地刷新；是否需要远端失效须补并发访问与平台一致性条件，不能从函数名推定。
  - 新增依赖 IO_PIO → IO_PIO_ALLOC：typed port 的 valid_io_port_access、宽度与构造合同
  - 新增依赖 IO_ALLOC → IO_GLOBAL：已登记窗口的 builder 与保留状态
  - 新增依赖 IO_WIN → IO_GLOBAL：builder.has_registered_windows() 的引导来源
  - 新增依赖 IO_PIO_ALLOC → IO_GLOBAL：敏感端口保留后发布全局 allocator 的权限状态
  - 新增依赖 IO_ALLOC → IOAPIC_REG：IoApicAccess::new 保留 [base,base+0x20) 时的 remove 权限合同
  - 新增依赖 IO_WIN → ROUTE_MAP：irq::init 将 MADT 的 IOAPIC 地址对应到可保留窗口；须证明地址落在登记窗口且未分配
  - 新增依赖 APIC_RESERVE → APIC_PUB：xAPIC 分支只有 remove 成功后发布 APIC_TYPE；x2APIC 分支不消费该条件
  - 新增依赖 PT_CFG → MM_PT：PageTableConfig 布局/顶层范围引理与当前 x86 PagingConstsTrait
  - 新增依赖 MM_FRAME → MM_PT：页表节点和映射 frame 的有效元数据、引用计数及所有权转移合同
  - 新增依赖 MM_PT → MM_KVA：map_frames/map_untracked_frames 消费 cursor 映射与所有权保持合同
  - 新增依赖 MM_KVA → IO_MMIO：IoMem::new 的 KVirtArea::map_untracked_frames 结果、映射存活与范围合同
  - 新增依赖 MM_PT → MM_BOOT：构造内核映射与 boot_pt 接管的页表合同
  - 新增依赖 PT_X86 → MM_BOOT：激活已构造根页、读取 boot 根页的 CR3 效果合同
  - 新增依赖 MM_FRAME → MM_BOOT：元数据 pages 与全局 frame allocator 的初始化/可用区间合同
  - 新增依赖 MM_BOOT → KFAULT_MAP：KERNEL_PAGE_TABLE 已发布与线性映射区间/物理地址对应合同
  - 新增依赖 MM_PT → KFAULT_MAP：cursor_mut/map(Untracked) 的映射与失败合同
  - 新增依赖 PREEMPT_PIN → KFAULT_MAP：创建 cursor 时保持当前 CPU 的 pin 与释放合同
  - 新增依赖 LOC_ALLOC → LOC_EARLY_GLOBAL：实例 allocated_regions 与 alloc 的边界和保留合同
  - 新增依赖 LOC_EARLY_GLOBAL → LOC_STORE：AP 地址数组和各 CPU 存储的两个 early_alloc 调用需要跨次不重叠可写资源
  - 新增依赖 LOC_EARLY_GLOBAL → MM_BOOT：frame allocator 初始化排除 early 阶段已经分配的范围
  - 新增依赖 LOC_ID → LOC_REMOTE：逻辑 CPU 索引与 get_ap/静态存储地址的对应关系
  - 新增依赖 LOC_ID → LOC_CELL：单次指令使用当前 GS 存储、offset 布局和逻辑 CPU 对应
  - 新增依赖 LOC_CELL → PREEMPT_PIN：inc_guard_count/dec_guard_count 的单指令计数合同；避免依赖需要本 guard 的高级锁接口
  - 新增依赖 LOC_REMOTE → LAPIC_INST：APIC_INSTANCE.get_on_cpu(current_racy()) 的槽存活和共享访问合同
  - 新增依赖 LOC_REMOTE → SMP_IPI：目标 CPU 队列索引、T: Sync 与存储生命周期
  - 新增依赖 LOC_CELL → TRAP_DISP：KERNEL_INTERRUPT_NESTED_LEVEL 的同核单指令加减与恢复
  - 新增依赖 MM_FRAME → LOC_DYNAMIC：每 CPU chunk 的连续 Segment、元数据与独占内存
  - 新增依赖 IRQ_DROP → SYNC_GUARD：LocalIrqDisabled/WriteIrqDisabled 写侧的创建、转移与 IF 恢复
  - 新增依赖 PREEMPT_PIN → SYNC_GUARD：PreemptDisabled 与 WriteIrqDisabled 读侧的不迁移/释放合同
  - 新增依赖 SYNC_GUARD → IRQLINE：Inner.callbacks 的读/写 guardian 及 guard 转移恢复合同
  - 新增依赖 SYNC_GUARD → SMP_IPI：CALL_QUEUES 的 SpinLock 保持原子模式、队列互斥和释放合同
  - 新增依赖 TASK_RUNTIME → SYNC_WAIT：当前 Task 的有效引用、park_current/unpark_target 的状态转换与唤醒合同
  - 新增依赖 SYNC_WAIT → SYNC_API：Mutex/RwMutex 的 WaitQueue 等待及唤醒保证
  - 新增依赖 SYNC_GUARD → SYNC_API：读写锁/RwArc 持锁期间的运行模式与释放合同
  - 新增依赖 LOC_CELL → TASK_RUNTIME：CURRENT_TASK_PTR 的同核读取、Arc 来源和有效引用条件
  - 新增依赖 TASK_STACK → TASK_STACK_ALLOC：KERNEL_STACK_SIZE 的页面倍数与上界；零长度和加上 guard pages 的溢出仍须另证
  - 新增依赖 MM_FRAME → TASK_STACK_ALLOC：alloc_segment_with 返回连续、存活的栈 frames 与失败资源保持
  - 新增依赖 MM_KVA → TASK_STACK_ALLOC：map_frames 保留 4 页 guard 区间及有效栈映射，初始 SP 在映射末端
  - 新增依赖 TASK_CTX → TASK_SW：cur/nxt 独占上下文和有效栈满足 context_switch 的 ABI/恢复合同
  - 新增依赖 IRQ_DROP → TASK_SW：forget(irq_guard) 到 after_switching_to 的跨栈恢复权限；末尾 enable_local 的前提
  - 新增依赖 MM_FRAME → SMP_AP：AP_BOOT_STACK_SIZE 的连续 Segment 存活到 AP 使用结束
  - 新增依赖 MM_BOOT → SMP_AP：boot_pt::with_borrow 的根页、线性映射栈地址与 activate_kernel_page_table 效果
  - 新增依赖 SMP_AP → SMP_IPI：construct_hw_cpu_id_mapping 给出 CpuId 索引到在线 HwCpuId 的完整映射
  - 新增依赖 MM_FRAME → TLB_FREE：page_keeper 持有 Frame 所有权并延迟最终释放，不能仅传入 frame 就视为保留
  - 新增依赖 CPU_FEAT → CPU_ENABLE：特性采样的叶支持与位判断合同
  - 新增依赖 CPU_ENABLE → XSAVE：已启用控制寄存器和保存区掩码/长度合同
  - 新增依赖 VM_REPR → VM_CONTENT：read_val 的 Pod 值和实际读取字节之间的关系
  - 新增依赖 VM_REPR → VM_POD：内容断言消费 Pod/切片的实际字节桥接合同
  - 新增依赖 TSC_VALUE → TMR_DEADLINE：init_deadline_mode_config 消费 tsc_freq() 并计算间隔
  - 新增依赖 TSC_VALUE → CAL_FREQ：CPUID/PIT 选择后发布的频率值合同
  - 新增依赖 SYSCALL → SMP_COMPOSE：ap_early_entry 的 trap::init 消费 GDT/IDT/syscall 初始化结果
  - 新增依赖 TRAP_DISP → SMP_COMPOSE：开中断前已安装入口并能安全分派
  - 新增依赖 CPU_ENABLE → SMP_COMPOSE：enable_cpu_features 的每核控制寄存器已配置状态
  - 新增依赖 TMR_DEADLINE → SMP_COMPOSE：init_on_ap 的 deadline 分支配置和回调就绪状态
  - 新增依赖 TMR_PERIODIC → SMP_COMPOSE：init_on_ap 的 periodic 分支配置和回调就绪状态
  - 新增依赖 TASK_RUNTIME → SMP_COMPOSE：AP late entry 后 yield_now 的调度输入与 bootstrap 不返回条件
  - 新增依赖 IO_MMIO → PCI_BAR：MemoryBar::new 消费 IoMem::new 的映射范围、存活和 cache/flags 合同
  - 新增依赖 IO_MMIO → PCI_MSIX：表项 write_once/read_once 的有效范围与设备可见写入；仅有 BAR 地址合同不够
  - 新增依赖 IRQLINE → PCI_MSIX：set_interrupt_vector 取 num/remapping_index 并持有 IrqLine，克隆/替换须保留生命周期
  - 新增依赖 PCI_ENUM → PCI_DEVICE：有效 location 遍历与无设备判断
  - 新增依赖 PCI_BAR → PCI_DEVICE：BarManager 的六槽/桥接类型与映射合同
  - 新增依赖 PCI_CAP → PCI_DEVICE：capability 链有界遍历与结果
  - 新增依赖 PCI_MSIX → PCI_DEVICE：遇到 MSI-X capability 时的构造和启用合同
  - 新增依赖 ACPI_TABLES → HPET：ACPI HPET 表发现、基址和字段可读合同
  - 新增依赖 ROUTE_MAP → HPET：Hpet::new 调用 IRQ_CHIP.map_isa_pin_to(irq,0)，需映射句柄与释放合同；仅约束完整构造，getter 可先证明
  - 新增依赖 IO_PIO → SERIAL_QEMU_CMOS：串口/QEMU/CMOS 静态端口访问宽度与权限合同
  - 新增依赖 ACPI_TABLES → SERIAL_QEMU_CMOS：CMOS 的 FADT 世纪寄存器编号来源，仅约束 CMOS 子项
  - 新增依赖 SA_HEAP → HEAP_GLOBAL：slab 自由槽的 LIFO、独占内存与布局合同
  - 新增依赖 MM_FRAME → HEAP_GLOBAL：slab/大分配使用 frame/Segment 的存活与回收合同
  - 新增依赖 LOC_ACC → ACC_SCOPE：当前范围的 LOC_ACC 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 新增依赖 VM_POD → ACC_SCOPE：当前范围的 VM_POD 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 新增依赖 TLB_FREE → ACC_SCOPE：当前范围的 TLB_FREE 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 新增依赖 CAL_FREQ → ACC_SCOPE：当前范围的 CAL_FREQ 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 新增依赖 SMP_COMPOSE → ACC_SCOPE：当前范围的 SMP_COMPOSE 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 新增依赖 XSAVE → ACC_SCOPE：当前范围的 XSAVE 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 新增依赖 TASK_SW → ACC_SCOPE：当前范围的 TASK_SW 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 新增依赖 PCI_IRQ → ACC_SCOPE：当前范围的 PCI_IRQ 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 新增依赖 SA_DMA → ACC_SCOPE：当前范围的 SA_DMA 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 新增依赖 BZ_TRUST → ACC_SCOPE：当前范围的 BZ_TRUST 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 新增依赖 BZ_ENCODE → ACC_SCOPE：当前范围的 BZ_ENCODE 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 新增依赖 ACC_RUN → ACC_SCOPE：当前范围的 ACC_RUN 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 新增依赖 IO_GLOBAL → ACC_SCOPE：当前范围的 IO_GLOBAL 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 新增依赖 KFAULT_MAP → ACC_SCOPE：当前范围的 KFAULT_MAP 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 新增依赖 LOC_DYNAMIC → ACC_SCOPE：当前范围的 LOC_DYNAMIC 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 新增依赖 SYNC_API → ACC_SCOPE：当前范围的 SYNC_API 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 新增依赖 PCI_DEVICE → ACC_SCOPE：当前范围的 PCI_DEVICE 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 新增依赖 HPET → ACC_SCOPE：当前范围的 HPET 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 新增依赖 SERIAL_QEMU_CMOS → ACC_SCOPE：当前范围的 SERIAL_QEMU_CMOS 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 新增依赖 HEAP_GLOBAL → ACC_SCOPE：当前范围的 HEAP_GLOBAL 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 新增依赖 BZ_SETUP → ACC_SCOPE：当前范围的 BZ_SETUP 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 新增依赖 BOOT_COMMON → ACC_SCOPE：当前范围的 BOOT_COMMON 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 新增依赖 COMMON_AUDIT → ACC_SCOPE：当前范围的 COMMON_AUDIT 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序
  - 调整依赖 PT_X86 → TASK_STACK_ALLOC：由待确认改为验收前置：flush_tlb 明确调用 tlb_flush_addr_range(&self.kvirt_area.range())；刷新后标记当前 CPU coherent
  - 调整依赖 TASK_RUNTIME → TASK_SW：由待确认改为验收前置：CURRENT/PREVIOUS_TASK_PTR 的 Arc 存活、switched_to_cpu 独占运行权及 after_switching_to 延迟释放
  - 调整依赖 PT_X86 → TASK_SW：改为待确认：实际注入客户 hook 是否激活地址空间尚缺证据；栈刷新已由 TASK_STACK_ALLOC 供给。
  - 调整依赖 ROUTE_MAP → PITIRQ：组合骨架/条件证明可先开始；完成前置只限制最终验收。
  - 调整依赖 TRAP_DISP → PITIRQ：组合骨架/条件证明可先开始；完成前置只限制最终验收。
  - 调整依赖 LAPIC_DEV → PITIRQ：组合骨架/条件证明可先开始；完成前置只限制最终验收。
  - 调整依赖 SMP_AP → SMP_COMPOSE：组合骨架/条件证明可先开始；完成前置只限制最终验收。
  - 调整依赖 PIT_CFG → PITIRQ：由待确认改为验收前置：本里程碑明确验收实际 PIT 产生 IRQ0：必须给出 RateGenerator 编程与周期来源，不能只假定中断出现
  - PR：#855 的配置合同、#921 的解析合同、#916 的 PE 头构造按限定交付复核结项；#706 是静态/动态 PIO、MMIO 与配置访问底座，BAR 只复用它。末轮复核 #706@7c710f060、#895@b0db47c88、#883@2c6a1a266、#927@32635fe1e 与 #931@d30c27170，前述覆盖边界保持；#931 关联 BZ_RANGE/BZ_ELF，仅协调 #927 的 Vec 规约。main 纳入 #932；#706 最新失败点仍为 cpu/set.rs:300，#860 为 irc11.rs:38，审阅/CI/冲突分别记录。
- **r2 · 2026-11-16**：对照 main 97963e831 的源码与各 PR 的最新 head 审查路线、前置依赖和范围：每条依赖补上“用到前置的哪个接口 / 在哪个固定提交核对”，区分开工前置与验收前置，推断关系不再算作阻塞；拆分过粗的工作项，补充遗漏项，移除没有依据的先后关系；#855、#921 已合入，#408 由 #928 取代。
  - 拆分 IO_ALLOC → IO_ALLOC + IO_PIO：PIC、PIT、PCI 配置端口只消费 PIO 端口合同，不消费 MMIO 分配器；APIC、IOAPIC 只消费 MMIO 登记合同。IO_ALLOC 保留 range 与 MMIO 部分。
  - 拆分 APIC_PROBE → APIC_PROBE + APIC_RESERVE：模式探测只消费 CPUID；xAPIC 寄存器指针来自 paddr_to_vaddr，不经 IoMem，只有 init 里的窗口保留（remove）接触 IO 分配器。
  - 拆分 IOAPIC_REG → IOAPIC_REG + IOAPIC_ENTRY：寄存器级访问只需地址与窗口；重定向项 enable / disable 才消费 IrqLine::num / remapping_index。
  - 拆分 SMP_AP → SMP_AP + SMP_COMPOSE：计划把 BSP / AP 编排称为最终集成入口：AP 启动合同与编排 / 发布可见性是两件事，后者是组合验收。
  - 拆分 TASK_STACK → TASK_STACK + TASK_STACK_ALLOC：任务切换需要栈的存活、映射与初始 SP；#921 只证明了大小解析。
  - 拆分 PCI_CAP → PCI_CAP + PCI_MSIX：capability 链遍历只需配置读取；MSI-X 需要 BAR 映射、remapping 编码与配置写入。
  - 拆分 BZ_RANGE → BZ_RANGE + BZ_ENCODE：压缩 / 未压缩 payload 路径（encoder.rs）是独立接口，不消费区间合同。
  - 新增 PREEMPT_PIN：EOI、APIC timer、AP 启动与缺页路径都用 disable_preempt() 取得 PinCurrentCpu guard；main 与 #900 里它仍是 unimplemented!()，计划此前没有对应工作项。
  - 新增 TASK_RUNTIME：task/mod、scheduler、processor 共 485 行未验证，计划此前没有对应工作项。
  - 新增 later：新增“后续工作”区：LOC_DYNAMIC、HPET、SERIAL_QEMU_CMOS、MM_BOOT、HEAP_GLOBAL、SYNC_WAIT、BZ_SETUP；它们不在当前 x86 关键路径上。
  - 新增 trusted：新增“可信边界”区：TB_BOOT_INPUT、TB_IOMMU、TB_TDX、TB_HW_OPS、TB_ELF_RANGE、TB_EXTABLE_LINK、TB_ALLOC，列出消费它们的工作项。
  - 移除依赖 PT_CFG → TLB_REQ：#677 消费请求队列、覆盖关系与 TlbModel，#570 用 Mapping / PageTableView；都不消费 PageTableConfig（@c00f702244、@5bdb5d2aad）。
  - 移除依赖 IO_ALLOC → PIC：PIC 只消费 PIO 端口合同：改为 IO_PIO→PIC。
  - 移除依赖 ACPI_MADT → IOAPIC_REG：寄存器级证明可从给定地址开始；MADT 提供基址属 irq::init 的组合，已由 ACPI_MADT→ROUTE_MAP 表达。
  - 移除依赖 IO_ALLOC → PIT_CFG：PIT 只消费 PIO 端口合同：改为 IO_PIO→PIT_CFG。
  - 移除依赖 IO_WIN → APIC_PROBE：模式探测只消费 CPUID；窗口保留拆为 APIC_RESERVE（IO_WIN→APIC_RESERVE）。
  - 移除依赖 LOC_ID → IDT_LOAD：idt::init 不读取 CPU-local 或 CpuId；每 CPU 调用是编排条件，不是依赖。
  - 移除依赖 IRQ_MODEL → IRQLINE：回调锁只消费 guard 的禁中断 / 恢复合同：改为 IRQ_DROP→IRQLINE。
  - 移除依赖 IOAPIC_REG → ROUTE_MAP：ROUTE_MAP 消费的是重定向项 enable / disable：改为 IOAPIC_ENTRY→ROUTE_MAP。
  - 移除依赖 TRAP_DATA → FPU_REPR：FpuContext / XSaveArea / FxSaveArea 不消费 UserContext 或异常分类合同；同文件与 §5 的“依次处理”不构成依赖。
  - 移除依赖 XSAVE → SYSCALL：syscall 汇编入口与 RawUserContext::run 不调用 FPU 保存 / 恢复。
  - 移除依赖 SYSCALL → TASK_SW：任务切换的是 TaskContext，不消费 syscall 合同。
  - 移除依赖 TASK_STACK → TASK_SW：大小解析不足以供应栈存活 / 映射 / 初始 SP：改为 TASK_STACK_ALLOC→TASK_SW。
  - 移除依赖 IO_ALLOC → PCI_CFG：x86 配置空间访问只消费 0xCF8 / 0xCFC 的 PIO 合同：改为 IO_PIO→PCI_CFG。
  - 移除依赖 PCI_ENUM → PCI_BAR：给定 location 即可探测 BAR，不消费完整枚举结果：改为 PCI_CFG→PCI_BAR。
  - 移除依赖 PCI_BAR → PCI_CAP：普通 capability 链与 MSI 标记不消费 BAR，只有 MSI-X 需要：改为 PCI_BAR→PCI_MSIX。
  - 移除依赖 PCI_ENC → PCI_CAP：只有 MSI-X 的 remapping 分支需要编码：改为 PCI_ENC→PCI_MSIX。
  - 移除依赖 PCI_CAP → PCI_IRQ：IRQ 路径消费的是 MSI-X 表项合同：改为 PCI_MSIX→PCI_IRQ。
  - 移除依赖 ROUTE_MAP → PCI_IRQ：MSI-X 投递不经过 ISA→GSI→IOAPIC 路由；remapping 地址来自 IrqLine::remapping_index。
  - 移除依赖 BZ_TRUST → BZ_ELF：登记边界与收窄边界是同一件事的两步，登记本身不提供消费者合同。
  - 移除依赖 F_RECOVER → ACC_IMG：链接检查需要汇编符号与段存在，不要求缺页恢复路径已证明：改为 F_ASM→ACC_IMG。
  - 新增依赖 IO_PIO → PIC：拆分后的 PIO 前置（原 IO_ALLOC）
  - 新增依赖 IO_PIO → PIT_CFG：拆分后的 PIO 前置（原 IO_ALLOC）
  - 新增依赖 IO_PIO → PCI_CFG：拆分后的 PIO 前置（原 IO_ALLOC）
  - 新增依赖 IOAPIC_REG → IOAPIC_ENTRY：IoApic::enable / disable 消费寄存器访问合同
  - 新增依赖 IRQLINE → IOAPIC_ENTRY：IoApic::enable 消费 IrqLine::num / remapping_index
  - 新增依赖 IO_ALLOC → APIC_RESERVE：init 的 xAPIC 分支调用 io_mem_builder.remove(base..base + 1024)
  - 新增依赖 IO_WIN → APIC_RESERVE：保留的范围须属于登记窗口
  - 新增依赖 PREEMPT_PIN → LAPIC_DEV：interrupts_ack 用 disable_preempt() 取得 PinCurrentCpu 后调用 get_or_init(..).eoi()
  - 新增依赖 PREEMPT_PIN → TMR_DEADLINE：timer/apic.rs 三处 disable_preempt()
  - 新增依赖 PREEMPT_PIN → TMR_PERIODIC：timer/apic.rs 三处 disable_preempt()
  - 新增依赖 PREEMPT_PIN → SMP_AP：boot/smp.rs 第 159 行 disable_preempt()
  - 新增依赖 IRQLINE → TRAP_DISP：process_top_half 与回调表由陷阱分派调用
  - 新增依赖 IRQ_DROP → IRQLINE：替换 IRQ_MODEL→IRQLINE
  - 新增依赖 IOAPIC_ENTRY → ROUTE_MAP：替换 IOAPIC_REG→ROUTE_MAP
  - 新增依赖 IRQLINE → TMR_DEADLINE：init_bsp / init_timer 注册 IrqLine 回调
  - 新增依赖 SMP_AP → SMP_COMPOSE：编排验收建立在 AP 启动合同之上
  - 新增依赖 IRQLINE → SMP_IPI：smp::init 用 IrqLine::alloc().on_active(do_inter_processor_call)
  - 新增依赖 LOC_ACC → SMP_IPI：CALL_QUEUES 是 cpu_local!，经 get_on_cpu 跨核访问
  - 新增依赖 GDT → SYSCALL：syscall::init 的安全条件要求 GDT 已初始化
  - 新增依赖 TASK_STACK_ALLOC → TASK_SW：替换 TASK_STACK→TASK_SW
  - 新增依赖 SA_RCU → TASK_SW：switch_to_task 调用 finish_grace_period()
  - 新增依赖 TASK_RUNTIME → TASK_SW：推断：待确认 TASK_SW 是否消费 Task / CurrentTask 合同
  - 新增依赖 IRQ_GUARD → TASK_STACK_ALLOC：flush_tlb 的参数是 &DisabledLocalIrqGuard
  - 新增依赖 PT_X86 → TASK_STACK_ALLOC：推断：待确认 flush_tlb 调用的刷新原语
  - 新增依赖 PCI_CFG → PCI_BAR：BAR 探测写全一、读尺寸、恢复原值
  - 新增依赖 IO_ALLOC → PCI_BAR：MemoryBar::new 调用 unsafe IoMem::new
  - 新增依赖 PCI_CFG → PCI_CAP：capability 链只需配置读取
  - 新增依赖 PCI_CAP → PCI_MSIX：MSI-X capability 定位
  - 新增依赖 PCI_BAR → PCI_MSIX：MSI-X table / PBA 所在 BAR
  - 新增依赖 PCI_ENC → PCI_MSIX：remapping 分支的 MSI-X 地址编码
  - 新增依赖 PCI_MSIX → PCI_IRQ：替换 PCI_CAP→PCI_IRQ
  - 新增依赖 TRAP_DISP → PCI_IRQ：回调执行与 EOI 的最终验收
  - 新增依赖 BZ_ELF → BZ_RANGE：to_flat_binary 消费 file_size <= mem_size 等 ELF 段条件
  - 新增依赖 F_ASM → ACC_IMG：替换 F_RECOVER→ACC_IMG
  - PR：#855 已合入 41ccd7463（main 含 #928、#929）；#921 已合入 97963e831；#916 于审查期间合入 c25ca6f98；#408 已关闭，由 #928 取代；#706、#927 的 head 在审查期间更新，#930 未关联（见 reviewedCandidates）。
- **r1 · 2026-11-16**：建立独立计划与 PR 快照；保留现有工作项和依赖。
<!-- END GENERATED:changes -->

## 附录 E：固定源码与审阅依据

参见 [r3 复核证据](review-r3.md)。附录 B 的每条边仍保留具体文件、符号和实际核对提交；PR 覆盖说明保存在 `pr-catalog.js`，事实快照时间见 `pr-snapshot.js`。
