/* Verification plan: WHAT the work items are. Edited by hand.
 * Lane, title, module tags, what to deliver (todo), when it is complete and what stays trusted (accept), plus scope
 * (later / trusted / outOfScope) and the dashboard baseline. Keep IDs stable: other files refer to them.
 *
 * Everything that changes more often or is edited mechanically lives next to this file, see plan-assemble.js:
 *   plan-edges.js    dependencies           plan-accept.js  acceptance ("done") records
 *   pr-catalog.js    PR ↔ work item links   plan-history.js change log (its last entry is the revision)
 * outOfScope: excluded architectures, never rendered. Dashboard LOC stays auxiliary, not acceptance.
 * Maintenance recipes: README.md. */
window.PLAN_BASE = {
  schemaVersion: 1,
  acceptanceRule: "每项交付 todo 指定的真实执行 API/合同、至少一个实际调用者的前置建立与结果使用证据、固定提交和适用验证命令结果；成功/失败/资源释放与剩余可信输入逐项记录。requires 可支持局部证明，最终验收须说明其来源。只写纯规格、保留未说明的注释/桩、PR 合并或 CI 通过均不自动结项。已完成项按其明确限定交付评定。",
  repo: "https://github.com/asterinas/vostd",
  liveUrl: "https://asterinas.github.io/vostd/stats/snapshot.json",
  doc: {
    date: "2026-11-16",
    sha: "032089aa3d4603fa68f3f874cddfc6d61ff81225",   // #932 vendors dv; ostd/verified_libs unchanged since 8e681282d
    snapshotAt: "2026-11-13 17:44（北京时间）",
    snapshotSha: "90087275ebd4b974596947d11d3da27d722e05d3",
  },

  /* The three views, in tab order (x86 is the default). `note` is shown under the tab. */
  lanes: [
    {
      "key": "x86",
      "name": "x86 平台",
      "sub": "APIC · IRQ · 陷阱 · CPU-local · x86 页表 · 定时器 · 故障恢复 · 用户态",
      "note": "局部合同可并行推进；PITIRQ 是首个中断闭环，ACC_SCOPE 才是 x86 范围的最终验收。"
    },
    {
      "key": "bzimage",
      "name": "bzImage 启动链",
      "sub": "PE/COFF · ELF 解析 · 加载地址 · 输出区间 · 最终镜像检查",
      "note": "builder、ELF、压缩与 setup 独立推进，只在最终镜像、运行与范围验收处连接 x86。"
    },
    {
      "key": "common",
      "name": "OSTD 公共模块",
      "sub": "PCI · MM · CPU-local · IRQ/抢占资源 · task · sync · heap · DMA",
      "note": "为 x86 与 bzImage 提供接口合同；各项独立验收，最后汇入 ACC_SCOPE。"
    }
  ],

  /* Dashboard code-line classes. Auxiliary information only (see `done` above). */
  statuses: [
    { key: "verified_exec", name: "已验证", glyph: "✓", cssVar: "--tm-verified", def: "可执行代码由 Verus 证明" },
    { key: "trusted", name: "可信边界", glyph: "◐", cssVar: "--tm-trusted", def: "位于明确的可信边界并有调用条件；不能折算成已证明" },
    { key: "unverified", name: "待验证", glyph: "○", cssVar: "--tm-unverified", def: "在范围内但尚无足够证明" },
    { key: "unplanned", name: "暂不纳入", glyph: "■", cssVar: "--tm-unplanned", def: "黑色：本轮不要求验证（本页不显示）" },
  ],

  nodes: [
    /* ================================================================ IO */
    { id: "IO_ALLOC", lane: "common", face: "io/io_mem · util/range_alloc", title: "MMIO 窗口分配与 remove 资源合同",
      mods: ["util/range_alloc", "io/io_mem"],
      todo: [
        "#706 的 builder new/remove、窗口状态与 RangeAllocator 权限转移；局部分配不等于全局窗口登记。new 给出 state_matches，remove 消费 can_remove 与 io_mem_range_registered。IoMem 映射/访问、全局初始化另由 IO_MMIO / IO_GLOBAL 交付。",
      ],
      accept: "交付可供 IO_WIN、APIC_RESERVE、IOAPIC_REG 使用的局部窗口和权限合同；以给定合法窗口证明范围移除、互不重叠、失败状态保持及回收资格即可验收。不能要求下游 APIC/IOAPIC 已全部完成才关闭本项。固件区域真实性属 TB_BOOT_INPUT。",
      src: "§4 · §5 阶段 A" },
    { id: "IO_PIO", lane: "common", face: "io/io_port", title: "静态 PIO 端口构造与访问合同",
      mods: ["io/io_port"],
      todo: [
        "#706 的 IoPort::new/read/write 与外部 PortRead/PortWrite 规格供 PIC、PIT、PCI 配置访问使用。硬件全宽边界是 port + size <= 65536；new 的可表示释放端点更严格，为 <= u16::MAX。动态权限与显式释放拆为 IO_PIO_ALLOC。",
      ],
      accept: "完成条件：u8/u16/u32 的宽度、读写权限、端口不越界与静态调用点可证明；PIC/PIT/PCI 的静态端口无需等全局 allocator 初始化。端口读值及写设备效果仍属 TB_HW_OPS，由消费者补协议合同。",
      src: "§4 · §5 阶段 B" },
    { id: "IO_WIN", lane: "x86", face: "boot/memory_region · arch/x86/io", title: "引导 MMIO 窗口 → 登记权限",
      mods: ["boot/memory_region", "arch/x86/io"],
      todo: [
        "construct_io_mem_allocator_builder 从 EARLY_INFO.memory_regions 筛选区域并计算低、高 MMIO 窗口；目前未被验证，也没有建立与 registered_io_mem_windows() 的相等关系（arch/x86/io.rs，#706 head 44061a4945）。",
        "#706 对 x86 builder 构造函数本身的改动不足以建立这条端到端关系；MemoryRegion 的局部证明补不出固件布局的真实性。",
      ],
      accept: "交付：builder 返回的权限与实际引导 MMIO 窗口一一对应的证明。窗口列表来自未纳入计划的 arch/x86/boot，属可信边界 TB_BOOT_INPUT；动态显式释放资格仍须逐消费者验收。",
      src: "§5 阶段 A" },

    /* ============================================================== IRQ */
    { id: "IRQ_MODEL", lane: "x86", face: "trap/irq · arch/x86/irq", title: "统一 IRQ 状态模型",
      mods: ["trap/irq", "arch/x86/irq"],
      todo: [
        "确定同一 CPU 的 IF 状态、IRQ 嵌套和恢复权限由谁拥有。",
        "#879 用 LocalIrqGuardOwner / CpuLocalAuth<bool>（specs/task/irq.rs @6cec73d064），#900 用 CpuCoreOwner / LocalIrqGuardToken（specs/task/cpu_core.rs @c8b604c0ec）：两者没有相互转换的不变式，需选统一状态或建立显式关联不变式。",
      ],
      accept: "交付统一的 IF/嵌套深度/恢复权限状态及 #879 owner 与 #900 CpuCoreOwner 的关联不变式，供 IRQ_GUARD、IRQ_DROP 和 trap 入口建立转换。逐个状态转移验证一致性，不能只保留互不相关的两个模型；初始 CPU 状态与硬件 IF 指令分别由 TB_BOOT_INPUT/TB_HW_OPS 记录。#900 已撤回禁抢占 fallback，不能据旧标题计入交付。",
      src: "§5 阶段 A · §6" },
    { id: "IRQ_GUARD", lane: "x86", face: "trap/irq", title: "IRQ guard 创建与嵌套",
      mods: ["trap/irq"],
      todo: [
        "验证 guard 的创建与嵌套。main 的 new 是 external_body；#879 已证明私有 new 的保存 IF / 深度更新，公开 disable_local 仍 external，owner 没有构造器。",
      ],
      accept: "交付真实 disable_local 入口的 owner 来源、保存 IF、增加嵌套深度和 guard 唯一权限，供 CPU-local/锁调用者使用；构造失败及重复禁用不能伪造恢复权。私有 new 已证不足以关闭公开 external 入口；硬件 IF 操作属 TB_HW_OPS。",
      src: "§5 阶段 A" },
    { id: "IRQ_DROP", lane: "x86", face: "trap/irq · arch/x86/irq", title: "guard 转移、释放与恢复原 IF",
      mods: ["trap/irq", "arch/x86/irq"],
      todo: [
        "验证 guard 的转移、释放，并恢复原 IF 状态。main 的 Drop 被注释，transfer_to 的布尔后置条件不能证明恢复权限转移；#900 恢复运行层执行体，但未把它连接到 proof token。",
      ],
      accept: "阶段 A 验收样例之一：同一 CPU 创建 IRQ guard、获取本地资源、完成转移或正常释放并恢复原 IF 状态。",
      src: "§5 阶段 A" },

    /* ============================================================ LOCAL */
    { id: "LOC_ALLOC", lane: "common", face: "mm/frame/allocator · boot/mod", title: "early allocator 实例",
      mods: ["boot/mod", "mm/frame"],
      todo: [
        "#802：实例 alloc 的对齐、尾指针单调、失败保持与 allocated_regions 已证；new 与全局 early_alloc 仍 external，axiom_early_regions_wf 未被消费。",
        "全局 early_alloc 没有返回线性内存资源，也未形式化跨次不重叠。main 里 EarlyFrameAllocator / early_alloc 整段在注释中，实现路径是 mm/frame/allocator.rs，不是 boot/mod.rs。",
      ],
      accept: "交付实例 alloc 的对齐、容量、单调、失败保持及 allocated_regions 合同；给定有效实例可验收。new 的区域来源与全局线性内存交接归 LOC_EARLY_GLOBAL，不能由 heap slot 证明替代。",
      src: "§5 阶段 A · §7" },
    { id: "LOC_STORE", lane: "common", face: "cpu/local · arch/x86/cpu", title: "BSP / AP 的 CPU-local 存储初始化",
      mods: ["cpu/local", "arch/x86/cpu"],
      todo: [
        "用 early allocator 的结果初始化 BSP / AP 存储；还需链接区间有效、复制前未使用、BSP 源与目标不重叠（#802 的单次数值合同不足以关闭这些义务）。",
        "区分引导阶段的 CPU / IRQ 初始资源与运行阶段 guard，明确交接点。",
      ],
      accept: "交付 BSP/AP 已分配、已复制、已发布的存储区域及生命周期，供 LOC_ID/LOC_REMOTE 建立访问前置；核对源目标不重叠、每核分配互异和复制前未使用。不能用尚未初始化的 CPU-local 建立自身初始化前置；链接区间及早期 CPU 状态属 TB_BOOT_INPUT。",
      src: "§5 阶段 A" },
    { id: "LOC_ID", lane: "x86", face: "arch/x86/cpu · cpu/local", title: "GS 基址与逻辑 CPU 身份",
      mods: ["arch/x86/cpu", "cpu/local"],
      todo: [
        "GS 基址指向本 CPU 的存储，并给出逻辑 CPU 身份。main 已证明 CpuId 范围、转换与 all_cpus；num_cpus 仍可信，current_racy / set_this_cpu_id / init_on_bsp / init_on_ap 在注释里。",
        "NMI 和 bootstrap 例外在 #900 中尚未建模，应单列为边界条件。",
      ],
      accept: "交付 GS 基址、逻辑 CpuId 与正在执行 CPU 的对应关系，供本地访问、GDT 和 APIC 实例使用；核对 BSP/AP 设置与读取及有效索引。num_cpus、引导 GS/CPU 状态属 TB_BOOT_INPUT，NMI/bootstrap 例外须在入口条件中明确。",
      src: "§5 阶段 A · 阶段 B" },
    { id: "LOC_ACC", lane: "common", face: "cpu/local · cpu/mod", title: "guard / pin 约束下访问 CPU-local",
      mods: ["cpu/local", "cpu/mod"],
      todo: [
        "在持有 IRQ guard 的前提下访问 CPU-local；远端访问 get_on_cpu 要求 T: Sync，存储要求 S: AnyStorage<T>。PinCurrentCpu 是独立的 unsafe trait。",
      ],
      accept: "交付 get_with 在有效存储及 PinCurrentCpu/IRQ guard 生命周期内的借用合同；用实际本地资源访问证明前置可建立、借用不逃逸及 guard 释放后权限恢复。远端共享和单指令 Cell 分别归 LOC_REMOTE/LOC_CELL；GS/链接输入属 TB_BOOT_INPUT。",
      src: "§5 阶段 A" },

    /* ================================================================ MM */
    { id: "PT_CFG", lane: "common", face: "mm/page_table · mm/kspace", title: "分页布局与 PageTableConfig 常量合同（已验收）",
      mods: ["mm/page_table", "mm/kspace", "arch/x86/mm"],
      todo: [
        "#855（已合入 41ccd7463）：删除 axiom_current_paging_consts_hardcoded；x86 的常量义务由 lemma_paging_consts_requirements 证明（arch/x86/mm/mod.rs）；Kernel / User 配置证明 PTE 大小与顶层范围，泛型 cursor 消费这些合同。#928（4676a774b，取代已关闭的 #408）把 TOP_LEVEL_CAN_UNMAP 等改为关联常量，#929 做证明展开的性能优化。",
        "仍限制 4 KiB 页、8 字节 PTE、最多四层；KernelPtConfig / UserPtConfig 的 item_into_raw / item_from_raw 仍可信；VmSpace::unmap 保留溢出 assume。",
      ],
      accept: "限定验收：布局公理删除、x86 PagingConstsTrait 和 Kernel/User 配置常量义务有证明，泛型 cursor/页大小消费者已使用这些引理。4 KiB、8 字节 PTE、最多四层是当前配置限制；item 原始转换与 unmap 溢出债务归 MM_PT，不再阻塞本项。寄存器与硬件失效归 PT_X86。",
      src: "§4 · §7" },
    { id: "PT_X86", lane: "x86", face: "arch/x86/mm", title: "x86 页表寄存器与刷新效果",
      mods: ["arch/x86/mm"],
      todo: [
        "PTE 编码已有证明；CR3 激活 / 读取、按地址及非全局刷新是 external_body + unimplemented!()，全局刷新函数体只剩注释，都没有硬件效果后置条件。",
      ],
      accept: "交付 CR3 根页激活/读取、单页/范围/全局刷新效果，供栈、MM_BOOT、TLB_SHOOT 使用；范围循环证明可独立开展。验收恢复执行包装并将地址对齐/有效根页前置接到消费者，硬件指令效果逐条列入 TB_HW_OPS。",
      src: "§4" },
    { id: "VM_POD", lane: "common", face: "mm/io · mm/test", title: "Pod · 切片 · 可失败 VM I/O 测试",
      mods: ["mm/io", "mm/test"],
      todo: [
        "#927：Pod derive、切片与可失败 VM I/O 测试；恢复 Pod derive、补 cursor 合同及可信 Vec 可变索引规约。main 已有 VM I/O 边界、失败保持与 limit 合同（#924）。",
      ],
      accept: "以 VM_REPR 合同恢复内容相等、成功返回和精确复制量断言，并明确恢复哪些运行期 ktest；测试须调用实际 Pod/VM I/O API。测试通过只验收这些例子，成功/部分故障全链由 F_BYTES 验收；原始转换/Vec 外部规约逐条记录。",
      src: "§4" },
    { id: "VM_CONTENT", lane: "common", face: "mm/io", title: "read_val 返回值与字节内容的关系",
      mods: ["mm/io"],
      todo: [
        "连接 read_val 的返回值与底层字节：目前返回值与实际字节内容没有关系。",
        "补齐关闭内容相等断言所需的关系。",
      ],
      accept: "交付 read_val/write_val、reader/writer 拷贝的值与底层字节关系，供 F_BYTES 和 Pod 调用者证明内容相等；覆盖边界、失败状态和游标推进。以实际调用实例建立前置，Pod 表示与底层内存操作按 VM_REPR 的边界记录。",
      src: "§4 · §5 阶段 C" },
    { id: "TLB_REQ", lane: "common", face: "mm/tlb", title: "TLB 请求与逻辑提交",
      mods: ["mm/tlb"],
      todo: [
        "#677：OpsStack 不变式、push / merge / clear、请求覆盖与逻辑提交；OpsStack::new、硬件刷新、dispatch、sync 仍可信，CPU locality 与 frame 保留未建模。#570：tracked update / flush 规格，须与 #677 的模型协调（main 仍有对应公理，不能称已被取代）。",
        "main 的 issue / dispatch 仍可信；逻辑 dispatch 只取最后一项，Range 只处理 range.start，不能代表整队硬件刷新。#838 的通用 TLB 基础与 #903 的模型清理纳入旧分支迁移。",
      ],
      accept: "交付请求集合覆盖、队列 push/merge/clear 和 tracked 映射更新合同，供 TLB_SHOOT/TLB_FREE 使用；验证零请求、Range 全范围和队列所有请求，协调 #677/#570 与 main 的模型。逻辑提交不代表远端完成；OpsStack::new 的可信构造与硬件操作分开登记。",
      src: "§5 阶段 C · §7" },
    { id: "TLB_SHOOT", lane: "common", face: "mm/tlb · arch/x86/mm", title: "TLB shootdown：远端刷新与完成确认",
      mods: ["mm/tlb", "arch/x86/mm"],
      todo: [
        "证明请求目标、实际刷新与完成确认；还需当前 CPU 固定、每核队列与目标集合发布合同。main 的队列 / ACK 在注释里，dispatch、sync、remote handler 是桩。",
      ],
      accept: "发送 IPI 成功、逻辑请求入队或单核 invlpg 包装均不足以证明远端刷新完成；原 ACK 在实际刷新之前，须证明期间无法返回用户态。逻辑请求部分已由 TLB_REQ 单独承担，可先于 IPI 开展。",
      src: "§5 阶段 C" },
    { id: "TLB_FREE", lane: "common", face: "mm/tlb · mm/frame", title: "待释放页面保留；释放在确认之后",
      mods: ["mm/tlb", "mm/frame"],
      todo: [
        "证明待释放页面的保留义务：page_keeper 的 push / extend / clear 在 main 都在注释里，#677 也未恢复。",
        "页框释放必须在所需确认之后。",
      ],
      accept: "验收跨 CPU 完成与资源释放；传入 frame 不能据接口名算作已保留。",
      src: "§3 P3 · §5 阶段 C" },

    /* ============================================================= ACPI */
    { id: "ACPI_TABLES", lane: "x86", face: "arch/x86/kernel/acpi", title: "ACPI 表来源与访问有效性",
      mods: ["arch/x86/kernel"],
      star: "文档建议：通用 ACPI / MADT 当前没有对应开放 PR，应尽早安排，否则 IOAPIC 和 PIT IRQ 会在局部证明后继续等待表发现接口（§3）。",
      todo: [
        "建立 RSDP / RSDT / XSDT 来源、物理映射、表长度及访问有效性：get_acpi_tables 是普通 Rust，消费 EARLY_INFO.acpi_arg，支持 BIOS 搜索，解析失败多处 unwrap，BIOS 搜索失败返回 None。",
        "覆盖 NotProvided 时的 BIOS 搜索与失败路径；保留原 unwrap 的条件或 panic 行为，不默认为可恢复错误。",
      ],
      accept: "交付 MADT 等消费者可用的表来源、长度、物理访问和结果存活合同；覆盖 NotProvided/BIOS 搜索失败，保留原 unwrap 所需条件或 panic 行为。RSDP/固件真实性属 TB_BOOT_INPUT，外部 ACPI parser 的具体条件须登记；DMAR 子树局部已有证明不代表该入口完成。",
      src: "§3 · §5 阶段 B · §6" },
    { id: "ACPI_MADT", lane: "x86", face: "arch/x86/kernel/acpi", title: "MADT：IOAPIC 地址 · GSI 范围 · ISA override",
      mods: ["arch/x86/kernel"],
      todo: [
        "MADT 消费合同给出 IOAPIC 地址、GSI base 范围和 ISA override；验收要区分 MADT 给出的 GSI base 与寄存器给出的容量（IoApicAccess::max_redirection_entry），仅解析 MADT 不能建立完整 GSI 覆盖。",
      ],
      accept: "交付给 ROUTE_MAP 的 IOAPIC 地址、GSI base 与 ISA override，并建立表长度/条目类型/极性触发标志条件。实际 GSI 容量还须消费 IOAPIC 寄存器合同；固件描述与真实接线的一致性属于待提供的平台证据。",
      src: "§5 阶段 B" },

    /* ============================================================== DEV */
    { id: "PIC", lane: "x86", face: "arch/x86/kernel/irq/pic.rs", title: "PIC：init_and_disable / set_mask",
      mods: ["arch/x86/kernel"],
      todo: [
        "证明端口、向量偏移、级联参数与写入参数；init_and_disable 调用 set_mask(0xff, 0xff)，需补“写入序列使 PIC 处于全屏蔽”的协议合同。irq 模块在 main 未启用，文件是普通 Rust。",
      ],
      accept: "交付 init_and_disable 的端口访问序列与全屏蔽设备状态，供 ROUTE_MAP 的 PCAT_COMPAT 分支使用；核对向量偏移和级联参数。无需等待 MMIO allocator；端口写入到设备状态的协议依赖 TB_HW_OPS。",
      src: "§5 阶段 B" },
    { id: "IOAPIC_REG", lane: "x86", face: "arch/x86/kernel/irq/ioapic.rs", title: "IOAPIC：寄存器访问",
      mods: ["arch/x86/kernel"],
      todo: [
        "间接寄存器选择 / 数据访问互斥。基地址可作为参数，寄存器级证明不必等 MADT；MADT 提供基址属于 irq::init 的组合（见 ROUTE_MAP）。",
      ],
      accept: "交付给 IOAPIC_ENTRY 的间接寄存器读写合同：选择/数据事务互斥、偏移有界、max_redirection_entry 的含义及映射存活。以给定合法窗口证明，固件地址到该窗口的对应由 ROUTE_MAP 组合；寄存器效果属 TB_HW_OPS。",
      src: "§5 阶段 B" },
    { id: "IOAPIC_ENTRY", lane: "x86", face: "arch/x86/kernel/irq/ioapic.rs", title: "IOAPIC：重定向项 enable / disable",
      mods: ["arch/x86/kernel"],
      todo: [
        "重定向项 enable / disable 的效果与失败合同。当前代码未启用且没有规格。",
      ],
      accept: "交付给 ROUTE_MAP 的 enable/disable 表项效果、向量/remapping 编码、屏蔽与句柄存活合同；核对索引边界及失败时权限保持。设备投递语义属 TB_HW_OPS，IRT 状态属 TB_IOMMU。",
      src: "§5 阶段 B" },
    { id: "PIT_CFG", lane: "x86", face: "arch/x86/timer/pit.rs", title: "PIT 配置（pit::init）",
      mods: ["arch/x86/timer"],
      todo: [
        "pit::init 写 0x43 命令字，再向 0x40 写低、高字节；TIMER_FREQ = 1000，分频值 1193（1193182 / 1000），字节 0xA9、0x04——已按 main 源码核对。pit 模块在 main 注释，x86 timer 只启用 TIMER_FREQ。",
        "证明挂到实际执行函数上，可先在 #706 上独立交付。",
      ],
      accept: "交付 pit::init 的 0x43 命令与 0x40 低/高字节写入合同、1000 Hz 目标下 divisor=1193 的计算，供 PITIRQ/CAL_FREQ 使用；参数证明及硬件协议输入均需记录。真实产生中断的进展由 PITIRQ 在选定平台验收。",
      src: "§5 阶段 B" },

    /* ============================================================== APIC */
    { id: "APIC_PROBE", lane: "x86", face: "arch/x86/kernel/apic", title: "APIC 模式探测（x2APIC 优先 / xAPIC 回退）",
      mods: ["arch/x86/kernel"],
      todo: [
        "交付 CPUID 采样到候选模式/NoApic 的分支合同；可独立证明，实际 init 的发布由 APIC_PUB 组合窗口保留结果。",
      ],
      accept: "探测只消费 CPUID，不消费 IO 窗口；xAPIC 窗口保留已拆为 APIC_RESERVE，因此不再等待 IO 分配器。",
      src: "§5 阶段 A" },
    { id: "APIC_RESERVE", lane: "x86", face: "arch/x86/kernel/apic", title: "xAPIC 寄存器窗口保留",
      mods: ["arch/x86/kernel", "io/io_mem"],
      todo: [
        "xAPIC 从实际 MSR 采样取地址，保留对应 1024 字节范围，其他窗口权限不变。",
        "XApic::new 用 mm::paddr_to_vaddr(get_xapic_base_address()) 取寄存器指针，且是 external_body；寄存器读写用无分配权限的 volatile wrapper，不经 IoMem，因此这一项才是 APIC 与 IO 分配器的唯一接点。",
      ],
      accept: "MSR 地址对齐与上界只是局部事实，还需证明该地址属于登记窗口。x2APIC 分支不消费窗口。",
      src: "§5 阶段 A" },
    { id: "APIC_PUB", lane: "x86", face: "arch/x86/kernel/apic", title: "APIC 发布模式与 ApicId",
      mods: ["arch/x86/kernel"],
      todo: [
        "发布模式与 ApicId::from 一致，保留 xAPIC 八位截断。ApicId::from 与发布入口在 main 都被注释。",
      ],
      accept: "完成条件：init 成功后 Once 发布的模式与探测一致；xAPIC 分支已保留寄存器窗口，失败不伪造已发布状态；ApicId::from 与模式匹配并保留八位截断。硬件采样属 TB_HW_OPS。",
      src: "§5 阶段 A · §7" },
    { id: "LAPIC_INST", lane: "x86", face: "arch/x86/kernel/apic", title: "每核 APIC 实例（get_or_init）",
      mods: ["arch/x86/kernel"],
      todo: [
        "证明 get_or_init 返回的实例对应执行 CPU，引用在许可的生命周期内有效。",
        "说明初始化重入条件。get_or_init 在 main 整体注释，ForceSyncSend 的安全理由尚无形式连接。",
      ],
      accept: "交付 get_or_init 返回实例与执行 CPU 的对应关系、有效引用、一次初始化及重入条件，供 EOI/timer/IPI 使用；!Send/!Sync 或逻辑 CpuId 不能单独建立该关系。GS/CPU 输入与 ForceSyncSend 的安全前提逐条登记。",
      src: "§5 阶段 B" },
    { id: "LAPIC_DEV", lane: "x86", face: "arch/x86/kernel/apic · timer/apic.rs", title: "APIC / ApicTimer 设备状态与 EOI",
      mods: ["arch/x86/kernel"],
      todo: [
        "为 Apic / ApicTimer 接口补设备状态后置条件并覆盖 EOI；xAPIC 与 x2APIC 两个后端都要覆盖。ICR / ID 编码与后端计算已在 main（#819），可直接复用。",
        "send_ipi 在两个后端都是 external_body。",
      ],
      accept: "交付 xAPIC/x2APIC 的 EOI、timer 配置和 send_ipi 状态合同，供陷阱、timer、SMP_IPI 使用；验证参数编码、CPU 归属和访问权限。硬件效果按 TB_HW_OPS 登记，send_ipi 不自动保证对方执行或 ACK。",
      src: "§5 阶段 B" },

    /* ============================================================== TRAP */
    { id: "GDT", lane: "x86", face: "arch/x86/trap/gdt.rs", title: "GDT / TSS 与栈",
      mods: ["arch/x86/trap"],
      todo: [
        "证明选择子、描述符及栈布局：栈证明须覆盖 .cpu_local_tss 首部布局，不能只证明选择子常量。gdt.rs 在 main 未启用，普通 Rust。",
      ],
      accept: "还消费 boot 建立的 CS == KERNEL_CS（TB_BOOT_INPUT）；TSS 描述符 limit 未包含 I/O bitmap；当前没有配置专用 IST。完整 trap::init 还调用 syscall 初始化，应按原执行顺序（gdt::init → idt::init → syscall::init）接入。",
      src: "§5 阶段 B" },
    { id: "IDT_TABLE", lane: "x86", face: "arch/x86/trap/idt.rs", title: "IDT 构表（256 个向量）",
      mods: ["arch/x86/trap"],
      star: "文档建议：若下一项只能选一个不叠加 #706 的新代码任务，选 trap/idt.rs 的构表证明（§3）。",
      todo: [
        "256 个向量对应各自入口；仅 3 / 4 号向量设为 Ring3，其余保持原权限；正确构造描述符表长度。",
        "实际用到：Box::new / Box::leak 的分配合同、spin::Once、Entry::missing / set_handler_addr、VirtAddr::new 与外部 VECTORS（没有 Vec）；这些都需要具体合同，不能把现有源码当作已验证外部规格。",
      ],
      accept: "trap 模块在 main 未启用，须与 #887 的模块开关协调（#887 启用 trap 后仍注释 mod idt）；若只完成构表，应标注尚未恢复整个入口。Box 只消费 alloc 的外部规约，不等待 heap slot 证明（SA_HEAP）；用户全局 allocator 属 TB_ALLOC。",
      src: "§3 · §5 阶段 B" },
    { id: "IDT_LOAD", lane: "x86", face: "arch/x86/trap/idt.rs", title: "IDT 全局发布与每 CPU lidt",
      mods: ["arch/x86/trap"],
      todo: [
        "验证全局发布（GLOBAL_IDT Once）与每 CPU 的 lidt 加载；入口地址规范性、当前代码选择子、表的永久生命周期与汇编 ABI 另须落实。",
      ],
      accept: "交付 GLOBAL_IDT Once 发布和每核 lidt 后的 IDTR/表生命周期合同，供 TRAP_DISP 使用；核对规范入口地址、代码选择子和 ABI。硬件 lidt 与 VECTORS 地址是明确外部输入；函数不消费 CpuId，不增加 LOC_ID 前置。",
      src: "§5 阶段 B" },
    { id: "TRAP_DATA", lane: "x86", face: "arch/x86/cpu/context · arch/x86/trap", title: "上下文数据与异常分类（#887）",
      mods: ["arch/x86/cpu", "arch/x86/trap"],
      todo: [
        "#887：寄存器 / TLS / 指针更新的字段保持、take_exception 与异常分类；启用 CPU / context、trap 数据与 user trait，继续停用 GS local、GDT / IDT / syscall、分派、异常构造、FPU 与 UserMode。activate_tls_pointer 仍是 external_body，没有硬件状态后置条件。",
      ],
      accept: "交付给 TRAP_EXC/用户上下文调用者的寄存器字段保持、TLS/指针更新、take_exception 与分类合同；以实际构造/读取案例核对。activate_tls_pointer 的硬件效果仍可信；异常构造、FPU 和 UserMode 另项验收。",
      src: "§4 · §6" },
    { id: "TRAP_EXC", lane: "x86", face: "arch/x86/cpu · arch/x86/trap", title: "CpuException::new：异常构造",
      mods: ["arch/x86/cpu", "arch/x86/trap"],
      todo: [
        "向量映射、错误码保留、GP 零 / 非零分支与 CR2 采样。",
        "明确双重故障零错误码与页错误码合法位等输入条件：现有 debug_assert_eq! 与 from_bits(..).unwrap() 不能提供这些输入来源。",
      ],
      accept: "交付 TRAP_DISP 可用的向量到异常映射、错误码保留、GP 分支及 CR2 采样合同；核对双重故障零错误码和页错误码合法位输入。debug_assert/unwrap 的前置必须有来源，CR2 与入口错误码属 TB_HW_OPS。",
      src: "§5 阶段 B" },
    { id: "TRAP_DISP", lane: "x86", face: "arch/x86/trap · trap/handler", title: "陷阱入口 → TrapFrame → 分派",
      mods: ["arch/x86/trap", "trap/handler"],
      todo: [
        "IDT 汇编入口进入，经 TrapFrame 分派到 IRQ 回调 / 异常处理；把原 trap::init 的 gdt::init → idt::init → syscall::init 顺序接回。",
        "补 bottom-half、嵌套上界与 IRQ 恢复合同；NMI 返回 / 嵌套与 TSS 栈安全须明确验收。",
      ],
      accept: "#900 尚未建立执行 guard、trap 入口和 proof state 的完整连接；main 的 handler 与架构 trap 均未启用。汇编栈布局与现代异常错误码约定是否一致待确认：DEF_HANDLER 只对 8、10..14、17 号向量使用 CPU 错误码分支。",
      src: "§5 阶段 B" },

    /* ============================================================== ROUTE */
    { id: "IRQLINE", lane: "x86", face: "trap/irq · arch/x86/kernel/irq", title: "IrqLine 分配、回调注册与释放",
      mods: ["trap/irq", "arch/x86/kernel"],
      todo: [
        "IrqLine 分配与回调注册；MappedIrqLine 释放；覆盖分配 / 映射失败与资源保留、clone 保留、最后句柄释放与回调注销。",
        "main 的 IrqLine / InnerHandle / CallbackHandle / ALLOCATOR 与回调执行整体在注释里（源码名是 CallbackHandle、ALLOCATOR）。",
      ],
      accept: "交付分配/注册/clone/最后句柄释放与回调注销的资源合同，供路由、IPI、timer、PCI 使用；覆盖分配失败、注销与回调并发、MappedIrqLine 释放。锁硬件状态由 SYNC_GUARD 提供，remapping 项按 TB_IOMMU 登记。",
      src: "§5 阶段 B" },
    { id: "ROUTE_MAP", lane: "x86", face: "arch/x86/kernel/irq", title: "ISA → GSI 映射与 IOAPIC 配置",
      mods: ["arch/x86/kernel"],
      todo: [
        "依据 MADT 的 ISA override 把中断映射到 GSI，并配置 IOAPIC 重定向项。",
        "IRQ0 对应关系：没有任何 override 时 irq::init 硬编码补 0→2；有其他 override 但没有 IRQ0 项时 map_isa_pin_to 回退 0→0。IRQ0 验收必须证明选定平台的实际对应关系。",
      ],
      accept: "待确认：选定 BSP 平台的实际 MADT、IRQ0 接线、重定向极性 / 触发模式。ACPI / PIC / IOAPIC 局部验证通过后，若陷阱分派或 EOI 尚未接线，只能记为设备配置完成。",
      src: "§5 阶段 B" },
    { id: "PITIRQ", lane: "x86", face: "多模块联调", title: "PIT IRQ0 完整处理（首个中断闭环）",
      mods: [],
      milestone: true,
      todo: [
        "IrqLine 分配与回调注册（经 ROUTE_MAP 的 IRQLINE）→ ISA / GSI 映射 → IOAPIC 配置 → IDT / 汇编进入 → TrapFrame → IRQ 嵌套状态 → 回调 → EOI → 恢复 → MappedIrqLine 释放。",
        "覆盖分配 / 映射失败与资源保留；范围是非 TDX 的 BSP 路径（TB_TDX）。",
      ],
      accept: "验收选定非 TDX BSP 平台上 PIT 实际产生 IRQ0、注册/路由/进入/回调/EOI/恢复/解除映射全链及失败保留。可先写组合合同和测试骨架；各前置是验收门槛。平台 IRQ0 接线与进展仍需实际证据。",
      src: "§3 P1 · §5 阶段 B" },

    /* ============================================================== TIME */
    { id: "CAL_FREQ", lane: "x86", face: "arch/x86/kernel/tsc.rs · timer", title: "PIT 校准与完整 init_tsc_freq",
      mods: ["arch/x86/kernel", "arch/x86/timer"],
      todo: [
        "PIT 校准，再接完整 init_tsc_freq。main 已证明 CPUID 采样计算（#905），但保留两个乘积上界 assume；PIT 校准、init_tsc_freq、TSC_FREQ 发布均在注释里。",
        "整数截断、采样边界、频率发布、CONFIG / Once 状态、临时 PIT 映射释放与原模式选择。",
      ],
      accept: "频率为零、计数减法的边界不能由“频率初始化完成”这一名称隐含保证。局部证明可先假定 IRQ0 回调合同；最终接线才需要 PITIRQ 完成。",
      src: "§3 P2 · §5 阶段 C" },
    { id: "TMR_DEADLINE", lane: "x86", face: "arch/x86/timer/apic.rs", title: "APIC timer：deadline 模式",
      mods: ["arch/x86/timer", "timer/mod"],
      todo: [
        "deadline 模式消费已发布的频率；回调里 tsc_interval + tsc_value 的 deadline 加法边界尚无证明。该文件因父模块注释而未编译。",
      ],
      accept: "交付给 BSP/AP timer 调用者的 deadline 选择、频率到间隔转换、加法不溢出、回调重装与资源释放合同；保持原模式选择并建立非零频率来源。时钟推进和 MSR 效果属 TB_HW_OPS，不能从 CPUID 检测直接推得。",
      src: "§5 阶段 C" },
    { id: "TMR_PERIODIC", lane: "x86", face: "arch/x86/timer/apic.rs", title: "APIC timer：periodic 模式",
      mods: ["arch/x86/timer", "timer/mod"],
      todo: [
        "periodic 校准直接消费 PIT 中断与每核 APIC；须证明计数差、Once 发布与映射释放；等待中断与 enable_local_and_halt 的进展条件应明确。",
      ],
      accept: "交付 PIT 校准的计数差、周期分频、Once 发布与 IRQ 映射释放合同，供 BSP/AP 初始化消费；保留无 APIC 分支并核对其可达条件。halt 等待和设备计时进展列为 TB_HW_OPS 的明确前提。",
      src: "§5 阶段 C" },

    /* ============================================================ FAULT */
    { id: "F_ASM", lane: "x86", face: "arch/x86/ex_table · arch/x86/mm", title: "可失败汇编：memcpy / memset_fallible",
      mods: ["arch/x86/ex_table", "arch/x86/mm"],
      todo: [
        "x86 的 memcpy_fallible.S、memset_fallible.S 文件缺失（已核对），两处 global_asm! 注释，只留 __memcpy_fallible / __memset_fallible 的外部声明。",
        "恢复来源、ABI、链接段、表项与生命周期是必要交付。",
      ],
      accept: "没有这些汇编，故障恢复链无从接通，最终镜像里的 ExTable 链接检查也无对象。",
      src: "§5 阶段 C" },
    { id: "F_RECOVER", lane: "x86", face: "arch/x86/ex_table · arch/x86/mm", title: "缺页 → 查表 → 恢复 RIP → 返回未完成字节数",
      mods: ["arch/x86/ex_table", "arch/x86/mm"],
      todo: [
        "按“复制 / 填充 → 缺页 → 查表 → 修改恢复 RIP → 返回未完成字节数”的实际链验证，分别表达成功、部分完成与故障结果。ExTable 首匹配 / 无匹配证明已在 main（#886）；read_table 是链接可信边界（external_body）。",
        "用户缺页回调成功时重试、失败才查 ExTable；回调由 OSTD 使用者提供（TB_CLIENT_HOOKS）。内核线性映射缺页另由 KFAULT_MAP 验收，不混入用户复制的局部恢复前置。",
      ],
      accept: "__ex_table / __ex_table_end 在仓库里只有声明、没有定义，由最终内核链接产物提供（TB_EXTABLE_LINK）；须在最终镜像里检查 ABI、入口与 ExTable 链接（ACC_IMG）。",
      src: "§5 阶段 C" },
    { id: "F_BYTES", lane: "common", face: "mm/io", title: "VM I/O 内容相等与完整复制断言",
      mods: ["mm/io"],
      todo: [
        "把底层内存视图与原 Rust buffer 的字节关系连接起来，才能关闭内容相等与完整复制断言。",
        "底层目前只保证 r <= len；宏保证游标按返回量移动，但没有声明 Ok(n) 的精确复制量。内容相等、成功返回、复制量三类断言要分别补合同，不能全部归因于故障恢复缺失。",
      ],
      accept: "这是 #927 里仍被注释的断言的最终归宿。局部合同可先假定汇编 / 恢复合同，最终验收才需要 F_RECOVER 完成。",
      src: "§5 阶段 C" },

    /* ================================================================ SMP */
    { id: "SMP_AP", lane: "x86", face: "boot/smp", title: "AP 启动与初始化",
      mods: ["boot/smp", "arch/x86/irq"],
      todo: [
        "AP 初始化：boot::smp 与根 smp 在 main 都未启用，源文件是普通 Rust。还消费 boot 页表根、AP 栈分配与 activate_kernel_page_table 的输入合同。",
      ],
      accept: "bringup_all_aps 的汇编启动与初始页表 / CPU 状态属可信边界（TB_BOOT_INPUT）。编排与发布可见性的验收拆为 SMP_COMPOSE。",
      src: "§3 P3 · §5 阶段 C" },
    { id: "SMP_COMPOSE", lane: "x86", face: "boot/smp · arch/x86/mod", title: "BSP / AP 初始化编排与发布可见性",
      mods: ["boot/smp", "arch/x86/mod"],
      milestone: true,
      todo: [
        "验收每项初始化的先后条件和发布可见性；局部包逐步接回原调用方。",
        "根 BSP 路径对 APIC 初始化用 expect，timer::init_bsp 保留无 APIC 分支，集成时核对这些分支在选定平台上的可达条件，保持原行为。",
      ],
      accept: "交付 BSP/AP 调用点合同闭合与发布可见性记录，区分 bootstrap、首个 IRQ 和多核运行状态；可先核对组合义务，不等待局部证明全部完成才开工。原启动汇编属 TB_BOOT_INPUT。",
      src: "§5 阶段 C" },
    { id: "SMP_IPI", lane: "x86", face: "smp/smp · arch/x86/kernel/apic", title: "IPI 异步发送与目标回调执行",
      mods: ["smp/smp", "arch/x86/kernel"],
      todo: [
        "交付目标核身份、队列保留、同核同步/远端异步分支和回调安全合同；原 API 明说可能不执行，不增造无条件完成 ACK。TLB 协议所需的确认/公平投递条件在 TLB_SHOOT 中补。",
      ],
      accept: "验收发送与回调的资源/CPU 对应关系；不承诺现有 API 没有的必达或同步完成。硬件投递属 TB_HW_OPS，进展假设由消费者明确。",
      src: "§5 阶段 C" },

    /* ================================================================ USER */
    { id: "CPU_FEAT", lane: "x86", face: "arch/x86/mod.rs", title: "CPU 特性位检测（AVX / AVX-512F）",
      mods: ["arch/x86/mod"],
      todo: [
        "#920：以每次调用的 ghost 采样表达叶支持与特性位；改用已有规约的 native_cpuid::cpuid_count。main 的 has_avx / has_avx512 / enable_cpu_features 均在注释里。",
      ],
      accept: "交付 has_avx/has_avx512 的采样位与返回值合同，供 CPU_ENABLE 使用；按 #920 的限定函数收尾验收。OSXSAVE/XCR0 配置归 CPU_ENABLE，跨次/跨核 CPUID 一致性按 TB_HW_OPS 单列。",
      src: "§4" },
    { id: "FPU_REPR", lane: "x86", face: "arch/x86/cpu/context", title: "FPU 表示、有效长度与 clone",
      mods: ["arch/x86/cpu"],
      todo: [
        "布局、area_size、扩展区长度与 clone 下溢边界；原实现是未启用模块中的普通 Rust，#887 继续注释 FPU。",
      ],
      accept: "交付 XSAVE 可使用的 XSaveArea/FxSaveArea 布局、对齐、容量、area_size 与 clone 边界合同；核对扩展区长度和减法无下溢。与 TRAP_DATA 可并行；Pod/原始内存转换所需外部条件逐条登记。",
      src: "§5 阶段 C" },
    { id: "XSAVE", lane: "x86", face: "arch/x86/cpu", title: "CPU_FEATURES / XSAVE 初始化与保存恢复",
      mods: ["arch/x86/cpu"],
      todo: [
        "FPU save/load 的对齐、mask、容量、已启用模式与状态保存恢复合同；每核特性初始化拆至 CPU_ENABLE。",
      ],
      accept: "交付用户/任务调用者可用的 FPU save/load 前置及状态保存恢复关系，核对对齐、mask、容量和已启用模式；用实际调用场景建立条件。指令语义属 TB_HW_OPS，CPU 特性初始化由 CPU_ENABLE 提供。",
      src: "§5 阶段 C" },
    { id: "SYSCALL", lane: "x86", face: "arch/x86/trap/syscall", title: "syscall 与用户态返回",
      mods: ["arch/x86/trap", "user/user"],
      todo: [
        "syscall 入口与用户态返回；syscall、UserMode 执行路径在 main 未启用。",
      ],
      accept: "交付 syscall 入口、RawUserContext::run 与返回的寄存器/栈/权限合同，供 UserMode 和运行验收消费；核对 GDT 选择子、MSR 配置和异常返回。硬件与汇编输入逐条记录，无需把 FPU 保存恢复作为整个入口的前置。",
      src: "§5 阶段 C" },
    { id: "TASK_SW", lane: "x86", face: "arch/x86/task · task/processor", title: "processor 任务切换资源交接",
      mods: ["arch/x86/task", "task/processor"],
      todo: [
        "任务切换的资源交接与地址空间切换。main 已有 #870 的寄存器数据证明；汇编 context_switch 与 processor 执行路径未证明。",
      ],
      accept: "验证上下文独占、当前/前一任务交接、栈刷新、RCU 静止点与 IRQ 权限恢复。PRE/POST_SCHEDULE_HANDLER 是注入接口，当前源码不能证明它实际切换 VmSpace；地址空间效果作为 TB_CLIENT_HOOKS 的具体调用者合同待核对，不强制绑定整个 PT_X86。",
      src: "§3 P3 · §5 阶段 C" },

    /* ================================================================= TASK / SYNC (common) */
    { id: "TASK_STACK", lane: "common", face: "task/kernel_stack", title: "内核栈大小解析（#921，已合入）",
      mods: ["task/kernel_stack"],
      todo: [
        "#921（已合入 97963e831）：main 已证明十进制解析与 KERNEL_STACK_SIZE 的上界 / 页对齐（复用 EndianNat<Base10>、Seq::all 的 vstd_extra 数字助手）；configured_stack_size_in_pages 仍是 external_body 的可信静态初始化。",
      ],
      accept: "限定交付为合法十进制输入的精确解析，以及 KERNEL_STACK_SIZE 上界/页对齐；静态环境输入由 configured_stack_size_in_pages 的 external_body 承接（TB_STACK_CONFIG）。分配/映射/非零栈要求由 TASK_STACK_ALLOC 另证。",
      src: "§7" },
    { id: "TASK_STACK_ALLOC", lane: "common", face: "task/kernel_stack", title: "内核栈分配、映射与 TLB 一致性",
      mods: ["task/kernel_stack"],
      todo: [
        "KernelStack::new_with_guard_page：FrameAllocOptions 分配、KVirtArea::map_frames 映射、4 页 guard page；tlb_coherent: AtomicCpuSet 与 flush_tlb。main 里这一段整体在注释中。",
        "FrameAllocOptions 和 KVirtArea 的接口分别由 MM_FRAME、MM_KVA 供给；全局初始化在 MM_BOOT 验收。",
      ],
      accept: "交付 KernelStack 分配/映射、存活、初始 SP、guard page 和 flush_tlb 合同，供 TASK_SW 使用；核对非零大小、加法界限、失败资源保持和释放。大小来源属 TB_STACK_CONFIG，映射与刷新分别消费 MM_KVA/PT_X86。",
      src: "§7" },
    { id: "PREEMPT_PIN", lane: "common", face: "task/preempt · task/atomic_mode", title: "禁抢占 guard 与 PinCurrentCpu 合同",
      mods: ["task/preempt", "task/atomic_mode"],
      todo: [
        "main 与 #900 head 的 disable_preempt() 都是 external_body + unimplemented!()；DisabledPreemptGuard 仍是占位结构（_private: ()）；PinCurrentCpu 的 blanket impl 也关闭。",
        "x86 路径上的实际使用：EOI（arch/x86/mod.rs::interrupts_ack）、APIC timer（timer/apic.rs 三处）、AP 启动（boot/smp.rs）与缺页路径（arch/x86/trap/mod.rs）。",
      ],
      accept: "交付：禁抢占 guard 的创建 / 释放与 PinCurrentCpu 的“不迁移”合同。原设计用 CPU-local 计数器；#900 曾尝试用 IRQ guard 作后备，评审后已撤回，计划不再按“IRQ guard 作禁抢占后备”安排。源码注释（interrupts_ack）自称中断上下文里 disable_preempt() 并非必要。",
      src: "§5 阶段 A" },
    { id: "TASK_RUNTIME", lane: "common", face: "task/mod · task/scheduler · task/processor", title: "Task / current-task / park-unpark 局部状态合同",
      mods: ["task/mod", "task/scheduler", "task/processor"],
      todo: [
        "current-task 的有效引用、调度器注入与队列状态、唯一运行权和 park/unpark 局部合同；以给定切换 hook 合同验证接口。main 的 Task 字段与 processor 接线关闭；TaskBuilder、内置 FIFO 和实际调度组合另由 TASK_COMPOSE 验收。",
      ],
      accept: "交付 Task/CurrentTask 有效引用、唯一运行权、调度器注入、park/unpark 状态与丢失唤醒排除；供 SYNC_WAIT 和 TASK_SW 消费。局部模型以给定切换 hook 合同证明，processor 的真实资源交接在 TASK_SW 组合，避免相互等待。用户调度策略与回调进展属 TB_CLIENT_HOOKS。",
      src: "§2" },

    /* ================================================================= PCI */
    { id: "PCI_ENC", lane: "x86", face: "arch/x86/pci.rs", title: "x86 PCI 配置端口编码（#919）",
      mods: ["arch/x86/pci", "bus/pci"],
      todo: [
        "#919：has_pci_bus() 恒真、配置地址编码与字段恢复、MSI-X remapping 地址构造及低 16 位恢复；硬件读写仍被注释。",
      ],
      accept: "硬件读写和总线探测仍未启用；编码证明不能计为 PCI 配置事务或中断重映射完成。#706 已内含同名编码函数，需保留 #919 较强的字段恢复后置条件。",
      src: "§4" },
    { id: "PCI_TYPES", lane: "common", face: "bus/pci", title: "PCI 数据类型 · getter · 位操作（#895）",
      mods: ["bus/pci"],
      todo: [
        "#895：PCI 数据类型、IoBar getter、vendor len、set_bit(offset < 16)；枚举、BAR、capability / MSI-X 主体继续注释。",
      ],
      accept: "交付 location/设备 ID 字段、zero、IoBar getter、vendor 长度与位操作合同，供 PCI_ENUM/PCI_DEVICE 使用；all() 的完整枚举归 PCI_ENUM。与 #706/#919 协调同名类型和模块开关；设备读写状态仍属 TB_HW_OPS。",
      src: "§4 · §7" },
    { id: "PCI_CFG", lane: "common", face: "bus/pci · arch/x86/pci", title: "配置空间读写（地址 · 宽度 · 对齐 · 失败）",
      mods: ["bus/pci", "arch/x86/pci"],
      todo: [
        "配置空间访问的地址、宽度、对齐与失败行为；畸形 / 截断输入、未发现设备的合同。",
        "#706 只保证架构 read / write 返回 Ok，没有描述设备配置状态；通用 read8 / read16 / write8 / write16 没有已验证合同，也没有名为 PciSegment 的接口。补 CF8 / CFC 成对事务互斥、偏移合法范围、子宽度读改写与设备状态合同。",
      ],
      accept: "交付给 BAR/capability/枚举的 read8/16/32、write8/16/32 地址、宽度、对齐与配置状态合同；核对 CF8/CFC 成对互斥和子宽度读改写。保留原返回/错误行为，#706 的恒 Ok 规格不足以说明设备状态；硬件值与访问效果属 TB_HW_OPS。",
      src: "§2" },
    { id: "PCI_ENUM", lane: "common", face: "bus/pci", title: "总线枚举与设备 / 功能遍历",
      mods: ["bus/pci"],
      todo: [
        "总线枚举与设备 / 功能号遍历的边界；畸形 / 截断输入与未发现设备的合同。",
      ],
      accept: "交付 location/all() 的有界、完整、无重复遍历与 vendor 不存在分支；以给定设备构造合同证明循环。实际 PciCommonDevice::new 同时初始化 BAR/capability，完整总线 init 由 PCI_DEVICE 验收。",
      src: "§2" },
    { id: "PCI_BAR", lane: "common", face: "bus/pci · io/io_mem", title: "BAR 探测与 MMIO / PIO 映射",
      mods: ["bus/pci", "io/io_mem", "io/io_port"],
      todo: [
        "BAR 尺寸探测与 MMIO / PIO 映射的所有权与释放；分配失败、映射失败与正常释放的合同。计划里的“分配”并不对应现有 x86 执行路径。",
      ],
      accept: "验收 BAR 尺寸/类型、64 位 BAR 成对处理、原值恢复、映射边界与别名存活；#706 没有修改 cfg_space 的 BAR 实现，只供应 IO 底座，记为复用。IoBar 直接调用 PortRead/PortWrite，端口宽度/范围效果属 TB_HW_OPS，不虚构 allocator 所有权。",
      src: "§2 · §4" },
    { id: "PCI_CAP", lane: "common", face: "bus/pci/capability", title: "capability 链遍历与 MSI 标记",
      mods: ["bus/pci"],
      todo: [
        "capability 链遍历：目前没有环检测；MSI 只有 CapabilityData::Msi 标记。",
      ],
      accept: "交付 capability 指针对齐/边界、类型分派和终止条件。原代码无环检测，需真实设备链无环前提或单独授权行为修复；MSI 当前只有标记，不添加未实现的 MSI 生命周期。构造 MSI-X 的组合归 PCI_DEVICE。",
      src: "§2 · §6" },
    { id: "PCI_MSIX", lane: "common", face: "bus/pci/capability/msix", title: "MSI-X 表项配置与启停",
      mods: ["bus/pci", "io/io_mem"],
      todo: [
        "MSI-X 构造存在 BAR 类型 / 缺失与访问失败的 panic / unwrap；表项启用 / 屏蔽与启停。当前 API 没有完整关闭 / 排空生命周期。",
      ],
      accept: "交付给 PCI_DEVICE/PCI_IRQ 的表项定位、启用/屏蔽、消息地址和 IrqLine 存活合同；核对 BAR 类型/长度、PBA、访问失败与原 unwrap 条件。当前缺失的关闭/排空支持须明确处理或登记客户义务，IRT 语义属 TB_IOMMU。",
      src: "§2 · §6" },
    { id: "PCI_IRQ", lane: "common", face: "bus/pci · trap/irq", title: "PCI 中断：IRQ 注册 · EOI · 关闭",
      mods: ["bus/pci", "trap/irq"],
      todo: [
        "IRQ 注册、EOI 与关闭。MSI-X 的投递不经过 ISA → GSI → IOAPIC 路由，已移除对 ROUTE_MAP 的依赖；remapping 地址来自 IrqLine::remapping_index。",
      ],
      accept: "交付选定 PCI 设备从注册、MSI-X 投递、trap 回调/EOI 到屏蔽/注销的组合证据，核对关闭期间资源存活和迟到中断。MSI 当前只有标记，不虚构完整实现；硬件进展与 IRT 分别属 TB_HW_OPS/TB_IOMMU。",
      src: "§2 · §6" },

    /* ===================================================== STANDALONE / COMMON */
    { id: "SA_HEAP", lane: "common", face: "mm/heap", title: "heap slot / slot_list",
      mods: ["mm/heap"],
      standalone: false,
      todo: [
        "#923：空表、LIFO、剩余链接保持、独占内存转移、slot getter 与物理地址转换；Send / Sync 仍为 verifier::external。main 的 heap 模块关闭，内部是普通 Rust。",
      ],
      accept: "交付 slot/slot_list 的空表、LIFO、剩余链保持与独占内存转移合同，供 HEAP_GLOBAL 的 slab 包装使用；核对真实调用者和 Send/Sync 外部条件。与 #505 协调重叠；Box 的局部证明使用 TB_ALLOC，无需等待本项。",
      src: "§7" },
    { id: "SA_DMA", lane: "common", face: "mm/dma", title: "DMA stream 同步 · 对齐",
      mods: ["mm/dma"],
      todo: [
        "#883：加强 slice 算术前置与 is_valid_daddr，验证 DmaStreamSlice::sync / daddr，后置主要是保持不变式，没有证明设备完成同步；内层 DmaStream::sync 仍可信，构造保留地址加法 assume。#617：删除 helper 层并让 getter 返回锁内读出的 snapshot。",
      ],
      accept: "交付 DmaStreamSlice 的边界/设备地址与 CPU/设备同步条件，供真实 DMA 客户使用；现有 x86 sync 返回 Ok 不证明设备已经完成，须明确一致性与设备完成输入。完整 map/registry/coherent 路径由 DMA_MAP 提供；#883/#617 只覆盖 stream 部分并有重叠，IOMMU/TDX/硬件一致性分别登记。",
      src: "§7" },
    { id: "SA_RCU", lane: "common", face: "sync/rcu · 弱内存模型", title: "RCU 宽限期 / 静止点合同",
      mods: ["sync/rcu"],
      todo: [
        "#860：显式 context 下的读保护、retirement、宽限期与回收，含 owning-link 与负例验收；scheduler / preemption 接线仍缺，callback allocation / type erasure / dispatch 保留 external_body。#487 是更早的大范围弱内存模型分支，disable_preempt 仍标“unsound”。二者都要迁移 #922 的 pool registry。",
      ],
      accept: "交付读保护、retirement、宽限期和回收合同，供 switch_to_task::finish_grace_period 与 RCU 客户使用；迁移 #922 registry 并用真实 context/负例核对权限。scheduler/preemption 与 callback 分配/dispatch 的未连接部分必须说明，不能把 #487 的 unsound/桩作为运行证据。",
      src: "§7" },

    /* ================================================================= BZ */
    { id: "BZ_PE", lane: "bzimage", face: "libs/linux-bzimage · pe_header.rs", title: "PE/COFF 头构建",
      mods: ["libs/linux-bzimage"],
      todo: [
        "#916（已合入 c25ca6f98）：验证 PE/COFF 头的八个手写函数与 368 字节拼接；解析、bytes_of 与 opaque 外部类型仍可信，packed 字段的逐字节小端编码尚未证明。",
      ],
      accept: "限定交付为 valid_setup_elf 下头字段构造与 len==368，足够供应 BZ_OUT 的长度界限；解析、bytes_of、packed 小端表示列为 TB_ELF_RANGE。全 builder 输入满足性与启动兼容性另验收。",
      src: "§7" },
    { id: "BZ_TRUST", lane: "bzimage", face: "libs/linux-bzimage", title: "把 ELF 范围的 assume 登记为可信边界",
      mods: ["libs/linux-bzimage"],
      todo: [
        "登记 mapping.rs 中 From<SetupVA> / From<SetupFileOffset> 的两处 assume（VA 范围与 offset 上界）及全部消费者；来源注释已有，但没有独立检查器。",
        "From<usize> 接受任意值，转换内部再假定范围，调用者没有承担相应 requires。",
      ],
      accept: "对源文件、ELF 等 Verus 无法直接证明的事实，逐项记录来源、消费者依赖与可运行检查（TB_ELF_RANGE）。",
      src: "§2 · §8" },
    { id: "BZ_ELF", lane: "bzimage", face: "libs/linux-bzimage", title: "收窄边界：ELF 解析合同 · 链接断言",
      mods: ["libs/linux-bzimage"],
      todo: [
        "通过 ELF parser 合同、链接断言或可独立检查的构建前置缩小边界；ELF / program-header 来源条件。#916（已合入）增加可信解析合同，但仍用 uninterpreted 的 elf_parse_result / elf_program_headers，没有从输入字节证明段内容。",
        "#931 扩展 xmas_elf 的 program_header_type/program_load_bytes 等可信规约；解析语义仍未从原始字节证明，需校验器或明确输入来源。",
      ],
      accept: "交付 BZ_RANGE/BZ_PE 所需 ELF 字节保持、段表类型、file_size<=mem_size 与地址/偏移界限的来源证据或可运行检查器。parser/uninterpreted 规约仍属 TB_ELF_RANGE；登记边界本身不构成 BZ_TRUST 到本项的阻塞。",
      src: "§1 · §2" },
    { id: "BZ_RANGE", lane: "bzimage", face: "libs/linux-bzimage", title: "setup / protected-mode 区间、对齐与算术边界",
      mods: ["libs/linux-bzimage"],
      todo: [
        "#931 在 to_flat_binary 上证明 ret@ == flat_binary_spec：按 program header 顺序扩容/复制，file_size <= mem_size 与地址上界作为 requires。新追加区间填零；重叠段的 memory-only 尾部保留旧字节，并非整段重新清零。make_bzimage 的尾部对齐与全链输入前置尚未覆盖。",
      ],
      accept: "固定 head @d30c271708585a0ae89b5eafd1dd795bc98281a9 的 flat binary 局部合同可供 BZ_OUT 使用；输入谓词/结果 spec 当前私有，实际 make_bzimage 调用点未证明、外部 parser/get_data 仍可信。验收须补调用者可建立条件和输出区域合同，不把 #931 当完整 builder 已完成。",
      src: "§2" },
    { id: "BZ_ENCODE", lane: "bzimage", face: "libs/linux-bzimage · encoder.rs", title: "压缩 / 未压缩 payload 路径",
      mods: ["libs/linux-bzimage"],
      todo: [
        "encoder.rs::encode_kernel 的 Raw / Gzip / Zlib 结果与失败行为；PayloadEncoding 参数转换。",
      ],
      accept: "交付 encode_kernel 的 Raw/Gzip/Zlib 输出对应、参数转换和失败合同，供外部构建工具使用；解压对应关系需有库合同或产物检查。与 make_bzimage 的实际连接尚待构建 manifest 证据，不能推定调用。",
      src: "§2" },
    { id: "BZ_OUT", lane: "bzimage", face: "libs/linux-bzimage", title: "输出区间不重叠与失败行为",
      mods: ["libs/linux-bzimage"],
      todo: [
        "交付 make_bzimage 的 PE/header 与已链接 setup（含 payload）的区间、seek/write 输出与失败行为；to_flat_binary 按源顺序覆盖重叠段，只有选定链接布局有非重叠证据时才声明不交叠。不得为证明修改原覆盖语义。",
      ],
      accept: "交付 make_bzimage 的输入条件、PE/header/setup 输出区域、seek/write 顺序及失败结果，供 BZ_IMG 使用；真实调用点须建立 BZ_RANGE/BZ_PE 前置。文件系统 I/O 与 ELF 来源逐项登记，builder 单元合同不足以证明启动兼容性。",
      src: "§2" },
    { id: "BZ_IMG", lane: "bzimage", face: "libs/linux-bzimage", title: "核对生成镜像的区域范围与加载地址",
      mods: ["libs/linux-bzimage"],
      todo: [
        "最终集成验收：核对生成镜像的区域范围和实际加载地址。",
      ],
      accept: "交付实际产物 manifest、PT_LOAD/entry/加载地址匹配、压缩解码和 setup 协议检查。静态检查器可以先编写，不等待 builder 或 setup 全部证明；最终范围验收 ACC_SCOPE 汇合形式证明与产物证据。",
      src: "§2" },

    /* ================================================================= ACC */
    { id: "ACC_IMG", lane: "bzimage", face: "最终镜像", title: "最终镜像：ABI · 入口 · ExTable 链接检查",
      mods: [],
      milestone: true,
      todo: [
        "检查最终镜像的 ABI、入口与 ExTable 链接：新增入口符号、表项尺寸 / 边界、目标地址所属可执行段，以及打包前后内容保持检查。",
      ],
      accept: "交付实际内核/镜像 ABI、入口与 ExTable 符号/段的检查脚本和固定产物结果，供 ACC_RUN 使用。仓库尚无该脚本；setup 链接布局不能替代内核 ExTable（TB_EXTABLE_LINK）。bzImage 仅在最终镜像及范围验收处与 x86 汇合；无需等待 F_RECOVER 完成才检查汇编符号。",
      src: "§8" },
    { id: "ACC_RUN", lane: "x86", face: "选定平台", title: "平台启动 · 中断 · 故障恢复运行测试",
      mods: [],
      milestone: true,
      todo: [
        "先建立可复现的运行目标：仓库里没有 QEMU 启动目标或 CI 运行步骤（Makefile 默认只验证 ostd，CI action 显式选择 ostd）。",
        "在选定平台运行启动、中断与故障恢复测试；形式证明与运行证据分别记录。",
      ],
      accept: "开放 PR 的历史 CI 不能替代基于最新 head 的组合验证。运行目标可先于各项形式证明建立。",
      src: "§8" },
    { id: "IO_PIO_ALLOC", lane: "common", face: "io/io_port/allocator", title: "动态 PIO 分配、保留与显式释放",
      mods: ["io/io_port"],
      todo: [
        "#706 的 acquire/acquire_overlapping、reserve_io_port_range、动态 claim 和 consuming drop(self)；核对自动 Drop 改写后的真实调用者。",
      ],
      accept: "供动态 IoPort 消费者使用：冲突/越界失败不丢权限，释放只能消费本 allocator 发出的 claim。硬件可访问范围与 allocator 的 u16 排他端点分别证明；硬件效果属 TB_HW_OPS。",
      src: "r3 源码复核" },
    { id: "IO_MMIO", lane: "common", face: "io/io_mem", title: "IoMem 映射、切片与设备访问合同",
      mods: ["io/io_mem"],
      todo: [
        "#706 的 IoMem::new/acquire/slice、VmIo/VmIoOnce 与映射存活；当前 new/acquire/设备访问仍 external，obeys_vmio_* 为 false，不能向设备调用者提供完整访问保证。",
      ],
      accept: "供 PCI BAR、MSI-X 消费地址/长度、访问边界和映射生命周期。new 的形式 requires 目前没有 registered-window 条件；其 unsafe 设备区域合法性须另交证据。Drop 当前不回收 MMIO，不能宣称释放回 allocator；设备寄存器效果属 TB_HW_OPS。HPET 直接使用 VolatileRef，另按其真实路径验收。",
      src: "r3 源码复核" },
    { id: "IO_GLOBAL", lane: "common", face: "io/mod", title: "PIO/MMIO 全局初始化与权限交接",
      mods: ["io/mod"],
      todo: [
        "把局部 builder/PIO allocator 与 io::init 的 Once 状态、注册窗口和动态分配权限相连，验证全局入口能获得所需资源。",
      ],
      accept: "交付 io_mem_allocator_initialized/io_port_allocator_initialized 的真实来源以及初始化一次、系统设备保留与失败合同；设备调用者仅在使用全局 acquire 时消费它。不能把 IO_GLOBAL 当静态 PIO 或 unsafe IoMem::new 的统一前置。",
      src: "r3 源码复核" },
    { id: "MM_FRAME", lane: "common", face: "mm/frame", title: "Frame / Segment 分配、元数据与释放",
      mods: ["mm/frame"],
      todo: [
        "补 FrameAllocOptions、Frame/Segment 元数据初始化、引用计数/类型转换、所有权移交和释放合同；#720 的类型接口仅按实际调用复用。",
      ],
      accept: "供栈、动态 CPU-local、页表和 DMA 使用：分配失败不伪造内存，成功给出对齐、存活、互不重叠和元数据权限。用户 GlobalFrameAllocator 实现属 TB_ALLOC；OSTD 包装与元数据义务仍在本项。",
      src: "r3 源码复核" },
    { id: "MM_PT", lane: "common", face: "mm/page_table · mm/vm_space", title: "通用页表与 VmSpace 映射接口补齐",
      mods: ["mm/page_table", "mm/vm_space"],
      todo: [
        "覆盖 cursor map/unmap/protect/query、item 原始转换和 frame 所有权往返，消解或逐项登记现存 external/admit/assume；#855 的常量证明不覆盖这些接口。",
      ],
      accept: "交付 MM_KVA、内核缺页和用户地址空间可用的映射变化、失败保持、释放义务；VmSpace::unmap 溢出 assume 不能以配置 PR 已合入关闭。局部逻辑映射可先行，最终回收由 TLB_FREE 接线，底层原子/PTE 操作属逐条核对的 TB_MM_RAW。",
      src: "r3 源码复核" },
    { id: "MM_KVA", lane: "common", face: "mm/kspace/kvirt_area", title: "KVirtArea 映射、存活与解除映射",
      mods: ["mm/kspace"],
      todo: [
        "交付 map_frames/map_untracked_frames、区间分配、range 与 Drop 的局部映射合同；显式区分指针算术、映射已生效和远端 TLB 安全释放。",
      ],
      accept: "供 KernelStack 与 IoMem 使用：保留区间、guard-page 空洞、映射权限、引用存活和失败资源保持可由调用者建立。局部接口使用给定 kernel table/allocator；全局初始化归 MM_BOOT，跨 CPU 释放归 TLB_FREE。",
      src: "r3 源码复核" },
    { id: "MM_BOOT", lane: "common", face: "mm/kspace · mm/frame · mm/page_table/boot_pt", title: "通用 MM 引导初始化与内核页表发布",
      mods: ["mm/kspace", "mm/frame", "mm/page_table"],
      todo: [
        "恢复 boot_pt、frame allocator init、init_kernel_page_table/activate_kernel_page_table，建立线性映射有效区间和 KERNEL_PAGE_TABLE 的发布合同。",
      ],
      accept: "交付 AP 启动、内核缺页、MMIO 指针消费者的可用页表/线性映射与全局分配状态。初始 boot 页表及固件区域是 TB_BOOT_INPUT；不能用 paddr_to_vaddr 的加法合同代替可解引用的映射证明。",
      src: "r3 源码复核" },
    { id: "KFAULT_MAP", lane: "x86", face: "arch/x86/trap", title: "内核线性映射缺页处理",
      mods: ["arch/x86/trap"],
      todo: [
        "单列 handle_kernel_page_fault：合法缺页范围/error code、对齐、Untracked(paddr,1,prop) 映射与返回；这条分支不同于用户可失败复制的 ExTable 恢复。",
      ],
      accept: "交付完整陷阱组合可使用的内核缺页合同，错误码/越界仍保留原 panic 条件。MMIO 设备区真实性属 TB_BOOT_INPUT/TB_HW_OPS；不能把用户 fault recovery 的完成替代本项。",
      src: "r3 源码复核" },
    { id: "LOC_EARLY_GLOBAL", lane: "common", face: "mm/frame/allocator", title: "全局 early_alloc 内存权限与交接",
      mods: ["mm/frame"],
      todo: [
        "把 #802 的实例数值证明接到全局 early_alloc/init_early_allocator，给出每次分配的可写区域与跨次不重叠、既有分配保留合同。",
      ],
      accept: "供 copy_bsp_for_ap 与 MM 引导消费；实例 alloc 成功数值不足以生成线性内存权限。固件 memory_regions 来源属 TB_BOOT_INPUT，global new 的 external 需记录/缩小。",
      src: "r3 源码复核" },
    { id: "LOC_REMOTE", lane: "common", face: "cpu/local", title: "CPU-local 目标核访问与存储索引",
      mods: ["cpu/local"],
      todo: [
        "交付 CpuLocal::get_on_cpu、StaticStorage::get_ptr_on_target 的索引、存活与 T: Sync 共享合同；无需 get_with 的 IRQ guard。",
      ],
      accept: "供 LAPIC 槽和 IPI CALL_QUEUES 使用；目标 CpuId 有效，存储已发布且借用不越生命周期。GS/链接布局属 TB_BOOT_INPUT，当前核稳定由各调用方的 guard 另证。",
      src: "r3 源码复核" },
    { id: "LOC_CELL", lane: "common", face: "cpu/local/cell · single_instr", title: "CpuLocalCell 单指令操作与原始指针",
      mods: ["cpu/local"],
      todo: [
        "覆盖 load/store、加减/位操作的单指令 CPU 归属、环绕算术与 as_mut_ptr 的借用条件；不能由 CpuLocal::get_with 证明替代。",
      ],
      accept: "供抢占计数、陷阱嵌套计数、CURRENT/PREVIOUS_TASK_PTR 使用；多次操作需同核时由调用者提供 pin/IRQ 条件。单指令汇编是 TB_HW_OPS，GS 和链接布局属 TB_BOOT_INPUT。",
      src: "r3 源码复核" },
    { id: "LOC_DYNAMIC", lane: "common", face: "cpu/local/dyn_cpu_local", title: "动态 CPU-local 存储（DynCpuLocalChunk）",
      mods: ["cpu/local"],
      todo: [
        "覆盖 new/alloc/try_dealloc 的 frame 分配、bitmap、逐 CPU 初始化、析构与错误 chunk 行为。",
      ],
      accept: "交付 DynamicStorage 的 AnyStorage 合同及显式回收；供动态 CpuLocal 调用者，不能因静态 CPU-local 验收而关闭本项。分配器实现/位图库合同属 TB_ALLOC/外部库边界。",
      src: "r3 源码复核" },
    { id: "SYNC_GUARD", lane: "common", face: "sync/guard · spin · rwlock", title: "锁 guardian 与 IRQ/抢占资源连接",
      mods: ["sync/guard", "sync/spin", "sync/rwlock"],
      todo: [
        "连接 SpinGuardian、GuardTransfer、PreemptDisabled、LocalIrqDisabled、WriteIrqDisabled 与实际 guard 生命周期；已有锁内存不变式证明不能代替硬件禁中断/不迁移状态。",
      ],
      accept: "交付锁持有期间的原子模式、guard transfer 无间隙与 Drop 恢复合同。供 IrqLine 回调表、IPI 队列和运行时锁使用；WriteIrqDisabled 读侧消费禁抢占、写侧消费禁 IRQ。外部原子操作按既有模型登记。",
      src: "r3 源码复核" },
    { id: "SYNC_WAIT", lane: "common", face: "sync/wait", title: "WaitQueue / Waiter / Waker 执行连接",
      mods: ["sync/wait"],
      todo: [
        "恢复 do_wait/wake_up 的 park/unpark 调用，处理循环 admit、计数上界 assume 与唤醒竞争。",
      ],
      accept: "供 Mutex/RwMutex 使用的条件复查、入队/唤醒、取消与无丢失唤醒合同；调度公平性须显式列条件，不能由 WaitQueue 名称保证终止。",
      src: "r3 源码复核" },
    { id: "SYNC_API", lane: "common", face: "sync/mutex · rwmutex · rwarc", title: "Mutex / RwMutex / RwArc 公共接口验收",
      mods: ["sync/mutex", "sync/rwmutex", "sync/rwarc"],
      todo: [
        "核对阻塞锁、升级/降级、借用及解锁 API 与 WaitQueue 的执行合同，登记 RwArc 外部体；不把 LOC 已验证比例当 API 组合完成。",
      ],
      accept: "供 task 与 OSTD 客户使用：竞争/等待/唤醒时资源保持和权限转移成立；已有局部锁证明直接复用。调度公平性和底层原子模型属于显式前提，硬件执行资源由 SYNC_GUARD 接入。",
      src: "r3 源码复核" },
    { id: "TASK_CTX", lane: "x86", face: "arch/x86/task/switch.S", title: "TaskContext 切换汇编 ABI",
      mods: ["arch/x86/task"],
      todo: [
        "在有效的 cur/nxt 上下文、独占资源和栈输入条件下建立保存恢复寄存器、RSP/RIP/FSBASE 与返回约定；复用 #870 的数据方法证明。",
      ],
      accept: "交付 processor::switch_to_task 可调用的 context_switch 边界合同和汇编/布局检查。局部证明不等待 scheduler/RCU/syscall；汇编指令效果属 TB_HW_OPS。",
      src: "r3 源码复核" },
    { id: "CPU_ENABLE", lane: "x86", face: "arch/x86/mod · cpu/context", title: "每核 CPU 控制寄存器与特性初始化",
      mods: ["arch/x86/mod", "arch/x86/cpu"],
      todo: [
        "从 XSAVE 拆出 enable_cpu_features/enable_essential_features 的 CR0/CR4/EFER/XCR0、XSAVE 区大小与 Once 发布合同。",
      ],
      accept: "供 BSP/AP 初始化和 FPU save/load 使用：特性采样到启用寄存器的条件闭合；同核/跨核 CPUID 一致性不能从两个布尔检测推得，硬件效果属 TB_HW_OPS。",
      src: "r3 源码复核" },
    { id: "VM_REPR", lane: "common", face: "libs/ostd-pod · mm/io", title: "Pod / buffer 与字节视图桥接",
      mods: ["libs/ostd-pod", "mm/io"],
      todo: [
        "建立 Pod 位表示、Rust slice 与 VmIoOwner/MemView 的字节对应及布局合同；测试用例本身不能作为 read_val 证明的前置。",
      ],
      accept: "供 VM_CONTENT、VM_POD 和 F_BYTES 证明值/字节相等；derive 宏产物、原始转换和未建模 Rust 内存连接逐项登记，不能仅恢复测试属性结项。",
      src: "r3 源码复核" },
    { id: "TSC_VALUE", lane: "x86", face: "arch/x86/kernel/tsc", title: "tsc_freq 采样结果与发布合同",
      mods: ["arch/x86/kernel"],
      todo: [
        "从 CAL_FREQ 拆出采样频率的 Hz 单位、非零/范围以及 TSC_FREQ Once 发布/读取合同；给定合格采样即可证明消费者。",
      ],
      accept: "供 deadline timer 使用。已合入 #905 可能返回 Some(0)，需保留原输入边界并证明选定平台的非零来源；物理时钟精度和 CPUID 输入属 TB_HW_OPS。完整回退仍在 CAL_FREQ 验收。",
      src: "r3 源码复核" },
    { id: "PCI_DEVICE", lane: "common", face: "bus/pci/common_device · bus/pci/mod", title: "PCI 设备构造、能力初始化与总线登记",
      mods: ["bus/pci"],
      todo: [
        "把 PciCommonDevice::new 的 command 设置、BAR 管理器、capability/MSI-X 构造与总线登记组合；枚举循环本身可以先证明。",
      ],
      accept: "交付真实发现设备的初始化/失败/panic 合同，核对未发现 vendor=0xffff、缺失 BAR、capability 环和 MSI-X 初始化。硬件配置值与 IRT 语义属 TB_HW_OPS/TB_IOMMU；不擅自添加原 API 没有的错误恢复。",
      src: "r3 源码复核" },
    { id: "HPET", lane: "x86", face: "arch/x86/timer/hpet.rs", title: "HPET 计时接口",
      mods: ["arch/x86/timer"],
      todo: [
        "交付寄存器 getter 与 Hpet::new/init 的 ACPI 基址、VolatileRef 范围/生命周期、计数器容量解析和 IRQ 映射合同；当前没有实现完整计时服务。",
      ],
      accept: "寄存器级证明可在给定映射地址下独立进行；完整 new 需要 IrqLine/ISA 映射，源码把 HPET 接 ISA 0 且有 FIXME，平台正确接线待确认。通过 paddr_to_vaddr 构造 VolatileRef，不消费 IoMem；线性映射有效性由 MM_BOOT 的组合证据核对，硬件效果属 TB_HW_OPS。",
      src: "r3 源码复核" },
    { id: "SERIAL_QEMU_CMOS", lane: "x86", face: "arch/x86/{serial,qemu,device/cmos}", title: "串口 · QEMU 出口 · CMOS",
      mods: ["arch/x86/serial", "arch/x86/qemu", "arch/x86/device"],
      todo: [
        "覆盖串口初始化/轮询、exit_qemu 与 CMOS 读取；逐接口说明端口与 ACPI/FADT 世纪字段条件。",
      ],
      accept: "交付 x86 基础设备的访问/转换合同；轮询终止需显式硬件进展假设，exit_qemu 非返回结果由目标平台记录，CMOS 输入真实性属 TB_HW_OPS。不等待 PIT/APIC 完成。",
      src: "r3 源码复核" },
    { id: "HEAP_GLOBAL", lane: "common", face: "mm/heap", title: "堆 slab / 全局分配器包装",
      mods: ["mm/heap"],
      todo: [
        "恢复 AllocDispatch、GlobalHeapAllocator 与 slab 分配/释放，复用 SA_HEAP 的 slot 链；#505 中关闭的路径不能算完成。",
      ],
      accept: "交付 OSTD 堆包装的布局、分配失败和回收资源合同；Box/Vec 的局部消费者仍可使用 alloc 外部规约，无需等待本项。用户提供 allocator 的实现属于 TB_ALLOC。",
      src: "r3 源码复核" },
    { id: "BZ_SETUP", lane: "bzimage", face: "libs/linux-bzimage/setup", title: "x86 setup / loader / BootParams",
      mods: ["libs/linux-bzimage"],
      todo: [
        "纳入 linux-bzimage/setup 与 boot-params 的 x86 legacy/EFI 入口、loader、Raw/Gzip/Zlib decoder、内存分配和 BootParams 传递；架构 boot 目录排除不等于 setup 排除。",
      ],
      accept: "交付所选启动模式的段加载/清零/入口与 BootParams 合同；EFI 服务、firmware 内存与压缩库是逐项记录的外部边界。入口固定地址与 kernel ELF 的吻合在 BZ_IMG 检查；运行所需模式配置仍待提供。",
      src: "r3 源码复核" },
    { id: "BOOT_COMMON", lane: "common", face: "boot/mod · lib", title: "通用 BootInfo 与 OSTD 入口编排",
      mods: ["boot/mod", "lib/lib"],
      todo: [
        "验证 BootInfo 发布/访问、init_after_heap 对 command-line/memory-region 的保存和 call_ostd_main 的入口条件；纳入普通 lib 初始化关闭路径的清单。",
      ],
      accept: "交付 EARLY_INFO 到 BOOT_INFO 的值/生命周期合同与 OSTD 客户入口前提；架构 boot 输入属 TB_BOOT_INPUT，用户 ostd_main 属 TB_CLIENT_HOOKS。全平台初始化组合由 SMP_COMPOSE/ACC_SCOPE 记录。",
      src: "r3 源码复核" },
    { id: "DMA_MAP", lane: "common", face: "mm/dma/mod · dma_coherent · dma_stream", title: "DMA 映射、coherent 与全局登记",
      mods: ["mm/dma"],
      todo: [
        "补全 mod.rs::init/dma_type/check_and_insert_dma_mapping、DmaCoherent/DmaStream::map、reader/writer 与释放的执行资源合同。main 的 mapping_set.insert、cache policy、IOMMU map 等仍有注释路径，dma_type 为 external + unimplemented，不能按现有 wf 后置条件视为映射完成。",
      ],
      accept: "交付实际 DMA 客户与 SA_DMA 可用的重复映射拒绝、设备地址/CPU 访问对应、Segment 存活、失败保持与最终注销合同；逐条处理被注释的执行动作。IOMMU/TDX 实现属 TB_IOMMU/TB_TDX，缓存一致性和设备完成属 TB_HW_OPS；软件 wrapper/registry 不由这些边界自动豁免。",
      src: "§7 · r3 源码复核" },
    { id: "TASK_COMPOSE", lane: "common", face: "task/mod · scheduler · fifo_scheduler", title: "任务创建、默认调度与远端通知组合",
      mods: ["task/mod", "task/scheduler", "task/processor"],
      todo: [
        "验证 TaskBuilder::build/spawn、kernel_task_entry 与退出、内置 FIFO 队列、reschedule 和 set_need_preempt 的真实组合；局部 current-task/park 状态合同仍由 TASK_RUNTIME 独立供给。",
      ],
      accept: "交付实际创建、首次执行、调度/等待/唤醒和退出的资源证据，覆盖分配失败、无 scheduler 时的 FIFO fallback、CPU 选择与远端通知。客户调度策略/回调进展属 TB_CLIENT_HOOKS；内置 FIFO 和软件通知包装在本项范围内，不能由注入接口的可信边界豁免。",
      src: "§7 · r3 源码复核" },
    { id: "COMMON_AUDIT", lane: "common", face: "cpu/set · user · timer · util · 辅助库", title: "公共 API 与残留占位清单验收",
      mods: ["cpu/set", "user/user", "timer/mod", "util/ops", "console/console", "logger/logger", "panic/panic"],
      todo: [
        "逐模块盘点未被工作项覆盖的 cpu/set、user::UserMode、timer/jiffies、console/logger/panic、util、ostd-pod/ostd-test、辅助库入口；每个未启用函数/占位/可信体必须有归属，不以 LOC 颜色推断完整性。",
      ],
      accept: "交付固定 main 上的 API/模块开关清单，引用本计划工作项或逐条可信边界；对剩余缺口形成可执行子任务并关闭，不能仅做清单就宣布 x86 完成。console/logger 的格式化与内核回调可保留明确外部条件，其他公共执行代码不隐含排除。",
      src: "r3 源码复核" },
    { id: "ACC_SCOPE", lane: "x86", face: "三条路线组合", title: "x86 当前范围最终验收",
      mods: [],
      milestone: true,
      rollup: true,
      todo: [
        "在一个固定集成提交上启用计划内执行路径，分别验证 OSTD 与 bzImage，逐 API 对照清单；记录构建产物、运行结果、剩余可信输入与尚未证明的性质。",
      ],
      accept: "完成条件：所有当前工作项交付均有固定提交/消费者证据；x86 make 验证与 builder 验证通过，ABI/ExTable 和选定 BSP/AP、用户态、TLB/PCI 运行场景有记录；占位/注释执行路径不得计为证明。硬件/架构 boot/IOMMU/TDX/用户回调等剩余边界逐项获明确记录。",
      src: "r3 源码复核" },
  ],

  /* Deferred work only. r3 moved the seven previously parked x86 items into nodes. */
  later: [],

  /* Inputs the plan consumes from code it does not verify (dashboard class “unplanned”
   * and external facts). Each consumer must state the input as a requires. */
  trusted: [
    {
      "id": "TB_BOOT_INPUT",
      "provider": "arch/x86/boot（未纳入计划）",
      "input": "固件内存区域（EARLY_INFO.memory_regions）、ACPI RSDP 来源、初始 CS == KERNEL_CS、GS.base 初值与 CPU 数量、AP 汇编启动输入与初始页表 / CPU 状态。",
      "consumers": [
        "IO_WIN",
        "ACPI_TABLES",
        "GDT",
        "LOC_ID",
        "SMP_AP",
        "LOC_EARLY_GLOBAL",
        "MM_BOOT",
        "BOOT_COMMON"
      ],
      "record": "每个消费者的 requires 写明该输入；不能证明固件布局的真实性。"
    },
    {
      "id": "TB_IOMMU",
      "provider": "arch/x86/iommu（未纳入计划）",
      "input": "IrqRemapping::init 分配的 IRT 项与 remapping index，以及 DMA 设备地址映射/解除的硬件条件。",
      "consumers": [
        "PCI_ENC",
        "PCI_MSIX",
        "IRQLINE",
        "IOAPIC_ENTRY",
        "SA_DMA",
        "DMA_MAP"
      ],
      "record": "#919 的 remapping 地址编码不等于 IOMMU / remapping 已验证。"
    },
    {
      "id": "TB_TDX",
      "provider": "arch/x86/tdx_guest.rs（未纳入计划）",
      "input": "TDX 路径的初始化、中断语义与 DMA unprotect/reprotect 的输入条件。",
      "consumers": [
        "PITIRQ",
        "DMA_MAP"
      ],
      "record": "首个中断闭环限定为非 TDX 的 BSP 路径。"
    },
    {
      "id": "TB_HW_OPS",
      "provider": "CPUID / MSR / volatile / 汇编的外部规约",
      "input": "has_xapic_spec 等 uninterp 的 spec、#905 的两条乘积上界 assume、CR3 与 invlpg 的 external_body。",
      "consumers": [
        "APIC_PROBE",
        "LAPIC_DEV",
        "CPU_FEAT",
        "CAL_FREQ",
        "PT_X86",
        "IO_PIO",
        "IO_MMIO",
        "LOC_CELL",
        "TASK_CTX",
        "HPET",
        "SERIAL_QEMU_CMOS",
        "SA_DMA",
        "DMA_MAP"
      ],
      "record": "按具体操作记录；每个消费者只补自己需要的合同，不先建立没有执行调用方的完整硬件模型。"
    },
    {
      "id": "TB_ELF_RANGE",
      "provider": "ELF 与链接产物",
      "input": "mapping.rs 里 From<SetupVA> / From<SetupFileOffset> 的 VA 范围与 offset 上界 assume。 #916/#931 的 parser、get_data、opaque ELF 类型和 bytes_of 的字节布局假设。",
      "consumers": [
        "BZ_TRUST",
        "BZ_ELF",
        "BZ_RANGE",
        "BZ_PE"
      ],
      "record": "通过 ELF parser 合同、链接断言或可独立检查的构建前置逐步缩小。"
    },
    {
      "id": "TB_EXTABLE_LINK",
      "provider": "最终内核链接产物",
      "input": "__ex_table / __ex_table_end 符号与表项：仓库里只有声明，没有定义。",
      "consumers": [
        "F_RECOVER",
        "ACC_IMG"
      ],
      "record": "用镜像链接检查记录，不能由缺页恢复证明替代。"
    },
    {
      "id": "TB_ALLOC",
      "provider": "用户提供的全局 heap/frame allocator 与 alloc 外部规约",
      "input": "__GLOBAL_HEAP_ALLOCATOR_REF 宏生成的接口与 alloc 的外部规约。 GlobalFrameAllocator 的可用区域、对齐和唯一性承诺；OSTD 元数据/包装不在此边界中。",
      "consumers": [
        "IDT_TABLE",
        "SA_HEAP",
        "MM_FRAME",
        "HEAP_GLOBAL",
        "LOC_DYNAMIC"
      ],
      "record": "x86 链上的 Box::new / Box::leak 只消费这份外部规约。"
    },
    {
      "id": "TB_STACK_CONFIG",
      "provider": "编译期 OSTD_TASK_STACK_SIZE_IN_PAGES 与 configured_stack_size_in_pages",
      "input": "合法十进制输入由调用者/构建环境提供；该静态初始化仍 external_body。KERNEL_STACK_SIZE 已证上界/页对齐不保证非零。",
      "consumers": [
        "TASK_STACK",
        "TASK_STACK_ALLOC"
      ],
      "record": "ostd/src/task/kernel_stack.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc；栈分配验收补非零与 guard-page 加法条件。"
    },
    {
      "id": "TB_CLIENT_HOOKS",
      "provider": "OSTD 使用者的调度器、PRE/POST_SCHEDULE_HANDLER、用户缺页处理和 ostd_main",
      "input": "注入回调的状态变化、进展及地址空间选择；当前源码没有具体客户可证明 handler 必定执行 CR3 切换。",
      "consumers": [
        "TASK_RUNTIME",
        "TASK_COMPOSE",
        "TASK_SW",
        "F_RECOVER",
        "BOOT_COMMON"
      ],
      "record": "ostd/src/task/{mod,processor}.rs; arch/x86/trap/mod.rs::handle_user_page_fault @8e681282d19b29bdc1b6e715930fe9224a0c88dc。按具体客户合同验收，不能凭调用关系臆定效果。"
    },
    {
      "id": "TB_MM_RAW",
      "provider": "现有原始内存/原子/PTE 外部规格",
      "input": "item_into_raw/item_from_raw、frame 类型与引用计数、页表底层读写等现存可信操作；软件 wrapper 未证明部分仍是 MM_FRAME/MM_PT 工作。",
      "consumers": [
        "MM_FRAME",
        "MM_PT",
        "MM_KVA"
      ],
      "record": "ostd/src/mm/{frame,page_table,kspace,vm_space} @8e681282d19b29bdc1b6e715930fe9224a0c88dc；逐条登记/缩小，不把整个 MM 标为可信。"
    },
    {
      "id": "TB_SETUP_ENV",
      "provider": "EFI/legacy 固件服务、解压库与链接布局",
      "input": "setup 所需服务返回内存、BootParams 输入、解压正确性和起始 CPU 状态。",
      "consumers": [
        "BZ_SETUP",
        "BZ_IMG"
      ],
      "record": "ostd/libs/linux-bzimage/setup/src @8e681282d19b29bdc1b6e715930fe9224a0c88dc；选择启动模式和产物后补可运行检查。"
    }
  ],

  /* Open PRs inspected and deliberately NOT linked to any work item. */
  reviewedCandidates: [{"n":930,"head":"5b25275eda60df30500cc5d2aea70c0e1d0f97bb","reviewedAt":"2026-11-16","note":"已合入 main 8e681282d19b29bdc1b6e715930fe9224a0c88dc；verified_bitflags 宏及 x86 页表/PE 头调用改为关联常量，移除旧 lint 与标注；pe_header 的长度/字段合同保留。该实现更新不增加依赖；涉及 flags 的开放分支需对齐本基线。"}],

  /* Work the roadmap deliberately does NOT show: RISC-V / LoongArch and multi-architecture
   * migration items (decision 2026-11-16: the page covers the x86, bzImage and common
   * lanes only). Kept verbatim so the plan content is not lost; the page never reads
   * this array, and no displayed node depends on one of these. */
  outOfScope: [
    { id: "PCI_ARCH", lane: "common", face: "arch/riscv/pci.rs · arch/loongarch/pci.rs", title: "RISC-V / LoongArch 的 PCI 适配",
      mods: ["arch/riscv/pci", "arch/loongarch/pci"], needs: ["PCI_CFG"], needsInf: [], prs: [706], reuse: [],
      todo: ["消费同一公共 PCI 合同，并独立证明各架构的访问语义。"],
      accept: "#706 带有这两个架构的 PCI 接线，仍待审阅。", src: "§2" },
    { id: "RV_SLICE", lane: "common", face: "arch/riscv/{cpu,irq,trap,timer}", title: "RISC-V 平台垂直切片",
      mods: ["arch/riscv/cpu", "arch/riscv/irq", "arch/riscv/trap", "arch/riscv/timer"], needs: [], needsInf: ["LOC_ACC", "IRQ_DROP", "PT_CFG"], prs: [], reuse: [],
      todo: ["先选平台垂直切片，再扩展 API 覆盖。", "消费公共基础与内存的共享合同。"],
      accept: "不假设硬件语义相同；跨架构合同修改应至少增加一个不同架构的验证目标；文档没有为该架构列出独立 PR。", src: "§1" },
    { id: "LA_SLICE", lane: "common", face: "arch/loongarch/{cpu,irq,trap,timer}", title: "LoongArch 平台垂直切片",
      mods: ["arch/loongarch/cpu", "arch/loongarch/irq", "arch/loongarch/trap", "arch/loongarch/timer"], needs: [], needsInf: ["LOC_ACC", "IRQ_DROP", "PT_CFG"], prs: [], reuse: [],
      todo: ["先选平台垂直切片，再扩展 API 覆盖。", "消费公共基础与内存的共享合同。"],
      accept: "不假设硬件语义相同；文档没有为该架构列出独立 PR。", src: "§1" },
    { id: "ACC_MATRIX", lane: "common", face: "跨架构目标矩阵", title: "x86 · RISC-V · LoongArch 目标矩阵检查",
      mods: [], milestone: true, needs: [], needsInf: ["RV_SLICE", "LA_SLICE"], prs: [], reuse: [],
      todo: ["共享接口按实际影响补 x86、RISC-V、LoongArch 和支持工具链的检查（make verify-x86 / verify-riscv / verify-loongarch）。"],
      accept: "共享合同修改至少增加一个不同架构的验证目标，避免把 x86 假设推广到所有实现。", src: "§1 · §8" },
  ],
  /* Offline fallback: dashboard snapshot at the document baseline (machine-filled). */
  baseline: {
    date: "2026-11-13T17:44:51+08:00",
    sha: "90087275ebd4b974596947d11d3da27d722e05d3",
    totals: {"total": 18503, "verified_exec": 5698, "trusted": 615, "unverified": 9894, "unplanned": 2296, "verified_apis": 293},
    apis: {"boot": 2, "cpu": 20, "src": 1, "mm": 166, "sync": 87, "task": 9, "timer": 6, "trap": 2},
    cols: ["group", "child", "total", "verified_exec", "trusted", "unverified", "unplanned", "spec", "proof"],
    rows: [
      ["arch","loongarch/boot",157,0,0,0,157,0,0],
      ["arch","loongarch/cpu",228,0,0,228,0,0,0],
      ["arch","loongarch/device",8,0,0,8,0,0,0],
      ["arch","loongarch/io",26,0,0,26,0,0,0],
      ["arch","loongarch/iommu",19,0,0,0,19,0,0],
      ["arch","loongarch/irq",32,0,0,32,0,0,0],
      ["arch","loongarch/kernel",84,0,0,84,0,0,0],
      ["arch","loongarch/mm",183,158,11,14,0,339,254],
      ["arch","loongarch/mod",26,0,0,26,0,0,0],
      ["arch","loongarch/pci",107,0,0,107,0,0,0],
      ["arch","loongarch/qemu",28,0,0,28,0,0,0],
      ["arch","loongarch/serial",72,0,0,72,0,0,0],
      ["arch","loongarch/task",62,48,0,14,0,29,0],
      ["arch","loongarch/timer",1,1,0,0,0,0,0],
      ["arch","loongarch/trap",121,0,0,121,0,0,0],
      ["arch","riscv/boot",87,0,0,0,87,0,0],
      ["arch","riscv/cpu",351,0,0,351,0,0,0],
      ["arch","riscv/device",8,0,0,8,0,0,0],
      ["arch","riscv/iommu",19,0,0,0,19,0,0],
      ["arch","riscv/irq",33,0,0,33,0,0,0],
      ["arch","riscv/mm",127,114,5,8,0,167,214],
      ["arch","riscv/mod",29,0,0,29,0,0,0],
      ["arch","riscv/pci",51,0,0,51,0,0,0],
      ["arch","riscv/qemu",13,0,0,13,0,0,0],
      ["arch","riscv/serial",4,0,0,4,0,0,0],
      ["arch","riscv/task",66,64,0,2,0,29,0],
      ["arch","riscv/timer",62,2,0,60,0,0,0],
      ["arch","riscv/trap",58,0,0,58,0,0,0],
      ["arch","x86/boot",582,0,0,0,582,0,0],
      ["arch","x86/cpu",519,0,0,519,0,0,0],
      ["arch","x86/device",48,0,0,48,0,0,0],
      ["arch","x86/ex_table",18,13,5,0,0,14,13],
      ["arch","x86/io",32,0,0,32,0,0,0],
      ["arch","x86/iommu",1072,0,0,0,1072,0,0],
      ["arch","x86/irq",56,0,0,56,0,0,0],
      ["arch","x86/kernel",934,532,0,402,0,311,223],
      ["arch","x86/mm",156,135,21,0,0,475,379],
      ["arch","x86/mod",108,0,0,108,0,0,0],
      ["arch","x86/pci",26,0,0,26,0,0,0],
      ["arch","x86/qemu",15,0,0,15,0,0,0],
      ["arch","x86/serial",22,0,0,22,0,0,0],
      ["arch","x86/task",54,44,0,10,0,29,0],
      ["arch","x86/tdx_guest",164,0,0,0,164,0,0],
      ["arch","x86/timer",262,1,0,261,0,0,0],
      ["arch","x86/trap",246,0,0,246,0,0,0],
      ["boot","memory_region",219,191,0,28,0,210,292],
      ["boot","mod",51,8,0,43,0,0,0],
      ["boot","smp",89,0,0,89,0,0,0],
      ["bus","mod",8,0,0,8,0,0,0],
      ["bus","pci",735,0,0,735,0,0,0],
      ["console","console",18,0,0,18,0,0,0],
      ["coverage","coverage",7,0,0,7,0,0,0],
      ["cpu","local",367,0,0,367,0,0,0],
      ["cpu","mod",51,25,0,26,0,51,20],
      ["cpu","set",196,155,0,41,0,213,256],
      ["error","error",13,10,0,3,0,0,0],
      ["io","io_mem",220,0,0,220,0,0,0],
      ["io","io_port",89,0,0,89,0,0,0],
      ["io","mod",7,0,0,7,0,0,0],
      ["lib","lib",54,0,0,54,0,0,0],
      ["libs","align_ext",24,24,0,0,0,4,8],
      ["libs","id-alloc",111,101,0,10,0,97,66],
      ["libs","linux-bzimage",1264,49,0,1215,0,22,6],
      ["libs","ostd-macros",196,0,0,0,196,0,0],
      ["libs","ostd-pod",186,6,19,161,0,7,20],
      ["libs","ostd-test",97,22,0,75,0,15,0],
      ["logger","logger",42,0,0,42,0,0,0],
      ["mm","dma",654,343,20,291,0,725,302],
      ["mm","frame",1425,778,58,589,0,1358,1315],
      ["mm","heap",211,0,0,211,0,0,0],
      ["mm","io",318,310,8,0,0,607,260],
      ["mm","kspace",280,118,57,105,0,394,359],
      ["mm","mod",16,13,3,0,0,19,66],
      ["mm","page_prop",28,28,0,0,0,17,34],
      ["mm","page_table",1811,843,271,697,0,2283,3126],
      ["mm","test",586,104,0,482,0,10,142],
      ["mm","tlb",169,38,89,42,0,33,0],
      ["mm","vm_space",174,148,26,0,0,348,587],
      ["panic","panic",71,0,0,71,0,0,0],
      ["smp","smp",53,0,0,53,0,0,0],
      ["sync","guard",24,22,0,2,0,0,0],
      ["sync","mod",3,0,0,3,0,0,0],
      ["sync","mutex",69,69,0,0,0,72,44],
      ["sync","rcu",421,372,0,49,0,409,587],
      ["sync","rwarc",58,40,0,18,0,15,20],
      ["sync","rwlock",163,163,0,0,0,295,273],
      ["sync","rwmutex",144,144,0,0,0,306,321],
      ["sync","spin",84,84,0,0,0,123,77],
      ["sync","wait",212,133,10,69,0,48,66],
      ["task","atomic_mode",19,7,0,12,0,0,0],
      ["task","kernel_stack",62,0,0,62,0,0,0],
      ["task","mod",181,4,0,177,0,0,0],
      ["task","preempt",54,7,4,43,0,28,21],
      ["task","processor",57,0,0,57,0,0,0],
      ["task","scheduler",283,32,0,251,0,138,45],
      ["task","utils",10,0,0,10,0,0,0],
      ["timer","jiffies",22,22,0,0,0,25,0],
      ["timer","mod",10,0,0,10,0,0,0],
      ["trap","handler",26,0,0,26,0,0,0],
      ["trap","irq",156,15,8,133,0,6,0],
      ["user","user",35,0,0,35,0,0,0],
      ["util","either",23,23,0,0,0,6,0],
      ["util","ops",49,13,0,36,0,52,51],
      ["util","range_alloc",122,122,0,0,0,215,465]
    ]
  },
};
