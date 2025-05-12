const fs = require('fs');
const net = require('net');
const dns = require('dns');
const readline = require('readline');

/**
 * Converts a hostname to an IP address
 * @param {string} hostname - The hostname to resolve
 * @returns {Promise<string>} - The resolved IP address
 */
function hostnameToIp(hostname) {
  return new Promise((resolve, reject) => {
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
 * Sends a WHOIS query to the specified server
 * @param {string} server - The WHOIS server to query
 * @param {string} query - The domain to query
 * @returns {Promise<string>} - The WHOIS response
 */
function whoisQuery(server, query) {
  return new Promise(async (resolve, reject) => {
    let ip;
    try {
      ip = await hostnameToIp(server);
    } catch (err) {
      console.log('FAILED TO RESOLVE HOSTNAME');
      reject(err);
      return;
    }

    const socket = new net.Socket();
    let response = '';

    socket.connect(43, ip, () => {
      socket.write(`${query}\r\n`);
    });

    socket.on('data', (data) => {
      response += data.toString();
    });

    socket.on('close', () => {
      resolve(response);
    });

    socket.on('error', (err) => {
      console.log('FAILED TO REACH WHOIS SERVER');
      reject(err);
    });

    // Set a timeout to prevent hanging
    setTimeout(() => {
      if (!socket.destroyed) {
        socket.destroy();
        reject(new Error('Connection timeout'));
      }
    }, 10000);
  });
}

/**
 * Checks domain availability and writes available domains to a file
 * @param {string} domain - The domain to check
 * @param {string} noMatchPattern - Pattern indicating domain is available
 * @param {string} whoisQueryServer - The WHOIS server to query
 * @param {string} domainExt - The domain extension
 * @returns {Promise<boolean>} - Whether the domain is available
 */
async function checkDomain(domain, noMatchPattern, whoisQueryServer, domainExt) {
  let response = null;
  let retries = 3;

  while (retries > 0) {
    try {
      response = await whoisQuery(whoisQueryServer, domain);
      break;
    } catch (err) {
      retries--;
      if (retries === 0) {
        console.log(`Error checking ${domain}: ${err.message}`);
        return false;
      }
      // Wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  if (response && response.includes(noMatchPattern)) {
    console.log(`${domain} AVAILABLE FOR REGISTRATION!`);
    fs.appendFileSync(`${domainExt}_RESULTS.DAT`, `${domain}\n`);
    return true;
  } else {
    console.log(`${domain} NOT AVAILABLE.`);
    return false;
  }
}

/**
 * Main function to run the DomainMegaBot
 */
async function main() {
  console.log("THANK YOU FOR USING DOMAINMEGABOT POWERED BY HAR-KUUN (HTTPS://QING.SU). \n\nPLEASE NOTE THAT THIS BOT DOES NOT GUARANTEE THE AVAILABILITY. REGISTRAR'S RULES APPLY.\n\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Ask for TLD
  const ext = await new Promise(resolve => {
    rl.question("PLEASE SPECIFY TLD: ", answer => {
      resolve(answer);
    });
  });

  // Read TLD_DATA file
  let tldData;
  try {
    tldData = fs.readFileSync('TLD_DATA', 'utf8');
  } catch (err) {
    console.log("TLD DATABASE NOT FOUND!");
    process.exit(1);
  }

  const lines = tldData.split('\n');
  let domainExt = '0';
  let noMatchPattern = '';
  let whoisQueryServer = '';

  // Find the specified TLD in the data
  for (const line of lines) {
    const arr = line.split('=');
    if (arr[0] === ext) {
      domainExt = arr[0];
      whoisQueryServer = arr[1];
      noMatchPattern = arr[2];
      break;
    }
  }

  if (domainExt === '0') {
    console.log("TLD NOT SUPPORTED!");
    process.exit(2);
  }

  // Ask for dictionary file
  const dictFile = await new Promise(resolve => {
    rl.question("PLEASE SPECIFY DICTIONARY FILE: ", answer => {
      resolve(answer);
    });
  });

  // Read dictionary file
  let dictionary;
  try {
    dictionary = fs.readFileSync(dictFile, 'utf8');
  } catch (err) {
    console.log("DICTIONARY FILE NOT FOUND!");
    process.exit(3);
  }

  // Create results file
  try {
    fs.writeFileSync(
      `${domainExt}_RESULTS.DAT`,
      "THANK YOU FOR USING DOMAINMEGABOT POWERED BY HAR-KUUN (HTTPS://QING.SU). \n\nBELOW IS THE AVAILABLE DOMAIN NAME LIST BASED ON YOUR QUERY. PLEASE NOTE THAT THIS DOES NOT GUARANTEE THE AVAILABILITY. REGISTRAR'S RULES APPLY.\n\n"
    );
  } catch (err) {
    console.log("FAILED TO WRITE RESULTS TO FILE!");
    process.exit(4);
  }

  // Process each domain prefix from the dictionary
  const domainPrefixes = dictionary.split('\n').filter(line => line.trim());
  
  for (const prefix of domainPrefixes) {
    const domain = `${prefix}.${domainExt}`;
    await checkDomain(domain, noMatchPattern, whoisQueryServer, domainExt);
  }

  // Append closing message to results file
  fs.appendFileSync(
    `${domainExt}_RESULTS.DAT`,
    "\nTHANK YOU FOR USING DOMAIN MEGABOT POWERED BY HAR-KUUN (HTTPS://QING.SU). HAVE A GREAT DAY!\n"
  );
  
  console.log("TASK FINISHED!\n\nTHANK YOU FOR USING DOMAINMEGABOT POWERED BY HAR-KUUN (HTTPS://QING.SU). HAVE A GREAT DAY!");
  rl.close();
  process.exit(0);
}

// Run the main function
main().catch(err => {
  console.error('An error occurred:', err);
  process.exit(1);
});

module.exports = {
  hostnameToIp,
  whoisQuery,
  checkDomain
}; 