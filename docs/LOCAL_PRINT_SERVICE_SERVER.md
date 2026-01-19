# Local Print Service - Complete Server.js

This is the complete Node.js print service code that handles both text-based ESC/POS printing and HTML→Image→ESC/POS printing for Tamil/bilingual receipts.

## Prerequisites

```bash
npm init -y
npm install express cors escpos escpos-usb puppeteer
```

## Complete server.js

```javascript
const express = require("express");
const cors = require("cors");
const escpos = require("escpos");
escpos.USB = require("escpos-usb");

const puppeteer = require("puppeteer");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = 3001;

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================
app.get("/status", (req, res) => {
  try {
    const devices = escpos.USB.findPrinter();
    res.json({
      success: true,
      printerConnected: devices.length > 0,
      printerCount: devices.length,
    });
  } catch (error) {
    res.json({
      success: true,
      printerConnected: false,
      error: error.message,
    });
  }
});

// ============================================
// LIST AVAILABLE USB PRINTERS
// ============================================
app.get("/printers", (req, res) => {
  try {
    const devices = escpos.USB.findPrinter();
    res.json({
      success: true,
      printers: devices.map((d, i) => ({
        index: i,
        vendorId: d.deviceDescriptor?.idVendor,
        productId: d.deviceDescriptor?.idProduct,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// TEXT-BASED ESC/POS PRINTING (English only)
// ============================================
app.post("/print", async (req, res) => {
  try {
    const { commands } = req.body;

    if (!commands) {
      return res.status(400).json({ success: false, error: "No commands provided" });
    }

    const device = new escpos.USB();
    const printer = new escpos.Printer(device);

    device.open((err) => {
      if (err) {
        console.error("Failed to open printer:", err);
        return res.status(500).json({ success: false, error: err.message });
      }

      // Send raw ESC/POS commands directly
      device.write(Buffer.from(commands, "utf-8"), (writeErr) => {
        if (writeErr) {
          console.error("Write error:", writeErr);
          device.close();
          return res.status(500).json({ success: false, error: writeErr.message });
        }

        device.close();
        console.log("✅ Text receipt printed successfully");
        res.json({ success: true, message: "Receipt printed" });
      });
    });
  } catch (error) {
    console.error("Print error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// HTML → IMAGE → ESC/POS PRINTING (Tamil/Bilingual)
// This is the ONLY way Tamil prints correctly!
// ============================================
app.post("/print-html", async (req, res) => {
  let browser = null;

  try {
    const { html } = req.body;

    if (!html) {
      return res.status(400).json({ success: false, error: "No HTML provided" });
    }

    console.log("📄 Rendering HTML receipt to image...");

    // Launch Puppeteer to render HTML
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Set viewport for 80mm thermal printer (384px @ 203dpi)
    await page.setViewport({
      width: 384,
      height: 800,
      deviceScaleFactor: 2, // Higher DPI for clearer text
    });

    // Load the HTML content
    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    // Wait for fonts to load (important for Tamil!)
    await page.evaluateHandle("document.fonts.ready");

    // Get the actual content height
    const bodyHandle = await page.$("body");
    const boundingBox = await bodyHandle.boundingBox();
    await bodyHandle.dispose();

    // Take screenshot of just the content
    const imageBuffer = await page.screenshot({
      type: "png",
      clip: {
        x: 0,
        y: 0,
        width: 384,
        height: Math.ceil(boundingBox.height) + 20,
      },
    });

    await browser.close();
    browser = null;

    console.log("🖼️ Image generated, sending to printer...");

    // Open USB printer and send image
    const device = new escpos.USB();
    const printer = new escpos.Printer(device);

    device.open((err) => {
      if (err) {
        console.error("Failed to open printer:", err);
        return res.status(500).json({ success: false, error: err.message });
      }

      // Load the image buffer and print as ESC/POS image
      escpos.Image.load(imageBuffer, (image) => {
        if (!image) {
          device.close();
          return res.status(500).json({ success: false, error: "Failed to load image" });
        }

        printer
          .align("CT")
          .image(image, "D24") // D24 = double-density, 24-dot mode
          .cut()
          .close();

        console.log("✅ Tamil/Bilingual receipt printed as image successfully!");
        res.json({ success: true, message: "Receipt printed as image" });
      });
    });
  } catch (error) {
    console.error("Print-html error:", error);
    if (browser) {
      await browser.close();
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   🖨️  PRINT SERVICE STARTED                   ║
╠══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                   ║
║                                                              ║
║  Endpoints:                                                  ║
║    GET  /status      - Check printer connection              ║
║    GET  /printers    - List USB printers                     ║
║    POST /print       - Text ESC/POS (English)                ║
║    POST /print-html  - Image ESC/POS (Tamil/Bilingual)       ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // Check for printers on startup
  try {
    const devices = escpos.USB.findPrinter();
    if (devices.length > 0) {
      console.log(`✅ Found ${devices.length} USB printer(s)`);
    } else {
      console.log("⚠️  No USB printers detected");
    }
  } catch (e) {
    console.log("⚠️  Could not enumerate USB devices:", e.message);
  }
});
```

## How It Works

### English Receipts (Text Mode)
```
React App
  → Supabase Edge Function (generates ESC/POS text commands)
  → POST /print endpoint
  → Sends text commands directly to printer
  → ✅ Prints perfectly
```

### Tamil/Bilingual Receipts (Image Mode)
```
React App
  → Supabase Edge Function (generates HTML with Tamil fonts)
  → POST /print-html endpoint
  → Puppeteer renders HTML with Noto Sans Tamil font
  → Screenshot as PNG image
  → Convert to ESC/POS GS v 0 (image command)
  → Printer prints pixels
  → ✅ Perfect Tamil text!
```

## Why Image Mode for Tamil?

Thermal printers **DO NOT** understand Tamil Unicode. They only have built-in character sets for:
- ASCII (English letters, numbers, symbols)
- Some extended Latin characters
- Chinese/Japanese/Korean (in some models)

**Tamil Unicode sent as text = boxes/garbage/nothing**

The ONLY way to print Tamil:
1. Render the text using a proper font (Noto Sans Tamil)
2. Convert to a bitmap/PNG image
3. Send the image bytes using ESC/POS image commands
4. Printer prints the **pixels**, not characters

This works on ANY thermal printer, even cheap ₹2,000 ones!

## Troubleshooting

### No printers found
- Check USB connection
- On Linux, you may need udev rules (see main setup docs)
- On Windows, install the printer driver

### Tamil text still broken
- Make sure `enableBilingual` is true in your billing settings
- Check that the edge function returns `receiptHtml`
- Verify Puppeteer is installed: `npm list puppeteer`

### Slow printing
- First print is slow (Puppeteer startup)
- Subsequent prints are faster
- Consider keeping Puppeteer browser instance open for high-volume

## Running as a Service

### Windows (startup folder shortcut)
Create a .bat file in your Startup folder:
```batch
@echo off
cd C:\path\to\print-service
node server.js
```

### Linux (systemd)
```ini
[Unit]
Description=Thermal Print Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/print-service
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Save as `/etc/systemd/system/print-service.service` then:
```bash
sudo systemctl enable print-service
sudo systemctl start print-service
```
