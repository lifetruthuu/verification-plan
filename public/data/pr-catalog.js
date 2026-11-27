/* One entry per PR the plan has an opinion about. Curated by hand, never overwritten by the GitHub sync.
 *   implements  work items this PR delivers (open → drives "PR 进行中"; merged → shown grey until the item is accepted)
 *   reuses      work items it is only reused by / coordinated with (shown as 参考, never counts as progress)
 *   scope, note what it covers and what is still missing; valid for reviewedHead only — re-check after the head changes
 * Live state (open / merged, head, review, CI, merge gate) comes from pr-snapshot.js. */
window.PLAN_PR_CATALOG = [
  {
    "n": 920,
    "scope": "AVX 与 APIC 探测、共享叶 0x15 的 TSC 参数",
    "implements": ["CPU_FEAT", "APIC_PROBE", "TSC_VALUE"],
    "reuses": [],
    "note": "原实现由 #706 撤回，#961 在 2711a2627 恢复。APIC 叶 1 条件和模式选择需在真实调用处建立。",
    "reviewedHead": "56c04a329786066a820c083a3a556302f01264f6",
    "reviewedAt": "2026-11-23",
    "evidence": [
      "ostd/specs/context.rs::CpuFeatureModel::from_cpuid，ostd/src/arch/x86/{mod.rs,kernel/tsc.rs,kernel/apic/{xapic,x2apic}.rs} @eb1a9d044",
      "ostd/src/arch/x86/mod.rs::enable_cpu_features @ce76e7de2",
      "ostd/src/arch/x86/{mod.rs,kernel/apic/{xapic,x2apic}.rs,kernel/tsc.rs} 与 ostd/specs/mod.rs @b94500acd",
      "ostd/specs/context.rs，ostd/src/arch/x86/{mod.rs,kernel/apic/{xapic,x2apic}.rs,kernel/tsc.rs} @2711a2627"
    ]
  },
  {
    "n": 919,
    "scope": "已关闭的 PCI 配置与 MSI-X 位域恢复方案",
    "implements": [],
    "reuses": ["PCI_ENC", "PCI_MSIX"],
    "note": "关闭未合并。评审及作者确认位域恢复可从 #706 现有精确公式推出，待真实 PCI 配置或 MSI-X 调用者需要时再证明。",
    "reviewedHead": "47ba456daa39e351e016d37a0373578863985b5c",
    "reviewedAt": "2026-11-24",
    "evidence": [
      "ostd/src/arch/x86/pci.rs::encode_as_port,construct_remappable_msix_address,read32,write32 @d14bae0d0，与主线 @b94500acd 对照",
      "ostd/src/arch/x86/pci.rs::encode_as_port,construct_remappable_msix_address @47ba456da"
    ]
  },
  {
    "n": 706,
    "scope": "主线静态 PIO、PCI 配置端口与编码、MMIO 窗口和按成功结果签发的权限",
    "implements": ["IO_ALLOC", "IO_PIO", "PCI_CFG", "IO_PIO_ALLOC", "IO_MMIO", "IO_GLOBAL", "IO_MMIO_ALLOC", "PCI_ENC"],
    "reuses": [
      "IO_WIN",
      "PIT_CFG",
      "PCI_BAR",
      "APIC_RESERVE",
      "IOAPIC_REG",
      "PCI_MSIX",
      "CPU_FEAT",
      "APIC_PROBE",
      "TSC_VALUE",
      "PCI_TYPES",
      "PT_X86"
    ],
    "note": "最终 head 31813f542 与合入 b94500acd 的源码树相同。PCI read32/write32 已消费静态 PIO，设备事务仍缺互斥与效果合同。MMIO 成功申请返回 FreePermit，builder::remove、IoMem::clone/slice 和自动回收均缺。最终提交保留 #958 的格式化改动，但撤回 #920 的共享 CPUID，xAPIC 实际读取 EDX[8]。 #961 已恢复对应模型与位修正。",
    "reviewedHead": "31813f542ecb1e3190faa152407a5d0218996afa",
    "reviewedAt": "2026-11-23",
    "evidence": [
      "ostd/src/arch/x86/pci.rs::read32,write32,encode_as_port，ostd/src/io/io_port/{mod,allocator}.rs，verified_libs/vstd_extra/src/external/io_port.rs @b94500acd",
      "ostd/src/io/io_mem/{allocator.rs::IoMemAllocatorBuilder::new,IoMemAllocator::acquire,IoMemAllocator::recycle,mod.rs::IoMem::acquire}，ostd/src/util/range_alloc.rs::RangeAllocator::free @b94500acd",
      "ostd/src/arch/x86/{io.rs,kernel/apic/{mod,xapic,x2apic}.rs,kernel/irq/ioapic.rs,kernel/tsc.rs}，ostd/src/bus/pci/{mod,device_info}.rs @b94500acd",
      "verified_libs/vstd_extra/src/external/{iter,ilog2}.rs，ostd/src/mm/frame/{mod,unique}.rs @b94500acd"
    ]
  },
  {
    "n": 895,
    "scope": "已合入 main 11d378516 的 PCI 类型、getter 和位操作",
    "implements": ["PCI_TYPES"],
    "reuses": ["PCI_ENUM", "PCI_CAP", "PCI_MSIX"],
    "note": "主线 b94500acd 仍导出 PciDeviceLocation 并在配置访问处读取字段。PciDeviceId 的声明和导出已注释。zero、IoBar getter、CapabilityVndrData::len 和 set_bit 的合同保留，PCI_TYPES 仍需设备 ID 与枚举或设备构造的真实消费证据。",
    "reviewedHead": "5ed7a2c167d0faaf215beb1b5844fefe125e2a65",
    "reviewedAt": "2026-11-23",
    "evidence": ["ostd/src/bus/pci/{device_info,mod,cfg_space}.rs，ostd/src/arch/x86/pci.rs @b94500acd"]
  },
  {
    "n": 879,
    "scope": "IRQ owner 与 guard 构造；资源创建、恢复与 #900 的状态关系待接线",
    "implements": ["IRQ_MODEL", "IRQ_GUARD"],
    "reuses": [],
    "note": "同步主线后 IRQ 交付文件与前次相同。私有 new 消费 owner 建立嵌套，公开 disable_local 的 owner 来源、实际 Drop 和 #900 的跨模型关系仍缺。",
    "reviewedHead": "27efd7c490c6d6fb101b23e09f30dd48a637700b",
    "reviewedAt": "2026-11-27",
    "evidence": [
      "ostd/specs/task/{mod.rs,irq.rs}，ostd/src/trap/irq.rs @d80181398",
      "ostd/{specs/task/irq.rs,src/trap/irq.rs,src/arch/x86/irq.rs} @27efd7c49"
    ]
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
    "note": "EarlyFrameAllocator::alloc 以 model().can_align(layout) 为前置，结果和状态与 allocate(layout) 对应，失败保持区域尾部。CPU-local 的真实引导输入及全局交接仍待接通。",
    "reviewedHead": "20e6c1e33513ca57d6d68e211bf1bdead3739dae",
    "reviewedAt": "2026-11-26",
    "evidence": [
      "https://github.com/asterinas/vostd/pull/802#discussion_r4520760944",
      "https://github.com/asterinas/vostd/pull/802#discussion_r4520877758",
      "ostd/src/mm/frame/allocator.rs::EarlyFrameAllocator::alloc @20e6c1e33"
    ]
  },
  {
    "n": 887,
    "scope": "x86 用户上下文数据、异常分类与字段保持",
    "implements": ["TRAP_DATA"],
    "reuses": ["IDT_TABLE", "TRAP_EXC"],
    "note": "主线同步保留 x86 UserContext 数据访问和独立字段保持。activate_tls_pointer 的 FSBASE 写入及用户执行仍缺状态合同。",
    "reviewedHead": "d41697db1dbb660c3c0dd86bbaa08362d42d11a9",
    "reviewedAt": "2026-11-27",
    "evidence": [
      "ostd/src/arch/x86/{mod.rs,cpu/context/mod.rs::UserContext::take_exception,trap/mod.rs}，ostd/src/user.rs::UserContextApi @1f8a35856",
      "ostd/src/user.rs，ostd/src/arch/x86/cpu/context/mod.rs @75d5d9558",
      "ostd/src/user.rs，ostd/src/arch/x86/cpu/context/mod.rs @3fd0fe2d5",
      "ostd/src/{user.rs,arch/x86/cpu/context/mod.rs} @d41697db1"
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
    "note": "OpsStack 队列和逻辑 flush 仍在旧分支。当前 head 删除 update 保持页表一致性的引理；与 #935 协调，远端完成仍缺证据。",
    "reviewedHead": "96810b123ca871e0eb6602f0c6b8b02efee2a2e6",
    "reviewedAt": "2026-11-24",
    "evidence": ["ostd/specs/mm/tlb.rs，ostd/src/mm/tlb.rs @96810b123"]
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
    "note": "SlabSlotList::push/pop 给出地址序列和 no_duplicates，pop 交还末项的 HeapSlot 权限。存活链接在内部由原始内存权限维持；Send/Sync 由 unsafe impl 承担，slab 和全局堆需另验。",
    "reviewedHead": "cfb7d80541fb040212c5065765b32addd7e0ebbc",
    "reviewedAt": "2026-11-27",
    "evidence": ["ostd/src/mm/heap/{slot.rs,slot_list.rs} @cfb7d8054"]
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
    "note": "设备地址上界来自当前 stream 的恒等映射。slice::daddr 以基址加偏移，slice::sync 将区间交给 stream，设备一致性与完成条件仍待实证。",
    "reviewedHead": "2ab9e1ce0a0e2382dcedcdf60ff5e22586f7edaf",
    "reviewedAt": "2026-11-27",
    "evidence": [
      "ostd/src/mm/dma/{dma_stream.rs::DmaStreamSlice::sync,DmaStreamSlice::daddr,mod.rs} @f2ed581e0",
      "ostd/src/mm/dma/{dma_stream.rs,mod.rs} @6c589ebbd",
      "ostd/src/mm/dma/{dma_stream.rs,mod.rs} @a41d9e000",
      "ostd/src/mm/dma/{dma_stream.rs,mod.rs} @2ab9e1ce0"
    ]
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
    "scope": "SlabMeta 的容量、分配计数与 AllocDispatch 的布局处理",
    "implements": ["HEAP_GLOBAL", "HEAP_SLAB"],
    "reuses": ["SA_HEAP"],
    "note": "SlabMeta::alloc 在成功时计数加一，空链失败保持计数。Slab::new/dealloc 和大块 HeapSlot 路径仍在注释里，#[global_allocator] 入口未接通。与 #923 核对 slot 权限合同。",
    "reviewedHead": "cb2be5a80af1fa3286752092ec51f6eb9af29d91",
    "reviewedAt": "2026-11-27",
    "evidence": ["ostd/src/mm/heap/{mod,slab,slot}.rs @cb2be5a80"]
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
    "reuses": ["BZ_TRUST"],
    "note": "正向转换由 to_flat_binary 和 new_pe_sec_header 使用。#915 评审接受正常构建的 setup ELF 在 64 位宿主上的 VA 范围假设；BZ_TRUST 复用这项评审依据，实际产物的独立检查仍待交付。",
    "reviewedHead": "b90a2ed913853673161a985cb02c87bbb12ad88c",
    "reviewedAt": "2026-11-27"
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
    "scope": "TSC 单次采样与算术的历史实现",
    "implements": [],
    "reuses": ["TSC_VALUE"],
    "note": "PR head 1055d52e7、当时合入的 35a5722f5 及主线 b94500acd 的 tsc.rs 文件相同。CpuidSamples 记录本次采样，保留 max_leaf <= 0x15 拒绝、Some(0) 及回退时两条 u32 乘积上界假设。实际发布与读取的非零频率仍待核对。 #961 将频率合同重新接到共享 CPUID 模型。",
    "reviewedHead": "1055d52e751b6c380377fc4a78853078a5943bf0",
    "reviewedAt": "2026-11-23",
    "evidence": [
      "ostd/src/arch/x86/kernel/tsc.rs::CpuidSamples::frequency_hz,determine_tsc_freq_via_cpuid,init_tsc_freq @1055d52e7、@35a5722f5、@b94500acd"
    ]
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
    "note": "七个 frame 测试继续实施； linked-list owner getter、ref_count 与测试侧取值合同已调整。真实元数据生命周期、失败与 VM I/O 故障游标继续单独核对。",
    "reviewedHead": "e861fc864cdfbc6d3fad32361498055c010207c2",
    "reviewedAt": "2026-11-26",
    "evidence": [
      "ostd/src/mm/frame/{mod.rs,unique.rs,test.rs::linked_list}，ostd/specs/mm/frame/meta_owners.rs，ostd/src/mm/test.rs @c3b70735c",
      "ostd/src/mm/{frame/test.rs,frame/unique.rs,test.rs,io.rs} @e04dc39a2",
      "ostd/src/mm/frame/{linked_list.rs,unique.rs,test.rs}，ostd/specs/mm/frame/meta_owners.rs @e861fc864"
    ]
  },
  {
    "n": 935,
    "scope": "TLB 每核状态、陈旧条目和 FlushSet 请求记账",
    "implements": ["TLB_REQ"],
    "reuses": ["TLB_SHOOT", "TLB_FREE"],
    "note": "remaining_slots 给出待入队容量。issue 在槽耗尽或操作自身升级时得到 all_user，否则与旧集合取并且容量减一。push_from 合并时也可能升级为非全局全刷，仍缺每核执行、确认及帧保留。",
    "reviewedHead": "606ef10e5e8c73fe29281d89ac83d6ab248f947f",
    "reviewedAt": "2026-11-27",
    "evidence": [
      "ostd/specs/mm/tlb.rs::FlushSet；ostd/src/mm/tlb.rs::issue_tlb_flush_with,OpsStack::push_from @76d55a69d3",
      "ostd/src/mm/tlb.rs::TlbFlushOp::escalates_to_all，ostd/specs/mm/tlb.rs @17dbb8a8c",
      "ostd/src/mm/tlb.rs::TlbFlusher::issue_tlb_flush,OpsStack::push_from，ostd/specs/mm/tlb.rs @606ef10e5"
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
    "note": "共享 Segment 的证明已调整以处理 rlimit；与本计划相关的复用仍限公共库，frame 生命周期另行验收。",
    "reviewedHead": "2128c47df7d6c2d27cfcc2a388be1cdc31f6073b",
    "reviewedAt": "2026-11-26",
    "evidence": ["ostd/src/{arch/riscv/cpu/extension.rs,mm/frame/segment.rs} @2128c47df"]
  },
  {
    "n": 942,
    "scope": "已关闭的内核测试结果分类方案",
    "implements": [],
    "reuses": ["KTEST_RESULT"],
    "note": "已关闭未合并。主线实际测试运行入口的 panic 分类及消息匹配仍待跟踪。",
    "reviewedHead": "3b0821b71b068164347e7d52a8624daf17bd94db",
    "reviewedAt": "2026-11-26",
    "evidence": ["ostd/libs/ostd-test/src/lib.rs::KtestItem::run @3b0821b71"]
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
    "note": "主线工具链为 Rust 1.100.0。#706 在 RangeAllocator::alloc_specific 和 free 中接入 FreePermit，调用者仍需另外建立 MMIO 窗口来源、设备保留和释放后可再次申请的条件。",
    "reviewedHead": "0913d1ce86e749b4a0f8c0a12ef6ef9b2d572cc2",
    "reviewedAt": "2026-11-23",
    "evidence": ["rust-toolchain.toml，ostd/src/util/range_alloc.rs::RangeAllocator::alloc_specific,free @b94500acd"]
  },
  {
    "n": 944,
    "scope": "与 #887 协调共享 UserContextApi 和 TrapFrame 声明",
    "implements": [],
    "reuses": ["TRAP_DATA"],
    "note": "共享 user.rs 与前次一致。分支移动外部异常类型的规格并调整平台 trap/上下文表示。与 #887 合并时仍需核对共享 trait 的 trap-number/error-code 入口。",
    "reviewedHead": "895e242d4f5f9fe7b5e6e81140782141e7ca4667",
    "reviewedAt": "2026-11-27",
    "evidence": ["ostd/src/{user.rs,trap/mod.rs}，verified_libs/vstd_extra/src/external/riscv.rs @895e242d4"]
  },
  {
    "n": 948,
    "scope": "builder 的三种编码、EFI decode_payload 与两个 setup 共用的 ELF 段初始化",
    "implements": ["BZ_ENCODE", "BZ_DECODE", "BZ_LOAD"],
    "reuses": ["BZ_SETUP", "BZ_IMG", "BZ_PE", "BZ_LEGACY_ALLOC", "BZ_EFI_ALLOC", "BZ_EFI_HANDOFF"],
    "note": "按审阅恢复 Vec 返回值及 decoder 内的 unwrap。有效压缩流的读取成功来自 alloc-only 切片解码器的两条 libflate 公理。load_elf 现要求每个 PT_LOAD 满足分配前置。两个 alloc_at 的外部合同均仅给出长度，物理地址、独占使用与入口交接另验。",
    "reviewedHead": "c762f8e27d0bb25af35fc3dd4d55cd4b61d49abc",
    "reviewedAt": "2026-11-27",
    "evidence": [
      "ostd/libs/linux-bzimage/{builder/src/encoder.rs,setup/src/{loader.rs,x86/amd64_efi/{alloc,decoder,efi}.rs,x86/legacy_i386/alloc.rs}}，verified_libs/vstd_extra/src/external/libflate.rs @f06ae789d",
      "ostd/libs/linux-bzimage/setup/src/{loader.rs,x86/amd64_efi/alloc.rs,x86/legacy_i386/alloc.rs} @124914ae2",
      "ostd/libs/linux-bzimage/setup/src/x86/amd64_efi/{efi,decoder}.rs @105a3768c",
      "ostd/libs/linux-bzimage/setup/src/{loader.rs,x86/legacy_i386/alloc.rs,x86/amd64_efi/{alloc,decoder,efi}.rs}，verified_libs/vstd_extra/src/external/{libflate,no_std_io2}.rs @c762f8e27"
    ]
  },
  {
    "n": 951,
    "scope": "已合入 0195b8176 的条件 panic 合同与 Segment::slice 引用计数证明",
    "implements": [],
    "reuses": ["MM_FRAME", "MM_PT", "MM_KVA", "VM_CONTENT"],
    "note": "该版引入 allowed_to_panic_if 并证明 Segment::slice 克隆引用后的计数保持。#978 随后删除该 panic 接口，当前调用者直接建立排除条件。",
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
    "note": "已合入 5d1da312c。IRC11 的失败 CAS 将实际观测值传给 update_fail，增加拒绝用例；SC 原子发布非原子权限的 MutexPerm 等仍依赖手写 Objective。",
    "reviewedHead": "9287da829800aab6cd715d78c43c740591b5e4e2",
    "reviewedAt": "2026-11-26",
    "evidence": [
      "tools/patches/verus-irc11.patch；ostd/src/sync/{mutex,rcu/mod}.rs；ostd/specs/mm/frame/frame_specs.rs @484a329664",
      "verified_libs/vstd_extra/src/atomic_irc11.rs，ostd/src/sync/mutex.rs，tools/tests/irc11_cas_fail_reject.rs @9287da829"
    ]
  },
  {
    "n": 953,
    "scope": "对照合并后的迭代器极值与无符号 ilog2 外部合同",
    "implements": [],
    "reuses": ["IO_WIN", "PT_X86"],
    "note": "主线 b94500acd 的 min/max 在迭代器前提下给出元素归属，极值和相等元素的选择仍依赖 obeys_cmp。ilog2 保留 x > 0 前置，no_unwind 已改为无条件。窗口计算的 max_by 另需证明，页表 parse_flags 仍须建立掩码非零。",
    "reviewedHead": "a9c118ae0e38f9fe27ab9f4f31166c16f259ea6e",
    "reviewedAt": "2026-11-23",
    "evidence": [
      "verified_libs/vstd_extra/src/external/{iter,ilog2}.rs @a9c118ae0",
      "ostd/src/boot/memory_region.rs::max_region_end,most_restrictive_type,next_region_boundary；ostd/src/arch/x86/mm/mod.rs::parse_flags @2f0e25632",
      "verified_libs/vstd_extra/src/external/{iter,ilog2}.rs，ostd/src/arch/x86/{io.rs,mm/mod.rs} @b94500acd"
    ]
  },
  {
    "n": 954,
    "scope": "x86 context_switch 的可信 FFI 权限与返回栈对齐",
    "implements": ["TASK_CTX"],
    "reuses": ["TASK_SW"],
    "note": "同步主线后 FFI 定义相同。cur 返回权限与栈对齐来自可信包装，须由 switch_to_task 建立独占、有效延续和栈寿命。",
    "reviewedHead": "b86b7eab0457543ee2d8b8ea93b4ca9bd90186ba",
    "reviewedAt": "2026-11-27",
    "evidence": [
      "ostd/src/arch/x86/task/{mod.rs::context_switch,switch.S}，ostd/src/task/processor.rs::switch_to_task @10bf577c1",
      "ostd/src/arch/x86/task/mod.rs @504dbdded",
      "ostd/src/arch/x86/task/mod.rs @985ba1905",
      "ostd/src/arch/x86/task/mod.rs @b86b7eab0"
    ]
  },
  {
    "n": 955,
    "scope": "256 项 IDT 的门属性、静态发布和本次 lidt 的描述符见证",
    "implements": ["IDT_TABLE", "IDT_LOAD"],
    "reuses": ["TRAP_DISP"],
    "note": "init 和 published_idt 显式要求 Once 未观察到 poison，VirtAddr::new 要求规范地址。实际 trap 初始化仍须建立这些条件、向量有效性和每核加载，Once 包装的发布关系属可信边界。",
    "reviewedHead": "b00942221571aade60572a7a5bfbee7cb3821dd5",
    "reviewedAt": "2026-11-27",
    "evidence": [
      "ostd/src/arch/x86/{mod.rs,trap/{idt.rs::init,published_idt,trap.S,mod.rs}}，verified_libs/vstd_extra/src/external/{x86_idt,smart_ptr}.rs @4fdc660b8",
      "ostd/src/arch/x86/trap/idt.rs::init，verified_libs/vstd_extra/src/external/x86/idt.rs @02eae00e6",
      "ostd/src/arch/x86/trap/idt.rs::init @c1e430fcd",
      "ostd/src/arch/x86/trap/idt.rs，verified_libs/vstd_extra/src/external/x86/idt.rs @b00942221"
    ]
  },
  {
    "n": 956,
    "scope": "宿主 builder 校验 Efi64 的 setup ELF .rela 节及其相对重定位类型",
    "implements": ["BZ_RELOC"],
    "reuses": ["BZ_ELF", "BZ_OUT", "BZ_EFI_OUT"],
    "note": "随 #978 移除 allowed_to_panic_if。调用者须建立解析安全且成功、节可读及全部条目受支持。Rela64 布局和可读 Rela 节的类型关系已写入 xmas-elf 规约。实际 make_bzimage 仍须由当前 setup ELF 建立这些条件，并记录运行时拒绝后留下的文件内容。",
    "reviewedHead": "e1649d5316dcc2de74e085f4027be71091c12c5b",
    "reviewedAt": "2026-11-27",
    "evidence": [
      "ostd/libs/linux-bzimage/{builder/src/lib.rs::make_bzimage,assert_elf64_reloc_supported,setup/src/x86/linker.ld}，verified_libs/vstd_extra/src/external/xmas_elf.rs @a592aaef6",
      "ostd/libs/linux-bzimage/builder/src/lib.rs::assert_elf64_reloc_supported @394e534a1",
      "ostd/libs/linux-bzimage/builder/src/lib.rs::assert_elf64_reloc_supported @20d189ccb",
      "ostd/libs/linux-bzimage/builder/src/lib.rs::{make_bzimage,assert_elf64_reloc_supported}、verified_libs/vstd_extra/src/external/xmas_elf.rs @e1649d531"
    ]
  },
  {
    "n": 958,
    "scope": "主线移除 fmt_req，并停用 Frame 与 UniqueFrame 的 Debug 实现",
    "implements": [],
    "reuses": ["MM_FRAME", "KTEST_RESULT", "SYNC_GUARD", "SYNC_API", "BZ_RELOC"],
    "note": "#706 最终 head 31813f542 修正了中间版本带回的格式化改动。合入 b94500acd 后，Frame、UniqueFrame、Segment、锁 guard 和 PanicInfo 的相关文件与 #706 合入前一致。#934 的链表测试已适配 Frame 的 Debug 约束。#956 的 panic_display 也沿用当前接口。",
    "reviewedHead": "6ea044c0a5b32b56b8a3509289668d6bdca1356f",
    "reviewedAt": "2026-11-23",
    "evidence": [
      "ostd/src/mm/frame/{mod,unique,segment}.rs，ostd/src/sync/{spin,rwlock,mutex,rwmutex}.rs，ostd/libs/ostd-test/src/lib.rs @22194556e",
      "verified_libs/vstd_extra/src/panic.rs::PanicMessage @068e79fb8",
      "ostd/src/mm/frame/{mod,unique,segment}.rs，ostd/src/sync/{spin,rwlock,mutex,rwmutex}.rs，ostd/libs/ostd-test/src/lib.rs @b94500acd"
    ]
  },
  {
    "n": 959,
    "scope": "每核 FPU 初始化见证、上下文构造与复制、Pod 可变字节视图",
    "implements": ["CPU_ENABLE", "FPU_REPR", "VM_REPR"],
    "reuses": ["CPU_FEAT", "XSAVE", "TRAP_DATA"],
    "note": "当前 FpuInitialization 绑定 XSAVE、执行核和 XCR0，长度对应平台值及该配置所需字节数。需要启动方提供 owner 和平台大小；512 字节 legacy 布局、硬件 save/load 另行验收。",
    "reviewedHead": "7419886cc7be64ae048c88637822f4ceb2c6c2f6",
    "reviewedAt": "2026-11-26",
    "evidence": [
      "ostd/src/arch/x86/{mod.rs::enable_cpu_features,cpu/context/mod.rs::enable_essential_features,FpuInitialization,FpuContext}，ostd/specs/context.rs::CpuFeatureModel::matches_xstates @ce76e7de2",
      "ostd/libs/ostd-pod/src/lib.rs::Pod::as_bytes_mut，verified_libs/vstd_extra/src/external/x86.rs::X86CpuRegisterOwner,FpuOnce @ce76e7de2",
      "ostd/src/arch/x86/cpu/context/mod.rs::FpuInitialization::enabled_on,enable_essential_features @25d3d1dbf",
      "ostd/src/arch/x86/cpu/context/mod.rs::FpuInitialization::enabled_on,FpuContext::new @7419886cc"
    ]
  },
  {
    "n": 963,
    "scope": "xAPIC 物理基址的页对齐与 1024 字节窗口端点上界",
    "implements": ["APIC_RESERVE"],
    "reuses": [],
    "note": "已合入主线 e9b249978。对任意 MSR 读值，结果按 PAGE_SIZE 对齐且 base + 1024 ≤ usize::MAX。apic::init 的 remove 调用仍被注释，窗口归属、排他保留与虚拟映射有效性仍待核对。",
    "reviewedHead": "b5d4b4ea9ba9f33ba346822c2b9bcf75637cbcdc",
    "reviewedAt": "2026-11-23",
    "evidence": [
      "ostd/src/arch/x86/kernel/apic/{xapic.rs::get_xapic_base_address,mod.rs::init} @b5d4b4ea9",
      "ostd/src/arch/x86/kernel/apic/xapic.rs::get_xapic_base_address @e9b249978"
    ]
  },
  {
    "n": 961,
    "scope": "恢复共享 CPUID、APIC 探测和 TSC 参数合同",
    "implements": ["CPU_FEAT", "APIC_PROBE", "TSC_VALUE"],
    "reuses": [],
    "note": "合入 2711a2627，恢复 #920 的共享 CPUID、EDX[9]、AVX 与 TSC 参数合同。APIC 模式选择、CPU 启动权限和频率发布仍待接通。",
    "reviewedHead": "f481a8292f00e7a062ec79458de37abf24adbd3e",
    "reviewedAt": "2026-11-23",
    "evidence": [
      "ostd/specs/context.rs，ostd/src/arch/x86/{mod.rs,kernel/apic/{xapic,x2apic}.rs,kernel/tsc.rs} @2711a2627"
    ]
  },
  {
    "n": 966,
    "scope": "16550 串口的七个寄存器地址和字节端口访问边界",
    "implements": ["SERIAL_QEMU_CMOS"],
    "reuses": ["COM1_SEND"],
    "note": "合入 2aa424ec0。new 的七个连续地址和 u8 访问合法性已由 #979 在 COM1 静态量消费。驱动函数缺少初始化写入、发送数据及设备进展的后置。",
    "reviewedHead": "9b299b02f676e12ecc4a43b3bff0ee9d793e3b44",
    "reviewedAt": "2026-11-24",
    "evidence": [
      "ostd/src/arch/x86/{device/mod.rs,device/serial.rs::SerialPort,serial.rs::CONSOLE_COM1_PORT,mod.rs} @9ba7887b0",
      "ostd/src/arch/x86/device/serial.rs::SerialPort @9b299b02f"
    ]
  },
  {
    "n": 964,
    "scope": "收紧 KVirtArea 分配区间公理和 map_frames 的调用前置",
    "implements": ["MM_KVA"],
    "reuses": [],
    "note": "合入 cfddc3d07。分配器公理约束实际返回区间，map_frames 的范围条件改由调用者建立；映射存活和解除映射仍须验收。",
    "reviewedHead": "b838711e66b7ef844fe0b74efa79356fb5c9c1b4",
    "reviewedAt": "2026-11-23",
    "evidence": ["ostd/src/mm/kspace/kvirt_area.rs::axiom_kvirt_alloc_range_bounds,KVirtArea::map_frames @cfddc3d07"]
  },
  {
    "n": 969,
    "scope": "PIT 与 8259 PIC 的端口、命令及软件写入顺序",
    "implements": ["PIT_CFG", "PIC"],
    "reuses": ["IO_PIO", "IO_PIO_ALLOC", "SERIAL_QEMU_CMOS"],
    "note": "PIT 的三项与 PIC 的十项写入由调用者提供序列，驱动消费前缀并保留后缀。相对上次核对，分支交付文件内容相同；尚须在平台入口建立协议和设备效果。",
    "reviewedHead": "abf9d4c2bafb0f2f91632a5374d32266fe8bd89d",
    "reviewedAt": "2026-11-27",
    "evidence": [
      "ostd/src/arch/x86/{timer/pit.rs::init,kernel/irq/pic.rs::set_mask}，ostd/src/io/io_port/mod.rs::IoPort::write @f2bdb88a6",
      "ostd/src/io/io_port/mod.rs::needs_write_sequence,PortWriteSequence，ostd/src/arch/x86/{device/serial.rs,timer/pit.rs,kernel/irq/pic.rs} @43cc4d8d5",
      "ostd/src/{io/io_port/mod.rs,arch/x86/timer/pit.rs,arch/x86/kernel/irq/pic.rs} @abf9d4c2b"
    ]
  },
  {
    "n": 967,
    "scope": "对良构页表原始项约束 protect 回调",
    "implements": ["MM_PT"],
    "reuses": [],
    "note": "已合入 bf34addf3。protect_next、Entry::protect 及 VmSpace 只对 raw_item_well_formed 的输入要求回调保持 trackedness，仍需在实际映射与权限变更路径验收。",
    "reviewedHead": "649c7c9fba97b2af19d968e23fbbd4b43fb219f6",
    "reviewedAt": "2026-11-24",
    "evidence": ["ostd/src/mm/{page_table/cursor/mod.rs,page_table/node/entry.rs,vm_space.rs} @649c7c9fb"]
  },
  {
    "n": 968,
    "scope": "Verus dyn / Any 工具链补丁",
    "implements": [],
    "reuses": ["MM_FRAME"],
    "note": "工具链补丁提供动态类型能力，dv 的补丁应用方式仍在审阅中；实际 frame 元数据转换和后续证明需独立核对。",
    "reviewedHead": "006eee5009401342981243b7da8e819753a88396",
    "reviewedAt": "2026-11-26",
    "evidence": [
      "dv/src/verus.rs，tools/patches/0004-verus-type-identity.patch @b15d50340",
      "dv/src/verus.rs，tools/patches/0004-verus-type-identity.patch @006eee500"
    ]
  },
  {
    "n": 977,
    "scope": "x86 本核 TLB 刷新与 CR3 写入的调用条件",
    "implements": ["PT_X86", "PT_LOCAL_FLUSH", "PT_FLUSH_NONGLOBAL"],
    "reuses": ["TLB_SHOOT", "MM_BOOT_ACTIVATE"],
    "note": "非空范围要求同一规范地址区且起点页对齐；Range<usize> 的 step_by 模型约束迭代。地址构造保持数值，成功构造 PhysFrame 保持首地址。三个刷新包装和 CR3 写入尚缺硬件状态后置，含全局项刷新与根页读回仍为外部体。",
    "reviewedHead": "06327ccfdfe3b6a5c917a4914bc49e5f22115b30",
    "reviewedAt": "2026-11-27",
    "evidence": [
      "ostd/src/arch/x86/mm/mod.rs，verified_libs/vstd_extra/src/external/{x86,iter}.rs @126316d81",
      "ostd/src/arch/x86/mm/mod.rs，verified_libs/vstd_extra/src/external/{iter,x86}.rs @06327ccfd"
    ]
  },
  {
    "n": 976,
    "scope": "区分页表叶编码和 frame 元数据的物理范围",
    "implements": ["MM_PT"],
    "reuses": ["MM_KVA"],
    "note": "item_wf 对所有叶要求合法层级、按层对齐且整页落在 ARCH_MAX_PADDR 内（x86 排他上界 2^52）。跟踪叶另需有效 frame 元数据，非跟踪叶可超出其覆盖。须由映射调用者建立相应界限。",
    "reviewedHead": "b138a9c0e1e212e28750ad0506c87af765c02072",
    "reviewedAt": "2026-11-27",
    "evidence": [
      "ostd/specs/arch/x86/mod.rs，ostd/src/mm/{kspace/kvirt_area.rs,page_table/cursor/mod.rs} @a69759b8d",
      "ostd/specs/{arch/x86/mod.rs,mm/page_table/cursor/cursor_fn_specs.rs}，ostd/src/mm/page_table/cursor/mod.rs @b138a9c0e"
    ]
  },
  {
    "n": 974,
    "scope": "KVirtArea 映射查询测试与页表路径引理",
    "implements": ["MM_KVA"],
    "reuses": [],
    "note": "主线 fece47de1 启用原 ktest 辅助方法 len/query。query 将 Some 与 owner 的游标叶项对应，允许 addr == end，调用方须提供 guard、元数据一致性与条件 panic。Drop 和 TLB 释放仍待接通。",
    "reviewedHead": "a2402c3a05b0070c09f6e0b02067f709ff64c229",
    "reviewedAt": "2026-11-26",
    "evidence": [
      "ostd/src/mm/kspace/kvirt_area.rs::KVirtArea::query，ostd/specs/mm/page_table/cursor/mapping_set_lemmas.rs @a2402c3a0"
    ]
  },
  {
    "n": 970,
    "scope": "已关闭的 PIT/PIC 端口验证草案",
    "implements": [],
    "reuses": ["PIT_CFG", "PIC"],
    "note": "已关闭未合并。草案曾适配敏感端口宏与 PIT/PIC，当前可组合的接口与后续工作在 #969。",
    "reviewedHead": "19eaccca2c0d1ff265defce63ab8d07187418611",
    "reviewedAt": "2026-11-26",
    "evidence": ["ostd/src/arch/x86/{timer/pit.rs,kernel/irq/pic.rs} @19eaccca2"]
  },
  {
    "n": 979,
    "scope": "COM1 静态寄存器范围、初始化调用及状态位截断",
    "implements": ["SERIAL_QEMU_CMOS", "COM1_SEND"],
    "reuses": ["IO_PIO"],
    "note": "已合入 7cd0bcdcd。审阅后对齐 bitflags 接口，保留无 decreases 的发送轮询。七个地址和 LineSts 的已知位有合同；八次初始化写、发送序列、端口独占与轮询终止仍待验收。",
    "reviewedHead": "ff72fbaa57879aac59165aadefe4ca72405cbce5",
    "reviewedAt": "2026-11-27",
    "evidence": [
      "ostd/src/arch/x86/{mod.rs,serial.rs::CONSOLE_COM1_PORT,line_sts,send}，verified_libs/bitflags/src/lib.rs @ff72fbaa5",
      "ostd/src/{arch/x86/device/serial.rs,io/io_port/allocator.rs,console.rs} @7cd0bcdcd"
    ]
  },
  {
    "n": 981,
    "scope": "引导 MMIO 窗口构造和 ACPI 表查找",
    "implements": ["IO_WIN", "ACPI_TABLES"],
    "reuses": ["EARLY_INFO_INIT"],
    "note": "分支在 EarlyBootInfoInit、端点界及固件前置下给出两个对齐窗口和各启动变体的 ACPI 结果。登记匹配、发布点签发见证、映射可读性以及 MADT/HPET 调用者仍待证明。BIOS 搜索失败保留 None，分支停用此分支的 warn 日志。",
    "reviewedHead": "d3e35705243714a02db50c7785ec479948edd64f",
    "reviewedAt": "2026-11-27",
    "evidence": [
      "ostd/src/{boot/mod.rs,arch/x86/io.rs,arch/x86/kernel/acpi/mod.rs}，verified_libs/vstd_extra/src/external/{acpi,iter,ptr}.rs @d3e357052",
      "ostd/src/arch/x86/{boot/linux_boot/mod.rs,kernel/irq/mod.rs,timer/hpet.rs} @7cd0bcdcd"
    ]
  },
  {
    "n": 984,
    "scope": "每核 GDT 表布局、选择子索引与 TSS 指针参数",
    "implements": ["GDT", "TSS_LOCAL"],
    "reuses": ["LOC_ID"],
    "note": "分支验证本核初始 CS 前置下的索引、描述符表界限和指令参数。StaticStorage::as_ptr 的外部体给出非空与对齐；CPU 归属、目标 TSS 寿命、链接首部和实际加载后置仍缺，trap::init 尚未启用。",
    "reviewedHead": "e89201cb675d61c0ff2b0cfe05439ac01e8cf7ce",
    "reviewedAt": "2026-11-27",
    "evidence": [
      "ostd/src/{arch/x86/trap/gdt.rs,cpu/local/static_cpu_local.rs}，ostd/specs/arch/x86/mod.rs，verified_libs/vstd_extra/src/external/x86.rs @e89201cb6"
    ]
  },
  {
    "n": 983,
    "scope": "恢复 TSC 频率/计数器读取和有特性前置的 RDRAND",
    "implements": ["TSC_VALUE"],
    "reuses": ["TMR_DEADLINE", "CAL_FREQ", "SMP_AP"],
    "note": "tsc_freq 以 Acquire 读取初值为零的原子量，read_tsc 的外部指令可返回任意 u64；分支未恢复 init_tsc_freq 写入。read_random 依赖 CPUID.1:ECX[30]，最多尝试十次。仓内未见 x86 read_random 的真实调用者；采样单调、进展、频率非零及指令特性前置仍需具体消费者建立。",
    "reviewedHead": "75ec8b0531059331caf5090ab3ab6254aa5ef4af",
    "reviewedAt": "2026-11-27",
    "evidence": [
      "ostd/src/arch/x86/{mod.rs,kernel/tsc.rs}，ostd/specs/context.rs，verified_libs/vstd_extra/src/external/x86.rs @75ec8b053",
      "ostd/src/arch/x86/{timer/apic.rs::timer_callback,boot/smp.rs::spin_wait_cycles} @7cd0bcdcd"
    ]
  },
  {
    "n": 978,
    "scope": "移除 may_panic，将可达 panic 的条件交给调用者排除",
    "implements": [],
    "reuses": ["MM_KVA", "MM_FRAME", "MM_PT", "VM_CONTENT", "BZ_LOAD", "BZ_RELOC", "IDT_LOAD"],
    "note": "KVirtArea 映射要求排除包含分配失败的完整条件，Segment 和 VM I/O 的调用方须建立范围、对齐或计数前提。#955、#948、#956 已适配。",
    "reviewedHead": "da9eb9ccfed93019e4ff08dee2dd4baed2fb33d1",
    "reviewedAt": "2026-11-27",
    "evidence": [
      "ostd/src/mm/{kspace/kvirt_area.rs,frame/segment.rs,io.rs}，docs/coding-guidelines/proof-engineering.md @da9eb9ccf"
    ]
  },
  {
    "n": 980,
    "scope": "放宽 UniqueFrame、VM 写入与游标构造的公开前置",
    "implements": ["MM_FRAME", "MM_PT"],
    "reuses": ["VM_CONTENT"],
    "note": "UniqueFrame::from_unused 允许交入已占用或无效地址，Err 保持区域所有者。write_vals 仅在 align > 1 时要求二次幂和两次加 align−1 有界。Cursor、PageTable 和 VmSpace 的游标入口移除 va.end > 0。",
    "reviewedHead": "ccf88d6601d88ea32c2c1bf751791392ac23145e",
    "reviewedAt": "2026-11-27",
    "evidence": ["ostd/src/mm/{frame/unique.rs,io.rs,page_table/cursor/mod.rs,vm_space.rs} @ccf88d660"]
  }
];
