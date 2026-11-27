/* Dependency table: one row per prerequisite ("from") → consumer ("to"). Rewritten by plan.mjs; hand edits are fine.
 *   confirmed    gate "start" | "accept", need = the interface / spec / resource / state the consumer uses,
 *                ev = file::symbol @fixed-commit where that was checked
 *   unconfirmed  tag "推断" | "待确认", missing = the evidence that is absent (never blocks a work item)
 * Rows are grouped by consumer in node order. Record every change in plan-history.js (plan.mjs does it). */
window.PLAN_EDGES = [
  /* ===== consumers in: x86 平台 ===== */
  { "to": "IO_WIN", "from": "EARLY_INFO_INIT", "gate": "accept", "need": "窗口构造读取与引导入口发布的 memory_regions 相同的序列，#981 要求借用 EarlyBootInfoInit。", "ev": "ostd/src/{boot/mod.rs::get_early_info,arch/x86/io.rs::construct_io_mem_allocator_builder} @d3e357052" },

  { "to": "IRQ_GUARD", "from": "IRQ_MODEL", "gate": "accept", "need": "同 CPU 的 inv / coherent、匹配的 authority、保存的 IF 与嵌套权限合同", "ev": "ostd/src/trap/irq.rs::DisabledLocalIrqGuard::new; ostd/specs/task/irq.rs::LocalIrqGuardOwner @6cec73d064" },

  { "to": "IRQ_DROP", "from": "IRQ_GUARD", "gate": "accept", "need": "创建产生的保存 IF、CPU、嵌套深度与线性恢复权限", "ev": "ostd/specs/task/irq.rs::IrqRestorePermission,tracked_restore @6cec73d064" },

  /* ===== consumers in: OSTD 公共模块 ===== */
  { "to": "LOC_STORE", "from": "LOC_EARLY_GLOBAL", "gate": "accept", "need": "AP 地址数组和各 CPU 存储的两个 early_alloc 调用需要跨次不重叠可写资源", "ev": "ostd/src/cpu/local/mod.rs::copy_bsp_for_ap @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  /* ===== consumers in: x86 平台 ===== */
  { "to": "LOC_ID", "from": "LOC_STORE", "gate": "accept", "need": "AP 存储基址、索引有效性与发布合同（get_ap）；BSP 的静态 GS 基址不依赖 AP 分配完成", "ev": "ostd/src/cpu/local/mod.rs::get_ap; ostd/src/arch/x86/boot/ap_boot.S::GS.base @97963e831" },

  /* ===== consumers in: OSTD 公共模块 ===== */
  { "to": "LOC_ACC", "from": "LOC_ID", "gate": "accept", "need": "AnyStorage::get_ptr_on_current / get_ptr_on_target 的归属、有效性与生命周期合同", "ev": "ostd/src/cpu/local/mod.rs::AnyStorage,CpuLocalDerefGuard::deref @97963e831" },
  { "to": "LOC_ACC", "from": "IRQ_GUARD", "gate": "accept", "need": "借用期间禁 IRQ 且不迁移：get_with 的参数是 &DisabledLocalIrqGuard，没有接受任意 PinCurrentCpu 的泛型接口", "ev": "ostd/src/cpu/local/mod.rs::get_with（第 112–114 行） @97963e831" },

  { "to": "VM_POD", "from": "VM_REPR", "gate": "accept", "need": "内容断言消费 Pod/切片的实际字节桥接合同", "ev": "ostd/src/mm/test.rs; ostd/libs/ostd-pod/tests/derive_test.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "VM_CONTENT", "from": "VM_REPR", "gate": "accept", "need": "read_val 的 Pod 值和实际读取字节之间的关系", "ev": "ostd/src/mm/io.rs::VmReader::read_val; ostd/specs/mm/io.rs::VmIoOwner @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "TLB_SHOOT", "from": "TLB_REQ", "gate": "accept", "need": "入队不丢失与全刷覆盖合同", "ev": "ostd/src/mm/tlb.rs::dispatch_tlb_flush,do_remote_flush @97963e831" },
  { "to": "TLB_SHOOT", "from": "SMP_IPI", "gate": "accept", "need": "目标核/队列/回调安全合同；完成 ACK 与投递进展由本项协议补充，不能从 inter_processor_call 名称推得", "ev": "ostd/src/mm/tlb.rs::dispatch_tlb_flush,do_remote_flush; ostd/src/smp.rs::inter_processor_call @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TLB_SHOOT", "from": "PT_LOCAL_FLUSH", "gate": "accept", "need": "Address/Range 请求在目标核执行时须证明指定页已失效，再交付完成确认。", "ev": "ostd/src/mm/tlb.rs::TlbFlushOp::perform_on_current，ostd/src/arch/x86/mm/mod.rs::tlb_flush_addr_range @06327ccfd" },
  { "to": "TLB_SHOOT", "from": "PT_FLUSH_NONGLOBAL", "gate": "accept", "need": "All 请求升级后需要目标核刷新全部非全局项。", "ev": "ostd/src/mm/tlb.rs::TlbFlushOp::perform_on_current @606ef10e5，ostd/src/arch/x86/mm/mod.rs::tlb_flush_all_excluding_global @06327ccfd" },

  { "to": "TLB_FREE", "from": "TLB_SHOOT", "gate": "accept", "need": "frame 保留到安全完成点：dispatch 明说异步，入队不够", "ev": "ostd/src/mm/tlb.rs::issue_tlb_flush_with,dispatch_tlb_flush,sync_tlb_flush; OpsStack::push,push_from,clear_without_flush @97963e831" },
  { "to": "TLB_FREE", "from": "MM_FRAME", "gate": "accept", "need": "page_keeper 持有 Frame 所有权并延迟最终释放，不能仅传入 frame 就视为保留", "ev": "ostd/src/mm/tlb.rs::issue_tlb_flush_with; OpsStack::push,clear_without_flush @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  /* ===== consumers in: x86 平台 ===== */
  { "to": "ACPI_TABLES", "from": "EARLY_INFO_INIT", "gate": "accept", "need": "get_acpi_tables 按同一已发布 EarlyBootInfo 的 acpi_arg 选择固件路径，需要 EarlyBootInfoInit。", "ev": "ostd/src/{boot/mod.rs::get_early_info,arch/x86/kernel/acpi/mod.rs::get_acpi_tables} @d3e357052" },

  { "to": "ACPI_MADT", "from": "ACPI_TABLES", "gate": "accept", "need": "有效的 AcpiTables、find_table::<Madt>、表长度与条目访问合同", "ev": "ostd/src/arch/x86/kernel/irq/mod.rs::init @97963e831" },

  { "to": "PIC", "from": "IO_PIO", "gate": "accept", "need": "init_and_disable 需要调用者序列以 mask_writes(0xff,0xff) 开头，依次消费十项且保留后缀。", "ev": "ostd/src/arch/x86/kernel/irq/pic.rs::init_and_disable,set_mask，ostd/src/io/io_port/mod.rs::PortWriteSequence @43cc4d8d5" },

  { "to": "IOAPIC_REG", "from": "IO_ALLOC", "gate": "accept", "need": "IoApicAccess::new 需要独占 [base,base+0x20)。恢复设备路径时，须用 builder 的可执行接口排除该范围。", "ev": "ostd/src/arch/x86/kernel/irq/ioapic.rs::IoApicAccess::new，ostd/src/io/io_mem/allocator.rs::IoMemAllocatorBuilder @b94500acd" },

  { "to": "IOAPIC_ENTRY", "from": "IOAPIC_REG", "gate": "accept", "need": "寄存器选择 / 数据访问合同", "ev": "ostd/src/arch/x86/kernel/irq/ioapic.rs::IoApic::enable,disable @97963e831" },
  { "to": "IOAPIC_ENTRY", "from": "IRQLINE", "gate": "accept", "need": "IrqLine::num / remapping_index，以及重定向项被禁用前 IRQ 不被释放的生命周期合同", "ev": "ostd/src/arch/x86/kernel/irq/ioapic.rs::IoApic::enable; ostd/src/trap/irq.rs::IrqLine @97963e831" },

  { "to": "PIT_CFG", "from": "IO_PIO", "gate": "accept", "need": "pit::init 消费调用者提供的 init_writes(mode) 三项前缀。受保护端口必须传入 PortWriteSequence。", "ev": "ostd/src/arch/x86/timer/pit.rs::init，ostd/src/io/io_port/mod.rs::needs_write_sequence,IoPort::write @43cc4d8d5" },

  { "to": "APIC_RESERVE", "from": "IO_ALLOC", "gate": "accept", "need": "xAPIC 需要永久排除从 MSR 基址起的 1024 字节。主线 builder 只保证登记窗口和分离，仍须提供设备保留及排他效果。", "ev": "ostd/src/arch/x86/kernel/apic/mod.rs::init，ostd/src/io/io_mem/allocator.rs::IoMemAllocatorBuilder @b94500acd" },
  { "to": "APIC_RESERVE", "from": "IO_WIN", "gate": "accept", "need": "该 1024 字节范围属于登记窗口，且权限尚未被其他设备占用", "ev": "ostd/src/arch/x86/kernel/apic/mod.rs::init @97963e831" },

  { "to": "APIC_PUB", "from": "APIC_PROBE", "gate": "accept", "need": "ApicId::from 读取 APIC_TYPE，须与 init 发布的模式一致，并保留 xAPIC 八位截断（value as u8）", "ev": "ostd/src/arch/x86/kernel/apic/mod.rs::init,APIC_TYPE,ApicId::from @97963e831" },
  { "to": "APIC_PUB", "from": "APIC_RESERVE", "gate": "accept", "need": "xAPIC 分支只有 remove 成功后发布 APIC_TYPE；x2APIC 分支不消费该条件", "ev": "ostd/src/arch/x86/kernel/apic/mod.rs::init @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "LAPIC_INST", "from": "APIC_PUB", "gate": "accept", "need": "get_or_init 消费 APIC_TYPE.get().unwrap() 的已发布模式", "ev": "ostd/src/arch/x86/kernel/apic/mod.rs::get_or_init @97963e831" },
  { "to": "LAPIC_INST", "from": "LOC_ID", "gate": "accept", "need": "CpuId::current_racy 与 CPU-local 槽归属，以及 PinCurrentCpu 的不迁移合同", "ev": "ostd/src/arch/x86/kernel/apic/mod.rs::get_or_init @97963e831" },
  { "to": "LAPIC_INST", "from": "LOC_REMOTE", "gate": "accept", "need": "APIC_INSTANCE.get_on_cpu(current_racy()) 的槽存活和共享访问合同", "ev": "ostd/src/arch/x86/kernel/apic/mod.rs::get_or_init @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "LAPIC_DEV", "from": "LAPIC_INST", "gate": "accept", "need": "调用方取得当前 CPU 的已启用后端；后端寄存器证明本身不必等实例管理", "ev": "ostd/src/arch/x86/kernel/apic/mod.rs::Apic,ApicTimer; xapic.rs::XApic::eoi; x2apic.rs::X2Apic::eoi @97963e831" },
  { "to": "LAPIC_DEV", "from": "PREEMPT_PIN", "gate": "accept", "need": "EOI 路径 interrupts_ack 先用 disable_preempt() 取得 PinCurrentCpu，再调用 get_or_init(..).eoi()", "ev": "ostd/src/arch/x86/mod.rs::interrupts_ack @97963e831" },

  { "to": "GDT", "from": "TSS_LOCAL", "gate": "accept", "need": "构造 TSS 描述符及 load_tss 需要当前核的、存活到使用结束的 TSS。", "ev": "ostd/src/arch/x86/trap/gdt.rs::init @e89201cb6" },

  { "to": "IDT_LOAD", "from": "IDT_TABLE", "gate": "accept", "need": "load_idtr 需要静态表的 256 个可用门，init 用 Idt::wf 证明逐项属性，并从同一切片计算基址和 4095 界限。", "ev": "ostd/src/arch/x86/trap/idt.rs::Idt::wf,init,published_idt，verified_libs/vstd_extra/src/external/x86_idt.rs::load_idtr @c9a85a789" },

  { "to": "TRAP_EXC", "from": "TRAP_DATA", "gate": "accept", "need": "异常数据类型与 PageFaultErrorCode::from_bits 合同；无需等全部 UserContext getter", "ev": "ostd/src/arch/x86/cpu/context/mod.rs::CpuException::new @a47e745320" },

  { "to": "TRAP_DISP", "from": "IDT_LOAD", "gate": "accept", "need": "实际 trap 分派需在执行核上加载对应入口表，并遵守每个 stub 的错误码和栈约定。IdtrLoad 可描述已安装的表，启动调用和分派还须恢复。", "ev": "ostd/src/arch/x86/trap/{idt.rs::init,mod.rs::init,trap.S::trap_common}，verified_libs/vstd_extra/src/external/x86_idt.rs::IdtrLoad @c9a85a789" },
  { "to": "TRAP_DISP", "from": "GDT", "gate": "accept", "need": "有效的 TSS / 栈布局合同", "ev": "ostd/src/arch/x86/trap/gdt.rs::LOCAL_TSS; trap.S::trap_common @97963e831" },
  { "to": "TRAP_DISP", "from": "IRQ_GUARD", "gate": "accept", "need": "IF、嵌套、bottom-half guard 交接及返回时禁中断合同", "ev": "ostd/src/trap/handler.rs::process_bottom_half,call_irq_callback_functions @97963e831" },
  { "to": "TRAP_DISP", "from": "TRAP_EXC", "gate": "accept", "need": "CpuException::new 的分类与载荷合同：trap_handler 第 166 行调用 CpuException::new(f.trap_num, f.error_code)", "ev": "ostd/src/arch/x86/trap/mod.rs::trap_handler @97963e831" },
  { "to": "TRAP_DISP", "from": "IRQLINE", "gate": "accept", "need": "回调表有效性、IRQ 索引范围与回调执行合同", "ev": "ostd/src/trap/irq.rs::process_top_half; trap/handler.rs::call_irq_callback_functions @97963e831" },
  { "to": "TRAP_DISP", "from": "LOC_CELL", "gate": "accept", "need": "KERNEL_INTERRUPT_NESTED_LEVEL 的同核单指令加减与恢复", "ev": "ostd/src/arch/x86/trap/mod.rs::trap_handler @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "IRQLINE", "from": "SYNC_GUARD", "gate": "accept", "need": "Inner.callbacks 的读/写 guardian 及 guard 转移恢复合同", "ev": "ostd/src/trap/irq.rs::Inner,process_top_half; ostd/src/sync/guard.rs::WriteIrqDisabled @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "ROUTE_MAP", "from": "ACPI_MADT", "gate": "accept", "need": "ISA override 与 IOAPIC 控制器清单", "ev": "ostd/src/arch/x86/kernel/irq/mod.rs::init,IrqChip::map_isa_pin_to @97963e831" },
  { "to": "ROUTE_MAP", "from": "IOAPIC_ENTRY", "gate": "accept", "need": "重定向项 enable / disable 的效果与失败合同", "ev": "ostd/src/arch/x86/kernel/irq/mod.rs::IrqChip::map_gsi_pin_to; ioapic.rs::IoApic::enable @97963e831" },
  { "to": "ROUTE_MAP", "from": "IRQLINE", "gate": "accept", "need": "IRQ vector 与保留期合同", "ev": "ostd/src/arch/x86/kernel/irq/mod.rs::MappedIrqLine::drop @97963e831" },
  { "to": "ROUTE_MAP", "from": "PIC", "gate": "accept", "need": "PCAT_COMPAT 平台上 PIC 已被 init_and_disable 屏蔽，IOAPIC 才是唯一投递路径", "ev": "ostd/src/arch/x86/kernel/irq/mod.rs::init（PCAT_COMPAT → pic::init_and_disable） @97963e831" },
  { "to": "ROUTE_MAP", "from": "IO_WIN", "gate": "accept", "need": "irq::init 将 MADT 的 IOAPIC 地址对应到可保留窗口；须证明地址落在登记窗口且未分配", "ev": "ostd/src/arch/x86/kernel/irq/mod.rs::init; ioapic.rs::IoApicAccess::new @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "PITIRQ", "from": "ROUTE_MAP", "gate": "accept", "need": "最终组合：ISA / GSI 映射与 IOAPIC 配置（本项就是这些合同的组合验收）", "ev": "ostd/src/arch/x86/timer/pit.rs::enable_interrupt; ostd/src/arch/x86/kernel/irq/mod.rs::init @97963e831" },
  { "to": "PITIRQ", "from": "TRAP_DISP", "gate": "accept", "need": "最终组合：IDT / 汇编进入、TrapFrame、IRQ 嵌套状态、回调执行", "ev": "ostd/src/trap/handler.rs::call_irq_callback_functions @97963e831" },
  { "to": "PITIRQ", "from": "LAPIC_DEV", "gate": "accept", "need": "最终组合：回调后的 EOI（interrupts_ack 通过当前 LAPIC 的 eoi）", "ev": "ostd/src/arch/x86/mod.rs::interrupts_ack @97963e831" },
  { "to": "PITIRQ", "from": "PIT_CFG", "gate": "accept", "need": "BSP 的无 APIC 定时器分支使用 SquareWaveGenerator；须在选定平台建立命令、IRQ0 周期和路由。RateGenerator 供 TSC 校准使用。", "ev": "ostd/src/arch/x86/timer/mod.rs::init_bsp，kernel/tsc.rs::determine_tsc_freq_via_pit @2aa424ec0，timer/pit.rs::init @f2bdb88a6" },

  { "to": "CAL_FREQ", "from": "PITIRQ", "gate": "accept", "need": "IRQ0 周期回调、EOI 与等待进展合同：determine_tsc_freq_via_pit 用 IrqLine::alloc + on_active(pit_callback) 注册回调，再用 enable_local_and_halt 等待，不是端口轮询", "ev": "ostd/src/arch/x86/kernel/tsc.rs::determine_tsc_freq_via_pit（第 180–194 行） @97963e831" },
  { "to": "CAL_FREQ", "from": "PIT_CFG", "gate": "accept", "need": "pit::init(RateGenerator) 的周期合同", "ev": "ostd/src/arch/x86/kernel/tsc.rs::determine_tsc_freq_via_pit @97963e831" },
  { "to": "CAL_FREQ", "from": "TSC_VALUE", "gate": "accept", "need": "校准入口须区分基于共享叶 0x15 和可选本核基频的 None、Some(0) 与非零 Hz，再组合 PIT 回退与发布。", "ev": "ostd/src/arch/x86/kernel/tsc.rs::determine_tsc_freq_via_cpuid,init_tsc_freq @8c8ef39c4" },

  { "to": "TMR_DEADLINE", "from": "LAPIC_DEV", "gate": "accept", "need": "Apic::set_lvt_timer 与 deadline MSR 的效果", "ev": "ostd/src/arch/x86/timer/apic.rs::init_deadline_mode @97963e831" },
  { "to": "TMR_DEADLINE", "from": "IRQLINE", "gate": "accept", "need": "IrqLine 分配与回调注册", "ev": "ostd/src/arch/x86/timer/apic.rs::init_bsp,init_timer @97963e831" },
  { "to": "TMR_DEADLINE", "from": "PREEMPT_PIN", "gate": "accept", "need": "init 与回调中 disable_preempt() 取得的 PinCurrentCpu guard（第 64、117、146 行）", "ev": "ostd/src/arch/x86/timer/apic.rs @97963e831" },
  { "to": "TMR_DEADLINE", "from": "TSC_VALUE", "gate": "accept", "need": "init_deadline_mode_config 消费 tsc_freq() 并计算间隔", "ev": "ostd/src/arch/x86/timer/apic.rs::init_deadline_mode_config @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "TMR_PERIODIC", "from": "PITIRQ", "gate": "accept", "need": "periodic 校准注册 PIT 回调并等待 CONFIG，完成后 drop(irq)：周期采样回调与中断进展", "ev": "ostd/src/arch/x86/timer/apic.rs::init_periodic_mode_config,pit_callback @97963e831" },
  { "to": "TMR_PERIODIC", "from": "LAPIC_DEV", "gate": "accept", "need": "计数器、分频与 LVT 状态合同", "ev": "ostd/src/arch/x86/timer/apic.rs::init_periodic_mode_config @97963e831" },
  { "to": "TMR_PERIODIC", "from": "PREEMPT_PIN", "gate": "accept", "need": "init 与回调中 disable_preempt() 取得的 PinCurrentCpu guard", "ev": "ostd/src/arch/x86/timer/apic.rs @97963e831" },

  { "to": "F_RECOVER", "from": "TRAP_DISP", "gate": "accept", "need": "页错误分支提供的 TrapFrame.rip、异常数据与用户缺页处理失败合同：缺页处理成功就直接返回重试，失败才查表改 RIP", "ev": "ostd/src/arch/x86/trap/mod.rs::trap_handler,handle_user_page_fault（ExTable::find_recovery_inst_addr 在第 231 行） @97963e831" },
  { "to": "F_RECOVER", "from": "F_ASM", "gate": "accept", "need": "汇编提供的恢复地址、剩余字节返回 ABI 与 ExTable 表项", "ev": "ostd/src/arch/x86/mm/util.rs::__memcpy_fallible,__memset_fallible; ostd/src/arch/x86/ex_table.rs::ExTable::find_recovery_inst_addr @97963e831" },

  /* ===== consumers in: OSTD 公共模块 ===== */
  { "to": "F_BYTES", "from": "F_RECOVER", "gate": "accept", "need": "成功 / 部分完成 / 故障三种结果的最终行为", "ev": "ostd/src/mm/io.rs::memcpy_fallible,impl_read_fallible @97963e831" },
  { "to": "F_BYTES", "from": "VM_CONTENT", "gate": "accept", "need": "原 Rust buffer、VirtPtr / MemView 与 Pod 值的字节关系", "ev": "ostd/src/mm/io.rs::read_val,memcpy_fallible @97963e831" },

  /* ===== consumers in: x86 平台 ===== */
  { "to": "SMP_AP", "from": "LAPIC_INST", "gate": "accept", "need": "当前核 HwCpuId::read_current 的归属合同（read_current 调用 apic::get_or_init(guard)）", "ev": "ostd/src/boot/smp.rs::report_online_and_hw_cpu_id; ostd/src/arch/x86/irq.rs::HwCpuId::read_current @97963e831" },
  { "to": "SMP_AP", "from": "LOC_STORE", "gate": "accept", "need": "get_ap 返回存活且独占的 CPU-local 区域", "ev": "ostd/src/boot/smp.rs::boot_all_aps @97963e831" },
  { "to": "SMP_AP", "from": "PREEMPT_PIN", "gate": "accept", "need": "boot/smp.rs 第 159 行用 disable_preempt() 取得的 PinCurrentCpu guard", "ev": "ostd/src/boot/smp.rs::report_online_and_hw_cpu_id @97963e831" },
  { "to": "SMP_AP", "from": "MM_FRAME", "gate": "accept", "need": "AP_BOOT_STACK_SIZE 的连续 Segment 存活到 AP 使用结束", "ev": "ostd/src/boot/smp.rs::boot_all_aps @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "SMP_AP", "from": "MM_BOOT", "gate": "accept", "need": "AP 切到内核表后仍可通过线性映射访问已分配的启动栈", "ev": "ostd/src/boot/smp.rs::boot_all_aps,ap_early_entry；ostd/src/mm/kspace/mod.rs::init_kernel_page_table @7cd0bcdcd" },
  { "to": "SMP_AP", "from": "MM_BOOT_ROOT", "gate": "accept", "need": "boot_all_aps 在启动借用期间取得 root_address 作为 bringup_all_aps 的页表实参", "ev": "ostd/src/boot/smp.rs::boot_all_aps @7cd0bcdcd" },
  { "to": "SMP_AP", "from": "MM_BOOT_ACTIVATE", "gate": "accept", "need": "ap_early_entry 在本核激活内核页表并退出启动页表后才报告 online", "ev": "ostd/src/boot/smp.rs::ap_early_entry @7cd0bcdcd" },

  { "to": "SMP_COMPOSE", "from": "SMP_AP", "gate": "accept", "need": "本项的验收内容就是在 AP 启动合同之上组合每项初始化的先后条件与发布可见性（计划称其为最终集成入口）", "ev": "ostd/src/boot/smp.rs::boot_all_aps,ap_early_entry @97963e831" },
  { "to": "SMP_COMPOSE", "from": "SYSCALL", "gate": "accept", "need": "ap_early_entry 的 trap::init 消费 GDT/IDT/syscall 初始化结果", "ev": "ostd/src/boot/smp.rs::ap_early_entry; ostd/src/arch/x86/trap/mod.rs::init @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "SMP_COMPOSE", "from": "TRAP_DISP", "gate": "accept", "need": "开中断前已安装入口并能安全分派", "ev": "ostd/src/boot/smp.rs::ap_early_entry @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "SMP_COMPOSE", "from": "CPU_ENABLE", "gate": "accept", "need": "enable_cpu_features 的每核控制寄存器已配置状态", "ev": "ostd/src/boot/smp.rs::ap_early_entry @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "SMP_COMPOSE", "from": "TMR_DEADLINE", "gate": "accept", "need": "init_on_ap 的 deadline 分支配置和回调就绪状态", "ev": "ostd/src/arch/x86/mod.rs::init_on_ap @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "SMP_COMPOSE", "from": "TMR_PERIODIC", "gate": "accept", "need": "init_on_ap 的 periodic 分支配置和回调就绪状态", "ev": "ostd/src/arch/x86/mod.rs::init_on_ap @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "SMP_COMPOSE", "from": "TASK_RUNTIME", "gate": "accept", "need": "AP late entry 后 yield_now 的调度输入与 bootstrap 不返回条件", "ev": "ostd/src/boot/smp.rs::ap_early_entry @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "SMP_IPI", "from": "LAPIC_DEV", "gate": "accept", "need": "arch::irq::send_ipi 的目标 / vector 效果", "ev": "ostd/src/smp.rs::inter_processor_call,do_inter_processor_call; ostd/src/arch/x86/irq.rs::send_ipi @97963e831" },
  { "to": "SMP_IPI", "from": "TRAP_DISP", "gate": "accept", "need": "注册回调在目标核上执行的合同", "ev": "ostd/src/smp.rs::do_inter_processor_call @97963e831" },
  { "to": "SMP_IPI", "from": "IRQLINE", "gate": "accept", "need": "IrqLine 注册：smp::init 用 IrqLine::alloc().on_active(do_inter_processor_call)", "ev": "ostd/src/smp.rs::init @97963e831" },
  { "to": "SMP_IPI", "from": "LOC_REMOTE", "gate": "accept", "need": "目标 CPU 队列索引、T: Sync 与存储生命周期", "ev": "ostd/src/smp.rs::CALL_QUEUES,inter_processor_call @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "SMP_IPI", "from": "SYNC_GUARD", "gate": "accept", "need": "CALL_QUEUES 的 SpinLock 保持原子模式、队列互斥和释放合同", "ev": "ostd/src/smp.rs::inter_processor_call,do_inter_processor_call @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "SMP_IPI", "from": "SMP_AP", "gate": "accept", "need": "construct_hw_cpu_id_mapping 给出 CpuId 索引到在线 HwCpuId 的完整映射", "ev": "ostd/src/smp.rs::init; ostd/src/boot/smp.rs::construct_hw_cpu_id_mapping @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "FPU_REPR", "from": "CPU_ENABLE", "gate": "accept", "need": "真实调用 FpuContext::new/default/clone 时要交付与当前 CPU 配置相符的 FpuInitialization。构造与复制的局部证明可以先给定 enabled_on(cpu)，512 字节模式须单独建立见证。", "ev": "ostd/src/arch/x86/{mod.rs::enable_cpu_features,cpu/context/mod.rs::FpuInitialization::enabled_on,FpuContext::new,FpuContext::clone} @ce76e7de2" },

  { "to": "XSAVE", "from": "FPU_REPR", "gate": "accept", "need": "save/load 使用 as_bytes_mut/as_bytes 的活动范围和底层对齐。硬件写入或恢复还需证明缓冲充足，恢复镜像的保留字段合法。", "ev": "ostd/src/arch/x86/cpu/context/mod.rs::FpuContext::{as_bytes_mut,as_bytes,save,load} @ce76e7de2" },
  { "to": "XSAVE", "from": "CPU_ENABLE", "gate": "accept", "need": "XSAVE 路径消费 enabled_on 中缓存大小等于当前 XCR0 所需长度的条件，启动方须建立对应的平台大小与本核权限。", "ev": "ostd/src/arch/x86/cpu/context/mod.rs::FpuInitialization::enabled_on,enable_essential_features @25d3d1dbf" },

  { "to": "SYSCALL", "from": "TRAP_DISP", "gate": "accept", "need": "用户返回的寄存器 ABI 与异常 / IRQ 返回合同", "ev": "ostd/src/arch/x86/trap/syscall.rs::RawUserContext::run; ostd/src/arch/x86/cpu/context/mod.rs::UserContextApiInternal::execute @97963e831" },
  { "to": "SYSCALL", "from": "GDT", "gate": "accept", "need": "syscall::init 的安全条件要求 GDT 已初始化：选择子合同", "ev": "ostd/src/arch/x86/trap/syscall.rs::init @97963e831" },

  { "to": "TASK_SW", "from": "TASK_STACK_ALLOC", "gate": "accept", "need": "栈存活、映射、初始 SP 与 KernelStack::flush_tlb；仅有大小解析不够", "ev": "ostd/src/task/processor.rs::switch_to_task,before_switching_to @97963e831" },
  { "to": "TASK_SW", "from": "SA_RCU", "gate": "accept", "need": "switch_to_task 调用 crate::sync::finish_grace_period()：当前 CPU 不处于读侧临界区与宽限期完成合同", "ev": "ostd/src/task/processor.rs::switch_to_task（第 42 行） @97963e831" },
  { "to": "TASK_SW", "from": "TASK_RUNTIME", "gate": "accept", "need": "CURRENT/PREVIOUS_TASK_PTR 的 Arc 存活、switched_to_cpu 独占运行权及 after_switching_to 延迟释放", "ev": "ostd/src/task/processor.rs::switch_to_task,before_switching_to,after_switching_to @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_SW", "from": "TASK_CTX", "gate": "accept", "need": "switch_to_task 调用前需取得指向不同记录的 cur/nxt 权限并交出已初始化的 next。恢复后使用原 cur 令牌和保存 RSP 的对齐保证，另核对挂起栈与中断状态。", "ev": "ostd/src/task/processor.rs::switch_to_task；ostd/src/arch/x86/task/mod.rs::context_switch @54972ccc4" },
  { "to": "TASK_SW", "from": "IRQ_DROP", "gate": "accept", "need": "forget(irq_guard) 到 after_switching_to 的跨栈恢复权限；末尾 enable_local 的前提", "ev": "ostd/src/task/processor.rs::switch_to_task,after_switching_to @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_SW", "from": "PT_X86", "tag": "待确认", "missing": "只有选定 OSTD 客户的 PRE/POST_SCHEDULE_HANDLER 真正调用 VmSpace 激活时才建立地址空间切换依赖；缺具体回调实现和效果合同。现有 processor 只调用注入 handler。" },

  /* ===== consumers in: OSTD 公共模块 ===== */
  { "to": "TASK_STACK_ALLOC", "from": "IRQ_GUARD", "gate": "accept", "need": "flush_tlb 的参数是 &DisabledLocalIrqGuard", "ev": "ostd/src/task/kernel_stack.rs::KernelStack::flush_tlb（注释中） @97963e831" },
  { "to": "TASK_STACK_ALLOC", "from": "TASK_STACK", "gate": "accept", "need": "KERNEL_STACK_SIZE 的页面倍数与上界；零长度和加上 guard pages 的溢出仍须另证", "ev": "ostd/src/task/kernel_stack.rs::KernelStack::new_with_guard_page @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_STACK_ALLOC", "from": "MM_FRAME", "gate": "accept", "need": "alloc_segment_with 返回连续、存活的栈 frames 与失败资源保持", "ev": "ostd/src/task/kernel_stack.rs::KernelStack::new_with_guard_page @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_STACK_ALLOC", "from": "MM_KVA", "gate": "accept", "need": "map_frames 保留 4 页 guard 区间及有效栈映射，初始 SP 在映射末端", "ev": "ostd/src/task/kernel_stack.rs::KernelStack::new_with_guard_page @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_STACK_ALLOC", "from": "PT_LOCAL_FLUSH", "gate": "accept", "need": "flush_tlb 明确调用 tlb_flush_addr_range(&self.kvirt_area.range())；刷新后标记当前 CPU coherent", "ev": "ostd/src/task/kernel_stack.rs::KernelStack::flush_tlb @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "PREEMPT_PIN", "from": "LOC_CELL", "gate": "accept", "need": "inc_guard_count/dec_guard_count 的单指令计数合同；避免依赖需要本 guard 的高级锁接口", "ev": "ostd/src/task/preempt/{guard,cpu_local}.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "TASK_RUNTIME", "from": "LOC_CELL", "gate": "accept", "need": "CURRENT_TASK_PTR 的同核读取、Arc 来源和有效引用条件", "ev": "ostd/src/task/mod.rs::Task::current; task/processor.rs::current_task @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "PCI_CFG", "from": "IO_PIO", "gate": "accept", "need": "PCI_ADDRESS_PORT 是 0xCF8 的 u32 只写端口，PCI_DATA_PORT 是 0xCFC 的 u32 可读写端口。两者消费已验收的全宽与类型访问合同。", "ev": "ostd/src/arch/x86/pci.rs::PCI_ADDRESS_PORT,PCI_DATA_PORT,read32,write32，ostd/src/io/io_port/mod.rs::IoPort @b94500acd" },
  { "to": "PCI_CFG", "from": "PCI_ENC", "gate": "accept", "need": "read32/write32 将 encode_as_port(location) 与 offset & 0xFFFC 合并。配置访问需能从地址核对选定 bus/device/function 以及允许的偏移。", "ev": "ostd/src/arch/x86/pci.rs::encode_as_port,read32,write32 @b94500acd，分支字段恢复后置 @d14bae0d0" },

  { "to": "PCI_ENUM", "from": "PCI_CFG", "gate": "accept", "need": "配置读取语义：vendor ID 0xFFFF 表示设备不存在", "ev": "ostd/src/bus/pci/common_device.rs::new; bus/pci/mod.rs::init @97963e831" },
  { "to": "PCI_ENUM", "from": "PCI_TYPES", "gate": "accept", "need": "PciDeviceLocation/设备 ID 的字段范围和读取合同；all() 完整性与无重复由本项 PCI_ENUM 证明", "ev": "ostd/src/bus/pci/device_info.rs::PciDeviceLocation,all @b0db47c885eb9af77bf53233d0d80c5d277bcf9d" },

  { "to": "PCI_BAR", "from": "PCI_CFG", "gate": "accept", "need": "写全一、读尺寸、恢复原值的配置访问合同；给定 location 即可探测，不消费完整枚举结果", "ev": "ostd/src/bus/pci/cfg_space.rs::MemoryBar::new,IoBar::new @97963e831" },
  { "to": "PCI_BAR", "from": "IO_MMIO", "gate": "accept", "need": "MemoryBar::new 消费 IoMem::new 的映射范围、存活和 cache/flags 合同", "ev": "ostd/src/bus/pci/cfg_space.rs::MemoryBar::new @8e681282d19b29bdc1b6e715930fe9224a0c88dc; ostd/src/io/io_mem/mod.rs::new @477db699e56654e7813a910b9a25b747d80b6370" },

  { "to": "PCI_CAP", "from": "PCI_CFG", "gate": "accept", "need": "capability 链只需配置空间读取", "ev": "ostd/src/bus/pci/capability/mod.rs::device_capabilities @97963e831" },

  { "to": "PCI_MSIX", "from": "PCI_CAP", "gate": "accept", "need": "定位 MSI-X capability 与配置写入", "ev": "ostd/src/bus/pci/capability/msix.rs::new,set_interrupt_vector @97963e831" },
  { "to": "PCI_MSIX", "from": "PCI_BAR", "gate": "accept", "need": "MSI-X table / PBA 所在 MemoryBar 与 IoMem 的合同", "ev": "ostd/src/bus/pci/capability/msix.rs::new @97963e831" },
  { "to": "PCI_MSIX", "from": "PCI_ENC", "gate": "accept", "need": "remapping 分支的 construct_remappable_msix_address", "ev": "ostd/src/bus/pci/capability/msix.rs::set_interrupt_vector @97963e831; ostd/src/arch/x86/pci.rs::construct_remappable_msix_address @d14bae0d0f" },
  { "to": "PCI_MSIX", "from": "IO_MMIO", "gate": "accept", "need": "表项 write_once/read_once 的有效范围与设备可见写入；仅有 BAR 地址合同不够", "ev": "ostd/src/bus/pci/capability/msix.rs::new,set_interrupt_vector @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "PCI_MSIX", "from": "IRQLINE", "gate": "accept", "need": "set_interrupt_vector 取 num/remapping_index 并持有 IrqLine，克隆/替换须保留生命周期", "ev": "ostd/src/bus/pci/capability/msix.rs::set_interrupt_vector,clone @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "PCI_IRQ", "from": "PCI_MSIX", "gate": "accept", "need": "MSI-X 表项启用 / 屏蔽合同", "ev": "ostd/src/bus/pci/capability/msix.rs::set_interrupt_vector,irq_mut @97963e831" },
  { "to": "PCI_IRQ", "from": "IRQLINE", "gate": "accept", "need": "IrqLine::num / remapping_index / on_active 与句柄保留 / 释放", "ev": "ostd/src/bus/pci/capability/msix.rs::irq_mut @97963e831" },
  { "to": "PCI_IRQ", "from": "TRAP_DISP", "gate": "accept", "need": "回调执行与 EOI 的最终验收合同", "ev": "ostd/src/trap/irq.rs::process_top_half @97963e831" },

  { "to": "SA_DMA", "from": "DMA_MAP", "gate": "accept", "need": "DmaStream map 建立设备地址、存活与缓存一致性条件；slice 只使用其中合同", "ev": "ostd/src/mm/dma/dma_stream.rs::DmaStream::map,sync,DmaStreamSlice::sync @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  /* ===== consumers in: bzImage 启动链 ===== */
  { "to": "BZ_RANGE", "from": "BZ_ELF", "gate": "accept", "need": "file_size <= mem_size、源切片长度与目标区间有界；可先作为 requires", "ev": "ostd/libs/linux-bzimage/builder/src/lib.rs::to_flat_binary @97963e831" },

  { "to": "BZ_OUT", "from": "BZ_RANGE", "gate": "accept", "need": "每个 PT_LOAD 的目标区间与逐段覆盖语义；非重叠是选定产物的独立条件，不是当前 to_flat_binary 的保证", "ev": "ostd/libs/linux-bzimage/builder/src/lib.rs::to_flat_binary,flat_load_step @d30c271708585a0ae89b5eafd1dd795bc98281a9" },

  { "to": "BZ_IMG", "from": "BZ_OUT", "gate": "accept", "need": "按所选模式对照同一份已写出的对齐 setup。Legacy32 可直接比对整文件，Efi64 对照 PE 覆写区之外的字节。", "ev": "ostd/libs/linux-bzimage/builder/src/lib.rs::make_bzimage @7cd0bcdcd" },
  { "to": "BZ_IMG", "from": "BZ_ELF", "gate": "accept", "need": "核对实际 PT_LOAD、entry、文件偏移与加载地址；setup loader 按 physical_addr 装载而入口采用固定地址，二者必须核对。静态检查不要求解析器先被形式证明", "ev": "ostd/libs/linux-bzimage/setup/src/loader.rs::load_segment; setup/src/x86/legacy_i386/mod.rs::ASTER_ENTRY_POINT @97963e831" },
  { "to": "BZ_IMG", "from": "BZ_ENCODE", "tag": "待确认", "missing": "setup 用 .incbin 将 PAYLOAD_FILE 放入 .payload。缺实际构建记录将 encode_kernel 输出与该文件、所选内核及镜像一一对应。" },

  { "to": "ACC_IMG", "from": "BZ_IMG", "gate": "accept", "need": "依赖选定镜像及其内核 ELF 的身份与加载布局；该检查不消费 builder 的 Verus 证明", "ev": "ostd/libs/linux-bzimage/builder/src/lib.rs::make_bzimage @97963e831" },
  { "to": "ACC_IMG", "from": "F_ASM", "gate": "accept", "need": "ABI、恢复目标与 ExTable 表项的链接检查需要汇编符号与段存在；不要求缺页恢复路径先证明", "ev": "ostd/src/arch/x86/ex_table.rs::ExTable::init; ostd/src/arch/x86/mm/util.rs::memcpy_fallible @97963e831" },

  /* ===== consumers in: x86 平台 ===== */
  { "to": "ACC_RUN", "from": "ACC_IMG", "gate": "accept", "need": "可启动产物与平台配置；运行消费产物，不消费静态检查证明，最终验收同时记录二者", "ev": "ostd/libs/linux-bzimage/setup/src/x86/legacy_i386/mod.rs::main_legacy32 @97963e831" },
  { "to": "ACC_RUN", "from": "PITIRQ", "gate": "accept", "need": "可执行的注册、路由、回调与 EOI 路径，不要求形式证明先完成", "ev": "ostd/src/trap/irq.rs::IrqLine::on_active,process_top_half @97963e831" },
  { "to": "ACC_RUN", "from": "F_BYTES", "gate": "accept", "need": "成功、部分复制与故障结果可观察", "ev": "ostd/src/mm/io.rs::VmReader::read_fallible @97963e831" },

  /* ===== consumers in: OSTD 公共模块 ===== */
  { "to": "IO_PIO_ALLOC", "from": "IO_PIO", "gate": "accept", "need": "动态申请与 new_overlapping 使用同一 typed port 合同，宽度为 1、2 或 4 字节且排他端点可到 65536。", "ev": "ostd/src/io/io_port/{mod,allocator}.rs::acquire,new_overlapping；verified_libs/vstd_extra/src/external/io_port.rs::axiom_io_port_access_spec @64fd64fb0" },

  { "to": "IO_MMIO_ALLOC", "from": "IO_GLOBAL", "gate": "accept", "need": "IoMem::acquire 从全局 Once 取得实例，须将初始化谓词、登记窗口与同一实例交出的 FreePermit 对应。", "ev": "ostd/src/io/io_mem/mod.rs::IoMem::acquire，ostd/src/io/io_mem/allocator.rs::init,IoMemAllocator::acquire @78ebe223e" },

  { "to": "IO_MMIO", "from": "MM_KVA", "gate": "accept", "need": "IoMem::new 的 KVirtArea::map_untracked_frames 结果、映射存活与范围合同", "ev": "ostd/src/io/io_mem/mod.rs::IoMem::new @477db699e56654e7813a910b9a25b747d80b6370" },

  { "to": "IO_GLOBAL", "from": "IO_ALLOC", "gate": "accept", "need": "io::init 的安全条件要求系统设备窗口已排除。当前形式前置只检查 has_registered_windows，仍须证明发布的分配器保留排除效果。", "ev": "ostd/src/io/mod.rs::init，ostd/src/io/io_mem/allocator.rs::init,IoMemAllocatorBuilder @78ebe223e" },
  { "to": "IO_GLOBAL", "from": "IO_WIN", "gate": "accept", "need": "io::init 接受 has_registered_windows()。x86 的引导输入须满足 builder::new 的几何及登记条件，设备排除另外由 IO_ALLOC 交付。", "ev": "ostd/src/arch/x86/io.rs::construct_io_mem_allocator_builder，ostd/src/io/{mod.rs::init,io_mem/allocator.rs::IoMemAllocatorBuilder::new} @b94500acd" },
  { "to": "IO_GLOBAL", "from": "IO_PIO_ALLOC", "gate": "accept", "need": "初始化外部体扫描 .sensitive_io_ports，将预占和动态权限对应到同一分配器，须说明 PCI 静态端口所在范围如何长期排除在动态申请之外。", "ev": "ostd/src/io/io_port/allocator.rs::init,IoPortAllocation::tracked_empty,acquire,recycle，ostd/src/arch/x86/pci.rs::PCI_ADDRESS_PORT,PCI_DATA_PORT @b94500acd" },

  { "to": "MM_PT", "from": "PT_CFG", "gate": "accept", "need": "PageTableConfig 布局/顶层范围引理与当前 x86 PagingConstsTrait", "ev": "ostd/src/mm/page_table/mod.rs::PageTableConfig; cursor/mod.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "MM_PT", "from": "MM_FRAME", "gate": "accept", "need": "页表节点和映射 frame 的有效元数据、引用计数及所有权转移合同", "ev": "ostd/src/mm/page_table/node/mod.rs; ostd/src/mm/vm_space.rs::UserPtConfig @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "MM_KVA", "from": "MM_PT", "gate": "accept", "need": "map_frames/map_untracked_frames 消费 cursor 映射与所有权保持合同", "ev": "ostd/src/mm/kspace/kvirt_area.rs::KVirtArea::map_frames,map_untracked_frames @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "MM_BOOT", "from": "MM_PT", "gate": "accept", "need": "new_kernel_page_table 与 cursor.map 对线性、元数据及内核镜像映射的合同", "ev": "ostd/src/mm/kspace/mod.rs::init_kernel_page_table @7cd0bcdcd" },
  { "to": "MM_BOOT", "from": "MM_FRAME", "gate": "accept", "need": "meta_pages.into_raw 交出连续元数据页，其引用和重复映射约束贯穿内核页表的存活期", "ev": "ostd/src/mm/kspace/mod.rs::init_kernel_page_table；ostd/src/mm/frame/meta.rs::init @7cd0bcdcd" },
  { "to": "MM_BOOT", "from": "MM_BOOT_FRAMES", "gate": "accept", "need": "构造内核根及其子表时，页表节点取得来自全局可用页、与 early 分配分离的 frame", "ev": "ostd/src/lib.rs::init；ostd/src/mm/page_table/{mod.rs,node/mod.rs}::new_kernel_page_table,PageTableNode::alloc @7cd0bcdcd" },

  /* ===== consumers in: x86 平台 ===== */
  { "to": "KFAULT_MAP", "from": "MM_BOOT", "gate": "accept", "need": "KERNEL_PAGE_TABLE 已发布与线性映射区间/物理地址对应合同", "ev": "ostd/src/arch/x86/trap/mod.rs::handle_kernel_page_fault @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "KFAULT_MAP", "from": "MM_PT", "gate": "accept", "need": "cursor_mut/map(Untracked) 的映射与失败合同", "ev": "ostd/src/arch/x86/trap/mod.rs::handle_kernel_page_fault @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "KFAULT_MAP", "from": "PREEMPT_PIN", "gate": "accept", "need": "创建 cursor 时保持当前 CPU 的 pin 与释放合同", "ev": "ostd/src/arch/x86/trap/mod.rs::handle_kernel_page_fault @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  /* ===== consumers in: OSTD 公共模块 ===== */
  { "to": "LOC_EARLY_GLOBAL", "from": "LOC_ALLOC", "gate": "accept", "need": "实例 allocated_regions 与 alloc 的边界和保留合同", "ev": "ostd/src/mm/frame/allocator.rs::early_alloc,EarlyFrameAllocator::alloc @fa3dbab608d15cc740c7bc47c979db5235e07428" },

  { "to": "LOC_REMOTE", "from": "LOC_ID", "gate": "accept", "need": "逻辑 CPU 索引与 get_ap/静态存储地址的对应关系", "ev": "ostd/src/cpu/local/static_cpu_local.rs::get_ptr_on_target; cpu/local/mod.rs::get_on_cpu @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "LOC_CELL", "from": "LOC_ID", "gate": "accept", "need": "单次指令使用当前 GS 存储、offset 布局和逻辑 CPU 对应", "ev": "ostd/src/cpu/local/cell.rs; ostd/src/cpu/local/single_instr.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "LOC_DYNAMIC", "from": "MM_FRAME", "gate": "accept", "need": "每 CPU chunk 的连续 Segment、元数据与独占内存", "ev": "ostd/src/cpu/local/dyn_cpu_local.rs::DynCpuLocalChunk::new @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "LOC_DYNAMIC", "from": "LOC_DYNAMIC_ADDR", "gate": "accept", "need": "__new_dynamic 消费每个 CPU 的槽地址、对齐及可写范围", "ev": "ostd/src/cpu/local/dyn_cpu_local.rs::alloc,__new_dynamic @7cd0bcdcd" },

  { "to": "SYNC_GUARD", "from": "IRQ_DROP", "gate": "accept", "need": "LocalIrqDisabled/WriteIrqDisabled 写侧的创建、转移与 IF 恢复", "ev": "ostd/src/sync/guard.rs::SpinGuardian,GuardTransfer @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "SYNC_GUARD", "from": "PREEMPT_PIN", "gate": "accept", "need": "PreemptDisabled 与 WriteIrqDisabled 读侧的不迁移/释放合同", "ev": "ostd/src/sync/guard.rs::WriteIrqDisabled::read_guard @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "SYNC_WAIT", "from": "SYNC_WAKER", "gate": "accept", "need": "条件循环等待同一 Waker 的通知，取消时在 close 后再检查条件", "ev": "ostd/src/sync/wait.rs::wait_until,wait_until_or_cancelled @7cd0bcdcd" },
  { "to": "SYNC_WAIT", "from": "SYNC_QUEUE", "gate": "accept", "need": "wait_until 把关联 Waker 入队后重查条件，消费 enqueue 的登记合同", "ev": "ostd/src/sync/wait.rs::WaitQueue::wait_until @7cd0bcdcd" },

  { "to": "SYNC_API", "from": "SYNC_WAIT", "gate": "accept", "need": "阻塞锁从 wait_until 取得闭包成功返回的锁 guard", "ev": "ostd/src/sync/{mutex,rwmutex}.rs::lock,read,write @7cd0bcdcd" },
  { "to": "SYNC_API", "from": "SYNC_GUARD", "gate": "accept", "need": "读写锁/RwArc 持锁期间的运行模式与释放合同", "ev": "ostd/src/sync/rwarc.rs; ostd/src/sync/guard.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "SYNC_API", "from": "SYNC_QUEUE", "gate": "accept", "need": "Mutex 解锁唤醒一个等待者，RwMutex 的解锁路径消费 wake_one/wake_all", "ev": "ostd/src/sync/{mutex,rwmutex}.rs @7cd0bcdcd" },

  /* ===== consumers in: x86 平台 ===== */
  { "to": "CPU_ENABLE", "from": "CPU_FEAT", "gate": "accept", "need": "XCR0 的选择使用已恢复的 AVX 与 AVX-512F 探测合同，仍须建立本核寄存器权限。", "ev": "ostd/src/arch/x86/mod.rs::has_avx,has_avx512 @8c8ef39c4，enable_cpu_features @ce76e7de2" },

  /* ===== consumers in: OSTD 公共模块 ===== */
  { "to": "PCI_DEVICE", "from": "PCI_ENUM", "gate": "accept", "need": "有效 location 遍历与无设备判断", "ev": "ostd/src/bus/pci/common_device.rs::PciCommonDevice::new; ostd/src/bus/pci/capability/mod.rs::device_capabilities @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "PCI_DEVICE", "from": "PCI_BAR", "gate": "accept", "need": "BarManager 的六槽/桥接类型与映射合同", "ev": "ostd/src/bus/pci/common_device.rs::PciCommonDevice::new; ostd/src/bus/pci/capability/mod.rs::device_capabilities @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "PCI_DEVICE", "from": "PCI_CAP", "gate": "accept", "need": "capability 链有界遍历与结果", "ev": "ostd/src/bus/pci/common_device.rs::PciCommonDevice::new; ostd/src/bus/pci/capability/mod.rs::device_capabilities @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "PCI_DEVICE", "from": "PCI_MSIX", "gate": "accept", "need": "遇到 MSI-X capability 时的构造和启用合同", "ev": "ostd/src/bus/pci/common_device.rs::PciCommonDevice::new; ostd/src/bus/pci/capability/mod.rs::device_capabilities @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  /* ===== consumers in: x86 平台 ===== */
  { "to": "HPET", "from": "ACPI_TABLES", "gate": "accept", "need": "init 调用 get_acpi_tables，再经 HpetInfo::new 取得固件报告的 HPET 基址。", "ev": "ostd/src/arch/x86/timer/hpet.rs::init @7cd0bcdcd" },
  { "to": "HPET", "from": "ROUTE_MAP", "gate": "accept", "need": "Hpet::new 调用 IRQ_CHIP.map_isa_pin_to(irq,0)，需映射句柄与释放合同；仅约束完整构造，getter 可先证明", "ev": "ostd/src/arch/x86/timer/hpet.rs::Hpet::new @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "HPET", "from": "HPET_REGS", "gate": "accept", "need": "Hpet::new 在实际映射中消费比较器数量、各寄存器所需长度与对齐，返回持有这些寄存器的实例。", "ev": "ostd/src/arch/x86/timer/hpet.rs::{Hpet::new,init} @7cd0bcdcd" },
  { "to": "HPET", "from": "MM_BOOT", "gate": "accept", "need": "paddr_to_vaddr 所得地址必须覆盖完整寄存器区，并在 HPET_INSTANCE 持有引用期间保持有效。", "ev": "ostd/src/{arch/x86/timer/hpet.rs::init,mm/kspace/mod.rs::paddr_to_vaddr} @7cd0bcdcd" },

  { "to": "SERIAL_QEMU_CMOS", "from": "IO_PIO", "gate": "accept", "need": "静态 COM1 的七个 u8 地址和八次初始化写使用类型化的 PIO 合同；#969 合入时另建立偏移 0..=4 的限制。", "ev": "ostd/src/arch/x86/{device/serial.rs::SerialPort::init,serial.rs::CONSOLE_COM1_PORT} @7cd0bcdcd" },

  /* ===== consumers in: OSTD 公共模块 ===== */
  { "to": "HEAP_GLOBAL", "from": "SA_HEAP", "gate": "accept", "need": "AllocDispatch 消费 HeapSlot 的指针、大小、SlotInfo 与构造合同，dealloc 按原 layout 重建槽", "ev": "ostd/src/mm/heap/mod.rs::AllocDispatch；ostd/src/mm/heap/slot.rs::HeapSlot @7cd0bcdcd" },

  /* ===== consumers in: bzImage 启动链 ===== */
  { "to": "BZ_SETUP", "from": "BZ_LOAD", "gate": "accept", "need": "main_legacy32 读取原始 payload，按对应的 ELF 段初始化快照核对实际装载字节。", "ev": "ostd/libs/linux-bzimage/setup/src/x86/legacy_i386/mod.rs::main_legacy32 @7cd0bcdcd；ostd/libs/linux-bzimage/setup/src/loader.rs::load_elf @c762f8e27" },
  { "to": "BZ_SETUP", "from": "BZ_LEGACY_ALLOC", "gate": "accept", "need": "从 init 保留的 setup、BootParams 等区间及每段取得的独占 RAM 区间，建立 Legacy32 装载前置与跳转时的物理归属。", "ev": "ostd/libs/linux-bzimage/setup/src/x86/legacy_i386/{mod.rs::main_legacy32,alloc.rs::{init,alloc_at}}，ostd/libs/linux-bzimage/setup/src/loader.rs::load_segment @7cd0bcdcd" },

  /* ===== consumers in: OSTD 公共模块 ===== */
  { "to": "DMA_MAP", "from": "SYNC_GUARD", "gate": "accept", "need": "DMA_MAPPING_SET 的 SpinLock 与 DmaCoherent/DmaStream 的 RwArc 使用 PreemptDisabled，需真实 guard 生命周期", "ev": "ostd/src/mm/dma/{mod,dma_coherent,dma_stream}.rs::init,map,read_inner @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "DMA_MAP", "from": "MM_PT", "gate": "accept", "need": "非一致性 coherent 路径的 cache policy 修改需要 protect_next 的映射保持合同；当前调用在注释中", "ev": "ostd/src/mm/dma/dma_coherent.rs::DmaCoherent::map; mm/page_table/mod.rs::protect_flush_tlb @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "DMA_MAP", "from": "PT_LOCAL_FLUSH", "gate": "accept", "need": "protect_flush_tlb 的现存注释实现逐次调用 tlb_flush_addr(range.start)，只确认本地失效接口", "ev": "ostd/src/mm/page_table/mod.rs::protect_flush_tlb @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "DMA_MAP", "from": "TLB_SHOOT", "tag": "待确认", "missing": "DMA 非一致性 cache policy 路径的并发 CPU 访问和平台一致性条件尚缺；protect_flush_tlb 现存注释实现只调用本地 tlb_flush_addr，不能声称它已有远端完成协议。" },

  { "to": "TASK_COMPOSE", "from": "TASK_RUNTIME", "gate": "accept", "need": "当前任务引用、唯一运行权、park/unpark 和调度器注入合同", "ev": "ostd/src/task/mod.rs::TaskBuilder::build; task/scheduler/mod.rs::reschedule,park_current,exit_current @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_COMPOSE", "from": "TASK_SW", "gate": "accept", "need": "reschedule 的实际切换与首次 kernel_task_entry::after_switching_to 资源交接", "ev": "ostd/src/task/{mod,processor}.rs; task/scheduler/mod.rs::reschedule @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_COMPOSE", "from": "TASK_STACK_ALLOC", "gate": "accept", "need": "TaskBuilder::build 的有效栈和 end_vaddr()-16 的初始 SP/ABI 对齐", "ev": "ostd/src/task/mod.rs::TaskBuilder::build @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_COMPOSE", "from": "PREEMPT_PIN", "gate": "accept", "need": "set_need_preempt 与 FIFO 队列选择使用 guard.current_cpu 的同核合同", "ev": "ostd/src/task/scheduler/mod.rs::set_need_preempt; task/scheduler/fifo_scheduler.rs::local_rq_with,mut_local_rq_with @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_COMPOSE", "from": "SMP_IPI", "gate": "accept", "need": "远端 set_need_preempt 在目标 CPU 执行回调的安全合同；异步通知不等于必达或同步完成", "ev": "ostd/src/task/scheduler/mod.rs::set_need_preempt @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_COMPOSE", "from": "SYNC_GUARD", "gate": "accept", "need": "默认 FIFO 通过 disable_irq().lock() 保护 run queue 的权限和恢复合同", "ev": "ostd/src/task/scheduler/fifo_scheduler.rs::enqueue,local_rq_with,mut_local_rq_with @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_COMPOSE", "from": "TRAP_DATA", "gate": "accept", "need": "TaskBuilder::build 用 UserContext::tls_pointer 初始化 TaskContext TLS 字段", "ev": "ostd/src/task/mod.rs::TaskBuilder::build; arch/x86/cpu/context.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "COMMON_AUDIT", "from": "KTEST_RESULT", "gate": "accept", "need": "公共辅助库仍需核对主线测试运行入口的结果分类、panic 捕获和消息匹配；已关闭的 #942 仅供参考。", "ev": "ostd/libs/ostd-test/src/lib.rs::KtestItem::run @fece47de1" },

  /* ===== consumers in: x86 平台 ===== */
  { "to": "ACC_SCOPE", "from": "LOC_ACC", "gate": "accept", "need": "当前范围的 LOC_ACC 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "VM_POD", "gate": "accept", "need": "当前范围的 VM_POD 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "TLB_FREE", "gate": "accept", "need": "当前范围的 TLB_FREE 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "CAL_FREQ", "gate": "accept", "need": "当前范围的 CAL_FREQ 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "SMP_COMPOSE", "gate": "accept", "need": "当前范围的 SMP_COMPOSE 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "XSAVE", "gate": "accept", "need": "当前范围的 XSAVE 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "TASK_SW", "gate": "accept", "need": "当前范围的 TASK_SW 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "PCI_IRQ", "gate": "accept", "need": "当前范围的 PCI_IRQ 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "SA_DMA", "gate": "accept", "need": "当前范围的 SA_DMA 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "BZ_TRUST", "gate": "accept", "need": "当前范围的 BZ_TRUST 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "BZ_ENCODE", "gate": "accept", "need": "当前范围的 BZ_ENCODE 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "ACC_RUN", "gate": "accept", "need": "当前范围的 ACC_RUN 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "IO_GLOBAL", "gate": "accept", "need": "当前范围的 IO_GLOBAL 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "KFAULT_MAP", "gate": "accept", "need": "当前范围的 KFAULT_MAP 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "SYNC_API", "gate": "accept", "need": "当前范围的 SYNC_API 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "PCI_DEVICE", "gate": "accept", "need": "当前范围的 PCI_DEVICE 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "HPET", "gate": "accept", "need": "当前范围的 HPET 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "SERIAL_QEMU_CMOS", "gate": "accept", "need": "核对 COM1 端口永久保留和 UART 的初始化写入合同。", "ev": "ostd/src/arch/x86/{serial.rs::init,device/serial.rs::SerialPort::init} @7cd0bcdcd" },
  { "to": "ACC_SCOPE", "from": "HEAP_GLOBAL", "gate": "accept", "need": "当前范围的 HEAP_GLOBAL 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "BZ_SETUP", "gate": "accept", "need": "汇总 Legacy32 的 32 位指针、BootParams 和固定入口交接证据。", "ev": "ostd/libs/linux-bzimage/setup/src/x86/legacy_i386/mod.rs::{main_legacy32,call_aster_entrypoint} @7cd0bcdcd" },
  { "to": "ACC_SCOPE", "from": "BOOT_COMMON", "gate": "accept", "need": "当前范围的 BOOT_COMMON 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "COMMON_AUDIT", "gate": "accept", "need": "当前范围的 COMMON_AUDIT 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "TASK_COMPOSE", "gate": "accept", "need": "任务创建、内置 FIFO 与远端通知的实际组合和可信输入记录", "ev": "ostd/src/task/{mod,processor}.rs; task/scheduler/{mod,fifo_scheduler}.rs（最终范围验收） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "BZ_PARSE", "gate": "accept", "need": "核对 builder 公共参数解析的合法值、错误消息及两处 OS 字符串包装。", "ev": "ostd/libs/linux-bzimage/builder/src/encoder.rs::PayloadEncoding::from_str,From<OsString>,From<&OsStr> @53a020701cc05f8f99df03ed224e90bbe7ba234d" },
  { "to": "ACC_SCOPE", "from": "IO_MMIO_ALLOC", "gate": "accept", "need": "最终集成核对公开申请对实例返回值和 FreePermit 的使用、失败路径及显式回收的归属。", "ev": "ostd/src/io/io_mem/{allocator.rs::acquire,allocator.rs::recycle,mod.rs::IoMem::acquire} @6b8511ba2" },
  { "to": "ACC_SCOPE", "from": "COM1_SEND", "gate": "accept", "need": "核对控制台逐字节调用、退格写入序列和硬件轮询条件。", "ev": "ostd/src/{console.rs::Stdout::write_str,arch/x86/serial.rs::send} @7cd0bcdcd" },
  { "to": "ACC_SCOPE", "from": "QEMU_EXIT", "gate": "accept", "need": "记录启用 ISA debug exit 的选定平台如何报告 panic 退出，以及未配置设备时的行为。", "ev": "ostd/src/{panic.rs::abort,arch/x86/qemu.rs::exit_qemu} @7cd0bcdcd" },
  { "to": "ACC_SCOPE", "from": "BZ_EFI_OUT", "gate": "accept", "need": "汇总 Efi64 的 PE 覆写、保留的 Linux boot header 及输出文件状态。", "ev": "ostd/libs/linux-bzimage/builder/src/lib.rs::make_bzimage @7cd0bcdcd" },
  { "to": "ACC_SCOPE", "from": "BZ_EFI_HANDOFF", "gate": "accept", "need": "汇总 EFI 的解码、实际物理页、E820 和固定入口交接证据。", "ev": "ostd/libs/linux-bzimage/setup/src/x86/amd64_efi/{efi.rs::efi_phase_runtime,mod.rs::call_aster_entrypoint} @7cd0bcdcd" },
  { "to": "ACC_SCOPE", "from": "LOC_DYNAMIC_DROP", "gate": "accept", "need": "收录动态槽从分配到逐核析构及 chunk 回收的验收记录", "ev": "ostd/src/cpu/local/dyn_cpu_local.rs::try_dealloc,drop @7cd0bcdcd" },
  { "to": "ACC_SCOPE", "from": "HEAP_SLAB", "gate": "accept", "need": "收录 slab 小槽初始化、借出、归还与释放的证据", "ev": "ostd/src/mm/heap/slab.rs::SlabMeta::alloc,Slab::dealloc @7cd0bcdcd" },
  { "to": "ACC_SCOPE", "from": "HEAP_LARGE", "gate": "accept", "need": "收录大块分配和原始 Segment 往返的证据", "ev": "ostd/src/mm/heap/slot.rs::HeapSlot::alloc_large,HeapSlot::dealloc_large @7cd0bcdcd" },

  { "to": "COM1_SEND", "from": "IO_PIO", "gate": "accept", "need": "line_sts 与 SerialPort::send 分别消费状态端口的字节读和数据端口的字节写。", "ev": "ostd/src/arch/x86/{serial.rs::send,device/serial.rs::SerialPort} @7cd0bcdcd" },

  { "to": "TSS_LOCAL", "from": "LOC_ID", "gate": "accept", "need": "从当前核 GS 基址定位本核永久存储，并在取得和使用 TSS 指针期间维持 CPU 身份。", "ev": "ostd/src/{arch/x86/trap/gdt.rs::LOCAL_TSS,cpu/local/static_cpu_local.rs::StaticStorage::as_ptr} @e89201cb6" },

  /* ===== consumers in: bzImage 启动链 ===== */
  { "to": "BZ_EFI_HANDOFF", "from": "BZ_EFI_ALLOC", "gate": "accept", "need": "EFI 的 load_segment 消费按指定物理地址分配的切片；入口交接须保有各段内容及互不覆盖的分配记录。", "ev": "ostd/libs/linux-bzimage/setup/src/x86/amd64_efi/{alloc.rs::alloc_at,efi.rs::efi_phase_boot}，ostd/libs/linux-bzimage/setup/src/loader.rs::load_segment @7cd0bcdcd" },
  { "to": "BZ_EFI_HANDOFF", "from": "BZ_DECODE", "gate": "accept", "need": "efi_phase_boot 需要从实际嵌入的 payload 得到本次内核 ELF，再交给 load_elf。", "ev": "ostd/libs/linux-bzimage/setup/src/x86/amd64_efi/{decoder.rs::decode_payload,efi.rs::efi_phase_boot} @c762f8e27" },
  { "to": "BZ_EFI_HANDOFF", "from": "BZ_LOAD", "gate": "accept", "need": "EFI 入口需要 load_elf 的逐段初始化快照与相应物理页，确定最终可执行的入口字节。", "ev": "ostd/libs/linux-bzimage/setup/src/x86/amd64_efi/efi.rs::efi_phase_boot，ostd/libs/linux-bzimage/setup/src/loader.rs::load_elf @c762f8e27" },
  { "to": "BZ_EFI_HANDOFF", "from": "BZ_EFI_E820", "gate": "accept", "need": "在转交 BootParams 给内核前，使用 efi_phase_runtime 写入的有效 E820 前缀和实际项数。", "ev": "ostd/libs/linux-bzimage/setup/src/x86/amd64_efi/efi.rs::efi_phase_runtime，ostd/src/arch/x86/boot/linux_boot/mod.rs @7cd0bcdcd" },

  { "to": "BZ_EFI_OUT", "from": "BZ_PE", "gate": "accept", "need": "Efi64 写回检查只消费 PE 头长度 368 <= 0x1f1，保证 Linux boot header 未被覆盖。", "ev": "ostd/libs/linux-bzimage/builder/src/{lib.rs::make_bzimage,pe_header.rs::make_pe_coff_header} @7cd0bcdcd" },
  { "to": "BZ_EFI_OUT", "from": "BZ_OUT", "gate": "accept", "need": "Efi64 在完整写出且已对齐的 setup 上执行重定位检查并覆盖文件前缀。", "ev": "ostd/libs/linux-bzimage/builder/src/lib.rs::make_bzimage @7cd0bcdcd" },
  { "to": "BZ_EFI_OUT", "from": "BZ_RELOC", "gate": "accept", "need": "重定位检查正常返回后才能执行 PE 覆写；拒绝时要用检查前已写出的 setup 界定文件内容。", "ev": "ostd/libs/linux-bzimage/builder/src/lib.rs::{make_bzimage,assert_elf64_reloc_supported} @e1649d531" },

  /* ===== consumers in: OSTD 公共模块 ===== */
  { "to": "MM_BOOT_FRAMES", "from": "LOC_EARLY_GLOBAL", "gate": "accept", "need": "全局 early allocator 已分配的两个区间及一次性取走权限", "ev": "ostd/src/mm/frame/allocator.rs::init,EarlyFrameAllocator::allocated_regions @7cd0bcdcd" },

  { "to": "MM_BOOT_ROOT", "from": "PT_X86", "gate": "accept", "need": "首次 from_current_pt 读到当前核的启动根物理地址及对齐条件", "ev": "ostd/src/mm/page_table/boot_pt.rs::from_current_pt,root_address @7cd0bcdcd" },

  { "to": "MM_BOOT_ACTIVATE", "from": "MM_BOOT_ROOT", "gate": "accept", "need": "dismiss 取得同一启动页表及其固件页和自建页的记录；切换后本核不再取得该借用", "ev": "ostd/src/mm/page_table/boot_pt.rs::with_borrow,dismiss @7cd0bcdcd" },
  { "to": "MM_BOOT_ACTIVATE", "from": "MM_BOOT", "gate": "accept", "need": "KERNEL_PAGE_TABLE.get 取得已发布可激活的同一根页", "ev": "ostd/src/mm/kspace/mod.rs::activate_kernel_page_table @7cd0bcdcd" },
  { "to": "MM_BOOT_ACTIVATE", "from": "PT_X86", "gate": "accept", "need": "first_activate_unchecked 的根页安装结果须对应当前核", "ev": "ostd/src/mm/kspace/mod.rs::activate_kernel_page_table；ostd/src/mm/page_table/mod.rs::first_activate_unchecked @7cd0bcdcd" },
  { "to": "MM_BOOT_ACTIVATE", "from": "PT_FLUSH_GLOBAL", "gate": "accept", "need": "切根后 tlb_flush_all_including_global 完成本核含全局项的失效", "ev": "ostd/src/mm/kspace/mod.rs::activate_kernel_page_table @7cd0bcdcd" },

  { "to": "LOC_DYNAMIC_ADDR", "from": "LOC_ID", "gate": "accept", "need": "get_ptr_on_current 消费 guard.current_cpu 对当前核的绑定，目标索引消费 CpuId::as_usize 的范围", "ev": "ostd/src/cpu/local/dyn_cpu_local.rs::get_ptr_on_current,get_ptr_on_target @7cd0bcdcd" },

  { "to": "LOC_DYNAMIC_DROP", "from": "LOC_DYNAMIC", "gate": "accept", "need": "try_dealloc 消费 alloc 交出的来源 chunk、占用位和逐核初始化所有权", "ev": "ostd/src/cpu/local/dyn_cpu_local.rs::alloc,try_dealloc @7cd0bcdcd" },
  { "to": "LOC_DYNAMIC_DROP", "from": "LOC_DYNAMIC_ADDR", "gate": "accept", "need": "drop_in_place 需要 get_mut_ptr_on_target 指向该核已初始化的同一槽", "ev": "ostd/src/cpu/local/dyn_cpu_local.rs::try_dealloc @7cd0bcdcd" },

  { "to": "SYNC_WAKER", "from": "TASK_RUNTIME", "gate": "accept", "need": "new_pair 要取得当前任务，do_wait/wake_up 消费 park_current 与 unpark_target 的任务状态合同", "ev": "ostd/src/sync/wait.rs::Waiter::new_pair,Waker::do_wait,Waker::wake_up @7cd0bcdcd" },

  { "to": "SYNC_QUEUE", "from": "SYNC_WAKER", "gate": "accept", "need": "wake_one/wake_all 按 wake_up 对已通知或关闭状态的返回值决定是否继续弹出或计数", "ev": "ostd/src/sync/wait.rs::WaitQueue::wake_one,wake_all @7cd0bcdcd" },

  { "to": "HEAP_SLAB", "from": "SA_HEAP", "gate": "accept", "need": "Slab::new/dealloc 使用 push 转移槽权限，SlabMeta::alloc 使用 pop 取得唯一空闲槽并保留其余链", "ev": "ostd/src/mm/heap/slab.rs::Slab::new,SlabMeta::alloc,Slab::dealloc @7cd0bcdcd" },
  { "to": "HEAP_SLAB", "from": "MM_FRAME", "gate": "accept", "need": "Slab::new 消费独占页及元数据权限，SlabMeta::on_drop 依赖其寿命", "ev": "ostd/src/mm/heap/slab.rs::Slab::new,SlabMeta::on_drop @7cd0bcdcd" },

  { "to": "HEAP_LARGE", "from": "MM_FRAME", "gate": "accept", "need": "大槽保存连续 Segment 的原始区间，回收时以同一元数据类型恢复所有权", "ev": "ostd/src/mm/heap/slot.rs::HeapSlot::alloc_large,HeapSlot::dealloc_large @7cd0bcdcd" },
];
