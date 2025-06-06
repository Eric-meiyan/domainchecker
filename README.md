# Domain Availability Checker

A modern web application for checking domain name availability across multiple TLDs simultaneously. This project is built with Next.js and provides a user-friendly interface for domain searches.

## Features

- Check domain availability across multiple TLDs simultaneously
- Enter multiple keywords separated by commas
- Select which TLDs to check from a configurable list
- Real-time results showing available and unavailable domains
- Clean, responsive user interface

## Technology Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Domain Checking**: Custom WHOIS query implementation

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/domainsearch.git
cd domainsearch
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## Configuration

### TLD Configuration

The available TLDs are configured in the `app/config/tld-config.json` file. Each TLD entry includes:

- `name`: The TLD without the dot (e.g., "com")
- `server`: The WHOIS server for this TLD
- `availablePattern`: Text pattern that indicates domain availability
- `enabled`: Boolean to enable/disable this TLD
- `displayName`: Display name for the UI (e.g., ".com")

Example configuration:

```json
{
  "tlds": [
    {
      "name": "com",
      "server": "whois.verisign-grs.com",
      "availablePattern": "No match for",
      "enabled": true,
      "displayName": ".com"
    },
    ...
  ]
}
```

## Usage

1. Enter one or more domain name keywords in the input field, separated by commas
2. Select the TLDs you want to check using the checkboxes
3. Click "Check Domain Availability"
4. View the results, which will show available and unavailable domains

## Development

### Project Structure

- `app/page.tsx` - Main page component
- `app/components/` - React components
- `app/services/` - Domain checking service
- `app/api/` - API routes
- `app/config/` - Configuration files

### API Endpoints

- `GET /api/domain-check` - Retrieves available TLDs
- `POST /api/domain-check` - Checks domain availability


## Acknowledgments

This project is based on a Node.js implementation of the original DomainMegaBot C program by HAR-KUUN (https://qing.su), but has been completely redesigned as a web application with a modern user interface.

## 附件：namecheap.domains.getTldList接口返回的 xml 的字段含义

| Name                          | Description                                                                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Name                          | Indicates the top-level domain                                                                                                                |
| NonRealTimeDomain             | Possible statuses: True, False. Indicates whether the domain registration is instant (real-time) or not.                                      |
| MinRegisterYears              | Minimum number of years the TLD can be registered for                                                                                         |
| MaxRegisterYears              | Maximum number of years the TLD can be registered for                                                                                         |
| MinRenewYears                 | Minimum number of years the TLD can be renewed for                                                                                            |
| MaxRenewYears                 | Maximum number of years the TLD can be renewed for                                                                                            |
| MinTransferYears              | Minimum number of years the TLD can be transferred for                                                                                        |
| MaxTransferYears              | Maximum number of years the TLD can be transferred for                                                                                        |
| IsApiRegisterable             | Indicates whether a domain with this TLD can be registered through API                                                                        |
| IsApiRenewable                | Indicates whether a domain with this TLD can be renewed through API                                                                           |
| IsApiTransferable             | Indicates whether a domain with this TLD can be transferred to Namecheap through API                                                          |
| IsEppRequired                 | Indicates whether EPP code is required for this TLD                                                                                           |
| IsDisableModContact           | Indicates whether contact details can be modified for this TLD                                                                                |
| IsDisableWGAllot              | Indicates whether domain privacy can be allotted for this TLD. If this field result is Yes, then we will not be able to allot WG for the TLD. |
| IsIncludeInExtendedSearchOnly | Indicates whether this TLD is shown in general search results or in extended search results only                                              |
| SequenceNumber                | Indicates the sorting order in which TLDs are displayed on Namecheap website’s domain search results page                                     |
| Type                          | Indicates whether this is a generic TLD or country-code TLD                                                                                   |
| IsSupportsIDN                 | Indicates whether IDN is supported for this TLD                                                                                               |
| Category                      | Indicates the category of the domain                                                                                                          |