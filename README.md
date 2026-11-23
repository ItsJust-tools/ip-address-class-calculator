# IP Address Class Calculator

Enter an IPv4 address and instantly see its class (A/B/C/D/E), default subnet mask, network and broadcast address, and private/public status.

**Live:** deployed as `ip-address-class-calculator` (URL provisioned at deploy time)

## Features

- Classify any IPv4 address into class A, B, C, D, or E with a plain-language explanation
- Shows the default subnet mask for the address class
- Computes network address, first/last usable host, and broadcast address for any CIDR suffix
- Detects private (RFC 1918), loopback, link-local (APIPA) and public ranges
- Supports CIDR suffix input (e.g. `192.168.1.10/24`) and recomputes the effective mask
- Binary representation of address and mask
- Batch mode: paste multiple addresses and classify them all at once
- Copy results to clipboard and shareable URL state
- 100%% client-side — no data ever leaves your browser

## Keyboard shortcuts

| Key | Action       |
| --- | ------------ |
| `B` | Batch mode   |
| `C` | Copy summary |

## Development

```bash
npm install
npm run build -w @itsjust/core   # build shared core first
npm run dev
npm test
```

## Deployment

```bash
docker build -t itsjust-ip-address-class-calculator .
docker run -p 3000:3000 itsjust-ip-address-class-calculator
```

## License

MIT
