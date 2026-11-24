# IP Address Class Calculator

Analyze an IPv4 address to determine its class, network range, default mask, private/public status, and computed network details.

**Live:** [ip-address-class-calculator.itsjust.tools](https://ip-address-class-calculator.itsjust.tools)

## Features

- Live IPv4 input with instant validation and clear error messages
- Detects the address class (A/B/C/D/E) with documented class ranges
- Shows the default subnet mask, network address, and broadcast address for the classful default
- Detects private vs public vs loopback vs APIPA vs multicast vs reserved addresses
- CIDR notation display and usable host counts for the class network
- Accepts both dotted notation and simple integer input (0–4294967295)
- Copyable result summary and example IP chips for common addresses
- Educational reference panel explaining classful addressing (RFC 791), private ranges (RFC 1918), loopback (RFC 1122), APIPA (RFC 3927), multicast (RFC 5771), and CIDR (RFC 1519)
- 100% client-side — no data ever leaves your browser

## Classful reference

| Class | First octet range | Default mask  | Default CIDR |
| ----- | ----------------- | ------------- | ------------ |
| A     | 0–127             | 255.0.0.0     | /8           |
| B     | 128–191           | 255.255.0.0   | /16          |
| C     | 192–223           | 255.255.255.0 | /24          |
| D     | 224–239           | multicast     | n/a          |
| E     | 240–255           | experimental  | n/a          |

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
