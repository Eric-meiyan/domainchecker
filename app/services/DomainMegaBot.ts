import * as fs from 'fs';
import * as net from 'net';
import * as dns from 'dns';
import * as readline from 'readline';

/**
 * 将主机名（域名）解析为IP地址
 * 使用DNS查询将WHOIS服务器的域名转换为IP地址
 * 
 * @param hostname - 需要解析的主机名/域名（例如：whois.verisign-grs.com）
 * @returns 返回解析后的IP地址
 */
function hostnameToIp(hostname: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // 使用Node.js的dns.lookup函数解析主机名
    dns.lookup(hostname, (err, address) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(address);
    });
  });
}

/**
 * 向WHOIS服务器发送查询请求
 * 连接到指定的WHOIS服务器，发送域名查询，并返回响应结果
 * 
 * @param server - WHOIS服务器域名（例如：whois.verisign-grs.com）
 * @param query - 要查询的域名（例如：example.com）
 * @returns WHOIS服务器返回的完整响应文本
 */
async function whoisQuery(server: string, query: string): Promise<string> {
  return new Promise<string>(async (resolve, reject) => {
    let ip: string;
    try {
      // 先将WHOIS服务器域名解析为IP地址
      ip = await hostnameToIp(server);
    } catch (err) {
      console.log('FAILED TO RESOLVE HOSTNAME');
      reject(err);
      return;
    }

    // 创建TCP Socket连接
    const socket = new net.Socket();
    let response = '';

    // 连接到WHOIS服务器的43端口（标准WHOIS端口）
    socket.connect(43, ip, () => {
      // 连接成功后，发送查询请求
      socket.write(`${query}\r\n`);
    });

    // 接收数据事件处理
    socket.on('data', (data: Buffer) => {
      // 累积接收到的所有数据
      response += data.toString();
    });

    // 连接关闭时，返回完整响应
    socket.on('close', () => {
      resolve(response);
    });

    // 错误处理
    socket.on('error', (err: Error) => {
      console.log('FAILED TO REACH WHOIS SERVER');
      reject(err);
    });

    // 设置10秒超时以防止连接挂起
    setTimeout(() => {
      if (!socket.destroyed) {
        socket.destroy();
        reject(new Error('Connection timeout'));
      }
    }, 10000);
  });
}

/**
 * 检查域名可用性并将可用域名写入结果文件
 * 通过WHOIS查询判断域名是否可注册，并记录可用域名
 * 
 * @param domain - 完整域名（例如：example.com）
 * @param noMatchPattern - 表示域名可用的匹配模式/字符串
 * @param whoisQueryServer - WHOIS服务器域名
 * @param domainExt - 域名扩展名/后缀（例如：com）
 * @returns 如果域名可用返回true，否则返回false
 */
