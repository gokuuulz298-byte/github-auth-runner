# Local Print Service Setup Guide

This guide explains how to set up the local Node.js print service for ESC/POS thermal printing.

## Prerequisites

- Node.js 18+ installed
- USB Thermal Printer (58mm or 80mm)
- Windows/Linux/macOS

## Quick Setup

### 1. Create the Print Service Directory

```bash
mkdir thermal-print-service
cd thermal-print-service
npm init -y
```

### 2. Install Dependencies

```bash
npm install express cors escpos escpos-usb
```

For Serial/Bluetooth printers:
```bash
npm install escpos-serialport escpos-bluetooth
```

### 3. Create the Print Server

Create `server.js`:

```javascript
const express = require('express');
const cors = require('cors');
const escpos = require('escpos');

// Choose your adapter based on printer connection
escpos.USB = require('escpos-usb');
// escpos.Serial = require('escpos-serialport');
// escpos.Bluetooth = require('escpos-bluetooth');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/status', (req, res) => {
  res.json({ status: 'online', timestamp: new Date().toISOString() });
});

// Print raw ESC/POS commands
app.post('/print', async (req, res) => {
  try {
    const { commands } = req.body;
    
    if (!commands) {
      return res.status(400).json({ success: false, error: 'No commands provided' });
    }

    // Find USB printer
    const device = new escpos.USB();
    const printer = new escpos.Printer(device);

    device.open((err) => {
      if (err) {
        console.error('Printer error:', err);
        return res.status(500).json({ success: false, error: 'Failed to connect to printer' });
      }

      // Send raw commands directly
      device.write(Buffer.from(commands, 'utf8'), (writeErr) => {
        if (writeErr) {
          console.error('Write error:', writeErr);
          return res.status(500).json({ success: false, error: 'Failed to write to printer' });
        }
        
        device.close((closeErr) => {
          if (closeErr) console.error('Close error:', closeErr);
          res.json({ success: true, message: 'Printed successfully' });
        });
      });
    });
  } catch (error) {
    console.error('Print error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Print with image support (for Tamil text)
app.post('/print-image', async (req, res) => {
  try {
    const { imageBase64, commands } = req.body;
    
    const device = new escpos.USB();
    const printer = new escpos.Printer(device);

    device.open(async (err) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Failed to connect to printer' });
      }

      try {
        // If there's an image, print it first
        if (imageBase64) {
          const escpos_image = require('escpos').Image;
          const imageBuffer = Buffer.from(imageBase64, 'base64');
          
          escpos_image.load(imageBuffer, (image) => {
            printer
              .align('CT')
              .image(image, 'd24')
              .then(() => {
                if (commands) {
                  device.write(Buffer.from(commands, 'utf8'));
                }
                printer.cut();
                printer.close();
                res.json({ success: true, message: 'Printed successfully' });
              });
          });
        } else if (commands) {
          device.write(Buffer.from(commands, 'utf8'), () => {
            device.close();
            res.json({ success: true, message: 'Printed successfully' });
          });
        }
      } catch (printError) {
        console.error('Print error:', printError);
        device.close();
        res.status(500).json({ success: false, error: printError.message });
      }
    });
  } catch (error) {
    console.error('Print error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List available USB printers
app.get('/printers', (req, res) => {
  try {
    const devices = escpos.USB.findPrinter();
    res.json({ 
      success: true, 
      printers: devices.map((d, i) => ({
        index: i,
        vendorId: d.deviceDescriptor?.idVendor,
        productId: d.deviceDescriptor?.idProduct
      }))
    });
  } catch (error) {
    res.json({ success: false, printers: [], error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🖨️  Thermal Print Service running on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  GET  /status   - Health check`);
  console.log(`  GET  /printers - List USB printers`);
  console.log(`  POST /print    - Print raw ESC/POS commands`);
  console.log('');
});
```

### 4. Run the Service

```bash
node server.js
```

You should see:
```
🖨️  Thermal Print Service running on http://localhost:3001
```

### 5. Test the Connection

```bash
curl http://localhost:3001/status
```

Should return:
```json
{"status":"online","timestamp":"2024-01-18T..."}
```

## Windows Installation

### One-Click Install Script

Create `install.bat`:

```batch
@echo off
echo Installing Thermal Print Service...
mkdir thermal-print-service
cd thermal-print-service
call npm init -y
call npm install express cors escpos escpos-usb
echo Creating server file...
(
echo const express = require('express'^);
echo const cors = require('cors'^);
echo const escpos = require('escpos'^);
echo escpos.USB = require('escpos-usb'^);
echo const app = express(^);
echo app.use(cors(^)^);
echo app.use(express.json(^)^);
echo app.get('/status', (req, res^) =^> res.json({status:'online'}^)^);
echo app.post('/print', (req, res^) =^> {
echo   const device = new escpos.USB(^);
echo   device.open((err^) =^> {
echo     if(err^) return res.status(500^).json({success:false}^);
echo     device.write(Buffer.from(req.body.commands^), (^) =^> {
echo       device.close(^);
echo       res.json({success:true}^);
echo     }^);
echo   }^);
echo }^);
echo app.listen(3001, (^) =^> console.log('Print service on port 3001'^)^);
) > server.js
echo Done! Run 'node server.js' to start.
pause
```

### Run at Startup (Windows)

1. Press `Win + R`, type `shell:startup`
2. Create a shortcut to `start-print-service.bat`:

```batch
@echo off
cd /d "C:\path\to\thermal-print-service"
node server.js
```

## Linux Installation

### Install Script

```bash
#!/bin/bash
mkdir -p ~/thermal-print-service
cd ~/thermal-print-service
npm init -y
npm install express cors escpos escpos-usb

