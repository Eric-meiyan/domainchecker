#!/usr/bin/env node

// This file is a direct CLI entry point for the DomainMegaBot
import { main } from '../services/DomainMegaBot';

// Run the main function
main().catch(err => {
  console.error('An error occurred:', err);
  process.exit(1);
}); 