async function checkDomain(
  domain: string, 
  noMatchPattern: string, 
  whoisQueryServer: string, 
  domainExt: string
): Promise<boolean> {
  let response: string | null = null;
  let retries = 3; // 最多尝试3次

  // 尝试进行WHOIS查询，支持重试机制
  while (retries > 0) {
    try {
      response = await whoisQuery(whoisQueryServer, domain);
      break; // 查询成功，跳出循环
    } catch (err) {
      retries--;
      if (retries === 0) {
        // 所有重试都失败
        console.log(`Error checking ${domain}: ${(err as Error).message}`);
        return false;
      }
      // 等待1秒后重试
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // 通过检查响应中是否包含"无匹配"模式来判断域名是否可用
  if (response && response.includes(noMatchPattern)) {
    // 域名可用
    console.log(`${domain} AVAILABLE FOR REGISTRATION!`);
    // 将可用域名添加到结果文件
    fs.appendFileSync(`${domainExt}_RESULTS.DAT`, `${domain}\n`);
    return true;
  } else {
    // 域名不可用
    console.log(`${domain} NOT AVAILABLE.`);
    return false;
  }
}

/**
 * DomainMegaBot主函数
 * 处理用户输入，执行域名批量查询，并保存结果
 */
async function main(): Promise<void> {
  // 显示欢迎信息
  console.log("THANK YOU FOR USING DOMAINMEGABOT POWERED BY HAR-KUUN (HTTPS://QING.SU). \n\nPLEASE NOTE THAT THIS BOT DOES NOT GUARANTEE THE AVAILABILITY. REGISTRAR'S RULES APPLY.\n\n");

  // 创建命令行交互界面
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // 请求用户输入TLD（顶级域名）
  const ext = await new Promise<string>(resolve => {
    rl.question("PLEASE SPECIFY TLD: ", answer => {
      resolve(answer);
    });
  });

  // 读取TLD配置数据文件
  let tldData: string;
  try {
    tldData = fs.readFileSync('TLD_DATA', 'utf8');
  } catch (err) {
    console.log("TLD DATABASE NOT FOUND!");
    process.exit(1);
    return; // TypeScript类型检查需要
  }

  // 解析TLD数据
  const lines = tldData.split('\n');
  let domainExt = '0'; // 默认值表示未找到匹配的TLD
  let noMatchPattern = '';
  let whoisQueryServer = '';

  // 在TLD数据中查找用户指定的TLD
  for (const line of lines) {
    const arr = line.split('=');
    if (arr[0] === ext) {
      // 找到匹配的TLD
      domainExt = arr[0];          // TLD值
      whoisQueryServer = arr[1];   // WHOIS服务器
      noMatchPattern = arr[2];     // 表示域名可用的模式
      break;
    }
  }

  // 如果未找到指定的TLD
  if (domainExt === '0') {
    console.log("TLD NOT SUPPORTED!");
    process.exit(2);
  }

  // 请求用户输入包含域名前缀的字典文件
  const dictFile = await new Promise<string>(resolve => {
    rl.question("PLEASE SPECIFY DICTIONARY FILE: ", answer => {
      resolve(answer);
    });
  });

  // 读取字典文件
  let dictionary: string;
  try {
    dictionary = fs.readFileSync(dictFile, 'utf8');
  } catch (err) {
    console.log("DICTIONARY FILE NOT FOUND!");
    process.exit(3);
    return; // TypeScript类型检查需要
  }

  // 创建结果文件并写入头部信息
  try {
    fs.writeFileSync(
      `${domainExt}_RESULTS.DAT`,
      "THANK YOU FOR USING DOMAINMEGABOT POWERED BY HAR-KUUN (HTTPS://QING.SU). \n\nBELOW IS THE AVAILABLE DOMAIN NAME LIST BASED ON YOUR QUERY. PLEASE NOTE THAT THIS DOES NOT GUARANTEE THE AVAILABILITY. REGISTRAR'S RULES APPLY.\n\n"
    );
  } catch (err) {
    console.log("FAILED TO WRITE RESULTS TO FILE!");
    process.exit(4);
  }

  // 处理字典文件中的每个域名前缀
  // 过滤掉空行
  const domainPrefixes = dictionary.split('\n').filter(line => line.trim());
  
  // 对每个前缀执行域名可用性检查
  for (const prefix of domainPrefixes) {
    const domain = `${prefix}.${domainExt}`; // 构建完整域名
    await checkDomain(domain, noMatchPattern, whoisQueryServer, domainExt);
  }

  // 向结果文件添加结束信息
  fs.appendFileSync(
    `${domainExt}_RESULTS.DAT`,
    "\nTHANK YOU FOR USING DOMAIN MEGABOT POWERED BY HAR-KUUN (HTTPS://QING.SU). HAVE A GREAT DAY!\n"
  );
  
  // 显示任务完成信息
  console.log("TASK FINISHED!\n\nTHANK YOU FOR USING DOMAINMEGABOT POWERED BY HAR-KUUN (HTTPS://QING.SU). HAVE A GREAT DAY!");
  rl.close();
  process.exit(0);
}

// 仅当直接运行此模块时才执行main函数
// 作为导入模块时不会自动执行
if (require.main === module) {
  main().catch(err => {
    console.error('An error occurred:', err);
    process.exit(1);
  });
}

// 导出函数供其他模块使用
export {
  hostnameToIp,
  whoisQuery,
  checkDomain,
  main
}; 