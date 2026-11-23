/* Explicit acceptance records ("done"). A merged PR, a green CI or a dashboard colour never sets one.
 * date: day the delivery was verified; evidence: what was checked, against which fixed commit (…@<sha>).
 * Add with  npm run plan -- accept ID --evidence "…"  or edit by hand. */
window.PLAN_ACCEPT = {
  "PT_CFG": {
    "date": "2026-11-16",
    "evidence": "复核 #855 head 4362ee4b67601ef58882aa1fcb38a83fac879de7 与合入 41ccd7463 内容相同，最终 head 两次 APPROVED、CI 成功；main @8e681282d19b29bdc1b6e715930fe9224a0c88dc 的 arch/x86/mm::lemma_paging_consts_requirements、mm/{kspace,vm_space}::lemma_page_table_config_constant_requirements、mm/page_table::highest_level_index_range 已接通。#928 关联常量与 #929 展开改动已对照 main；这里只验收配置合同，本轮未重跑 Verus。"
  },
  "TASK_STACK": {
    "date": "2026-11-16",
    "evidence": "对照 #921 head c2b79a99ac026677dcf035233e3a87b36f2c88ed 与合入 97963e831、当前 main @8e681282d19b29bdc1b6e715930fe9224a0c88dc：parse_u32[_or_default] 的 requires/returns 和 KERNEL_STACK_SIZE ensures 已存在，限定交付已满足；PR CI 成功，环境配置边界记入 TB_STACK_CONFIG。本轮未重跑 Verus。"
  },
  "BZ_PE": {
    "date": "2026-11-16",
    "evidence": "对照 #916 head 2f3bb906faf644b82c16b00654a1b6e603b30eb0 与合入 c25ca6f98，main @8e681282d19b29bdc1b6e715930fe9224a0c88dc 的 pe_header::make_pe_coff_header 有 len==368 及字段构造合同；最终 head APPROVED、CI 成功，BZ_OUT 只需的长度合同已满足。parser/bytes_of 的可信边界已登记；未重跑本地 Verus。"
  },
  "IO_PIO": {
    "date": "2026-11-23",
    "evidence": "主线 @b94500acd5ecf9ff19354332252ea7a95f7a90df 与 #706 最终 head 31813f542 源码树相同。ostd/src/arch/x86/pci.rs 的 read32/write32 实际使用 0xCF8 的 u32 只写端口及 0xCFC 的 u32 读写端口。io_port/mod.rs 的 IoPort::new/read/write 与 vstd_extra::external::io_port 的 u8/u16/u32 规约建立宽度、访问标记和排他端点不超过 65536。该提交的上游 x86_64-unknown-none 验证通过（Actions 45107260702）。设备效果、成对互斥、动态预占和释放另项验收。"
  }
};
