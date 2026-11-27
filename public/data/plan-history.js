/* Change log, oldest first. The last entry is the plan revision shown on the page and in the document.
 * Later edge decisions supersede earlier ones (check-data compares the latest decision with the graph).
 * Append with  plan.mjs rev "reason"  and the edge / log commands, or edit by hand. */
window.PLAN_HISTORY = [
  {
    "revision": 1,
    "date": "2026-11-16",
    "reason": "建立独立计划与 PR 快照；保留现有工作项和依赖。"
  },
  {
    "revision": 2,
    "date": "2026-11-16",
    "reason": "对照 main 97963e831 的源码与各 PR 的最新 head 审查路线、前置依赖和范围：每条依赖补上“用到前置的哪个接口 / 在哪个固定提交核对”，区分开工前置与验收前置，推断关系不再算作阻塞；拆分过粗的工作项，补充遗漏项，移除没有依据的先后关系；#855、#921 已合入，#408 由 #928 取代。",
    "splits": [
      {
        "from": "IO_ALLOC",
        "to": ["IO_ALLOC", "IO_PIO"],
        "why": "PIC、PIT、PCI 配置端口只消费 PIO 端口合同，不消费 MMIO 分配器；APIC、IOAPIC 只消费 MMIO 登记合同。IO_ALLOC 保留 range 与 MMIO 部分。"
      },
      {
        "from": "APIC_PROBE",
        "to": ["APIC_PROBE", "APIC_RESERVE"],
        "why": "模式探测只消费 CPUID；xAPIC 寄存器指针来自 paddr_to_vaddr，不经 IoMem，只有 init 里的窗口保留（remove）接触 IO 分配器。"
      },
      {
        "from": "IOAPIC_REG",
        "to": ["IOAPIC_REG", "IOAPIC_ENTRY"],
        "why": "寄存器级访问只需地址与窗口；重定向项 enable / disable 才消费 IrqLine::num / remapping_index。"
      },
      {
        "from": "SMP_AP",
        "to": ["SMP_AP", "SMP_COMPOSE"],
        "why": "计划把 BSP / AP 编排称为最终集成入口：AP 启动合同与编排 / 发布可见性是两件事，后者是组合验收。"
      },
      {
        "from": "TASK_STACK",
        "to": ["TASK_STACK", "TASK_STACK_ALLOC"],
        "why": "任务切换需要栈的存活、映射与初始 SP；#921 只证明了大小解析。"
      },
      {
        "from": "PCI_CAP",
        "to": ["PCI_CAP", "PCI_MSIX"],
        "why": "capability 链遍历只需配置读取；MSI-X 需要 BAR 映射、remapping 编码与配置写入。"
      },
      {
        "from": "BZ_RANGE",
        "to": ["BZ_RANGE", "BZ_ENCODE"],
        "why": "压缩 / 未压缩 payload 路径（encoder.rs）是独立接口，不消费区间合同。"
      }
    ],
    "added": [
      {
        "id": "PREEMPT_PIN",
        "why": "EOI、APIC timer、AP 启动与缺页路径都用 disable_preempt() 取得 PinCurrentCpu guard；main 与 #900 里它仍是 unimplemented!()，计划此前没有对应工作项。"
      },
      {
        "id": "TASK_RUNTIME",
        "why": "task/mod、scheduler、processor 共 485 行未验证，计划此前没有对应工作项。"
      },
      {
        "id": "later",
        "why": "新增“后续工作”区：LOC_DYNAMIC、HPET、SERIAL_QEMU_CMOS、MM_BOOT、HEAP_GLOBAL、SYNC_WAIT、BZ_SETUP；它们不在当前 x86 关键路径上。"
      },
      {
        "id": "trusted",
        "why": "新增“可信边界”区：TB_BOOT_INPUT、TB_IOMMU、TB_TDX、TB_HW_OPS、TB_ELF_RANGE、TB_EXTABLE_LINK、TB_ALLOC，列出消费它们的工作项。"
      }
    ],
    "edgesRemoved": [
      {
        "a": "PT_CFG",
        "b": "TLB_REQ",
        "why": "#677 消费请求队列、覆盖关系与 TlbModel，#570 用 Mapping / PageTableView；都不消费 PageTableConfig（@c00f702244、@5bdb5d2aad）。"
      },
      {
        "a": "IO_ALLOC",
        "b": "PIC",
        "why": "PIC 只消费 PIO 端口合同：改为 IO_PIO→PIC。"
      },
      {
        "a": "ACPI_MADT",
        "b": "IOAPIC_REG",
        "why": "寄存器级证明可从给定地址开始；MADT 提供基址属 irq::init 的组合，已由 ACPI_MADT→ROUTE_MAP 表达。"
      },
      {
        "a": "IO_ALLOC",
        "b": "PIT_CFG",
        "why": "PIT 只消费 PIO 端口合同：改为 IO_PIO→PIT_CFG。"
      },
      {
        "a": "IO_WIN",
        "b": "APIC_PROBE",
        "why": "模式探测只消费 CPUID；窗口保留拆为 APIC_RESERVE（IO_WIN→APIC_RESERVE）。"
      },
      {
        "a": "LOC_ID",
        "b": "IDT_LOAD",
        "why": "idt::init 不读取 CPU-local 或 CpuId；每 CPU 调用是编排条件，不是依赖。"
      },
      {
        "a": "IRQ_MODEL",
        "b": "IRQLINE",
        "why": "回调锁只消费 guard 的禁中断 / 恢复合同：改为 IRQ_DROP→IRQLINE。"
      },
      {
        "a": "IOAPIC_REG",
        "b": "ROUTE_MAP",
        "why": "ROUTE_MAP 消费的是重定向项 enable / disable：改为 IOAPIC_ENTRY→ROUTE_MAP。"
      },
      {
        "a": "TRAP_DATA",
        "b": "FPU_REPR",
        "why": "FpuContext / XSaveArea / FxSaveArea 不消费 UserContext 或异常分类合同；同文件与 §5 的“依次处理”不构成依赖。"
      },
      {
        "a": "XSAVE",
        "b": "SYSCALL",
        "why": "syscall 汇编入口与 RawUserContext::run 不调用 FPU 保存 / 恢复。"
      },
      {
        "a": "SYSCALL",
        "b": "TASK_SW",
        "why": "任务切换的是 TaskContext，不消费 syscall 合同。"
      },
      {
        "a": "TASK_STACK",
        "b": "TASK_SW",
        "why": "大小解析不足以供应栈存活 / 映射 / 初始 SP：改为 TASK_STACK_ALLOC→TASK_SW。"
      },
      {
        "a": "IO_ALLOC",
        "b": "PCI_CFG",
        "why": "x86 配置空间访问只消费 0xCF8 / 0xCFC 的 PIO 合同：改为 IO_PIO→PCI_CFG。"
      },
      {
        "a": "PCI_ENUM",
        "b": "PCI_BAR",
        "why": "给定 location 即可探测 BAR，不消费完整枚举结果：改为 PCI_CFG→PCI_BAR。"
      },
      {
        "a": "PCI_BAR",
        "b": "PCI_CAP",
        "why": "普通 capability 链与 MSI 标记不消费 BAR，只有 MSI-X 需要：改为 PCI_BAR→PCI_MSIX。"
      },
      {
        "a": "PCI_ENC",
        "b": "PCI_CAP",
        "why": "只有 MSI-X 的 remapping 分支需要编码：改为 PCI_ENC→PCI_MSIX。"
      },
      {
        "a": "PCI_CAP",
        "b": "PCI_IRQ",
        "why": "IRQ 路径消费的是 MSI-X 表项合同：改为 PCI_MSIX→PCI_IRQ。"
      },
      {
        "a": "ROUTE_MAP",
        "b": "PCI_IRQ",
        "why": "MSI-X 投递不经过 ISA→GSI→IOAPIC 路由；remapping 地址来自 IrqLine::remapping_index。"
      },
      {
        "a": "BZ_TRUST",
        "b": "BZ_ELF",
        "why": "登记边界与收窄边界是同一件事的两步，登记本身不提供消费者合同。"
      },
      {
        "a": "F_RECOVER",
        "b": "ACC_IMG",
        "why": "链接检查需要汇编符号与段存在，不要求缺页恢复路径已证明：改为 F_ASM→ACC_IMG。"
      }
    ],
    "edgesAdded": [
      {
        "a": "IO_PIO",
        "b": "PIC",
        "why": "拆分后的 PIO 前置（原 IO_ALLOC）"
      },
      {
        "a": "IO_PIO",
        "b": "PIT_CFG",
        "why": "拆分后的 PIO 前置（原 IO_ALLOC）"
      },
      {
        "a": "IO_PIO",
        "b": "PCI_CFG",
        "why": "拆分后的 PIO 前置（原 IO_ALLOC）"
      },
      {
        "a": "IOAPIC_REG",
        "b": "IOAPIC_ENTRY",
        "why": "IoApic::enable / disable 消费寄存器访问合同"
      },
      {
        "a": "IRQLINE",
        "b": "IOAPIC_ENTRY",
        "why": "IoApic::enable 消费 IrqLine::num / remapping_index"
      },
      {
        "a": "IO_ALLOC",
        "b": "APIC_RESERVE",
        "why": "init 的 xAPIC 分支调用 io_mem_builder.remove(base..base + 1024)"
      },
      {
        "a": "IO_WIN",
        "b": "APIC_RESERVE",
        "why": "保留的范围须属于登记窗口"
      },
      {
        "a": "PREEMPT_PIN",
        "b": "LAPIC_DEV",
        "why": "interrupts_ack 用 disable_preempt() 取得 PinCurrentCpu 后调用 get_or_init(..).eoi()"
      },
      {
        "a": "PREEMPT_PIN",
        "b": "TMR_DEADLINE",
        "why": "timer/apic.rs 三处 disable_preempt()"
      },
      {
        "a": "PREEMPT_PIN",
        "b": "TMR_PERIODIC",
        "why": "timer/apic.rs 三处 disable_preempt()"
      },
      {
        "a": "PREEMPT_PIN",
        "b": "SMP_AP",
        "why": "boot/smp.rs 第 159 行 disable_preempt()"
      },
      {
        "a": "IRQLINE",
        "b": "TRAP_DISP",
        "why": "process_top_half 与回调表由陷阱分派调用"
      },
      {
        "a": "IRQ_DROP",
        "b": "IRQLINE",
        "why": "替换 IRQ_MODEL→IRQLINE"
      },
      {
        "a": "IOAPIC_ENTRY",
        "b": "ROUTE_MAP",
        "why": "替换 IOAPIC_REG→ROUTE_MAP"
      },
      {
        "a": "IRQLINE",
        "b": "TMR_DEADLINE",
        "why": "init_bsp / init_timer 注册 IrqLine 回调"
      },
      {
        "a": "SMP_AP",
        "b": "SMP_COMPOSE",
        "why": "编排验收建立在 AP 启动合同之上"
      },
      {
        "a": "IRQLINE",
        "b": "SMP_IPI",
        "why": "smp::init 用 IrqLine::alloc().on_active(do_inter_processor_call)"
      },
      {
        "a": "LOC_ACC",
        "b": "SMP_IPI",
        "why": "CALL_QUEUES 是 cpu_local!，经 get_on_cpu 跨核访问"
      },
      {
        "a": "GDT",
        "b": "SYSCALL",
        "why": "syscall::init 的安全条件要求 GDT 已初始化"
      },
      {
        "a": "TASK_STACK_ALLOC",
        "b": "TASK_SW",
        "why": "替换 TASK_STACK→TASK_SW"
      },
      {
        "a": "SA_RCU",
        "b": "TASK_SW",
        "why": "switch_to_task 调用 finish_grace_period()"
      },
      {
        "a": "TASK_RUNTIME",
        "b": "TASK_SW",
        "why": "推断：待确认 TASK_SW 是否消费 Task / CurrentTask 合同"
      },
      {
        "a": "IRQ_GUARD",
        "b": "TASK_STACK_ALLOC",
        "why": "flush_tlb 的参数是 &DisabledLocalIrqGuard"
      },
      {
        "a": "PT_X86",
        "b": "TASK_STACK_ALLOC",
        "why": "推断：待确认 flush_tlb 调用的刷新原语"
      },
      {
        "a": "PCI_CFG",
        "b": "PCI_BAR",
        "why": "BAR 探测写全一、读尺寸、恢复原值"
      },
      {
        "a": "IO_ALLOC",
        "b": "PCI_BAR",
        "why": "MemoryBar::new 调用 unsafe IoMem::new"
      },
      {
        "a": "PCI_CFG",
        "b": "PCI_CAP",
        "why": "capability 链只需配置读取"
      },
      {
        "a": "PCI_CAP",
        "b": "PCI_MSIX",
        "why": "MSI-X capability 定位"
      },
      {
        "a": "PCI_BAR",
        "b": "PCI_MSIX",
        "why": "MSI-X table / PBA 所在 BAR"
      },
      {
        "a": "PCI_ENC",
        "b": "PCI_MSIX",
        "why": "remapping 分支的 MSI-X 地址编码"
      },
      {
        "a": "PCI_MSIX",
        "b": "PCI_IRQ",
        "why": "替换 PCI_CAP→PCI_IRQ"
      },
      {
        "a": "TRAP_DISP",
        "b": "PCI_IRQ",
        "why": "回调执行与 EOI 的最终验收"
      },
      {
        "a": "BZ_ELF",
        "b": "BZ_RANGE",
        "why": "to_flat_binary 消费 file_size <= mem_size 等 ELF 段条件"
      },
      {
        "a": "F_ASM",
        "b": "ACC_IMG",
        "why": "替换 F_RECOVER→ACC_IMG"
      }
    ],
    "prs": "#855 已合入 41ccd7463（main 含 #928、#929）；#921 已合入 97963e831；#916 于审查期间合入 c25ca6f98；#408 已关闭，由 #928 取代；#706、#927 的 head 在审查期间更新，#930 未关联（见 reviewedCandidates）。"
  },
  {
    "revision": 3,
    "date": "2026-11-16",
    "reason": "复核当前 main、相关 PR 的固定 head、审阅及 CI；期间追踪 #927/#931 新 head 与 #932 合入。按接口粒度拆分前置，补回完成 x86 所需的公共模块、DMA coherent/登记与最终范围验收。首个 BSP 中断里程碑不再代表整个 x86 范围；已复核的配置合同独立结项，验收依赖不再显示为无法开工。",
    "splits": [
      {
        "from": "TASK_RUNTIME",
        "to": ["TASK_RUNTIME", "TASK_COMPOSE"],
        "why": "current-task/park-unpark 的局部状态合同与 TaskBuilder、默认 FIFO、实际切换及远端抢占通知的组合分开，避免所有消费者都等待完整调度路径。"
      },
      {
        "from": "SA_DMA",
        "to": ["SA_DMA", "DMA_MAP"],
        "why": "stream slice 同步不覆盖 coherent、全局映射登记、cache policy 和释放；main 的 registry 插入与硬件映射调用仍有注释路径。"
      },
      {
        "from": "IO_ALLOC",
        "to": ["IO_ALLOC", "IO_MMIO", "IO_GLOBAL"],
        "why": "窗口资源算法、映射/访问和全局初始化是不同消费者合同。"
      },
      {
        "from": "IO_PIO",
        "to": ["IO_PIO", "IO_PIO_ALLOC"],
        "why": "静态端口消费者不需要动态 allocator/显式释放完成。"
      },
      {
        "from": "LOC_ALLOC",
        "to": ["LOC_ALLOC", "LOC_EARLY_GLOBAL"],
        "why": "#802 实例 alloc 已证明不等于全局分配返回可写独占内存。"
      },
      {
        "from": "LOC_ACC",
        "to": ["LOC_ACC", "LOC_REMOTE", "LOC_CELL"],
        "why": "get_with、跨核共享 get_on_cpu 和单指令 CpuLocalCell 不消费相同 guard。"
      },
      {
        "from": "TASK_SW",
        "to": ["TASK_SW", "TASK_CTX"],
        "why": "低层 context_switch ABI 可独立推进；processor 的资源交接另行组合。"
      },
      {
        "from": "XSAVE",
        "to": ["XSAVE", "CPU_ENABLE"],
        "why": "AP 初始化只需要控制寄存器/特性启用，不等待 FPU clone/save/load 全部证明。"
      },
      {
        "from": "VM_POD",
        "to": ["VM_POD", "VM_REPR"],
        "why": "桥接合同与测试验收拆开，read_val 不等待整个测试 PR。"
      },
      {
        "from": "CAL_FREQ",
        "to": ["CAL_FREQ", "TSC_VALUE"],
        "why": "deadline 消费频率值/发布合同，不需要 PIT 回退校准整体完成。"
      },
      {
        "from": "PCI_ENUM",
        "to": ["PCI_ENUM", "PCI_DEVICE"],
        "why": "location 遍历与完整设备构造分别验收，避免枚举和 BAR/capability 相互等待。"
      }
    ],
    "moved": [
      {
        "id": "MM_BOOT",
        "from": "later",
        "to": "nodes",
        "why": "不在首个 BSP 中断路径不等于不在完成 x86 的当前范围。ostd/src/mm/kspace/mod.rs::init_kernel_page_table,activate_kernel_page_table; ostd/src/mm/frame/allocator.rs::init @97963e831"
      },
      {
        "id": "LOC_DYNAMIC",
        "from": "later",
        "to": "nodes",
        "why": "不在首个 BSP 中断路径不等于不在完成 x86 的当前范围。ostd/src/cpu/local/dyn_cpu_local.rs @97963e831"
      },
      {
        "id": "SYNC_WAIT",
        "from": "later",
        "to": "nodes",
        "why": "不在首个 BSP 中断路径不等于不在完成 x86 的当前范围。ostd/src/sync/wait.rs::WaitQueue,Waker @97963e831"
      },
      {
        "id": "HPET",
        "from": "later",
        "to": "nodes",
        "why": "不在首个 BSP 中断路径不等于不在完成 x86 的当前范围。ostd/src/arch/x86/timer/hpet.rs::Hpet::new @97963e831"
      },
      {
        "id": "SERIAL_QEMU_CMOS",
        "from": "later",
        "to": "nodes",
        "why": "不在首个 BSP 中断路径不等于不在完成 x86 的当前范围。ostd/src/arch/x86/serial.rs::init; qemu.rs::exit_qemu; device/cmos.rs @97963e831"
      },
      {
        "id": "HEAP_GLOBAL",
        "from": "later",
        "to": "nodes",
        "why": "不在首个 BSP 中断路径不等于不在完成 x86 的当前范围。ostd/src/mm/heap/mod.rs::AllocDispatch,GlobalHeapAllocator @97963e831"
      },
      {
        "id": "BZ_SETUP",
        "from": "later",
        "to": "nodes",
        "why": "不在首个 BSP 中断路径不等于不在完成 x86 的当前范围。ostd/libs/linux-bzimage/setup/src/loader.rs::load_elf; setup/src/main.rs @97963e831"
      }
    ],
    "added": [
      {
        "id": "IO_PIO_ALLOC",
        "why": "#706 的 acquire/acquire_overlapping、reserve_io_port_range、动态 claim 和 consuming drop(self)；核对自动 Drop 改写后的真实调用者。"
      },
      {
        "id": "IO_MMIO",
        "why": "#706 的 IoMem::new/acquire/slice、VmIo/VmIoOnce 与映射存活；当前 new/acquire/设备访问仍 external，obeys_vmio_* 为 false，不能向设备调用者提供完整访问保证。"
      },
      {
        "id": "IO_GLOBAL",
        "why": "把局部 builder/PIO allocator 与 io::init 的 Once 状态、注册窗口和动态分配权限相连，验证全局入口能获得所需资源。"
      },
      {
        "id": "MM_FRAME",
        "why": "补 FrameAllocOptions、Frame/Segment 元数据初始化、引用计数/类型转换、所有权移交和释放合同；#720 的类型接口仅按实际调用复用。"
      },
      {
        "id": "MM_PT",
        "why": "覆盖 cursor map/unmap/protect/query、item 原始转换和 frame 所有权往返，消解或逐项登记现存 external/admit/assume；#855 的常量证明不覆盖这些接口。"
      },
      {
        "id": "MM_KVA",
        "why": "交付 map_frames/map_untracked_frames、区间分配、range 与 Drop 的局部映射合同；显式区分指针算术、映射已生效和远端 TLB 安全释放。"
      },
      {
        "id": "KFAULT_MAP",
        "why": "单列 handle_kernel_page_fault：合法缺页范围/error code、对齐、Untracked(paddr,1,prop) 映射与返回；这条分支不同于用户可失败复制的 ExTable 恢复。"
      },
      {
        "id": "LOC_EARLY_GLOBAL",
        "why": "把 #802 的实例数值证明接到全局 early_alloc/init_early_allocator，给出每次分配的可写区域与跨次不重叠、既有分配保留合同。"
      },
      {
        "id": "LOC_REMOTE",
        "why": "交付 CpuLocal::get_on_cpu、StaticStorage::get_ptr_on_target 的索引、存活与 T: Sync 共享合同；无需 get_with 的 IRQ guard。"
      },
      {
        "id": "LOC_CELL",
        "why": "覆盖 load/store、加减/位操作的单指令 CPU 归属、环绕算术与 as_mut_ptr 的借用条件；不能由 CpuLocal::get_with 证明替代。"
      },
      {
        "id": "SYNC_GUARD",
        "why": "连接 SpinGuardian、GuardTransfer、PreemptDisabled、LocalIrqDisabled、WriteIrqDisabled 与实际 guard 生命周期；已有锁内存不变式证明不能代替硬件禁中断/不迁移状态。"
      },
      {
        "id": "SYNC_API",
        "why": "核对阻塞锁、升级/降级、借用及解锁 API 与 WaitQueue 的执行合同，登记 RwArc 外部体；不把 LOC 已验证比例当 API 组合完成。"
      },
      {
        "id": "TASK_CTX",
        "why": "在有效的 cur/nxt 上下文、独占资源和栈输入条件下建立保存恢复寄存器、RSP/RIP/FSBASE 与返回约定；复用 #870 的数据方法证明。"
      },
      {
        "id": "CPU_ENABLE",
        "why": "从 XSAVE 拆出 enable_cpu_features/enable_essential_features 的 CR0/CR4/EFER/XCR0、XSAVE 区大小与 Once 发布合同。"
      },
      {
        "id": "VM_REPR",
        "why": "建立 Pod 位表示、Rust slice 与 VmIoOwner/MemView 的字节对应及布局合同；测试用例本身不能作为 read_val 证明的前置。"
      },
      {
        "id": "TSC_VALUE",
        "why": "从 CAL_FREQ 拆出采样频率的 Hz 单位、非零/范围以及 TSC_FREQ Once 发布/读取合同；给定合格采样即可证明消费者。"
      },
      {
        "id": "PCI_DEVICE",
        "why": "把 PciCommonDevice::new 的 command 设置、BAR 管理器、capability/MSI-X 构造与总线登记组合；枚举循环本身可以先证明。"
      },
      {
        "id": "BOOT_COMMON",
        "why": "验证 BootInfo 发布/访问、init_after_heap 对 command-line/memory-region 的保存和 call_ostd_main 的入口条件；纳入普通 lib 初始化关闭路径的清单。"
      },
      {
        "id": "COMMON_AUDIT",
        "why": "逐模块盘点未被工作项覆盖的 cpu/set、user::UserMode、timer/jiffies、console/logger/panic、util、ostd-pod/ostd-test、辅助库入口；每个未启用函数/占位/可信体必须有归属，不以 LOC 颜色推断完整性。"
      },
      {
        "id": "ACC_SCOPE",
        "why": "在一个固定集成提交上启用计划内执行路径，分别验证 OSTD 与 bzImage，逐 API 对照清单；记录构建产物、运行结果、剩余可信输入与尚未证明的性质。"
      }
    ],
    "edgesRemoved": [
      {
        "a": "PT_CFG",
        "b": "PT_X86",
        "why": "CR3/INVLPG 与范围刷新用 x86 的 PAGE_SIZE 和根页输入条件；不需要重新完成整个 PageTableConfig。常量合同已经可用。"
      },
      {
        "a": "IO_WIN",
        "b": "IOAPIC_REG",
        "why": "给定基址与窗口权限可证明寄存器访问；固件地址对应窗口的组合归 ROUTE_MAP。"
      },
      {
        "a": "LOC_ALLOC",
        "b": "LOC_STORE",
        "why": "实例数值合同不能供应 copy_bsp_for_ap 所需全局独占可写内存，替换为 LOC_EARLY_GLOBAL。"
      },
      {
        "a": "LOC_ACC",
        "b": "SMP_IPI",
        "why": "CALL_QUEUES 用 get_on_cpu，不消费 get_with 的 IRQ guard 接口。"
      },
      {
        "a": "IRQ_DROP",
        "b": "IRQLINE",
        "why": "只覆盖 WriteIrqDisabled 的写侧；读侧还消费禁抢占，改为 SYNC_GUARD 合同。"
      },
      {
        "a": "CPU_FEAT",
        "b": "XSAVE",
        "why": "采样到控制寄存器效果先由 CPU_ENABLE 交付。"
      },
      {
        "a": "VM_POD",
        "b": "VM_CONTENT",
        "why": "测试包未提供 read_val 所需的 Pod/buffer 字节桥接合同，替换为 VM_REPR。"
      },
      {
        "a": "CAL_FREQ",
        "b": "TMR_DEADLINE",
        "why": "deadline 只需要 tsc_freq 的 Hz/非零/发布合同；替换为 TSC_VALUE。"
      },
      {
        "a": "IO_ALLOC",
        "b": "PCI_BAR",
        "why": "MemoryBar::new 使用 unsafe IoMem::new，不调用窗口 allocator；改为 IO_MMIO 映射接口。"
      },
      {
        "a": "IO_WIN",
        "b": "PCI_BAR",
        "why": "固定 #706 head 的 IoMem::new requires 不含窗口登记；unsafe MMIO 区域合法性仍须证明，但不能臆造 IO_WIN 阻塞。"
      }
    ],
    "edgesAdded": [
      {
        "a": "TASK_RUNTIME",
        "b": "TASK_COMPOSE",
        "why": "组合使用当前任务引用、运行权和 park/unpark 的状态合同。"
      },
      {
        "a": "TASK_SW",
        "b": "TASK_COMPOSE",
        "why": "reschedule 和 kernel_task_entry 消费实际切换及 after_switching_to 的资源交接。"
      },
      {
        "a": "TASK_STACK_ALLOC",
        "b": "TASK_COMPOSE",
        "why": "TaskBuilder::build 建立栈存活和 end_vaddr()-16 的初始 SP。"
      },
      {
        "a": "PREEMPT_PIN",
        "b": "TASK_COMPOSE",
        "why": "set_need_preempt 和 FIFO local_rq_with 用 guard.current_cpu 选择当前核分支和队列。"
      },
      {
        "a": "SMP_IPI",
        "b": "TASK_COMPOSE",
        "why": "set_need_preempt 的远端分支以 inter_processor_call 调用目标 CPU 的 cpu_local::set_need_preempt；不承诺该 API 未提供的必达。"
      },
      {
        "a": "SYNC_GUARD",
        "b": "TASK_COMPOSE",
        "why": "默认 FIFO 通过 disable_irq().lock() 保护 run queue；不能仅信任注入调度器而漏掉内置实现。"
      },
      {
        "a": "TRAP_DATA",
        "b": "TASK_COMPOSE",
        "why": "TaskBuilder::build 从 UserContext::tls_pointer 初始化 TaskContext 的 TLS 字段。"
      },
      {
        "a": "TASK_COMPOSE",
        "b": "ACC_SCOPE",
        "why": "将任务创建、默认调度和远端通知纳入最终当前范围验收。"
      },
      {
        "a": "DMA_MAP",
        "b": "SA_DMA",
        "why": "stream 同步最终使用 map 建立的设备地址、存活与一致性条件；slice 局部证明可先行。"
      },
      {
        "a": "SYNC_GUARD",
        "b": "DMA_MAP",
        "why": "DMA_MAPPING_SET 的 SpinLock 及 DmaCoherent/DmaStream 的 RwArc 消费 PreemptDisabled guard 合同。"
      },
      {
        "a": "MM_PT",
        "b": "DMA_MAP",
        "why": "待恢复的非一致性 coherent 分支消费 protect_flush_tlb 的 cache policy 映射更新合同。"
      },
      {
        "a": "PT_X86",
        "b": "DMA_MAP",
        "why": "protect_flush_tlb 的现存注释实现调用 tlb_flush_addr(range.start)，只能确认本地刷新合同。"
      },
      {
        "a": "TLB_SHOOT",
        "b": "DMA_MAP",
        "why": "待确认：原 cache policy 路径仅本地刷新；是否需要远端失效须补并发访问与平台一致性条件，不能从函数名推定。"
      },
      {
        "a": "IO_PIO",
        "b": "IO_PIO_ALLOC",
        "why": "typed port 的 valid_io_port_access、宽度与构造合同"
      },
      {
        "a": "IO_ALLOC",
        "b": "IO_GLOBAL",
        "why": "已登记窗口的 builder 与保留状态"
      },
      {
        "a": "IO_WIN",
        "b": "IO_GLOBAL",
        "why": "builder.has_registered_windows() 的引导来源"
      },
      {
        "a": "IO_PIO_ALLOC",
        "b": "IO_GLOBAL",
        "why": "敏感端口保留后发布全局 allocator 的权限状态"
      },
      {
        "a": "IO_ALLOC",
        "b": "IOAPIC_REG",
        "why": "IoApicAccess::new 保留 [base,base+0x20) 时的 remove 权限合同"
      },
      {
        "a": "IO_WIN",
        "b": "ROUTE_MAP",
        "why": "irq::init 将 MADT 的 IOAPIC 地址对应到可保留窗口；须证明地址落在登记窗口且未分配"
      },
      {
        "a": "APIC_RESERVE",
        "b": "APIC_PUB",
        "why": "xAPIC 分支只有 remove 成功后发布 APIC_TYPE；x2APIC 分支不消费该条件"
      },
      {
        "a": "PT_CFG",
        "b": "MM_PT",
        "why": "PageTableConfig 布局/顶层范围引理与当前 x86 PagingConstsTrait"
      },
      {
        "a": "MM_FRAME",
        "b": "MM_PT",
        "why": "页表节点和映射 frame 的有效元数据、引用计数及所有权转移合同"
      },
      {
        "a": "MM_PT",
        "b": "MM_KVA",
        "why": "map_frames/map_untracked_frames 消费 cursor 映射与所有权保持合同"
      },
      {
        "a": "MM_KVA",
        "b": "IO_MMIO",
        "why": "IoMem::new 的 KVirtArea::map_untracked_frames 结果、映射存活与范围合同"
      },
      {
        "a": "MM_PT",
        "b": "MM_BOOT",
        "why": "构造内核映射与 boot_pt 接管的页表合同"
      },
      {
        "a": "PT_X86",
        "b": "MM_BOOT",
        "why": "激活已构造根页、读取 boot 根页的 CR3 效果合同"
      },
      {
        "a": "MM_FRAME",
        "b": "MM_BOOT",
        "why": "元数据 pages 与全局 frame allocator 的初始化/可用区间合同"
      },
      {
        "a": "MM_BOOT",
        "b": "KFAULT_MAP",
        "why": "KERNEL_PAGE_TABLE 已发布与线性映射区间/物理地址对应合同"
      },
      {
        "a": "MM_PT",
        "b": "KFAULT_MAP",
        "why": "cursor_mut/map(Untracked) 的映射与失败合同"
      },
      {
        "a": "PREEMPT_PIN",
        "b": "KFAULT_MAP",
        "why": "创建 cursor 时保持当前 CPU 的 pin 与释放合同"
      },
      {
        "a": "LOC_ALLOC",
        "b": "LOC_EARLY_GLOBAL",
        "why": "实例 allocated_regions 与 alloc 的边界和保留合同"
      },
      {
        "a": "LOC_EARLY_GLOBAL",
        "b": "LOC_STORE",
        "why": "AP 地址数组和各 CPU 存储的两个 early_alloc 调用需要跨次不重叠可写资源"
      },
      {
        "a": "LOC_EARLY_GLOBAL",
        "b": "MM_BOOT",
        "why": "frame allocator 初始化排除 early 阶段已经分配的范围"
      },
      {
        "a": "LOC_ID",
        "b": "LOC_REMOTE",
        "why": "逻辑 CPU 索引与 get_ap/静态存储地址的对应关系"
      },
      {
        "a": "LOC_ID",
        "b": "LOC_CELL",
        "why": "单次指令使用当前 GS 存储、offset 布局和逻辑 CPU 对应"
      },
      {
        "a": "LOC_CELL",
        "b": "PREEMPT_PIN",
        "why": "inc_guard_count/dec_guard_count 的单指令计数合同；避免依赖需要本 guard 的高级锁接口"
      },
      {
        "a": "LOC_REMOTE",
        "b": "LAPIC_INST",
        "why": "APIC_INSTANCE.get_on_cpu(current_racy()) 的槽存活和共享访问合同"
      },
      {
        "a": "LOC_REMOTE",
        "b": "SMP_IPI",
        "why": "目标 CPU 队列索引、T: Sync 与存储生命周期"
      },
      {
        "a": "LOC_CELL",
        "b": "TRAP_DISP",
        "why": "KERNEL_INTERRUPT_NESTED_LEVEL 的同核单指令加减与恢复"
      },
      {
        "a": "MM_FRAME",
        "b": "LOC_DYNAMIC",
        "why": "每 CPU chunk 的连续 Segment、元数据与独占内存"
      },
      {
        "a": "IRQ_DROP",
        "b": "SYNC_GUARD",
        "why": "LocalIrqDisabled/WriteIrqDisabled 写侧的创建、转移与 IF 恢复"
      },
      {
        "a": "PREEMPT_PIN",
        "b": "SYNC_GUARD",
        "why": "PreemptDisabled 与 WriteIrqDisabled 读侧的不迁移/释放合同"
      },
      {
        "a": "SYNC_GUARD",
        "b": "IRQLINE",
        "why": "Inner.callbacks 的读/写 guardian 及 guard 转移恢复合同"
      },
      {
        "a": "SYNC_GUARD",
        "b": "SMP_IPI",
        "why": "CALL_QUEUES 的 SpinLock 保持原子模式、队列互斥和释放合同"
      },
      {
        "a": "TASK_RUNTIME",
        "b": "SYNC_WAIT",
        "why": "当前 Task 的有效引用、park_current/unpark_target 的状态转换与唤醒合同"
      },
      {
        "a": "SYNC_WAIT",
        "b": "SYNC_API",
        "why": "Mutex/RwMutex 的 WaitQueue 等待及唤醒保证"
      },
      {
        "a": "SYNC_GUARD",
        "b": "SYNC_API",
        "why": "读写锁/RwArc 持锁期间的运行模式与释放合同"
      },
      {
        "a": "LOC_CELL",
        "b": "TASK_RUNTIME",
        "why": "CURRENT_TASK_PTR 的同核读取、Arc 来源和有效引用条件"
      },
      {
        "a": "TASK_STACK",
        "b": "TASK_STACK_ALLOC",
        "why": "KERNEL_STACK_SIZE 的页面倍数与上界；零长度和加上 guard pages 的溢出仍须另证"
      },
      {
        "a": "MM_FRAME",
        "b": "TASK_STACK_ALLOC",
        "why": "alloc_segment_with 返回连续、存活的栈 frames 与失败资源保持"
      },
      {
        "a": "MM_KVA",
        "b": "TASK_STACK_ALLOC",
        "why": "map_frames 保留 4 页 guard 区间及有效栈映射，初始 SP 在映射末端"
      },
      {
        "a": "TASK_CTX",
        "b": "TASK_SW",
        "why": "cur/nxt 独占上下文和有效栈满足 context_switch 的 ABI/恢复合同"
      },
      {
        "a": "IRQ_DROP",
        "b": "TASK_SW",
        "why": "forget(irq_guard) 到 after_switching_to 的跨栈恢复权限；末尾 enable_local 的前提"
      },
      {
        "a": "MM_FRAME",
        "b": "SMP_AP",
        "why": "AP_BOOT_STACK_SIZE 的连续 Segment 存活到 AP 使用结束"
      },
      {
        "a": "MM_BOOT",
        "b": "SMP_AP",
        "why": "boot_pt::with_borrow 的根页、线性映射栈地址与 activate_kernel_page_table 效果"
      },
      {
        "a": "SMP_AP",
        "b": "SMP_IPI",
        "why": "construct_hw_cpu_id_mapping 给出 CpuId 索引到在线 HwCpuId 的完整映射"
      },
      {
        "a": "MM_FRAME",
        "b": "TLB_FREE",
        "why": "page_keeper 持有 Frame 所有权并延迟最终释放，不能仅传入 frame 就视为保留"
      },
      {
        "a": "CPU_FEAT",
        "b": "CPU_ENABLE",
        "why": "特性采样的叶支持与位判断合同"
      },
      {
        "a": "CPU_ENABLE",
        "b": "XSAVE",
        "why": "已启用控制寄存器和保存区掩码/长度合同"
      },
      {
        "a": "VM_REPR",
        "b": "VM_CONTENT",
        "why": "read_val 的 Pod 值和实际读取字节之间的关系"
      },
      {
        "a": "VM_REPR",
        "b": "VM_POD",
        "why": "内容断言消费 Pod/切片的实际字节桥接合同"
      },
      {
        "a": "TSC_VALUE",
        "b": "TMR_DEADLINE",
        "why": "init_deadline_mode_config 消费 tsc_freq() 并计算间隔"
      },
      {
        "a": "TSC_VALUE",
        "b": "CAL_FREQ",
        "why": "CPUID/PIT 选择后发布的频率值合同"
      },
      {
        "a": "SYSCALL",
        "b": "SMP_COMPOSE",
        "why": "ap_early_entry 的 trap::init 消费 GDT/IDT/syscall 初始化结果"
      },
      {
        "a": "TRAP_DISP",
        "b": "SMP_COMPOSE",
        "why": "开中断前已安装入口并能安全分派"
      },
      {
        "a": "CPU_ENABLE",
        "b": "SMP_COMPOSE",
        "why": "enable_cpu_features 的每核控制寄存器已配置状态"
      },
      {
        "a": "TMR_DEADLINE",
        "b": "SMP_COMPOSE",
        "why": "init_on_ap 的 deadline 分支配置和回调就绪状态"
      },
      {
        "a": "TMR_PERIODIC",
        "b": "SMP_COMPOSE",
        "why": "init_on_ap 的 periodic 分支配置和回调就绪状态"
      },
      {
        "a": "TASK_RUNTIME",
        "b": "SMP_COMPOSE",
        "why": "AP late entry 后 yield_now 的调度输入与 bootstrap 不返回条件"
      },
      {
        "a": "IO_MMIO",
        "b": "PCI_BAR",
        "why": "MemoryBar::new 消费 IoMem::new 的映射范围、存活和 cache/flags 合同"
      },
      {
        "a": "IO_MMIO",
        "b": "PCI_MSIX",
        "why": "表项 write_once/read_once 的有效范围与设备可见写入；仅有 BAR 地址合同不够"
      },
      {
        "a": "IRQLINE",
        "b": "PCI_MSIX",
        "why": "set_interrupt_vector 取 num/remapping_index 并持有 IrqLine，克隆/替换须保留生命周期"
      },
      {
        "a": "PCI_ENUM",
        "b": "PCI_DEVICE",
        "why": "有效 location 遍历与无设备判断"
      },
      {
        "a": "PCI_BAR",
        "b": "PCI_DEVICE",
        "why": "BarManager 的六槽/桥接类型与映射合同"
      },
      {
        "a": "PCI_CAP",
        "b": "PCI_DEVICE",
        "why": "capability 链有界遍历与结果"
      },
      {
        "a": "PCI_MSIX",
        "b": "PCI_DEVICE",
        "why": "遇到 MSI-X capability 时的构造和启用合同"
      },
      {
        "a": "ACPI_TABLES",
        "b": "HPET",
        "why": "ACPI HPET 表发现、基址和字段可读合同"
      },
      {
        "a": "ROUTE_MAP",
        "b": "HPET",
        "why": "Hpet::new 调用 IRQ_CHIP.map_isa_pin_to(irq,0)，需映射句柄与释放合同；仅约束完整构造，getter 可先证明"
      },
      {
        "a": "IO_PIO",
        "b": "SERIAL_QEMU_CMOS",
        "why": "串口/QEMU/CMOS 静态端口访问宽度与权限合同"
      },
      {
        "a": "ACPI_TABLES",
        "b": "SERIAL_QEMU_CMOS",
        "why": "CMOS 的 FADT 世纪寄存器编号来源，仅约束 CMOS 子项"
      },
      {
        "a": "SA_HEAP",
        "b": "HEAP_GLOBAL",
        "why": "slab 自由槽的 LIFO、独占内存与布局合同"
      },
      {
        "a": "MM_FRAME",
        "b": "HEAP_GLOBAL",
        "why": "slab/大分配使用 frame/Segment 的存活与回收合同"
      },
      {
        "a": "LOC_ACC",
        "b": "ACC_SCOPE",
        "why": "当前范围的 LOC_ACC 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      },
      {
        "a": "VM_POD",
        "b": "ACC_SCOPE",
        "why": "当前范围的 VM_POD 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      },
      {
        "a": "TLB_FREE",
        "b": "ACC_SCOPE",
        "why": "当前范围的 TLB_FREE 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      },
      {
        "a": "CAL_FREQ",
        "b": "ACC_SCOPE",
        "why": "当前范围的 CAL_FREQ 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      },
      {
        "a": "SMP_COMPOSE",
        "b": "ACC_SCOPE",
        "why": "当前范围的 SMP_COMPOSE 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      },
      {
        "a": "XSAVE",
        "b": "ACC_SCOPE",
        "why": "当前范围的 XSAVE 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      },
      {
        "a": "TASK_SW",
        "b": "ACC_SCOPE",
        "why": "当前范围的 TASK_SW 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      },
      {
        "a": "PCI_IRQ",
        "b": "ACC_SCOPE",
        "why": "当前范围的 PCI_IRQ 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      },
      {
        "a": "SA_DMA",
        "b": "ACC_SCOPE",
        "why": "当前范围的 SA_DMA 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      },
      {
        "a": "BZ_TRUST",
        "b": "ACC_SCOPE",
        "why": "当前范围的 BZ_TRUST 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      },
      {
        "a": "BZ_ENCODE",
        "b": "ACC_SCOPE",
        "why": "当前范围的 BZ_ENCODE 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      },
      {
        "a": "ACC_RUN",
        "b": "ACC_SCOPE",
        "why": "当前范围的 ACC_RUN 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      },
      {
        "a": "IO_GLOBAL",
        "b": "ACC_SCOPE",
        "why": "当前范围的 IO_GLOBAL 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      },
      {
        "a": "KFAULT_MAP",
        "b": "ACC_SCOPE",
        "why": "当前范围的 KFAULT_MAP 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      },
      {
        "a": "LOC_DYNAMIC",
        "b": "ACC_SCOPE",
        "why": "当前范围的 LOC_DYNAMIC 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      },
      {
        "a": "SYNC_API",
        "b": "ACC_SCOPE",
        "why": "当前范围的 SYNC_API 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      },
      {
        "a": "PCI_DEVICE",
        "b": "ACC_SCOPE",
        "why": "当前范围的 PCI_DEVICE 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      },
      {
        "a": "HPET",
        "b": "ACC_SCOPE",
        "why": "当前范围的 HPET 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      },
      {
        "a": "SERIAL_QEMU_CMOS",
        "b": "ACC_SCOPE",
        "why": "当前范围的 SERIAL_QEMU_CMOS 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      },
      {
        "a": "HEAP_GLOBAL",
        "b": "ACC_SCOPE",
        "why": "当前范围的 HEAP_GLOBAL 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      },
      {
        "a": "BZ_SETUP",
        "b": "ACC_SCOPE",
        "why": "当前范围的 BZ_SETUP 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      },
      {
        "a": "BOOT_COMMON",
        "b": "ACC_SCOPE",
        "why": "当前范围的 BOOT_COMMON 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      },
      {
        "a": "COMMON_AUDIT",
        "b": "ACC_SCOPE",
        "why": "当前范围的 COMMON_AUDIT 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序"
      }
    ],
    "edgesChanged": [
      {
        "a": "PT_X86",
        "b": "TASK_STACK_ALLOC",
        "why": "由待确认改为验收前置：flush_tlb 明确调用 tlb_flush_addr_range(&self.kvirt_area.range())；刷新后标记当前 CPU coherent"
      },
      {
        "a": "TASK_RUNTIME",
        "b": "TASK_SW",
        "why": "由待确认改为验收前置：CURRENT/PREVIOUS_TASK_PTR 的 Arc 存活、switched_to_cpu 独占运行权及 after_switching_to 延迟释放"
      },
      {
        "a": "PT_X86",
        "b": "TASK_SW",
        "why": "改为待确认：实际注入客户 hook 是否激活地址空间尚缺证据；栈刷新已由 TASK_STACK_ALLOC 供给。"
      },
      {
        "a": "ROUTE_MAP",
        "b": "PITIRQ",
        "why": "组合骨架/条件证明可先开始；完成前置只限制最终验收。"
      },
      {
        "a": "TRAP_DISP",
        "b": "PITIRQ",
        "why": "组合骨架/条件证明可先开始；完成前置只限制最终验收。"
      },
      {
        "a": "LAPIC_DEV",
        "b": "PITIRQ",
        "why": "组合骨架/条件证明可先开始；完成前置只限制最终验收。"
      },
      {
        "a": "SMP_AP",
        "b": "SMP_COMPOSE",
        "why": "组合骨架/条件证明可先开始；完成前置只限制最终验收。"
      },
      {
        "a": "PIT_CFG",
        "b": "PITIRQ",
        "why": "由待确认改为验收前置：本里程碑明确验收实际 PIT 产生 IRQ0：必须给出 RateGenerator 编程与周期来源，不能只假定中断出现"
      }
    ],
    "prs": "#855 的配置合同、#921 的解析合同、#916 的 PE 头构造按限定交付复核结项；#706 是静态/动态 PIO、MMIO 与配置访问底座，BAR 只复用它。末轮复核 #706@7c710f060、#895@b0db47c88、#883@2c6a1a266、#927@32635fe1e 与 #931@d30c27170，前述覆盖边界保持；#931 关联 BZ_RANGE/BZ_ELF，仅协调 #927 的 Vec 规约。main 纳入 #932；#706 最新失败点仍为 cpu/set.rs:300，#860 为 irc11.rs:38，审阅/CI/冲突分别记录。"
  },
  {
    "revision": 4,
    "date": "2026-11-16",
    "reason": "修正依赖验收与页面就绪状态的联动：仅有未交付验收前置的工作由“可开始”改为“前置待交付”，可做条件证明但须等待组合验收；所有确认前置显式验收后才“前置就绪”。开放 PR 继续单列未交付合同，PR 合并不解除依赖。基于本版快照，原 79 项可开始分为 15 项就绪、64 项待交付；22 项 PR 进行中有 10 项缺前置，3 项已有验收记录，0 项有已确认的开工阻塞。工作项 ID、依赖关系和历史验收依据沿用 r3；本版调整状态规则，未新增源码或 PR head 复核。补充 #706 跨路线消费者、#855 限定完成及合并不解锁的回归校验。"
  },
  {
    "revision": 5,
    "date": "2026-11-18",
    "reason": "按 11 月 18 日 VOSTD main 和开放 PR 复核。拆分 payload 参数解析和内核测试结果分类，更新 TLB、MMIO、CPU 特性与已合并工作的验收缺口。",
    "splits": [
      {
        "from": "BZ_ENCODE",
        "to": ["BZ_ENCODE", "BZ_PARSE"],
        "why": "encode_kernel 直接接收枚举，#943 单独交付字符串到枚举的解析。"
      },
      {
        "from": "COMMON_AUDIT",
        "to": ["COMMON_AUDIT", "KTEST_RESULT"],
        "why": "#942 的内核测试结果分类有独立调用者与验收条件。"
      }
    ],
    "edgesAdded": [
      {
        "a": "BZ_PARSE",
        "b": "ACC_SCOPE",
        "why": "汇总独立的参数解析交付。"
      },
      {
        "a": "KTEST_RESULT",
        "b": "COMMON_AUDIT",
        "why": "把 ostd-test 中已有明确交付的分类器纳入公共 API 清单。"
      }
    ],
    "edgesChanged": [
      {
        "a": "CPU_FEAT",
        "b": "CPU_ENABLE",
        "why": "#920 将独立采样改为基于共享平台假设的能力判断。"
      },
      {
        "a": "IO_ALLOC",
        "b": "APIC_RESERVE",
        "why": "按 #706 当前的 remove 合同标明消费者仍缺的保留效果。"
      },
      {
        "a": "IO_ALLOC",
        "b": "IO_WIN",
        "why": "按 #706 最新接口替换已移除的 RangeAllocatorPermits 与 state_matches。"
      }
    ],
    "prs": "#934 同时实施 frame 和 VM I/O 测试。#935 吸收 #677 的部分设计。#940 和 #944 仅记录共享代码协调。#895、#927、#931 已合入，仍缺调用者、内容或实际 builder 证据。更新 #706、#860、#883、#887、#900、#920 的覆盖说明，并记入 #936/#937/#939 的主线接口改动。#945 跟踪 Rust 1.100.0 对 RangeAllocator 的影响。"
  },
  {
    "revision": 6,
    "date": "2026-11-19",
    "reason": "按 11 月 19 日上游 PR 重排 bzImage 解码、段初始化与启动交接，更新 APIC/TSC、PIO 和公共模块的交付范围。",
    "splits": [
      {
        "from": "BZ_SETUP",
        "to": ["BZ_SETUP", "BZ_DECODE", "BZ_LOAD"],
        "why": "#948 有独立的 EFI 解码和段初始化合同。保留原 ID 验收实际物理内存、启动入口和 BootParams。"
      }
    ],
    "edgesAdded": [
      {
        "a": "BZ_LOAD",
        "b": "BZ_SETUP",
        "why": "两个入口共用 loader，启动交接还需建立目标内存的归属。"
      },
      {
        "a": "BZ_DECODE",
        "b": "ACC_SCOPE",
        "why": "单列 EFI 解码的范围验收，legacy 可独立推进。"
      }
    ],
    "edgesChanged": [
      {
        "a": "BZ_ENCODE",
        "b": "BZ_IMG",
        "why": "已经定位 setup 嵌入点，待提供生成端与产物之间的证据。"
      },
      {
        "a": "CPU_FEAT",
        "b": "CPU_ENABLE",
        "why": "#920 将能力和 CPUID 规约迁入 ostd/specs/context.rs。"
      },
      {
        "a": "IO_PIO_ALLOC",
        "b": "IO_GLOBAL",
        "why": "#706 的全局资源交接需要解释敏感端口预占与初始化权限的对应。"
      },
      {
        "a": "IO_PIO",
        "b": "IO_PIO_ALLOC",
        "why": "#706 已移除静态 new 的旧端点限制，核对与动态申请共用的全宽前置。"
      }
    ],
    "prs": "新增 #948 的三项实施关联，#951 和 #952 按共享合同关联。#920 同时推进 APIC 探测和 TSC 采样。复核 #706、#720、#883、#934、#935、#944 的新 head，以及 #942 更新后的正文。#947、#949、#950 属工具和展示调整。"
  },
  {
    "revision": 7,
    "date": "2026-11-19",
    "reason": "区分 MMIO 窗口保留与发布后的分配，纳入 x86 任务切换 FFI，并按新提交修订 TSC 校准和公共库调用条件。",
    "splits": [
      {
        "from": "IO_ALLOC",
        "to": ["IO_ALLOC", "IO_MMIO_ALLOC"],
        "why": "设备初始化消费逐窗口保留效果，运行期 IoMem 申请和显式回收消费已发布的分配器与 FreePermit。两组调用者可分别验收。"
      }
    ],
    "edgesAdded": [
      {
        "a": "IO_ALLOC",
        "b": "IO_MMIO_ALLOC",
        "why": "运行期分配器需接收 builder 保留后的状态。"
      },
      {
        "a": "IO_GLOBAL",
        "b": "IO_MMIO_ALLOC",
        "why": "把全局发布条件接到安全申请入口，PCI BAR 的直接映射可独立验收。"
      },
      {
        "a": "IO_MMIO_ALLOC",
        "b": "ACC_SCOPE",
        "why": "公开申请与回收独立纳入验收清单。"
      }
    ],
    "edgesChanged": [
      {
        "a": "IO_ALLOC",
        "b": "APIC_RESERVE",
        "why": "xAPIC 调用者可以使用更新后的精确保留效果。"
      },
      {
        "a": "IO_ALLOC",
        "b": "IOAPIC_REG",
        "why": "IOAPIC 可从给定合法窗口核对设备保留。"
      },
      {
        "a": "IO_ALLOC",
        "b": "IO_WIN",
        "why": "窗口构造已能交出逐窗口初始化的 tracked 状态。"
      },
      {
        "a": "IO_ALLOC",
        "b": "IO_GLOBAL",
        "why": "顶层已传递状态，全局初始化的外部体仍待核对。"
      },
      {
        "a": "IO_PIO_ALLOC",
        "b": "IO_GLOBAL",
        "why": "区分永久预占的位图项与动态分配的权限。"
      },
      {
        "a": "CPU_FEAT",
        "b": "CPU_ENABLE",
        "why": "能力值改由参考 CPU 构造的字段直接交付。"
      },
      {
        "a": "TASK_CTX",
        "b": "TASK_SW",
        "why": "以新 FFI 声明为起点验证真实调度器的资源交接。"
      },
      {
        "a": "BZ_LOAD",
        "b": "BZ_SETUP",
        "why": "loader 已用 MaybeUninit 的内容合同给出逐字节证据。"
      },
      {
        "a": "TSC_VALUE",
        "b": "CAL_FREQ",
        "why": "将采样模型与实际选择 CPUID 或 PIT 的调用处分清。"
      }
    ],
    "prs": "#706 分开验收设备保留和运行期申请，动态 PIO 调用处按精简后的成功条件复核。新增 #954 关联 TASK_CTX 和 TASK_SW。#920 区分共享叶 0x15 和本核回退基频；TSC_FREQ 使用 AtomicU64，APIC 定时器的 CONFIG 使用 Once。#948 补逐字节段内容和 PE 辅助引理，#934 更换测试元数据。#951、#953 已合入，按实际调用处复用。#944 本轮活动未改变 x86 范围。"
  },
  {
    "revision": 8,
    "date": "2026-11-23",
    "reason": "按 11 月 23 日上游源码修订 MMIO 设备保留与分配合同，纳入 IDT、FPU 和 EFI 构建时重定位检查，并复核各路径的实际调用条件。",
    "edgesAdded": [
      {
        "a": "BZ_RELOC",
        "b": "ACC_SCOPE",
        "why": "重定位检查有单独的宿主调用和验收证据。汇总边可纳入 EFI 交付，同时允许 legacy 输出独立验收。"
      },
      {
        "a": "CPU_ENABLE",
        "b": "FPU_REPR",
        "why": "构造、复制现在消费带 CPU 身份的初始化见证，两种保存格式都需要说明来源。"
      }
    ],
    "splits": [
      {
        "from": "BZ_OUT",
        "to": ["BZ_OUT", "BZ_RELOC"],
        "why": "保留 BZ_OUT 跟踪文件输出，将仅在 Efi64 分支执行的 setup ELF 重定位检查交给 BZ_RELOC。"
      }
    ],
    "edgesChanged": [
      {
        "a": "IO_ALLOC",
        "b": "IO_WIN",
        "why": "builder 的返回值描述窗口序列，旧状态令牌已删除。"
      },
      {
        "a": "IO_ALLOC",
        "b": "APIC_RESERVE",
        "why": "xAPIC 仍需要保留效果，当前 builder 已停止提供 r7 的 remove 合同。"
      },
      {
        "a": "IO_ALLOC",
        "b": "IOAPIC_REG",
        "why": "寄存器访问仍依赖窗口独占，当前 head 只提供窗口几何关系。"
      },
      {
        "a": "IO_ALLOC",
        "b": "IO_GLOBAL",
        "why": "全局入口已移除 builder 状态参数，安全条件与形式前置之间需要补证。"
      },
      {
        "a": "IO_GLOBAL",
        "b": "IO_MMIO_ALLOC",
        "why": "公开包装只给出 permit 的区间，仍需接通实例身份及全局状态。"
      },
      {
        "a": "IDT_TABLE",
        "b": "IDT_LOAD",
        "why": "构表者和加载者现已交接逐项不变式，发布指针和硬件效果仍使用外部合同。"
      },
      {
        "a": "IDT_LOAD",
        "b": "TRAP_DISP",
        "why": "区分已有的加载见证与尚未交接的启动和分派路径。"
      },
      {
        "a": "CPU_FEAT",
        "b": "CPU_ENABLE",
        "why": "已定位使用两个主线探测合同的分支调用。"
      },
      {
        "a": "FPU_REPR",
        "b": "XSAVE",
        "why": "表示层已提供布局和可见字节，硬件保存恢复仍缺内存效果证明。"
      },
      {
        "a": "CPU_ENABLE",
        "b": "XSAVE",
        "why": "缓存的容量界限本身不足以保证各核启用后的实际保存大小相容。"
      },
      {
        "a": "BZ_LOAD",
        "b": "BZ_SETUP",
        "why": "loader 按目标字宽建立段长上界，启动交接仍需分配地址和所有权。"
      }
    ],
    "edgesRemoved": [
      {
        "a": "IO_ALLOC",
        "b": "IO_MMIO_ALLOC",
        "why": "IoMemAllocator::new 只接收分离窗口，已无 pending 到发布令牌的交接。实例可在给定窗口下验证，公开申请的设备排除效果经 IO_GLOBAL 验收。"
      }
    ],
    "prs": "从 r7 的 2f0e25632 至 main 3283081b3，核对 11 月 19 日起有活动的 16 个 PR。#920 已合入，分支 #959 使用 AVX 探测并补 FPU 初始化、表示和 Pod 可变字节合同。#955 同时实施 IDT 构表和加载。#956 单列宿主 Efi64 的重定位检查。#955/#956 同步主线后分别集中布局依据、适配 #958 的格式化接口。#706 撤下设备 remove，收窄申请承诺并停用 IoMem 别名接口。#948 公开解码前置并按目标声明字长。#883 的 DMA 文件在变基前后相同，#954 只调整导入。#948 和 #954 最后同步 main 的提交未改各自的交付代码。#934 的活动未改变已查 head 或正文，#960 更新 IRC11 工具链。 发布时再核对 #706：78ebe223e 简化窗口端点谓词，合并后的分支带回旧 xAPIC 位和 fmt_req，集成时需保留主线合同。 #887 同步 main 后，已核对的上下文与异常数据合同相同。"
  },
  {
    "revision": 9,
    "date": "2026-11-23",
    "reason": "按 #706 合并后的主线复核三条路线，验收静态 PIO，更新引导窗口、PCI、CPU 探测与 EFI 分配的后续工作。",
    "edgesRemoved": [
      {
        "a": "IO_ALLOC",
        "b": "IO_WIN",
        "why": "主线 builder::new 已可独立消费。引导计算证明输入窗口与登记序列对应，不调用 remove；设备排除仍由 xAPIC、IOAPIC 和全局初始化消费。"
      }
    ],
    "edgesChanged": [
      {
        "a": "TSC_VALUE",
        "b": "CAL_FREQ",
        "why": "合并后 TSC 的来源恢复为单次调用的样本，跨核一致性须另证。"
      },
      {
        "a": "CPU_FEAT",
        "b": "CPU_ENABLE",
        "why": "#959 的两个探测调用仍在分支中，主线已撤回它们使用的共享模型。"
      },
      {
        "a": "IO_PIO",
        "b": "PCI_CFG",
        "why": "主线已有静态端口的实际消费者，配置状态与成对事务留在 PCI_CFG。"
      },
      {
        "a": "PCI_ENC",
        "b": "PCI_CFG",
        "why": "主线已有编码和可执行读写，#919 的后续工作集中于调用者可使用的字段保证。"
      },
      {
        "a": "IO_PIO",
        "b": "SERIAL_QEMU_CMOS",
        "why": "按实际接口限定这条依赖，避免把独立的 QEMU 出口也算作 IoPort 调用。"
      },
      {
        "a": "IO_ALLOC",
        "b": "APIC_RESERVE",
        "why": "设备分支需要区间排除，合入的窗口构造没有解除这一验收前置。"
      },
      {
        "a": "IO_ALLOC",
        "b": "IOAPIC_REG",
        "why": "在主线核对 0x20 字节的设备消费者，remove 仍在注释中。"
      },
      {
        "a": "IO_WIN",
        "b": "IO_GLOBAL",
        "why": "引导窗口登记与设备永久占用在全局初始化处分别交接。"
      },
      {
        "a": "IO_PIO_ALLOC",
        "b": "IO_GLOBAL",
        "why": "PCI 已实际使用直接声明的静态端口，需要最终链接记录证明它们受动态分配器保护。"
      },
      {
        "a": "BZ_LOAD",
        "b": "BZ_SETUP",
        "why": "按 #948 的分配合同与审阅意见区分正常返回的长度保证、可能 panic 的条件和实际物理归属。"
      }
    ],
    "prs": "从 r8 的 3283081b3 至 b94500acd，主线只合入 #706。核对最终 head 31813f542 与合入提交的源码树相同。以实际 PCI 调用及上游 x86 验证验收 IO_PIO；设备预占、MMIO 保留和配置事务继续跟踪。#919 在主线编码上补字段恢复。#920 改列历史参考，TSC_VALUE 的逐次采样关联 #905。#887、#948、#954、#955、#956 同步了该主线，原有上下文、编解码与装载、FFI、IDT 和 EFI 重定位合同分别对照过相应文件。#934 适配 Frame 的 Debug，#948 的 EFI 分配 panic 另列入 BZ_SETUP。三条路线的离线行数快照同步到本次合入提交。"
  },
  {
    "revision": 10,
    "date": "2026-11-23",
    "reason": "跟踪 #963 的 xAPIC 物理基址证明，并按 #961 恢复后的主线更新 APIC、AVX 与 TSC 合同。",
    "edgesChanged": [
      {
        "a": "TSC_VALUE",
        "b": "CAL_FREQ",
        "why": "校准入口须区分基于共享叶 0x15 和可选本核基频的 None、Some(0) 与非零 Hz，再组合 PIT 回退与发布。"
      },
      {
        "a": "CPU_FEAT",
        "b": "CPU_ENABLE",
        "why": "XCR0 的选择使用已恢复的 AVX 与 AVX-512F 探测合同，仍须建立本核寄存器权限。"
      }
    ],
    "prs": "#963 @b5d4b4ea9 实施 APIC_RESERVE 的物理地址算术。设备保留调用和窗口所有权仍待接通。#961 合入后复核了 APIC、AVX 和 TSC 的共享 CPUID 合同。"
  },
  {
    "revision": 11,
    "date": "2026-11-23",
    "reason": "纳入 #966 串口寄存器布局与字节端口访问证明，同步 #963 和 #964 合入后的进度。",
    "edgesChanged": [
      {
        "a": "IO_PIO",
        "b": "SERIAL_QEMU_CMOS",
        "why": "串口分支已在构造和端口访问处消费静态 PIO 合同。ACPI 的验收前置仅约束 CMOS。"
      }
    ],
    "prs": "#966 @9ba7887b0 实施串口布局与访问边界；上层 COM1 的端口独占和轮询进展仍待验证。#963 已合入 e9b249978，#964 已合入 cfddc3d07。"
  },
  {
    "revision": 12,
    "date": "2026-11-24",
    "reason": "按主线串口合入结果、#969 的 PIT/PIC 写入序列及 #967 的页表前置更新三条路线。",
    "edgesChanged": [
      {
        "a": "IO_PIO",
        "b": "PIT_CFG",
        "why": "PIT 逐次向 0x43、0x40、0x40 写入；每次 IoPort::write 匹配并消费预期端口和值。"
      },
      {
        "a": "IO_PIO",
        "b": "PIC",
        "why": "PIC 的四个 u8 端口按十项预期序列写入，最后两项分别匹配主从掩码。"
      },
      {
        "a": "PIT_CFG",
        "b": "PITIRQ",
        "why": "BSP 的无 APIC 定时器分支使用 SquareWaveGenerator；须在选定平台建立命令、IRQ0 周期和路由。RateGenerator 供 TSC 校准使用。"
      },
      {
        "a": "CPU_ENABLE",
        "b": "XSAVE",
        "why": "XSAVE 路径消费 enabled_on 中缓存大小等于当前 XCR0 所需长度的条件，启动方须建立对应的平台大小与本核权限。"
      },
      {
        "a": "BZ_LOAD",
        "b": "BZ_SETUP",
        "why": "逐段装载的条件 panic 包含平台分配失败。EFI 核对实际页地址，Legacy32 核对 E820 和槽位，再将段快照对应到物理内存。"
      },
      {
        "a": "IO_PIO",
        "b": "SERIAL_QEMU_CMOS",
        "why": "主线串口构造消费字节访问合同并返回七个连续地址；COM1 独占与轮询仍待接通。CMOS 使用 u8 端口，QEMU 直接写 0xF4。"
      }
    ],
    "prs": "主线 cfddc3d07 至 2aa424ec0 合入 #966、#967。#969 同时实施 PIT_CFG 和 PIC，#968 提供动态类型工具链。#919 关闭未合并。复核 #677、#879、#883、#887、#934、#948、#954、#955、#956、#959 的最新 head；设备、启动和权限的剩余条件分别留在对应节点。"
  },
  {
    "revision": 13,
    "date": "2026-11-26",
    "reason": "纳入本核 TLB 刷新、非跟踪叶映射和 KVirtArea 测试，按审阅后的合同更新 PIT、PIC、FPU 与启动路线。",
    "edgesChanged": [
      {
        "a": "PT_X86",
        "b": "TLB_SHOOT",
        "why": "远端处理器须执行对应的本核失效并给出完成证据；#977 提供部分执行入口及规范地址条件，外部指令合同仍缺失效后置。"
      },
      {
        "a": "IO_PIO",
        "b": "PIC",
        "why": "init_and_disable 需要调用者序列以 mask_writes(0xff,0xff) 开头，依次消费十项且保留后缀。"
      },
      {
        "a": "IO_PIO",
        "b": "PIT_CFG",
        "why": "pit::init 消费调用者提供的 init_writes(mode) 三项前缀。受保护端口必须传入 PortWriteSequence。"
      },
      {
        "a": "IO_PIO",
        "b": "SERIAL_QEMU_CMOS",
        "why": "主线串口使用 u8 端口；集成 #969 时 COM1 须证明基址至偏移 4 的可写端口不在 PIC/PIT 序列范围中。"
      },
      {
        "a": "KTEST_RESULT",
        "b": "COMMON_AUDIT",
        "why": "公共辅助库仍需核对主线测试运行入口的结果分类、panic 捕获和消息匹配；已关闭的 #942 仅供参考。"
      }
    ],
    "prs": "主线从 2aa424ec0 到 fece47de1，合入 #952、#972、#973、#974；#977、#976 分别跟踪本核刷新接口和非跟踪叶映射。#969 的预期序列现由调用者提供，#970 和 #942 均已关闭。#948 的 EFI 解码改为可失败接口，#959 收紧 XSAVE 见证，其他活动分支按固定 head 复核。"
  },
  {
    "revision": 14,
    "date": "2026-11-27",
    "reason": "将后续工作拆为可单独提交与验收的函数和文件，按主线及开放 PR 更新三条路线的调用合同。",
    "splits": [
      {
        "from": "SERIAL_QEMU_CMOS",
        "to": ["SERIAL_QEMU_CMOS", "COM1_SEND", "QEMU_EXIT", "ACC_SCOPE"],
        "why": "原 ID 保留串口预留与初始化。发送由控制台消费，QEMU 出口由 panic::abort 消费。CMOS 的 FADT 字段和敏感端口保留在总验收清单，待出现 RTC 调用者再建节点。"
      },
      {
        "from": "HPET",
        "to": ["HPET", "HPET_REGS"],
        "why": "比较器数量和偏移可在给定设备窗口下验证；固件提供的实际窗口、IRQ 和 Once 发布由 init 集成。"
      },
      {
        "from": "GDT",
        "to": ["GDT", "TSS_LOCAL"],
        "why": "CPU-local 指针的归属与链接位置可以从 gdt::init 的硬件加载合同中单独验收。"
      },
      {
        "from": "BZ_OUT",
        "to": ["BZ_OUT", "BZ_EFI_OUT"],
        "why": "make_bzimage 先写出两种模式共用的文件，只有 Efi64 才检查 .rela 并覆写 PE 头。选定 Legacy32 的产物可以直接核对第一份文件。"
      },
      {
        "from": "BZ_SETUP",
        "to": ["BZ_SETUP", "BZ_LEGACY_ALLOC", "BZ_EFI_ALLOC", "BZ_EFI_E820", "BZ_EFI_HANDOFF"],
        "why": "两个启动入口使用不同的分配器和 BootParams 来源。分配文件与 EFI E820 表各有真实消费者，Legacy32 与 EFI 分别用本模式的产物核对入口。"
      },
      {
        "from": "MM_BOOT",
        "to": ["MM_BOOT", "MM_BOOT_FRAMES", "MM_BOOT_ROOT", "MM_BOOT_ACTIVATE"],
        "why": "allocator::init 交接可分配物理页，boot_all_aps 读取启动根页，内核缺页读取已发布页表，ap_early_entry 逐核切换。四处可分别验证。"
      },
      {
        "from": "LOC_DYNAMIC",
        "to": ["LOC_DYNAMIC", "LOC_DYNAMIC_ADDR", "LOC_DYNAMIC_DROP"],
        "why": "AnyStorage 指针供逐核构造、远端读取和析构共用；OSDK 分配与依次尝试不同 chunk 回收各有独立调用者。"
      },
      {
        "from": "SYNC_WAIT",
        "to": ["SYNC_WAIT", "SYNC_WAKER", "SYNC_QUEUE"],
        "why": "Waker 交付单个任务的唤醒通知。队列计数和唤醒由解锁路径消费，wait_until 的条件复查由取锁路径消费。"
      },
      {
        "from": "HEAP_GLOBAL",
        "to": ["HEAP_GLOBAL", "HEAP_SLAB", "HEAP_LARGE"],
        "why": "AllocDispatch 消费用户分配器的布局合同；OSDK 的 slab cache 消费页内小槽，超出大小类别的分配直接消费 HeapSlot 的 Segment 往返。"
      },
      {
        "from": "PT_X86",
        "to": ["PT_X86", "PT_LOCAL_FLUSH", "PT_FLUSH_NONGLOBAL", "PT_FLUSH_GLOBAL"],
        "why": "栈仅消费地址范围失效，All 请求消费非全局刷新，引导激活另需含全局项的刷新和 CR3 根页读写。"
      }
    ],
    "added": [
      {
        "id": "EARLY_INFO_INIT",
        "why": "#981 同时给 MMIO 和 ACPI 入口增加见证参数，缺少从真实 EARLY_INFO 发布点取得该见证的证明。"
      }
    ],
    "edgesAdded": [
      {
        "a": "PT_LOCAL_FLUSH",
        "b": "TLB_SHOOT",
        "why": "Address/Range 请求在目标核执行时须证明指定页已失效，再交付完成确认。"
      },
      {
        "a": "PT_LOCAL_FLUSH",
        "b": "TASK_STACK_ALLOC",
        "why": "flush_tlb 明确调用 tlb_flush_addr_range(&self.kvirt_area.range())；刷新后标记当前 CPU coherent"
      },
      {
        "a": "BZ_PE",
        "b": "BZ_EFI_OUT",
        "why": "Efi64 写回检查只消费 PE 头长度 368 <= 0x1f1，保证 Linux boot header 未被覆盖。"
      },
      {
        "a": "PT_LOCAL_FLUSH",
        "b": "DMA_MAP",
        "why": "protect_flush_tlb 的现存注释实现逐次调用 tlb_flush_addr(range.start)，只确认本地失效接口"
      },
      {
        "a": "IO_PIO",
        "b": "COM1_SEND",
        "why": "line_sts 与 SerialPort::send 分别消费状态端口的字节读和数据端口的字节写。"
      },
      {
        "a": "COM1_SEND",
        "b": "ACC_SCOPE",
        "why": "核对控制台逐字节调用、退格写入序列和硬件轮询条件。"
      },
      {
        "a": "QEMU_EXIT",
        "b": "ACC_SCOPE",
        "why": "记录启用 ISA debug exit 的选定平台如何报告 panic 退出，以及未配置设备时的行为。"
      },
      {
        "a": "HPET_REGS",
        "b": "HPET",
        "why": "Hpet::new 在实际映射中消费比较器数量、各寄存器所需长度与对齐，返回持有这些寄存器的实例。"
      },
      {
        "a": "MM_BOOT",
        "b": "HPET",
        "why": "paddr_to_vaddr 所得地址必须覆盖完整寄存器区，并在 HPET_INSTANCE 持有引用期间保持有效。"
      },
      {
        "a": "EARLY_INFO_INIT",
        "b": "IO_WIN",
        "why": "窗口构造读取与引导入口发布的 memory_regions 相同的序列，#981 要求借用 EarlyBootInfoInit。"
      },
      {
        "a": "EARLY_INFO_INIT",
        "b": "ACPI_TABLES",
        "why": "get_acpi_tables 按同一已发布 EarlyBootInfo 的 acpi_arg 选择固件路径，需要 EarlyBootInfoInit。"
      },
      {
        "a": "LOC_ID",
        "b": "TSS_LOCAL",
        "why": "从当前核 GS 基址定位本核永久存储，并在取得和使用 TSS 指针期间维持 CPU 身份。"
      },
      {
        "a": "TSS_LOCAL",
        "b": "GDT",
        "why": "构造 TSS 描述符及 load_tss 需要当前核的、存活到使用结束的 TSS。"
      },
      {
        "a": "BZ_OUT",
        "b": "BZ_EFI_OUT",
        "why": "Efi64 在完整写出且已对齐的 setup 上执行重定位检查并覆盖文件前缀。"
      },
      {
        "a": "BZ_RELOC",
        "b": "BZ_EFI_OUT",
        "why": "重定位检查正常返回后才能执行 PE 覆写；拒绝时要用检查前已写出的 setup 界定文件内容。"
      },
      {
        "a": "BZ_EFI_OUT",
        "b": "ACC_SCOPE",
        "why": "汇总 Efi64 的 PE 覆写、保留的 Linux boot header 及输出文件状态。"
      },
      {
        "a": "BZ_LEGACY_ALLOC",
        "b": "BZ_SETUP",
        "why": "从 init 保留的 setup、BootParams 等区间及每段取得的独占 RAM 区间，建立 Legacy32 装载前置与跳转时的物理归属。"
      },
      {
        "a": "BZ_EFI_ALLOC",
        "b": "BZ_EFI_HANDOFF",
        "why": "EFI 的 load_segment 消费按指定物理地址分配的切片；入口交接须保有各段内容及互不覆盖的分配记录。"
      },
      {
        "a": "BZ_DECODE",
        "b": "BZ_EFI_HANDOFF",
        "why": "efi_phase_boot 需要从实际嵌入的 payload 得到本次内核 ELF，再交给 load_elf。"
      },
      {
        "a": "BZ_LOAD",
        "b": "BZ_EFI_HANDOFF",
        "why": "EFI 入口需要 load_elf 的逐段初始化快照与相应物理页，确定最终可执行的入口字节。"
      },
      {
        "a": "BZ_EFI_E820",
        "b": "BZ_EFI_HANDOFF",
        "why": "在转交 BootParams 给内核前，使用 efi_phase_runtime 写入的有效 E820 前缀和实际项数。"
      },
      {
        "a": "BZ_EFI_HANDOFF",
        "b": "ACC_SCOPE",
        "why": "汇总 EFI 的解码、实际物理页、E820 和固定入口交接证据。"
      },
      {
        "a": "LOC_EARLY_GLOBAL",
        "b": "MM_BOOT_FRAMES",
        "why": "全局 early allocator 已分配的两个区间及一次性取走权限"
      },
      {
        "a": "MM_BOOT_FRAMES",
        "b": "MM_BOOT",
        "why": "构造内核根及其子表时，页表节点取得来自全局可用页、与 early 分配分离的 frame"
      },
      {
        "a": "PT_X86",
        "b": "MM_BOOT_ROOT",
        "why": "首次 from_current_pt 读到当前核的启动根物理地址及对齐条件"
      },
      {
        "a": "MM_BOOT_ROOT",
        "b": "MM_BOOT_ACTIVATE",
        "why": "dismiss 取得同一启动页表及其固件页和自建页的记录；切换后本核不再取得该借用"
      },
      {
        "a": "MM_BOOT",
        "b": "MM_BOOT_ACTIVATE",
        "why": "KERNEL_PAGE_TABLE.get 取得已发布可激活的同一根页"
      },
      {
        "a": "PT_X86",
        "b": "MM_BOOT_ACTIVATE",
        "why": "first_activate_unchecked 的根页安装结果须对应当前核"
      },
      {
        "a": "PT_FLUSH_GLOBAL",
        "b": "MM_BOOT_ACTIVATE",
        "why": "切根后 tlb_flush_all_including_global 完成本核含全局项的失效"
      },
      {
        "a": "MM_BOOT_ROOT",
        "b": "SMP_AP",
        "why": "boot_all_aps 在启动借用期间取得 root_address 作为 bringup_all_aps 的页表实参"
      },
      {
        "a": "MM_BOOT_ACTIVATE",
        "b": "SMP_AP",
        "why": "ap_early_entry 在本核激活内核页表并退出启动页表后才报告 online"
      },
      {
        "a": "LOC_ID",
        "b": "LOC_DYNAMIC_ADDR",
        "why": "get_ptr_on_current 消费 guard.current_cpu 对当前核的绑定，目标索引消费 CpuId::as_usize 的范围"
      },
      {
        "a": "LOC_DYNAMIC_ADDR",
        "b": "LOC_DYNAMIC",
        "why": "__new_dynamic 消费每个 CPU 的槽地址、对齐及可写范围"
      },
      {
        "a": "LOC_DYNAMIC",
        "b": "LOC_DYNAMIC_DROP",
        "why": "try_dealloc 消费 alloc 交出的来源 chunk、占用位和逐核初始化所有权"
      },
      {
        "a": "LOC_DYNAMIC_ADDR",
        "b": "LOC_DYNAMIC_DROP",
        "why": "drop_in_place 需要 get_mut_ptr_on_target 指向该核已初始化的同一槽"
      },
      {
        "a": "LOC_DYNAMIC_DROP",
        "b": "ACC_SCOPE",
        "why": "收录动态槽从分配到逐核析构及 chunk 回收的验收记录"
      },
      {
        "a": "TASK_RUNTIME",
        "b": "SYNC_WAKER",
        "why": "new_pair 要取得当前任务，do_wait/wake_up 消费 park_current 与 unpark_target 的任务状态合同"
      },
      {
        "a": "SYNC_WAKER",
        "b": "SYNC_QUEUE",
        "why": "wake_one/wake_all 按 wake_up 对已通知或关闭状态的返回值决定是否继续弹出或计数"
      },
      {
        "a": "SYNC_WAKER",
        "b": "SYNC_WAIT",
        "why": "条件循环等待同一 Waker 的通知，取消时在 close 后再检查条件"
      },
      {
        "a": "SYNC_QUEUE",
        "b": "SYNC_WAIT",
        "why": "wait_until 把关联 Waker 入队后重查条件，消费 enqueue 的登记合同"
      },
      {
        "a": "SYNC_QUEUE",
        "b": "SYNC_API",
        "why": "Mutex 解锁唤醒一个等待者，RwMutex 的解锁路径消费 wake_one/wake_all"
      },
      {
        "a": "SA_HEAP",
        "b": "HEAP_SLAB",
        "why": "Slab::new/dealloc 使用 push 转移槽权限，SlabMeta::alloc 使用 pop 取得唯一空闲槽并保留其余链"
      },
      {
        "a": "MM_FRAME",
        "b": "HEAP_SLAB",
        "why": "Slab::new 消费独占页及元数据权限，SlabMeta::on_drop 依赖其寿命"
      },
      {
        "a": "MM_FRAME",
        "b": "HEAP_LARGE",
        "why": "大槽保存连续 Segment 的原始区间，回收时以同一元数据类型恢复所有权"
      },
      {
        "a": "HEAP_SLAB",
        "b": "ACC_SCOPE",
        "why": "收录 slab 小槽初始化、借出、归还与释放的证据"
      },
      {
        "a": "HEAP_LARGE",
        "b": "ACC_SCOPE",
        "why": "收录大块分配和原始 Segment 往返的证据"
      },
      {
        "a": "PT_FLUSH_NONGLOBAL",
        "b": "TLB_SHOOT",
        "why": "All 请求升级后需要目标核刷新全部非全局项。"
      }
    ],
    "edgesChanged": [
      {
        "a": "MM_BOOT",
        "b": "SMP_AP",
        "why": "AP 切到内核表后仍可通过线性映射访问已分配的启动栈"
      },
      {
        "a": "BZ_OUT",
        "b": "BZ_IMG",
        "why": "按所选模式对照同一份已写出的对齐 setup。Legacy32 可直接比对整文件，Efi64 对照 PE 覆写区之外的字节。"
      },
      {
        "a": "MM_PT",
        "b": "MM_BOOT",
        "why": "new_kernel_page_table 与 cursor.map 对线性、元数据及内核镜像映射的合同"
      },
      {
        "a": "MM_FRAME",
        "b": "MM_BOOT",
        "why": "meta_pages.into_raw 交出连续元数据页，其引用和重复映射约束贯穿内核页表的存活期"
      },
      {
        "a": "SYNC_WAIT",
        "b": "SYNC_API",
        "why": "阻塞锁从 wait_until 取得闭包成功返回的锁 guard"
      },
      {
        "a": "ACPI_TABLES",
        "b": "HPET",
        "why": "init 调用 get_acpi_tables，再经 HpetInfo::new 取得固件报告的 HPET 基址。"
      },
      {
        "a": "IO_PIO",
        "b": "SERIAL_QEMU_CMOS",
        "why": "静态 COM1 的七个 u8 地址和八次初始化写使用类型化的 PIO 合同；#969 合入时另建立偏移 0..=4 的限制。"
      },
      {
        "a": "SA_HEAP",
        "b": "HEAP_GLOBAL",
        "why": "AllocDispatch 消费 HeapSlot 的指针、大小、SlotInfo 与构造合同，dealloc 按原 layout 重建槽"
      },
      {
        "a": "BZ_LOAD",
        "b": "BZ_SETUP",
        "why": "main_legacy32 读取原始 payload，按对应的 ELF 段初始化快照核对实际装载字节。"
      },
      {
        "a": "SERIAL_QEMU_CMOS",
        "b": "ACC_SCOPE",
        "why": "核对 COM1 端口永久保留和 UART 的初始化写入合同。"
      },
      {
        "a": "BZ_SETUP",
        "b": "ACC_SCOPE",
        "why": "汇总 Legacy32 的 32 位指针、BootParams 和固定入口交接证据。"
      }
    ],
    "edgesRemoved": [
      {
        "a": "PT_X86",
        "b": "TLB_SHOOT",
        "why": "栈仅消费地址范围失效，All 请求消费非全局刷新，引导激活另需含全局项的刷新和 CR3 根页读写。"
      },
      {
        "a": "LOC_ID",
        "b": "GDT",
        "why": "CPU-local 指针的归属与链接位置可以从 gdt::init 的硬件加载合同中单独验收。"
      },
      {
        "a": "PT_X86",
        "b": "TASK_STACK_ALLOC",
        "why": "栈仅消费地址范围失效，All 请求消费非全局刷新，引导激活另需含全局项的刷新和 CR3 根页读写。"
      },
      {
        "a": "BZ_PE",
        "b": "BZ_OUT",
        "why": "make_bzimage 先写出两种模式共用的文件，只有 Efi64 才检查 .rela 并覆写 PE 头。选定 Legacy32 的产物可以直接核对第一份文件。"
      },
      {
        "a": "PT_X86",
        "b": "MM_BOOT",
        "why": "allocator::init 交接可分配物理页，boot_all_aps 读取启动根页，内核缺页读取已发布页表，ap_early_entry 逐核切换。四处可分别验证。"
      },
      {
        "a": "LOC_EARLY_GLOBAL",
        "b": "MM_BOOT",
        "why": "allocator::init 交接可分配物理页，boot_all_aps 读取启动根页，内核缺页读取已发布页表，ap_early_entry 逐核切换。四处可分别验证。"
      },
      {
        "a": "TASK_RUNTIME",
        "b": "SYNC_WAIT",
        "why": "Waker 交付单个任务的唤醒通知。队列计数和唤醒由解锁路径消费，wait_until 的条件复查由取锁路径消费。"
      },
      {
        "a": "ACPI_TABLES",
        "b": "SERIAL_QEMU_CMOS",
        "why": "原 ID 保留串口预留与初始化。发送由控制台消费，QEMU 出口由 panic::abort 消费。CMOS 的 FADT 字段和敏感端口保留在总验收清单，待出现 RTC 调用者再建节点。"
      },
      {
        "a": "MM_FRAME",
        "b": "HEAP_GLOBAL",
        "why": "AllocDispatch 消费用户分配器的布局合同；OSDK 的 slab cache 消费页内小槽，超出大小类别的分配直接消费 HeapSlot 的 Segment 往返。"
      },
      {
        "a": "PT_X86",
        "b": "DMA_MAP",
        "why": "栈仅消费地址范围失效，All 请求消费非全局刷新，引导激活另需含全局项的刷新和 CR3 根页读写。"
      },
      {
        "a": "LOC_DYNAMIC",
        "b": "ACC_SCOPE",
        "why": "AnyStorage 指针供逐核构造、远端读取和析构共用；OSDK 分配与依次尝试不同 chunk 回收各有独立调用者。"
      },
      {
        "a": "BZ_DECODE",
        "b": "ACC_SCOPE",
        "why": "按本轮复核的消费者重接依赖。"
      },
      {
        "a": "BZ_RELOC",
        "b": "ACC_SCOPE",
        "why": "按本轮复核的消费者重接依赖。"
      }
    ],
    "prs": "主线 fece47de1 至 7cd0bcdcd 合入 #978、#980、#982 和 #979。纳入 #981 的 MMIO 与 ACPI、#983 的 TSC 与随机数、#984 的 GDT；复核 #883 的 DMA 地址、#923 的堆槽、#935 的队列容量、#976 的叶范围、#977 的本核刷新以及 #948、#955、#956 的调用前置。"
  },
  {
    "revision": 15,
    "date": "2026-11-27",
    "reason": "暂缓消除 bzImage 正向地址转换的 assume。依据 #915 的评审，BZ_TRUST 按正常构建的 setup ELF 登记地址边界和调用者，保留现有 From 接口。"
  },
  {
    "revision": 16,
    "date": "2026-11-27",
    "reason": "三条路线按新增执行路径及其调用者组织后续 PR，保留逐项合同验收。以原 Rust 实现为基线补规约和证明，记录必要的执行差异及可信边界。",
    "added": [
      {
        "id": "KTEST_DISCOVERY",
        "why": "用同一项验收串起 KtestItem 登记、按表序枚举与 OSDK 过滤，并登记固定链接表的可信输入。"
      }
    ],
    "edgesAdded": [
      {
        "a": "KTEST_DISCOVERY",
        "b": "COMMON_AUDIT",
        "why": "将原属公共辅助库盘点的测试项发现流程落实为可独立核对的执行交付。"
      }
    ]
  },
  {
    "revision": 17,
    "date": "2026-11-27",
    "reason": "暂缓将内核测试项登记与枚举作为独立 PR，保留原工作项供后续查阅，撤下公共模块本轮验收前置。",
    "edgesRemoved": [
      {
        "a": "KTEST_DISCOVERY",
        "b": "COMMON_AUDIT",
        "why": "测试项登记与枚举已转入暂缓清单，本轮公共 API 验收无需等待这份交付。"
      }
    ],
    "moved": [
      {
        "id": "KTEST_DISCOVERY",
        "from": "nodes",
        "to": "later",
        "why": "保留测试登记、表序、表尾和元数据的复核范围，暂缓单独提交。"
      }
    ]
  }
];
