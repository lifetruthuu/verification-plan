/* One entry per PR the plan has an opinion about. Curated by hand, never overwritten by the GitHub sync.
 *   implements  work items this PR delivers (open → drives "PR 进行中"; merged → shown grey until the item is accepted)
 *   reuses      work items it is only reused by / coordinated with (shown as 参考, never counts as progress)
 *   scope, note what it covers and what is still missing; valid for reviewedHead only — re-check after the head changes
 * Live state (open / merged, head, review, CI, merge gate) comes from pr-snapshot.js. */
window.PLAN_PR_CATALOG = [
  {
    "n": 920,
    "scope": "主线的 AVX、APIC 能力探测与共享叶 0x15 的 TSC 参数",
    "implements": ["CPU_FEAT", "APIC_PROBE", "TSC_VALUE"],
    "reuses": [],
    "note": "合入 eb1a9d044。#959 使用两个 AVX 探测选择 XCR0 位，BSP/AP 启动的权限来源仍待集成。APIC 的叶 1 条件与模式选择尚未在主线接通。TSC 回退读本核叶 0x16，保留两个乘积上界假设，Some(0) 和 AtomicU64 发布仍须在消费者核对。",
    "reviewedHead": "56c04a329786066a820c083a3a556302f01264f6",
    "reviewedAt": "2026-11-23",
    "evidence": [
      "ostd/specs/context.rs::CpuFeatureModel::from_cpuid，ostd/src/arch/x86/{mod.rs,kernel/tsc.rs,kernel/apic/{xapic,x2apic}.rs} @eb1a9d044",
      "ostd/src/arch/x86/mod.rs::enable_cpu_features @ce76e7de2"
    ]
  },
  {
    "n": 919,
    "scope": "x86 PCI 编码；协调 #706/#895 的同名函数、数据类型及模块开关",
    "implements": ["PCI_ENC"],
    "reuses": ["PCI_MSIX"],
    "note": "证明 has_pci_bus() 恒真、配置地址编码 / 字段恢复、MSI-X remapping 地址构造与低 16 位恢复；#706 已内含同名函数，需保留 #919 较强的字段恢复后置条件。编码证明不能计为 PCI 配置事务或中断重映射完成。",
    "reviewedHead": "d14bae0d0f43d03664ab73240f02da30f17737d5",
    "reviewedAt": "2026-11-16"
  },
  {
    "n": 706,
    "scope": "分离的 MMIO 登记窗口、按成功结果签发的回收权限、PIO 冲突与 x86 PCI 配置端口",
    "implements": ["IO_ALLOC", "IO_PIO", "PCI_CFG", "IO_PIO_ALLOC", "IO_MMIO", "IO_GLOBAL", "IO_MMIO_ALLOC"],
    "reuses": [
      "IO_WIN",
      "PIT_CFG",
      "PCI_BAR",
      "APIC_RESERVE",
      "IOAPIC_REG",
      "PCI_MSIX",
      "CPU_FEAT",
      "APIC_PROBE",
      "TSC_VALUE"
    ],
    "note": "builder::new 保留登记窗口，ranges_disjoint 逐对检查端点。remove 已注释。MMIO 申请成功交出 FreePermit，PIO 用 claim 排除冲突，释放后再次申请成功仍缺保证。IoMem 停用 Clone/slice。相对 main 3283081b3，本 head 缺少 #920 的共享 CPUID，xAPIC 读 EDX[8]，还带回旧 fmt_req。接入时须保留主线合同。",
    "reviewedHead": "78ebe223e10a55b8e2c74ff870cf15164a9f75e0",
    "reviewedAt": "2026-11-23",
    "evidence": [
      "ostd/src/io/io_mem/{allocator.rs::IoMemAllocatorBuilder::new,IoMemAllocator::acquire,IoMemAllocator::recycle,mod.rs::IoMem::acquire}，ostd/src/util/range_alloc.rs::RangeAllocator::free @78ebe223e",
      "ostd/src/io/io_port/{allocator.rs::conflict_region,lemma_conflicting_acquire_fails,mod.rs::IoPort::drop}，ostd/src/arch/x86/pci.rs::read32,write32 @78ebe223e",
      "ostd/src/arch/x86/kernel/{apic/mod.rs::init,irq/ioapic.rs::IoApicAccess::new}，ostd/src/bus/pci/{cfg_space.rs::MemoryBar::new,capability/msix.rs} @78ebe223e",
      "verified_libs/vstd_extra/src/range.rs::ranges_disjoint，ostd/src/arch/x86/kernel/apic/xapic.rs::has_xapic，ostd/src/mm/frame/mod.rs::DebugSpecImpl @78ebe223e（对照主线 @3283081b3）"
    ]
  },
  {
    "n": 895,
    "scope": "已合入 main 11d378516 的 PCI 类型、getter 和位操作",
    "implements": ["PCI_TYPES"],
    "reuses": ["PCI_ENUM", "PCI_CAP", "PCI_MSIX"],
    "note": "核对 zero、IoBar getter、CapabilityVndrData::len 和 set_bit(offset < 16)。PciDeviceId::new 与 PCI 枚举/设备初始化调用仍被注释，location 的公共 u8 字段也未建立整个设备号范围不变式。PCI_TYPES 待补已验证消费者。",
    "reviewedHead": "5ed7a2c167d0faaf215beb1b5844fefe125e2a65",
    "reviewedAt": "2026-11-18"
  },
  {
    "n": 879,
    "scope": "IRQ owner 与 guard 构造；资源创建、恢复与 #900 的状态关系待接线",
    "implements": ["IRQ_MODEL", "IRQ_GUARD"],
    "reuses": [],
    "note": "owner 与 guard 构造有证明（LocalIrqGuardOwner / CpuLocalAuth<bool>）；公开 disable_local 仍 external，owner 没有构造器，Drop 未接。旧评审的硬件模型归属问题已由 owner 与 inv / coherent 重构处理。",
    "reviewedHead": "6cec73d064e85b04536d6368b3ad6b249aae5676",
    "reviewedAt": "2026-11-16"
  },
  {
    "n": 900,
    "scope": "IRQ guard 的运行层与 CPU core 的嵌套记账",
    "implements": ["IRQ_MODEL", "IRQ_GUARD", "IRQ_DROP"],
    "reuses": ["LOC_ID", "PREEMPT_PIN"],
    "note": "CpuCoreOwner 以 GhostSetAuth 和 token 标识 IRQ guard，新增 tracked_forget_local；运行层恢复 STI 后的 NOP。公开 guard/Drop 与 proof token、#879 的 owner 仍待连接。task/preempt/guard.rs 不在差异中。",
    "reviewedHead": "0e5815a712827ef102d0509e64b20e385075fdf6",
    "reviewedAt": "2026-11-18"
  },
  {
    "n": 802,
    "scope": "early allocator 实例证明；全局创建/分配及 CPU-local 初始化另补",
    "implements": ["LOC_ALLOC"],
    "reuses": ["LOC_EARLY_GLOBAL"],
    "note": "实例 alloc/allocated_regions 已证；new 与全局 early_alloc 仍 external，不能供应 CPU-local 所需线性内存与跨次不重叠资源。已复核 Layout::size 的 exec ensures 承接 valid_layout，旧 proof-mode 公理已移除；评论已解释修复，尚无审阅者批准。实例与全局交接分为 LOC_ALLOC/LOC_EARLY_GLOBAL。",
    "reviewedHead": "fa3dbab608d15cc740c7bc47c979db5235e07428",
    "reviewedAt": "2026-11-16",
    "evidence": [
      "https://github.com/asterinas/vostd/pull/802#discussion_r4520760944",
      "https://github.com/asterinas/vostd/pull/802#discussion_r4520877758"
    ]
  },
  {
    "n": 887,
    "scope": "x86 用户上下文数据、异常分类与字段保持",
    "implements": ["TRAP_DATA"],
    "reuses": ["IDT_TABLE", "TRAP_EXC"],
    "note": "合入主线后，context、trap 数据和 user.rs 与此前复核的 02fa63b7c 相同。UserContextApi 读写保存的 IP/SP 和 trap 元数据，take_exception 保持其余字段。TLS 的 FSBASE 写入仍是外部体。与 #955 和 #959 集成时分别接入 IDT 与 FPU，异常构造、实际分派和 UserMode 仍待验证。",
    "reviewedHead": "d383db6cc44d5872f4400643e40e3575910df59e",
    "reviewedAt": "2026-11-23",
    "evidence": [
      "ostd/src/arch/x86/{cpu/context/mod.rs::UserContext::take_exception,UserContextApi,trap/mod.rs}，ostd/src/user.rs::UserContextApi @d383db6cc"
    ]
  },
  {
    "n": 855,
    "scope": "分页布局公理移除与配置义务（已合入 41ccd7463）",
    "implements": ["PT_CFG"],
    "reuses": [],
    "note": "axiom_current_paging_consts_hardcoded 已从 main 删除；x86 常量义务由 lemma_paging_consts_requirements 证明，Kernel / User 配置证明 PTE 大小与顶层范围；仍限 4 KiB、8 字节 PTE、最多四层，原始 item 转换仍可信；仍需证明具体 x86 寄存器和刷新效果。 本轮对照最终 head 与合入内容一致，并复核 main 的泛型消费者；PT_CFG 按配置合同限定交付结项。该 head 两次批准、CI 成功，不以此认定 MM/PT_X86 整体完成。",
    "reviewedHead": "4362ee4b67601ef58882aa1fcb38a83fac879de7",
    "reviewedAt": "2026-11-16",
    "evidence": [
      "https://github.com/asterinas/vostd/pull/855#pullrequestreview-5901703621",
      "https://github.com/asterinas/vostd/pull/855#pullrequestreview-5901839719"
    ]
  },
  {
    "n": 927,
    "scope": "已合入 main f0d568203 的 Pod 派生和 11 个 VM I/O 测试函数",
    "implements": ["VM_POD"],
    "reuses": ["F_BYTES", "FPU_REPR", "VM_REPR"],
    "note": "最终 head 保留 cursor 精确返回值、Vec 索引外部规约及失败边界测试。仍有内容相等、精确复制量和成功性断言被注释，部分 #[ktest] 未恢复。#934 继续增强条件断言。",
    "reviewedHead": "06f92ec0f899d7d451531b0e0fb3902d7e4e9a55",
    "reviewedAt": "2026-11-18"
  },
  {
    "n": 677,
    "scope": "草稿，TLB 请求与逻辑提交；部分设计已进入 #935",
    "implements": ["TLB_REQ"],
    "reuses": [],
    "note": "旧分支证明 OpsStack 部分队列操作和逻辑提交；作者在讨论中确认 #935 采用部分设计。对照两个分支迁移可复用合同，frame 保留、CPU pin 和远端完成尚待证明。",
    "reviewedHead": "c00f702244e205c0f2394979cfabc356a4acc6ce",
    "reviewedAt": "2026-11-18"
  },
  {
    "n": 570,
    "scope": "TLB tracked helper；与 #677 协调并迁移已清理的接口",
    "implements": ["TLB_REQ"],
    "reuses": [],
    "note": "规格文件 tracked update / flush；main 仍有对应公理，不能称已被清理取代，须与 #677 的模型协调。",
    "reviewedHead": "5bdb5d2aad5273f84cc56097ff906e29ebaa46e5",
    "reviewedAt": "2026-11-16"
  },
  {
    "n": 921,
    "scope": "task/kernel_stack 栈大小解析（已合入 97963e831）；复用 vstd_extra 数字助手。",
    "implements": ["TASK_STACK"],
    "reuses": [],
    "note": "main 已证明十进制解析与 KERNEL_STACK_SIZE 上界 / 页对齐；configured_stack_size_in_pages 仍是 external_body 的可信静态初始化；栈分配与 flush_tlb 仍在注释里。合入内容与 head c2b79a99ac 的改动一致。",
    "reviewedHead": "c2b79a99ac026677dcf035233e3a87b36f2c88ed",
    "reviewedAt": "2026-11-16"
  },
  {
    "n": 923,
    "scope": "heap slot/slot_list；与 #505 重叠，不能替代 early_alloc 或全局分配器",
    "implements": ["SA_HEAP"],
    "reuses": [],
    "note": "head 1f20b6eda2 → 38f3177997：两个 slot 文件迁到 verus_spec，字段私有化评论已处理，Send / Sync 仍为 verifier::external。证明空表、LIFO、独占内存转移与 slot getter；不能替代 early_alloc、slab 或全局分配器。",
    "reviewedHead": "38f3177997b09129271cbdebbce9c6243c551542",
    "reviewedAt": "2026-11-16"
  },
  {
    "n": 916,
    "scope": "PE/COFF 头构建验证（pe_header.rs：八个手写函数、368 字节拼接）；已合入 c25ca6f98，自身改动 9 个文件，不含 CI / Verus patch。",
    "implements": ["BZ_PE"],
    "reuses": [],
    "note": "head d7cdf470b2 → 2f3bb906fa：新增公开可用规格、dual_spec、模块级 lint，并在最新提交为 ElfFile::new 补输入保持后置条件（elf.input == input，指针相等），对应审阅者最后一条意见；该 head 已获 rikosellic 批准。解析、bytes_of 与 opaque 外部类型仍可信，packed 字段小端编码未证明。",
    "reviewedHead": "2f3bb906faf644b82c16b00654a1b6e603b30eb0",
    "reviewedAt": "2026-11-16"
  },
  {
    "n": 860,
    "scope": "IRC11 下的 RCU 读保护、宽限期与回收",
    "implements": ["SA_RCU"],
    "reuses": [],
    "note": "新 head 采用 NonNullPtr 和原生 view，更新 reader close 到回收的顺序及 Objective 内存权限。IRC11 Build and verify 与各目标验证已通过，当前失败项是 format。调度/禁抢占接线、回调分配与分派仍需独立证据。",
    "reviewedHead": "aa4d1e466e62a7b32fe61fa868c6f2c9d983ca2c",
    "reviewedAt": "2026-11-18",
    "evidence": [
      "https://github.com/asterinas/vostd/actions/runs/44002501505/job/133769749630",
      "https://github.com/asterinas/vostd/actions/runs/44002501637/job/133769750094"
    ]
  },
  {
    "n": 857,
    "scope": "unmap 边界、等待和所有权辅助；由页表消费者按需复用",
    "implements": [],
    "reuses": ["PT_CFG", "MM_PT", "SYNC_WAIT"],
    "note": "用减法边界替代 unmap 溢出假设，移除空 owner 销毁可信体；wait 仍留 admit；最新评审要求上游修执行溢出并质疑 wait 改写，head 仍保留两项改动，不能视作纯 proof 修复。",
    "reviewedHead": "159470248472426adc8dea35711de4cb64975aa1",
    "reviewedAt": "2026-11-16"
  },
  {
    "n": 720,
    "scope": "TypeId/Any 与 frame/page table 的工具链及类型接口改动",
    "implements": [],
    "reuses": ["PT_CFG", "MM_FRAME", "MM_PT"],
    "note": "分支以 Rust 1.100.0 和七个 Verus 补丁提供 TypeId/Any、dyn trait 及 downcast 接口。Frame::into_dyn 的 transmute 仍在 external_body；与 #934 核对元数据和链表所有权合同。",
    "reviewedHead": "d52f5863bd8e750955b274f45eb136aefbc5d9df",
    "reviewedAt": "2026-11-19",
    "evidence": ["patches/README.md；ostd/src/mm/frame/mod.rs::into_dyn @d52f5863b"]
  },
  {
    "n": 883,
    "scope": "DMA stream slice 的 sync 与设备地址计算",
    "implements": ["SA_DMA"],
    "reuses": ["DMA_MAP"],
    "note": "与 r7 已查的 d31f93d94 对比，分支变基到主线 eb1a9d044，两个 DMA 文件逐字相同。slice 两个入口保持不变式，内层 sync 的实际缓存动作仍注释。设备完成与 coherent/registry 仍各需证据。",
    "reviewedHead": "f2ed581e00830b6eb21a9167e55a4f78349169e2",
    "reviewedAt": "2026-11-23",
    "evidence": ["ostd/src/mm/dma/{dma_stream.rs::DmaStreamSlice::sync,DmaStreamSlice::daddr,mod.rs} @f2ed581e0"]
  },
  {
    "n": 617,
    "scope": "DMA stream helper 层删除与 snapshot 接口重构；与 #883 文件重叠",
    "implements": ["SA_DMA"],
    "reuses": ["DMA_MAP"],
    "note": "getter 返回锁内读出的 Ghost<DmaStreamInner> snapshot，未提供长期状态绑定；slice sync / daddr、内层 sync 与范围 assume 仍在。冲突位于 dma_stream.rs。",
    "reviewedHead": "a00a7b6fa9546f2b2533a8b0560615f19155da12",
    "reviewedAt": "2026-11-16"
  },
  {
    "n": 505,
    "scope": "heap/slab 历史分支；当前冲突，注意 #923 已覆盖的 slot 范围",
    "implements": ["HEAP_GLOBAL"],
    "reuses": ["SA_HEAP"],
    "note": "heap 四文件与 external 类型；Slab::new / dealloc、large allocation、全局 allocator 接线仍注释；与 #923 重叠但未被完全替代；冲突在 external module 接线。",
    "reviewedHead": "cb2be5a80af1fa3286752092ec51f6eb9af29d91",
    "reviewedAt": "2026-11-16"
  },
  {
    "n": 487,
    "scope": "弱内存、RCU、调度模型；按真实消费者协调，不统一阻塞设备配置",
    "implements": ["SA_RCU"],
    "reuses": [],
    "note": "较老的大范围弱内存 / RCU / task 模型分支；disable_preempt 仍标 unsound，Task::current 恒返回空 CurrentTask，不能计为已接通运行层；广泛冲突（frame、RCU、task、CI），须迁移 #922。",
    "reviewedHead": "e47182cd1331f2f4ed9fd0e83ac070fbcd2460fe",
    "reviewedAt": "2026-11-16"
  },
  {
    "n": 408,
    "scope": "分页 trait 关联常量（已关闭，由 #928 取代）",
    "implements": [],
    "reuses": [],
    "note": "PR 已关闭未合并；TOP_LEVEL_CAN_UNMAP 等关联常量由 #928 合入。",
    "reviewedHead": "050a3e3e87350315e65c5c43d9d22eadc3f3a858",
    "reviewedAt": "2026-11-16"
  },
  {
    "n": 915,
    "scope": "linux-bzimage-builder 纳入 Cargo workspace 与 Verus；证明 SetupVA / SetupFileOffset 映射算术。映射证明仍依赖 setup ELF 地址/偏移范围假设（assume），登记为 trusted boundary。",
    "implements": [],
    "reuses": [],
    "note": "",
    "reviewedHead": "b6db6df974cf0af881255cf88613836613fc6ce4",
    "reviewedAt": "2026-11-14"
  },
  {
    "n": 918,
    "scope": "ostd-test 初始化与格式化证明。",
    "implements": [],
    "reuses": [],
    "note": "",
    "reviewedHead": "30581d3014f3ddf537d406f997ddc3abe416b514",
    "reviewedAt": "2026-11-14"
  },
  {
    "n": 909,
    "scope": "RCU Either 测试与共享布局规约；xAPIC 已改用 lemma_primitive_layout。",
    "implements": [],
    "reuses": [],
    "note": "",
    "reviewedHead": "6e20764d1cf4006b193ace48e4afcff59517badb",
    "reviewedAt": "2026-11-14"
  },
  {
    "n": 922,
    "scope": "RCU 读 token 改用实数份额和 pool registry，移除六处假设；不能据此认定 IRQ、调度或宽限期执行连接已完成。",
    "implements": [],
    "reuses": [],
    "note": "",
    "reviewedHead": "d079460c09249fe2be21b4fa4fe0559a44c372fa",
    "reviewedAt": "2026-11-14"
  },
  {
    "n": 924,
    "scope": "加强 VmReader/VmWriter 的边界结果、失败状态保持、limit 精确长度；read_val 返回值与实际字节内容的关系仍有缺口。",
    "implements": [],
    "reuses": [],
    "note": "",
    "reviewedHead": "90087275ebd4b974596947d11d3da27d722e05d3",
    "reviewedAt": "2026-11-14"
  },
  {
    "n": 925,
    "scope": "拆分 stats 与 pages 动作，测试代码纳入统计。",
    "implements": [],
    "reuses": [],
    "note": "",
    "reviewedHead": "52715e6ecd70b2b8aeb48818f4274dcb4930e598",
    "reviewedAt": "2026-11-14"
  },
  {
    "n": 926,
    "scope": "对齐原源码 import。",
    "implements": [],
    "reuses": [],
    "note": "",
    "reviewedHead": "46440af7206dc3132253ebb8cb5e190a5d711e76",
    "reviewedAt": "2026-11-14"
  },
  {
    "n": 905,
    "scope": "TSC CPUID 合同，保持原 u32 算术；两条输入假设为可信债务，消费者须接住 Some(0) 与 max_cpuid <= 0x15 拒绝条件。",
    "implements": [],
    "reuses": [],
    "note": "",
    "reviewedHead": "35a5722f5a802ac0f594d780306f61afa9f37370",
    "reviewedAt": "2026-11-14"
  },
  {
    "n": 886,
    "scope": "x86 异常表（ExTable）查找证明。",
    "implements": [],
    "reuses": [],
    "note": "",
    "reviewedHead": "aa41304e2a1cb32f556d9c23091441b79747c053",
    "reviewedAt": "2026-11-14"
  },
  {
    "n": 870,
    "scope": "x86 task 上下文数据证明。",
    "implements": [],
    "reuses": [],
    "note": "",
    "reviewedHead": "323526f8b7ff988ade49e9ab3ddf4f3feb91b794",
    "reviewedAt": "2026-11-14"
  },
  {
    "n": 819,
    "scope": "APIC ICR/ID 编码与后端计算；send_ipi 仍可信。",
    "implements": [],
    "reuses": [],
    "note": "",
    "reviewedHead": "7d4224a4e0cf102ab78f8df041c013aad40c98bf",
    "reviewedAt": "2026-11-14"
  },
  {
    "n": 820,
    "scope": "ISA IRQ override 路由提案；已关闭未合并，仅作历史参考。",
    "implements": [],
    "reuses": [],
    "note": "",
    "reviewedHead": null,
    "reviewedAt": "2026-11-14"
  },
  {
    "n": 906,
    "scope": "栈大小解析的旧提案；已由 #921 取代，不再计为当前开放工作。",
    "implements": [],
    "reuses": [],
    "note": "",
    "reviewedHead": null,
    "reviewedAt": "2026-11-14"
  },
  {
    "n": 928,
    "scope": "PageTableConfig 等改为关联常量（已合入 4676a774b，取代 #408）",
    "implements": [],
    "reuses": ["PT_CFG"],
    "note": "main 中 TOP_LEVEL_CAN_UNMAP 等已是关联常量。",
    "reviewedHead": "a5c74965dc771bac7c7891b8df5d3f9ab0290664",
    "reviewedAt": "2026-11-16"
  },
  {
    "n": 929,
    "scope": "页表、映射与链表证明展开的性能优化（已合入 a78d07377）",
    "implements": [],
    "reuses": ["PT_CFG"],
    "note": "",
    "reviewedHead": "6ea25445de4dfd9e4a71e11e3dd358e1295d3a26",
    "reviewedAt": "2026-11-16"
  },
  {
    "n": 931,
    "scope": "已合入 main 46d3b1e7e 的 ELF 输入规约与 flat binary 逐段构造",
    "implements": ["BZ_ELF", "BZ_RANGE"],
    "reuses": [],
    "note": "最终实现以 fold_left 描述按 PT_LOAD 顺序扩容、复制。新增区间清零，重叠段的 memory-only 尾部保留旧字节。输入/结果规格私有；实际 make_bzimage 未建立前置和输出区间，xmas_elf 仍可信。",
    "reviewedHead": "0e945fc06469e7a7931080ec50d56522dc89470f",
    "reviewedAt": "2026-11-18",
    "evidence": [
      "https://github.com/asterinas/vostd/pull/931#discussion_r4582797497",
      "https://github.com/asterinas/vostd/pull/931#discussion_r4582813072"
    ]
  },
  {
    "n": 930,
    "scope": "已合入 main：verified_bitflags 及页表/PE 头调用更新",
    "implements": [],
    "reuses": [],
    "note": "复核最终 head 与合入 8e681282d：关联常量、公开 bits 等接口同步，pe_header 长度/字段合同保留。改变当前消费者写法，未增加硬件或跨路线验证依赖；开放分支组合时需对齐。",
    "reviewedHead": "5b25275eda60df30500cc5d2aea70c0e1d0f97bb",
    "reviewedAt": "2026-11-16"
  },
  {
    "n": 932,
    "scope": "dv 内置与 CI/文档调用调整，已合入 032089aa3",
    "implements": [],
    "reuses": [],
    "note": "核对 head d164e5596a1b6de6345051ffc181395c9229c1e3 的 dv/CI/Makefile/README 改动与合入内容一致。移除 dv 子模块和独立缓存，make fmt 增加 dv 格式化；OSTD 验证命令与默认目标仍保持，未修改 ostd/verified_libs。复用其构建入口，不作为证明工作的开工前置。",
    "reviewedHead": "d164e5596a1b6de6345051ffc181395c9229c1e3",
    "reviewedAt": "2026-11-16"
  },
  {
    "n": 934,
    "scope": "七个 frame 测试、MockFrameMeta 与 VM I/O 分支断言",
    "implements": ["MM_FRAME", "VM_POD"],
    "reuses": [],
    "note": "类型化测试改用 MockFrameMeta，untyped 测试使用 U32FrameMeta。七个 frame 测试与 VM I/O 的部分复制量、故障游标证据继续分别使用。Segment::slice 的引用计数更新随 #951 进入主线。分配失败、缓冲字节内容与运行期 ktest 待核对。",
    "reviewedHead": "b277ee4e64472305f56fb91bf12c05a9bc3e4af8",
    "reviewedAt": "2026-11-19",
    "evidence": [
      "ostd/specs/mm/frame/meta_owners.rs；ostd/src/mm/frame/{test,linked_list}.rs；ostd/src/mm/test.rs @b277ee4e6"
    ]
  },
  {
    "n": 935,
    "scope": "TLB 每核状态、陈旧条目和 FlushSet 请求记账",
    "implements": ["TLB_REQ"],
    "reuses": ["TLB_SHOOT", "TLB_FREE"],
    "note": "FlushSet::vas 与每核 resident/stale 使用有限 Set。issue_tlb_flush 和 push_from 保证 join 或等于 FlushSet::all_user()。dispatch、远端完成和当前 CPU 固定另验，page_keeper 仍注释，入队后即丢弃传入 frame。",
    "reviewedHead": "76d55a69d34a7e4b10becf5003f4f3c8b696722e",
    "reviewedAt": "2026-11-19",
    "evidence": [
      "ostd/specs/mm/tlb.rs::FlushSet；ostd/src/mm/tlb.rs::issue_tlb_flush_with,OpsStack::push_from @76d55a69d3"
    ]
  },
  {
    "n": 936,
    "scope": "已合入的 Repr 接口调整，供 frame 和页表迁移",
    "implements": [],
    "reuses": ["MM_FRAME", "MM_PT"],
    "note": "cast_ptr.rs 删除 ReprPerm 和执行层 from_repr，frame 元数据和页表节点调用者改用新的表示合同。#934 已在 d80c2a322 对齐该接口。",
    "reviewedHead": "d2a91c33ea02d576aa608779494523ab7572ade5",
    "reviewedAt": "2026-11-18"
  },
  {
    "n": 937,
    "scope": "cpu/set 采用 vstd 的 count_ones 规约",
    "implements": [],
    "reuses": ["COMMON_AUDIT"],
    "note": "删除 vstd_extra 的本地 bits 规格，调整 cpu/set 的计数证明。公共 API 盘点记录该基线。",
    "reviewedHead": "93db8d35efab9f3d1f6f4e8a3b7daf92212d44e6",
    "reviewedAt": "2026-11-18"
  },
  {
    "n": 939,
    "scope": "共享 VM、页表与 DMA 的规格调用写法和 IRC11 CI",
    "implements": [],
    "reuses": ["VM_POD", "MM_PT", "SA_DMA"],
    "note": "已合入 525267ea3，更新 when_used_as_spec 调用与 IRC11 workflow/patch。开放分支复用 avail()/remain() 等当前接口。",
    "reviewedHead": "009947da42322aa48696a468801d8e7a0949f21a",
    "reviewedAt": "2026-11-18"
  },
  {
    "n": 940,
    "scope": "公共 bitflags 的名称查询、未知位和复合赋值合同",
    "implements": [],
    "reuses": ["COMMON_AUDIT"],
    "note": "ISA 文本与列表解析属于平台后续工作。当前范围复核 verified_libs/bitflags 的 from_name、known_bits、unknown_bits 与复合赋值接口。",
    "reviewedHead": "f7becca72affdc5c3b99654bf7d7e4c5218b1c23",
    "reviewedAt": "2026-11-18"
  },
  {
    "n": 942,
    "scope": "KtestItem::run 使用的测试结果分类",
    "implements": ["KTEST_RESULT"],
    "reuses": [],
    "note": "按修订后的正文复核同一 head。run 将执行结果规范化后调用 classify_test_result，覆盖正常、PanicInfo、未知 payload 和消息精确匹配；catch_unwind_impl 与 downcast 在外部。",
    "reviewedHead": "3b0821b71b068164347e7d52a8624daf17bd94db",
    "reviewedAt": "2026-11-19"
  },
  {
    "n": 943,
    "scope": "PayloadEncoding::from_str 的三个合法值及完整错误文本",
    "implements": ["BZ_PARSE"],
    "reuses": [],
    "note": "大小写敏感地接受 raw、gzip、zlib。其他输入返回 Invalid encoding format: 加原字符串。OsStr/OsString 包装、Serde 派生和 encode_kernel 的压缩字节均未在此 PR 验证。",
    "reviewedHead": "53a020701cc05f8f99df03ed224e90bbe7ba234d",
    "reviewedAt": "2026-11-18"
  },
  {
    "n": 945,
    "scope": "Rust 1.100.0 迁移与 RangeAllocator 空闲表不变式",
    "implements": [],
    "reuses": ["IO_ALLOC"],
    "note": "rust-toolchain.toml 更新到 1.100.0，并切换 allocator_ext、workspace lints。range_alloc.rs 为 FreelistInvariant 和迭代证明补 btree_map_wf。#706 集成时核对 BTreeMap 接口；本 PR 未建立 MMIO 窗口来源或保留效果。",
    "reviewedHead": "0913d1ce86e749b4a0f8c0a12ef6ef9b2d572cc2",
    "reviewedAt": "2026-11-18"
  },
  {
    "n": 944,
    "scope": "与 #887 协调共享 UserContextApi 和 TrapFrame 声明",
    "implements": [],
    "reuses": ["TRAP_DATA"],
    "note": "共享 user.rs 的声明与 #887 有交集。当前 head 调整另一平台的默认寄存器、上下文初始化与异常分类写法，trap_number/trap_error_code 仍注释。集成时核对 x86 trait 入口及字段保持。",
    "reviewedHead": "2980e2cee7bf4abdee9e715248c9d8356d478fd3",
    "reviewedAt": "2026-11-19"
  },
  {
    "n": 948,
    "scope": "builder 编码、EFI 魔数与解码、目标字长下的 ELF 段初始化",
    "implements": ["BZ_ENCODE", "BZ_DECODE", "BZ_LOAD"],
    "reuses": ["BZ_SETUP", "BZ_IMG", "BZ_PE"],
    "note": "magic_number 和 decoded_payload 已公开，Raw ELF 可直接建立解码前置。压缩流需要同次构建提供编码输出与嵌入字节的对应。loader 按目标设置 usize 字长并记录各段文件前缀与零尾部。alloc_at 只保证长度。Vec 写入模型补上追加效果，物理内存和启动入口仍待核对。 最新合入 main 的提交未改这些 builder 或 setup 文件。",
    "reviewedHead": "263398d72dc2fa0e3a19ad4b9ba0d88584e5f570",
    "reviewedAt": "2026-11-23",
    "evidence": [
      "ostd/libs/linux-bzimage/{builder/src/encoder.rs,setup/src/x86/amd64_efi/{decoder,efi}.rs,setup/src/loader.rs}，verified_libs/vstd_extra/src/external/libflate.rs @263398d72"
    ]
  },
  {
    "n": 951,
    "scope": "已合入 0195b8176 的条件 panic 合同与 Segment::slice 引用计数证明",
    "implements": [],
    "reuses": ["MM_FRAME", "MM_PT", "MM_KVA", "VM_CONTENT"],
    "note": "allowed_to_panic_if 表达调用者何时需允许 panic。Segment::slice 在克隆引用后恢复计数不变式。frame、页表、虚拟区间和 VM I/O 的真实调用处仍须建立对齐、范围或饱和条件。",
    "reviewedHead": "f20b8ff79ea80b9929fc6e12ec85d510ceb55a43",
    "reviewedAt": "2026-11-19",
    "evidence": [
      "verified_libs/vstd_extra/src/panic.rs::allowed_to_panic_if；ostd/src/mm/{io,frame/segment}.rs @f20b8ff79"
    ]
  },
  {
    "n": 952,
    "scope": "IRC11 原子模型更新及锁、RCU 的权限发布条件",
    "implements": [],
    "reuses": ["SA_RCU", "SYNC_API", "SYNC_GUARD", "MM_FRAME"],
    "note": "更新弱内存模型与拒绝用例。SC 原子不传递线程视图，MutexPerm、RcuPtrGhost 和其他资源仍借助手写 Objective；各消费者需说明跨线程发布权限的依据。",
    "reviewedHead": "484a329664870e750463170f60d4c94bebe83667",
    "reviewedAt": "2026-11-19",
    "evidence": [
      "tools/patches/verus-irc11.patch；ostd/src/sync/{mutex,rcu/mod}.rs；ostd/specs/mm/frame/frame_specs.rs @484a329664"
    ]
  },
  {
    "n": 953,
    "scope": "已合入 2f0e25632 的 Rust 1.100 比较与 ilog2 外部合同",
    "implements": [],
    "reuses": ["IO_WIN", "PT_X86"],
    "note": "Iterator::min/max 的元素归属和极值后置以 obeys_cmp 为条件。most_restrictive_type 显式建立 MemoryRegionType 的比较律。x86 页表 parse_flags 使用非零掩码，满足无符号 ilog2 的正输入 no_unwind 条件。两处按公共合同复用。",
    "reviewedHead": "a9c118ae0e38f9fe27ab9f4f31166c16f259ea6e",
    "reviewedAt": "2026-11-19",
    "evidence": [
      "verified_libs/vstd_extra/src/external/{iter,ilog2}.rs @a9c118ae0",
      "ostd/src/boot/memory_region.rs::max_region_end,most_restrictive_type,next_region_boundary；ostd/src/arch/x86/mm/mod.rs::parse_flags @2f0e25632"
    ]
  },
  {
    "n": 954,
    "scope": "x86 context_switch 的可信 FFI 权限与返回栈对齐",
    "implements": ["TASK_CTX"],
    "reuses": ["TASK_SW"],
    "note": "相对 r7 分支自身只整理 PointsTo 导入，FFI 合同相同。cur/nxt 需各自匹配权限且地址不同，next 已初始化，cur 恢复后栈指针对齐到模 16 余 8。唯一树内调用处 switch_to_task 尚未启用，有效续点、可写返回槽、IRQ、FSBASE 和 shadow stack 仍由调用者保证。",
    "reviewedHead": "57b1cf66facdb86a67db179c3337e9e4e0fa297f",
    "reviewedAt": "2026-11-23",
    "evidence": [
      "ostd/src/arch/x86/task/{mod.rs::context_switch,switch.S}，ostd/src/task/{mod.rs,processor.rs::switch_to_task} @57b1cf66f"
    ]
  },
  {
    "n": 955,
    "scope": "256 项 IDT 的门属性、静态发布和本次 lidt 的描述符见证",
    "implements": ["IDT_TABLE", "IDT_LOAD"],
    "reuses": ["TRAP_DISP"],
    "note": "init 对每个向量建立 entry_matches，仅 3、4 为 Ring3，返回基址、4095 界限和表内容。vector_table、published_idt、load_idtr 仍依赖外部模型。需用链接产物与目标 CPU 核对入口、CS 和错误码，并接回外层 trap::init。按审阅已将 16 字节布局移至 x86_idt，并由 init 使用 lemma_idt_entry_layout。",
    "reviewedHead": "c9a85a789cfb14965d31e0c93572deb0f27e5356",
    "reviewedAt": "2026-11-23",
    "evidence": [
      "ostd/src/arch/x86/trap/{idt.rs::init,published_idt,trap.S::trap_handler_table,mod.rs::init}，verified_libs/vstd_extra/src/external/{x86_idt.rs::load_idtr,smart_ptr.rs} @c9a85a789"
    ]
  },
  {
    "n": 956,
    "scope": "宿主 builder 校验 Efi64 的 setup ELF .rela 节及其相对重定位类型",
    "implements": ["BZ_RELOC"],
    "reuses": ["BZ_ELF", "BZ_OUT"],
    "note": "Efi64 在写出 setup 后、覆盖 PE 头前调用断言。正常返回保证 ELF64、Rela64 且每项类型为 8。读条件与支持条件成立时有 no_unwind，Group 在解码前拒绝。节查找和条目字节仍依赖 xmas-elf 模型，实际链接产物及失败时的文件内容待核对。Legacy32 不调用该断言。 合入主线后已移除 panic_display 的 fmt_req 前置。",
    "reviewedHead": "068e79fb8fa4097a706ca7da66dd986dcd149738",
    "reviewedAt": "2026-11-23",
    "evidence": [
      "ostd/libs/linux-bzimage/{builder/src/lib.rs::make_bzimage,assert_elf64_reloc_supported,setup/src/x86/linker.ld}，verified_libs/vstd_extra/src/external/xmas_elf.rs::section_data_readable,section_data_result @068e79fb8"
    ]
  },
  {
    "n": 958,
    "scope": "主线移除 fmt_req，并停用 Frame 与 UniqueFrame 的 Debug 实现",
    "implements": [],
    "reuses": ["MM_FRAME", "KTEST_RESULT", "SYNC_GUARD", "SYNC_API", "BZ_RELOC"],
    "note": "合入 22194556e。Frame/UniqueFrame 的 Debug 实现被注释，Segment、锁 guard 的格式化及 PanicInfo::Display 仍启用。#956 已同步移除 PanicMessage 的 fmt_req 实现和 panic_display 对该谓词的要求。格式化适配单列为协调，元数据生命周期、锁权限和 ktest 分类按各自合同验收。",
    "reviewedHead": "6ea044c0a5b32b56b8a3509289668d6bdca1356f",
    "reviewedAt": "2026-11-23",
    "evidence": [
      "ostd/src/mm/frame/{mod,unique,segment}.rs，ostd/src/sync/{spin,rwlock,mutex,rwmutex}.rs，ostd/libs/ostd-test/src/lib.rs @22194556e",
      "verified_libs/vstd_extra/src/panic.rs::PanicMessage @068e79fb8"
    ]
  },
  {
    "n": 959,
    "scope": "每核 FPU 初始化见证、上下文构造与复制、Pod 可变字节视图",
    "implements": ["CPU_ENABLE", "FPU_REPR", "VM_REPR"],
    "reuses": ["CPU_FEAT", "XSAVE", "TRAP_DATA"],
    "note": "给定寄存器 owner 与 XSTATE 条件，启用函数更新 CR0/CR4/EFER/XCR0、x87 并交出 Once 见证。FpuContext 的 512 或 576..=4096 字节表示、固有 clone 和字节视图有合同。此 head 未定义正文所称 tracked_legacy_initialization。真实 BSP/AP 权限、跨核保存大小、硬件 save/load 及用户上下文集成仍待交付。",
    "reviewedHead": "ce76e7de21614a66c9eb691c3c7535961b376643",
    "reviewedAt": "2026-11-23",
    "evidence": [
      "ostd/src/arch/x86/{mod.rs::enable_cpu_features,cpu/context/mod.rs::enable_essential_features,FpuInitialization,FpuContext}，ostd/specs/context.rs::CpuFeatureModel::matches_xstates @ce76e7de2",
      "ostd/libs/ostd-pod/src/lib.rs::Pod::as_bytes_mut，verified_libs/vstd_extra/src/external/x86.rs::X86CpuRegisterOwner,FpuOnce @ce76e7de2"
    ]
  }
];
