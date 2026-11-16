/* One entry per PR the plan has an opinion about. Curated by hand, never overwritten by the GitHub sync.
 *   implements  work items this PR delivers (open → drives "PR 进行中"; merged → shown grey until the item is accepted)
 *   reuses      work items it is only reused by / coordinated with (shown as 参考, never counts as progress)
 *   scope, note what it covers and what is still missing; valid for reviewedHead only — re-check after the head changes
 * Live state (open / merged, head, review, CI, merge gate) comes from pr-snapshot.js. */
window.PLAN_PR_CATALOG = [
  {
    "n": 920,
    "scope": "AVX/AVX-512F 采样检测；收尾后供 CPU 特性启用消费",
    "implements": ["CPU_FEAT"],
    "reuses": [],
    "note": "自身改动只有 arch/x86/mod.rs 的 has_avx / has_avx512 / CpuidFeatureSamples；转为收尾任务。仍未证明 OSXSAVE / XCR0 条件、跨次 CPUID 一致性或完整 enable_cpu_features。",
    "reviewedHead": "24b49326748e8a1488c4f79d4903be657b9c29df",
    "reviewedAt": "2026-11-16"
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
    "scope": "静态/动态 PIO、MMIO 分配/映射与 x86 PCI read32/write32 底座；多个接口前置，尚未验收",
    "implements": ["IO_ALLOC", "IO_PIO", "PCI_CFG", "IO_PIO_ALLOC", "IO_MMIO", "IO_GLOBAL"],
    "reuses": ["IO_WIN", "PIT_CFG", "PCI_BAR"],
    "note": "复核最新 7c710f060f7a5ed3330aba64a9f711e6dd5edac9：较 477db699e 合入 main，并将 allocator 的 PageFlags::RW() 改为关联常量，IO 合同未变。builder new/remove 局部权限已证；IoMem::new/acquire、VmIo/Once 与全局状态连接仍可信，obeys_vmio_* 为 false。静态端口不等动态 allocator；全宽硬件上界 65536，new 端点 <=65535。未改 BAR 主体，PCI_BAR 仅复用。宽度/重叠端口审阅已有 requires/说明回应，尚无新批准。最新 x86 CI 通过，两个非 x86 作业仍失败于 cpu/set.rs:300 assert(bit_at(seq,j))，根因未实验确认。",
    "reviewedHead": "7c710f060f7a5ed3330aba64a9f711e6dd5edac9",
    "reviewedAt": "2026-11-16",
    "evidence": [
      "ostd/src/io/io_mem/{mod,allocator}.rs::new,remove,acquire; ostd/src/arch/x86/{io,pci}.rs @7c710f060f7a5ed3330aba64a9f711e6dd5edac9",
      "https://github.com/asterinas/vostd/pull/706#discussion_r4559437004",
      "https://github.com/asterinas/vostd/pull/706#discussion_r4560880943",
      "https://github.com/asterinas/vostd/actions/runs/43826147600/job/133160348725",
      "https://github.com/asterinas/vostd/actions/runs/43826147600/job/133160348840"
    ]
  },
  {
    "n": 895,
    "scope": "PCI 数据类型/getter/位操作；当前不提供 IRQ/trap 运行路径",
    "implements": ["PCI_TYPES"],
    "reuses": ["PCI_ENUM", "PCI_CAP", "PCI_MSIX"],
    "note": "最新 b0db47c885eb9af77bf53233d0d80c5d277bcf9d 只合入 main，PCI 自身证明未变：zero、IoBar getter、vendor len、set_bit(offset < 16)。与 #706/#919 重叠 PciDeviceLocation 及模块开关；#895 启用 capability/cfg_space，#706 注释它们。冗余说明审阅已修改，GitHub 仍保留要求修改状态。",
    "reviewedHead": "b0db47c885eb9af77bf53233d0d80c5d277bcf9d",
    "reviewedAt": "2026-11-16"
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
    "scope": "运行 IRQ/Drop 与 CPU core 模型；执行和 proof state 尚未连接",
    "implements": ["IRQ_MODEL", "IRQ_GUARD", "IRQ_DROP"],
    "reuses": ["LOC_ID", "PREEMPT_PIN"],
    "note": "head 已更新；自身改动只有 specs/task/cpu_core.rs、arch/x86/irq.rs、trap/irq.rs。PR 标题与描述仍写“用 IRQ guard 作禁抢占后备”，但评审后该改动已撤回，当前 head 不改 task/preempt/guard.rs；main 与本 head 的 disable_preempt() 都是 unimplemented!()。执行 guard、Drop、trap 入口与 proof state 尚未连接；“Original comments are modified”意见已恢复。",
    "reviewedHead": "c8b604c0ec69db3bdf4bac683c04218ea1184432",
    "reviewedAt": "2026-11-16"
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
    "scope": "上下文数据和异常分类；异常构造、FPU、用户态运行仍未覆盖",
    "implements": ["TRAP_DATA"],
    "reuses": ["IDT_TABLE", "TRAP_EXC"],
    "note": "自身改动七文件（cpu/context、cpu/mod、arch/x86/mod、trap/mod、cpu/mod、lib、user）；启用 CPU / context、trap 数据与 user trait，继续停用 GS local、GDT / IDT / syscall、分派、异常构造、FPU、UserMode。重复 cpu_count 与 returns 意见已处理；SelectorErrorCode accessor 未添加，作者主张另作 API 工作，尚无审阅者确认。activate_tls_pointer 仍是 external_body。",
    "reviewedHead": "a47e745320e96a162052ee7d682a243b93359d2c",
    "reviewedAt": "2026-11-16"
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
    "scope": "Pod 与 VM I/O 测试；内容相等及部分成功性断言仍缺证明",
    "implements": ["VM_POD"],
    "reuses": ["F_BYTES", "FPU_REPR", "VM_REPR"],
    "note": "复核 32635fe1eadb80cc31cf81442ef8b256742d7829：较 bb524ccfad 合入 main（含 #932 的 dv 内置），新增 dv/src/doc.rs 为直接 rustdoc 设置 CARGO_PKG_NAME，Pod/VM 测试和 Vec 规约没有新增证明。部分内容、成功返回与精确复制量断言仍被注释，运行期 #[ktest] 属性未恢复；cursor returns 与 Vec call_ensures 已落实。最新 CI 已通过，不能计作可失败拷贝闭环。",
    "reviewedHead": "32635fe1eadb80cc31cf81442ef8b256742d7829",
    "reviewedAt": "2026-11-16"
  },
  {
    "n": 677,
    "scope": "草稿，通用 TLB 请求/逻辑提交；需补硬件刷新与完成确认",
    "implements": ["TLB_REQ"],
    "reuses": [],
    "note": "草稿；OpsStack 不变式、push/merge/clear、请求覆盖与逻辑提交。TlbFlusher::new 已证明空请求覆盖，可信构造器具体是 OpsStack::new；硬件刷新、dispatch、sync 仍可信，CPU pin 与 page_keeper 未接入。",
    "reviewedHead": "c00f702244e205c0f2394979cfabc356a4acc6ce",
    "reviewedAt": "2026-11-16"
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
    "scope": "RCU/CPU core 模型；与 #922 及 IRQ 资源归属协调",
    "implements": ["SA_RCU"],
    "reuses": [],
    "note": "旧九项意见中 import、Option 绑定、returns、辅助引理位置、重复谓词已修改，Send 泛型与 wf / type_inv 两项已被审阅者撤回；scheduler / preemption 接线仍缺，callback allocation / dispatch 保留 external_body；须迁移 #922 的 pool registry。IRC11 Build and verify 作业失败于 ostd/src/sync/rcu/irc11.rs:38，E0432：导入不存在的 NonNullPtrRef；同时存在合并冲突，二者分别记录。",
    "reviewedHead": "63d0612b8f860c4ccf329c0fc53769807d790ac5",
    "reviewedAt": "2026-11-16",
    "evidence": ["https://github.com/asterinas/vostd/actions/runs/43140246165/job/130925206177"]
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
    "note": "TypeId / Any 查询及转换连接；仍依赖类型碰撞假设与 frame reparam / transmute 的 external_body；PR 正文的 TypeIdSpec 叙述已落后于 head 的 core::any::TypeId。",
    "reviewedHead": "f3ca1d7d142e60dfe7f6adf087cc378e2d98e812",
    "reviewedAt": "2026-11-16"
  },
  {
    "n": 883,
    "scope": "DMA stream 同步与设备地址；非当前 BSP 中断里程碑前置",
    "implements": ["SA_DMA"],
    "reuses": ["DMA_MAP"],
    "note": "最新 2c6a1a26653c9230780eef5ecd97a19ba0522e75 合入 main 并对齐 AnyFrameMeta import，slice 证明未新增。已有算术前置/is_valid_daddr 及 DmaStreamSlice::sync/daddr 证明；后置主要保持不变式，内层 sync 仍可信，未证明设备完成同步；coherent/registry 不由该 PR 覆盖。",
    "reviewedHead": "2c6a1a26653c9230780eef5ecd97a19ba0522e75",
    "reviewedAt": "2026-11-16"
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
    "scope": "to_flat_binary 的逐段扩容/覆盖合同；关联 BZ_RANGE 与 ELF 输入规约",
    "implements": ["BZ_ELF", "BZ_RANGE"],
    "reuses": [],
    "note": "复核 d30c271708585a0ae89b5eafd1dd795bc98281a9：较 e3f13f01d 只恢复原注释，审阅修改已落实但未获新批准。ret@==flat_binary_spec；实际算法只将新扩展区域填零，重叠段的 memory-only tail 保留旧字节，原注释不能证明全 BSS 清零。输入谓词/结果 spec 私有，make_bzimage 未验证；parser/get_data、Vec/slice 外部规约可信。与 #927 重复 Vec::index_mut 的评论明确不是 change request，仅协调该声明，不依赖整个测试 PR。",
    "reviewedHead": "d30c271708585a0ae89b5eafd1dd795bc98281a9",
    "reviewedAt": "2026-11-16",
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
  }
];
