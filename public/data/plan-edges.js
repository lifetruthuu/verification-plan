/* Dependency table: one row per prerequisite ("from") → consumer ("to"). Rewritten by plan.mjs; hand edits are fine.
 *   confirmed    gate "start" | "accept", need = the interface / spec / resource / state the consumer uses,
 *                ev = file::symbol @fixed-commit where that was checked
 *   unconfirmed  tag "推断" | "待确认", missing = the evidence that is absent (never blocks a work item)
 * Rows are grouped by consumer in node order. Record every change in plan-history.js (plan.mjs does it). */
window.PLAN_EDGES = [
  /* ===== consumers in: x86 平台 ===== */
  { "to": "IO_WIN", "from": "IO_ALLOC", "gate": "accept", "need": "IoMemAllocatorBuilder::new 返回的窗口视图与 RangeAllocatorPermits 合同，以及 registered_io_mem_windows / state_matches 的规格", "ev": "ostd/src/io/io_mem/allocator.rs::new,state_matches,has_registered_windows @7c710f060f7a5ed3330aba64a9f711e6dd5edac9" },

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
  { "to": "TLB_SHOOT", "from": "PT_X86", "gate": "accept", "need": "当前核的失效效果", "ev": "ostd/src/mm/tlb.rs::do_remote_flush; ostd/src/arch/x86/mm/mod.rs::tlb_flush_addr_range @97963e831" },

  { "to": "TLB_FREE", "from": "TLB_SHOOT", "gate": "accept", "need": "frame 保留到安全完成点：dispatch 明说异步，入队不够", "ev": "ostd/src/mm/tlb.rs::issue_tlb_flush_with,dispatch_tlb_flush,sync_tlb_flush; OpsStack::push,push_from,clear_without_flush @97963e831" },
  { "to": "TLB_FREE", "from": "MM_FRAME", "gate": "accept", "need": "page_keeper 持有 Frame 所有权并延迟最终释放，不能仅传入 frame 就视为保留", "ev": "ostd/src/mm/tlb.rs::issue_tlb_flush_with; OpsStack::push,clear_without_flush @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  /* ===== consumers in: x86 平台 ===== */
  { "to": "ACPI_MADT", "from": "ACPI_TABLES", "gate": "accept", "need": "有效的 AcpiTables、find_table::<Madt>、表长度与条目访问合同", "ev": "ostd/src/arch/x86/kernel/irq/mod.rs::init @97963e831" },

  { "to": "PIC", "from": "IO_PIO", "gate": "accept", "need": "敏感 PIO 端口 IoPort<u8, WriteOnlyAccess>::write 的权限与写入合同；端口 0x20 / 0x21 / 0xA0 / 0xA1", "ev": "ostd/src/arch/x86/kernel/irq/pic.rs::MASTER_CMD,MASTER_DATA,SLAVE_CMD,SLAVE_DATA,set_mask @97963e831" },

  { "to": "IOAPIC_REG", "from": "IO_ALLOC", "gate": "accept", "need": "IoApicAccess::new 保留 [base,base+0x20) 时的 remove 权限合同", "ev": "ostd/src/arch/x86/kernel/irq/ioapic.rs::IoApicAccess::new @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "IOAPIC_ENTRY", "from": "IOAPIC_REG", "gate": "accept", "need": "寄存器选择 / 数据访问合同", "ev": "ostd/src/arch/x86/kernel/irq/ioapic.rs::IoApic::enable,disable @97963e831" },
  { "to": "IOAPIC_ENTRY", "from": "IRQLINE", "gate": "accept", "need": "IrqLine::num / remapping_index，以及重定向项被禁用前 IRQ 不被释放的生命周期合同", "ev": "ostd/src/arch/x86/kernel/irq/ioapic.rs::IoApic::enable; ostd/src/trap/irq.rs::IrqLine @97963e831" },

  { "to": "PIT_CFG", "from": "IO_PIO", "gate": "accept", "need": "0x43 / 0x40 敏感 PIO 的写权限与写合同", "ev": "ostd/src/arch/x86/timer/pit.rs::MODE_COMMAND_PORT,CHANNEL0_PORT,init @97963e831" },

  { "to": "APIC_RESERVE", "from": "IO_ALLOC", "gate": "accept", "need": "IoMemAllocatorBuilder::remove 的 requires 与 ensures", "ev": "ostd/src/arch/x86/kernel/apic/mod.rs::init（io_mem_builder.remove(base..base + 1024)） @97963e831" },
  { "to": "APIC_RESERVE", "from": "IO_WIN", "gate": "accept", "need": "该 1024 字节范围属于登记窗口，且权限尚未被其他设备占用", "ev": "ostd/src/arch/x86/kernel/apic/mod.rs::init @97963e831" },

  { "to": "APIC_PUB", "from": "APIC_PROBE", "gate": "accept", "need": "ApicId::from 读取 APIC_TYPE，须与 init 发布的模式一致，并保留 xAPIC 八位截断（value as u8）", "ev": "ostd/src/arch/x86/kernel/apic/mod.rs::init,APIC_TYPE,ApicId::from @97963e831" },
  { "to": "APIC_PUB", "from": "APIC_RESERVE", "gate": "accept", "need": "xAPIC 分支只有 remove 成功后发布 APIC_TYPE；x2APIC 分支不消费该条件", "ev": "ostd/src/arch/x86/kernel/apic/mod.rs::init @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "LAPIC_INST", "from": "APIC_PUB", "gate": "accept", "need": "get_or_init 消费 APIC_TYPE.get().unwrap() 的已发布模式", "ev": "ostd/src/arch/x86/kernel/apic/mod.rs::get_or_init @97963e831" },
  { "to": "LAPIC_INST", "from": "LOC_ID", "gate": "accept", "need": "CpuId::current_racy 与 CPU-local 槽归属，以及 PinCurrentCpu 的不迁移合同", "ev": "ostd/src/arch/x86/kernel/apic/mod.rs::get_or_init @97963e831" },
  { "to": "LAPIC_INST", "from": "LOC_REMOTE", "gate": "accept", "need": "APIC_INSTANCE.get_on_cpu(current_racy()) 的槽存活和共享访问合同", "ev": "ostd/src/arch/x86/kernel/apic/mod.rs::get_or_init @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "LAPIC_DEV", "from": "LAPIC_INST", "gate": "accept", "need": "调用方取得当前 CPU 的已启用后端；后端寄存器证明本身不必等实例管理", "ev": "ostd/src/arch/x86/kernel/apic/mod.rs::Apic,ApicTimer; xapic.rs::XApic::eoi; x2apic.rs::X2Apic::eoi @97963e831" },
  { "to": "LAPIC_DEV", "from": "PREEMPT_PIN", "gate": "accept", "need": "EOI 路径 interrupts_ack 先用 disable_preempt() 取得 PinCurrentCpu，再调用 get_or_init(..).eoi()", "ev": "ostd/src/arch/x86/mod.rs::interrupts_ack @97963e831" },

  { "to": "GDT", "from": "LOC_ID", "gate": "accept", "need": "LOCAL_TSS.as_ptr() 指向当前 CPU 的永久 TSS，且执行期间不迁移", "ev": "ostd/src/arch/x86/trap/gdt.rs::init,LOCAL_TSS @97963e831" },

  { "to": "IDT_LOAD", "from": "IDT_TABLE", "gate": "accept", "need": "有效、永久（'static）的 IDT 切片与表界限合同", "ev": "ostd/src/arch/x86/trap/idt.rs::init（GLOBAL_IDT、lidt） @97963e831" },

  { "to": "TRAP_EXC", "from": "TRAP_DATA", "gate": "accept", "need": "异常数据类型与 PageFaultErrorCode::from_bits 合同；无需等全部 UserContext getter", "ev": "ostd/src/arch/x86/cpu/context/mod.rs::CpuException::new @a47e745320" },

  { "to": "TRAP_DISP", "from": "IDT_LOAD", "gate": "accept", "need": "入口已安装、有效的代码选择子与表项", "ev": "ostd/src/arch/x86/trap/trap.S::trap_common; arch/x86/trap/mod.rs::trap_handler @97963e831" },
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
  { "to": "PITIRQ", "from": "PIT_CFG", "gate": "accept", "need": "本里程碑明确验收实际 PIT 产生 IRQ0：必须给出 RateGenerator 编程与周期来源，不能只假定中断出现", "ev": "ostd/src/arch/x86/timer/pit.rs::init,enable_interrupt; arch/x86/kernel/tsc.rs::determine_tsc_freq_via_pit @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "CAL_FREQ", "from": "PITIRQ", "gate": "accept", "need": "IRQ0 周期回调、EOI 与等待进展合同：determine_tsc_freq_via_pit 用 IrqLine::alloc + on_active(pit_callback) 注册回调，再用 enable_local_and_halt 等待，不是端口轮询", "ev": "ostd/src/arch/x86/kernel/tsc.rs::determine_tsc_freq_via_pit（第 180–194 行） @97963e831" },
  { "to": "CAL_FREQ", "from": "PIT_CFG", "gate": "accept", "need": "pit::init(RateGenerator) 的周期合同", "ev": "ostd/src/arch/x86/kernel/tsc.rs::determine_tsc_freq_via_pit @97963e831" },
  { "to": "CAL_FREQ", "from": "TSC_VALUE", "gate": "accept", "need": "CPUID/PIT 选择后发布的频率值合同", "ev": "ostd/src/arch/x86/kernel/tsc.rs::init_tsc_freq @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

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
  { "to": "SMP_AP", "from": "MM_BOOT", "gate": "accept", "need": "boot_pt::with_borrow 的根页、线性映射栈地址与 activate_kernel_page_table 效果", "ev": "ostd/src/boot/smp.rs::boot_all_aps,ap_early_entry @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

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

  { "to": "XSAVE", "from": "FPU_REPR", "gate": "accept", "need": "保存区对齐、容量与初始化有效性", "ev": "ostd/src/arch/x86/cpu/context/mod.rs::FpuContext::save,load @97963e831" },
  { "to": "XSAVE", "from": "CPU_ENABLE", "gate": "accept", "need": "已启用控制寄存器和保存区掩码/长度合同", "ev": "ostd/src/arch/x86/cpu/context/mod.rs::FpuContext::save,load @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "SYSCALL", "from": "TRAP_DISP", "gate": "accept", "need": "用户返回的寄存器 ABI 与异常 / IRQ 返回合同", "ev": "ostd/src/arch/x86/trap/syscall.rs::RawUserContext::run; ostd/src/arch/x86/cpu/context/mod.rs::UserContextApiInternal::execute @97963e831" },
  { "to": "SYSCALL", "from": "GDT", "gate": "accept", "need": "syscall::init 的安全条件要求 GDT 已初始化：选择子合同", "ev": "ostd/src/arch/x86/trap/syscall.rs::init @97963e831" },

  { "to": "TASK_SW", "from": "TASK_STACK_ALLOC", "gate": "accept", "need": "栈存活、映射、初始 SP 与 KernelStack::flush_tlb；仅有大小解析不够", "ev": "ostd/src/task/processor.rs::switch_to_task,before_switching_to @97963e831" },
  { "to": "TASK_SW", "from": "SA_RCU", "gate": "accept", "need": "switch_to_task 调用 crate::sync::finish_grace_period()：当前 CPU 不处于读侧临界区与宽限期完成合同", "ev": "ostd/src/task/processor.rs::switch_to_task（第 42 行） @97963e831" },
  { "to": "TASK_SW", "from": "TASK_RUNTIME", "gate": "accept", "need": "CURRENT/PREVIOUS_TASK_PTR 的 Arc 存活、switched_to_cpu 独占运行权及 after_switching_to 延迟释放", "ev": "ostd/src/task/processor.rs::switch_to_task,before_switching_to,after_switching_to @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_SW", "from": "TASK_CTX", "gate": "accept", "need": "cur/nxt 独占上下文和有效栈满足 context_switch 的 ABI/恢复合同", "ev": "ostd/src/task/processor.rs::switch_to_task; arch/x86/task/mod.rs::context_switch @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_SW", "from": "IRQ_DROP", "gate": "accept", "need": "forget(irq_guard) 到 after_switching_to 的跨栈恢复权限；末尾 enable_local 的前提", "ev": "ostd/src/task/processor.rs::switch_to_task,after_switching_to @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_SW", "from": "PT_X86", "tag": "待确认", "missing": "只有选定 OSTD 客户的 PRE/POST_SCHEDULE_HANDLER 真正调用 VmSpace 激活时才建立地址空间切换依赖；缺具体回调实现和效果合同。现有 processor 只调用注入 handler。" },

  /* ===== consumers in: OSTD 公共模块 ===== */
  { "to": "TASK_STACK_ALLOC", "from": "IRQ_GUARD", "gate": "accept", "need": "flush_tlb 的参数是 &DisabledLocalIrqGuard", "ev": "ostd/src/task/kernel_stack.rs::KernelStack::flush_tlb（注释中） @97963e831" },
  { "to": "TASK_STACK_ALLOC", "from": "TASK_STACK", "gate": "accept", "need": "KERNEL_STACK_SIZE 的页面倍数与上界；零长度和加上 guard pages 的溢出仍须另证", "ev": "ostd/src/task/kernel_stack.rs::KernelStack::new_with_guard_page @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_STACK_ALLOC", "from": "MM_FRAME", "gate": "accept", "need": "alloc_segment_with 返回连续、存活的栈 frames 与失败资源保持", "ev": "ostd/src/task/kernel_stack.rs::KernelStack::new_with_guard_page @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_STACK_ALLOC", "from": "MM_KVA", "gate": "accept", "need": "map_frames 保留 4 页 guard 区间及有效栈映射，初始 SP 在映射末端", "ev": "ostd/src/task/kernel_stack.rs::KernelStack::new_with_guard_page @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_STACK_ALLOC", "from": "PT_X86", "gate": "accept", "need": "flush_tlb 明确调用 tlb_flush_addr_range(&self.kvirt_area.range())；刷新后标记当前 CPU coherent", "ev": "ostd/src/task/kernel_stack.rs::KernelStack::flush_tlb @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "PREEMPT_PIN", "from": "LOC_CELL", "gate": "accept", "need": "inc_guard_count/dec_guard_count 的单指令计数合同；避免依赖需要本 guard 的高级锁接口", "ev": "ostd/src/task/preempt/{guard,cpu_local}.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "TASK_RUNTIME", "from": "LOC_CELL", "gate": "accept", "need": "CURRENT_TASK_PTR 的同核读取、Arc 来源和有效引用条件", "ev": "ostd/src/task/mod.rs::Task::current; task/processor.rs::current_task @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "PCI_CFG", "from": "IO_PIO", "gate": "accept", "need": "0xCF8 / 0xCFC 的静态 PIO 端口访问合同", "ev": "ostd/src/arch/x86/pci.rs::PCI_ADDRESS_PORT,PCI_DATA_PORT,read32,write32 @7c710f060f7a5ed3330aba64a9f711e6dd5edac9" },
  { "to": "PCI_CFG", "from": "PCI_ENC", "gate": "accept", "need": "encode_as_port 的精确结果；#706 已内含同名函数，不必等 #919 整体完成", "ev": "ostd/src/arch/x86/pci.rs::encode_as_port @7c710f060f7a5ed3330aba64a9f711e6dd5edac9" },

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
  { "to": "BZ_OUT", "from": "BZ_PE", "gate": "accept", "need": "覆盖保护只需 PE 头长度 <= 0x1f1；#916 的 len == 368 足够，不必依赖全部字段证明", "ev": "ostd/libs/linux-bzimage/builder/src/lib.rs::make_bzimage @97963e831; builder/src/pe_header.rs::make_pe_coff_header @c25ca6f98" },

  { "to": "BZ_IMG", "from": "BZ_OUT", "gate": "accept", "need": "产物检查消费生成文件与期望区间；只有验收同时承诺 builder 正确性时才需要输出合同已证明", "ev": "ostd/libs/linux-bzimage/builder/src/lib.rs::make_bzimage,to_flat_binary @97963e831" },
  { "to": "BZ_IMG", "from": "BZ_ELF", "gate": "accept", "need": "核对实际 PT_LOAD、entry、文件偏移与加载地址；setup loader 按 physical_addr 装载而入口采用固定地址，二者必须核对。静态检查不要求解析器先被形式证明", "ev": "ostd/libs/linux-bzimage/setup/src/loader.rs::load_segment; setup/src/x86/legacy_i386/mod.rs::ASTER_ENTRY_POINT @97963e831" },
  { "to": "BZ_IMG", "from": "BZ_ENCODE", "tag": "待确认", "missing": "make_bzimage 只读取已链接的 setup ELF，不调用 encode_kernel。编码结果如何经外部构建工具进入 setup payload 尚缺具体构建调用链和产物 manifest；只在该证据补齐后确定组合关系。" },

  { "to": "ACC_IMG", "from": "BZ_IMG", "gate": "accept", "need": "依赖选定镜像及其内核 ELF 的身份与加载布局；该检查不消费 builder 的 Verus 证明", "ev": "ostd/libs/linux-bzimage/builder/src/lib.rs::make_bzimage @97963e831" },
  { "to": "ACC_IMG", "from": "F_ASM", "gate": "accept", "need": "ABI、恢复目标与 ExTable 表项的链接检查需要汇编符号与段存在；不要求缺页恢复路径先证明", "ev": "ostd/src/arch/x86/ex_table.rs::ExTable::init; ostd/src/arch/x86/mm/util.rs::memcpy_fallible @97963e831" },

  /* ===== consumers in: x86 平台 ===== */
  { "to": "ACC_RUN", "from": "ACC_IMG", "gate": "accept", "need": "可启动产物与平台配置；运行消费产物，不消费静态检查证明，最终验收同时记录二者", "ev": "ostd/libs/linux-bzimage/setup/src/x86/legacy_i386/mod.rs::main_legacy32 @97963e831" },
  { "to": "ACC_RUN", "from": "PITIRQ", "gate": "accept", "need": "可执行的注册、路由、回调与 EOI 路径，不要求形式证明先完成", "ev": "ostd/src/trap/irq.rs::IrqLine::on_active,process_top_half @97963e831" },
  { "to": "ACC_RUN", "from": "F_BYTES", "gate": "accept", "need": "成功、部分复制与故障结果可观察", "ev": "ostd/src/mm/io.rs::VmReader::read_fallible @97963e831" },

  /* ===== consumers in: OSTD 公共模块 ===== */
  { "to": "IO_PIO_ALLOC", "from": "IO_PIO", "gate": "accept", "need": "typed port 的 valid_io_port_access、宽度与构造合同", "ev": "ostd/src/io/io_port/{mod,allocator}.rs::acquire,new_overlapping @477db699e56654e7813a910b9a25b747d80b6370" },

  { "to": "IO_MMIO", "from": "MM_KVA", "gate": "accept", "need": "IoMem::new 的 KVirtArea::map_untracked_frames 结果、映射存活与范围合同", "ev": "ostd/src/io/io_mem/mod.rs::IoMem::new @477db699e56654e7813a910b9a25b747d80b6370" },

  { "to": "IO_GLOBAL", "from": "IO_ALLOC", "gate": "accept", "need": "已登记窗口的 builder 与保留状态", "ev": "ostd/src/io/io_mem/allocator.rs::init @477db699e56654e7813a910b9a25b747d80b6370" },
  { "to": "IO_GLOBAL", "from": "IO_WIN", "gate": "accept", "need": "builder.has_registered_windows() 的引导来源", "ev": "ostd/src/arch/x86/io.rs::construct_io_mem_allocator_builder; ostd/src/io/mod.rs::init @477db699e56654e7813a910b9a25b747d80b6370" },
  { "to": "IO_GLOBAL", "from": "IO_PIO_ALLOC", "gate": "accept", "need": "敏感端口保留后发布全局 allocator 的权限状态", "ev": "ostd/src/io/io_port/allocator.rs::init @477db699e56654e7813a910b9a25b747d80b6370" },

  { "to": "MM_PT", "from": "PT_CFG", "gate": "accept", "need": "PageTableConfig 布局/顶层范围引理与当前 x86 PagingConstsTrait", "ev": "ostd/src/mm/page_table/mod.rs::PageTableConfig; cursor/mod.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "MM_PT", "from": "MM_FRAME", "gate": "accept", "need": "页表节点和映射 frame 的有效元数据、引用计数及所有权转移合同", "ev": "ostd/src/mm/page_table/node/mod.rs; ostd/src/mm/vm_space.rs::UserPtConfig @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "MM_KVA", "from": "MM_PT", "gate": "accept", "need": "map_frames/map_untracked_frames 消费 cursor 映射与所有权保持合同", "ev": "ostd/src/mm/kspace/kvirt_area.rs::KVirtArea::map_frames,map_untracked_frames @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "MM_BOOT", "from": "MM_PT", "gate": "accept", "need": "构造内核映射与 boot_pt 接管的页表合同", "ev": "ostd/src/mm/kspace/mod.rs::init_kernel_page_table; ostd/src/mm/page_table/boot_pt.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "MM_BOOT", "from": "PT_X86", "gate": "accept", "need": "激活已构造根页、读取 boot 根页的 CR3 效果合同", "ev": "ostd/src/mm/kspace/mod.rs::activate_kernel_page_table; ostd/src/mm/page_table/boot_pt.rs::with_borrow @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "MM_BOOT", "from": "MM_FRAME", "gate": "accept", "need": "元数据 pages 与全局 frame allocator 的初始化/可用区间合同", "ev": "ostd/src/mm/frame/allocator.rs::init; ostd/src/mm/kspace/mod.rs::init_kernel_page_table @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "MM_BOOT", "from": "LOC_EARLY_GLOBAL", "gate": "accept", "need": "frame allocator 初始化排除 early 阶段已经分配的范围", "ev": "ostd/src/mm/frame/allocator.rs::init,EarlyFrameAllocator::allocated_regions @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  /* ===== consumers in: x86 平台 ===== */
  { "to": "KFAULT_MAP", "from": "MM_BOOT", "gate": "accept", "need": "KERNEL_PAGE_TABLE 已发布与线性映射区间/物理地址对应合同", "ev": "ostd/src/arch/x86/trap/mod.rs::handle_kernel_page_fault @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "KFAULT_MAP", "from": "MM_PT", "gate": "accept", "need": "cursor_mut/map(Untracked) 的映射与失败合同", "ev": "ostd/src/arch/x86/trap/mod.rs::handle_kernel_page_fault @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "KFAULT_MAP", "from": "PREEMPT_PIN", "gate": "accept", "need": "创建 cursor 时保持当前 CPU 的 pin 与释放合同", "ev": "ostd/src/arch/x86/trap/mod.rs::handle_kernel_page_fault @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  /* ===== consumers in: OSTD 公共模块 ===== */
  { "to": "LOC_EARLY_GLOBAL", "from": "LOC_ALLOC", "gate": "accept", "need": "实例 allocated_regions 与 alloc 的边界和保留合同", "ev": "ostd/src/mm/frame/allocator.rs::early_alloc,EarlyFrameAllocator::alloc @fa3dbab608d15cc740c7bc47c979db5235e07428" },

  { "to": "LOC_REMOTE", "from": "LOC_ID", "gate": "accept", "need": "逻辑 CPU 索引与 get_ap/静态存储地址的对应关系", "ev": "ostd/src/cpu/local/static_cpu_local.rs::get_ptr_on_target; cpu/local/mod.rs::get_on_cpu @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "LOC_CELL", "from": "LOC_ID", "gate": "accept", "need": "单次指令使用当前 GS 存储、offset 布局和逻辑 CPU 对应", "ev": "ostd/src/cpu/local/cell.rs; ostd/src/cpu/local/single_instr.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "LOC_DYNAMIC", "from": "MM_FRAME", "gate": "accept", "need": "每 CPU chunk 的连续 Segment、元数据与独占内存", "ev": "ostd/src/cpu/local/dyn_cpu_local.rs::DynCpuLocalChunk::new @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "SYNC_GUARD", "from": "IRQ_DROP", "gate": "accept", "need": "LocalIrqDisabled/WriteIrqDisabled 写侧的创建、转移与 IF 恢复", "ev": "ostd/src/sync/guard.rs::SpinGuardian,GuardTransfer @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "SYNC_GUARD", "from": "PREEMPT_PIN", "gate": "accept", "need": "PreemptDisabled 与 WriteIrqDisabled 读侧的不迁移/释放合同", "ev": "ostd/src/sync/guard.rs::WriteIrqDisabled::read_guard @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "SYNC_WAIT", "from": "TASK_RUNTIME", "gate": "accept", "need": "当前 Task 的有效引用、park_current/unpark_target 的状态转换与唤醒合同", "ev": "ostd/src/sync/wait.rs::Waiter::new_pair,do_wait,Waker::wake_up @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "SYNC_API", "from": "SYNC_WAIT", "gate": "accept", "need": "Mutex/RwMutex 的 WaitQueue 等待及唤醒保证", "ev": "ostd/src/sync/{mutex,rwmutex}.rs::lock,unlock @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "SYNC_API", "from": "SYNC_GUARD", "gate": "accept", "need": "读写锁/RwArc 持锁期间的运行模式与释放合同", "ev": "ostd/src/sync/rwarc.rs; ostd/src/sync/guard.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  /* ===== consumers in: x86 平台 ===== */
  { "to": "CPU_ENABLE", "from": "CPU_FEAT", "gate": "accept", "need": "特性采样的叶支持与位判断合同", "ev": "ostd/src/arch/x86/mod.rs::has_avx,has_avx512,enable_cpu_features @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  /* ===== consumers in: OSTD 公共模块 ===== */
  { "to": "PCI_DEVICE", "from": "PCI_ENUM", "gate": "accept", "need": "有效 location 遍历与无设备判断", "ev": "ostd/src/bus/pci/common_device.rs::PciCommonDevice::new; ostd/src/bus/pci/capability/mod.rs::device_capabilities @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "PCI_DEVICE", "from": "PCI_BAR", "gate": "accept", "need": "BarManager 的六槽/桥接类型与映射合同", "ev": "ostd/src/bus/pci/common_device.rs::PciCommonDevice::new; ostd/src/bus/pci/capability/mod.rs::device_capabilities @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "PCI_DEVICE", "from": "PCI_CAP", "gate": "accept", "need": "capability 链有界遍历与结果", "ev": "ostd/src/bus/pci/common_device.rs::PciCommonDevice::new; ostd/src/bus/pci/capability/mod.rs::device_capabilities @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "PCI_DEVICE", "from": "PCI_MSIX", "gate": "accept", "need": "遇到 MSI-X capability 时的构造和启用合同", "ev": "ostd/src/bus/pci/common_device.rs::PciCommonDevice::new; ostd/src/bus/pci/capability/mod.rs::device_capabilities @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  /* ===== consumers in: x86 平台 ===== */
  { "to": "HPET", "from": "ACPI_TABLES", "gate": "accept", "need": "ACPI HPET 表发现、基址和字段可读合同", "ev": "ostd/src/arch/x86/timer/hpet.rs::Hpet::new @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "HPET", "from": "ROUTE_MAP", "gate": "accept", "need": "Hpet::new 调用 IRQ_CHIP.map_isa_pin_to(irq,0)，需映射句柄与释放合同；仅约束完整构造，getter 可先证明", "ev": "ostd/src/arch/x86/timer/hpet.rs::Hpet::new @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "SERIAL_QEMU_CMOS", "from": "IO_PIO", "gate": "accept", "need": "串口/QEMU/CMOS 静态端口访问宽度与权限合同", "ev": "ostd/src/arch/x86/serial.rs; qemu.rs; device/cmos.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "SERIAL_QEMU_CMOS", "from": "ACPI_TABLES", "gate": "accept", "need": "CMOS 的 FADT 世纪寄存器编号来源，仅约束 CMOS 子项", "ev": "ostd/src/arch/x86/device/cmos.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  /* ===== consumers in: OSTD 公共模块 ===== */
  { "to": "HEAP_GLOBAL", "from": "SA_HEAP", "gate": "accept", "need": "slab 自由槽的 LIFO、独占内存与布局合同", "ev": "ostd/src/mm/heap/slab.rs; ostd/src/mm/heap/mod.rs::AllocDispatch @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "HEAP_GLOBAL", "from": "MM_FRAME", "gate": "accept", "need": "slab/大分配使用 frame/Segment 的存活与回收合同", "ev": "ostd/src/mm/heap/mod.rs; ostd/src/mm/heap/slab.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

  { "to": "DMA_MAP", "from": "SYNC_GUARD", "gate": "accept", "need": "DMA_MAPPING_SET 的 SpinLock 与 DmaCoherent/DmaStream 的 RwArc 使用 PreemptDisabled，需真实 guard 生命周期", "ev": "ostd/src/mm/dma/{mod,dma_coherent,dma_stream}.rs::init,map,read_inner @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "DMA_MAP", "from": "MM_PT", "gate": "accept", "need": "非一致性 coherent 路径的 cache policy 修改需要 protect_next 的映射保持合同；当前调用在注释中", "ev": "ostd/src/mm/dma/dma_coherent.rs::DmaCoherent::map; mm/page_table/mod.rs::protect_flush_tlb @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "DMA_MAP", "from": "PT_X86", "gate": "accept", "need": "protect_flush_tlb 的现存注释实现逐次调用 tlb_flush_addr(range.start)，只确认本地失效接口", "ev": "ostd/src/mm/page_table/mod.rs::protect_flush_tlb @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "DMA_MAP", "from": "TLB_SHOOT", "tag": "待确认", "missing": "DMA 非一致性 cache policy 路径的并发 CPU 访问和平台一致性条件尚缺；protect_flush_tlb 现存注释实现只调用本地 tlb_flush_addr，不能声称它已有远端完成协议。" },

  { "to": "TASK_COMPOSE", "from": "TASK_RUNTIME", "gate": "accept", "need": "当前任务引用、唯一运行权、park/unpark 和调度器注入合同", "ev": "ostd/src/task/mod.rs::TaskBuilder::build; task/scheduler/mod.rs::reschedule,park_current,exit_current @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_COMPOSE", "from": "TASK_SW", "gate": "accept", "need": "reschedule 的实际切换与首次 kernel_task_entry::after_switching_to 资源交接", "ev": "ostd/src/task/{mod,processor}.rs; task/scheduler/mod.rs::reschedule @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_COMPOSE", "from": "TASK_STACK_ALLOC", "gate": "accept", "need": "TaskBuilder::build 的有效栈和 end_vaddr()-16 的初始 SP/ABI 对齐", "ev": "ostd/src/task/mod.rs::TaskBuilder::build @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_COMPOSE", "from": "PREEMPT_PIN", "gate": "accept", "need": "set_need_preempt 与 FIFO 队列选择使用 guard.current_cpu 的同核合同", "ev": "ostd/src/task/scheduler/mod.rs::set_need_preempt; task/scheduler/fifo_scheduler.rs::local_rq_with,mut_local_rq_with @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_COMPOSE", "from": "SMP_IPI", "gate": "accept", "need": "远端 set_need_preempt 在目标 CPU 执行回调的安全合同；异步通知不等于必达或同步完成", "ev": "ostd/src/task/scheduler/mod.rs::set_need_preempt @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_COMPOSE", "from": "SYNC_GUARD", "gate": "accept", "need": "默认 FIFO 通过 disable_irq().lock() 保护 run queue 的权限和恢复合同", "ev": "ostd/src/task/scheduler/fifo_scheduler.rs::enqueue,local_rq_with,mut_local_rq_with @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "TASK_COMPOSE", "from": "TRAP_DATA", "gate": "accept", "need": "TaskBuilder::build 用 UserContext::tls_pointer 初始化 TaskContext TLS 字段", "ev": "ostd/src/task/mod.rs::TaskBuilder::build; arch/x86/cpu/context.rs @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },

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
  { "to": "ACC_SCOPE", "from": "LOC_DYNAMIC", "gate": "accept", "need": "当前范围的 LOC_DYNAMIC 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "SYNC_API", "gate": "accept", "need": "当前范围的 SYNC_API 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "PCI_DEVICE", "gate": "accept", "need": "当前范围的 PCI_DEVICE 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "HPET", "gate": "accept", "need": "当前范围的 HPET 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "SERIAL_QEMU_CMOS", "gate": "accept", "need": "当前范围的 SERIAL_QEMU_CMOS 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "HEAP_GLOBAL", "gate": "accept", "need": "当前范围的 HEAP_GLOBAL 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "BZ_SETUP", "gate": "accept", "need": "当前范围的 BZ_SETUP 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "BOOT_COMMON", "gate": "accept", "need": "当前范围的 BOOT_COMMON 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "COMMON_AUDIT", "gate": "accept", "need": "当前范围的 COMMON_AUDIT 交付与可信边界记录；这是最终覆盖验收，不是其他工作的开工或运行顺序", "ev": "ostd/src/lib.rs; ostd/libs/linux-bzimage/builder/src/lib.rs; setup/src/main.rs（本计划范围清单） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
  { "to": "ACC_SCOPE", "from": "TASK_COMPOSE", "gate": "accept", "need": "任务创建、内置 FIFO 与远端通知的实际组合和可信输入记录", "ev": "ostd/src/task/{mod,processor}.rs; task/scheduler/{mod,fifo_scheduler}.rs（最终范围验收） @8e681282d19b29bdc1b6e715930fe9224a0c88dc" },
];
