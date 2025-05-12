const fs = require('fs');
const path = require('path');

// Function to parse TLD_DATA file
function parseTldData(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n');
    const tlds = [];

    // Process each line
    lines.forEach(line => {
      // Skip empty lines or commented lines
      if (!line.trim() || line.trim().startsWith('=')) {
        return;
      }

      // Skip commented TLDs (lines starting with //)
      if (line.trim().startsWith('//')) {
        return;
      }

      const parts = line.split('=');
      if (parts.length >= 3) {
        const name = parts[0].trim();
        const server = parts[1].trim();
        const availablePattern = parts[2].trim();

        // Only add valid entries
        if (name && server && availablePattern) {
          tlds.push({
            name,
            server,
            availablePattern,
            enabled: true, // Enable all TLDs by default
            displayName: `.${name}`
          });
        }
      }
    });

    return tlds;
  } catch (error) {
    console.error('Error reading or parsing TLD_DATA file:', error);
    return [];
  }
}

// Main function to generate config file
function generateTldConfig() {
  const tldDataPath = path.join(__dirname, 'TLD_DATA');
  const configDir = path.join(__dirname, 'app', 'config');
  const configPath = path.join(configDir, 'tld-config.json');

  // Create config directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Parse TLD_DATA file
  const tlds = parseTldData(tldDataPath);

  if (tlds.length === 0) {
    console.error('No valid TLDs found in TLD_DATA file.');
    process.exit(1);
  }

  // Create config object
  const config = { tlds };

  // Add some additional common TLDs that might be missing from TLD_DATA
  const commonTlds = [
    'app', 'dev', 'io'
  ];

  commonTlds.forEach(tld => {
    if (!tlds.some(t => t.name === tld)) {
      let server = '';
      let pattern = '';

      switch (tld) {
        case 'app':
        case 'dev':
          server = `whois.nic.${tld}`;
          pattern = 'Domain not found';
          break;
        case 'io':
          server = 'whois.nic.io';
          pattern = 'is available for purchase';
          break;
      }

      if (server && pattern) {
        config.tlds.push({
          name: tld,
          server,
          availablePattern: pattern,
          enabled: true,
          displayName: `.${tld}`
        });
      }
    }
  });

  // Write config file
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`Successfully generated TLD config with ${config.tlds.length} TLDs.`);
    console.log(`Config file saved to: ${configPath}`);
  } catch (error) {
    console.error('Error writing config file:', error);
    process.exit(1);
  }
}

// Run the generator
generateTldConfig(); 