cat > server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/status', (req, res) => res.json({status:'online'}));

app.post('/print', (req, res) => {
  const device = new escpos.USB();
  device.open((err) => {
    if(err) return res.status(500).json({success:false, error: err.message});
    device.write(Buffer.from(req.body.commands), () => {
      device.close();
      res.json({success:true});
    });
  });
});

app.listen(3001, () => console.log('Print service running on port 3001'));
EOF

echo "Installation complete! Run: node server.js"
```

### Create systemd Service

```bash
sudo nano /etc/systemd/system/thermal-print.service
```

```ini
[Unit]
Description=Thermal Print Service
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/thermal-print-service
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable thermal-print
sudo systemctl start thermal-print
```

## Printer Configuration

### USB Printer Permissions (Linux)

Create udev rule:
```bash
sudo nano /etc/udev/rules.d/99-escpos.rules
```

Add:
```
SUBSYSTEM=="usb", ATTRS{idVendor}=="XXXX", ATTRS{idProduct}=="YYYY", MODE="0666"
```

Replace `XXXX` and `YYYY` with your printer's vendor and product ID (find with `lsusb`).

Reload rules:
```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

### Common Printer Settings

| Setting | Value |
|---------|-------|
| Paper Width | 58mm or 80mm |
| Characters per line | 32 (58mm) or 48 (80mm) |
| Auto-cutter | Enabled |
| Baud Rate (Serial) | 9600 or 115200 |

## Troubleshooting

### Printer Not Found

1. Check USB connection
2. On Linux, check permissions: `ls -la /dev/usb/lp*`
3. Try running with sudo (testing only)

### No Output

1. Check printer paper
2. Verify printer is powered on
3. Test with vendor's utility first

### Garbled Text

1. Ensure printer supports ESC/POS
2. Check character encoding
3. Try different baud rate (serial)

## Testing

### Test Print

```bash
curl -X POST http://localhost:3001/print \
  -H "Content-Type: application/json" \
  -d '{"commands": "\x1B@\x1Ba\x01TEST PRINT\n\x1Bd\x04\x1DVA"}'
```

This should print "TEST PRINT" centered and cut the paper.

## Security Notes

- This service runs locally only (`localhost:3001`)
- No authentication required (trusted local network)
- For multi-device setup, consider adding API keys

## Integration with Billing App

The billing app automatically sends print jobs to `http://localhost:3001/print`. Ensure:

1. Print service is running before using the billing app
2. Browser allows `localhost` connections
3. No firewall blocking port 3001

## Support

For issues:
1. Check printer connection
2. Verify service is running: `curl http://localhost:3001/status`
3. Check console logs for errors
