# MMM-GoodWe

A Solar Module for MagicMirror² designed to integrate with a GoodWe System.

## Dependencies

* A [MagicMirror²](https://github.com/MichMich/MagicMirror) installation
* A GoodWe SEMS Portal account
* Node.js with `fetch` support, or the `node-fetch` package

## GoodWe Credentials

For security reasons, GoodWe account credentials are read by the Node helper from environment variables instead of being stored in the client-side MagicMirror configuration.

Set the following environment variables before starting MagicMirror:

```bash
export GOODWE_USERNAME="your-email@example.com"
export GOODWE_PASSWORD="your-password"
```

When using PM2 or another process manager, make sure these environment variables are available to the MagicMirror process.

### Example using an environment file

You can store the credentials in a separate environment file:

```bash
mkdir -p ~/.config/magicmirror
nano ~/.config/magicmirror/goodwe.env
```

Add:

```bash
GOODWE_USERNAME="your-email@example.com"
GOODWE_PASSWORD="your-password"
```

Protect the file so that only your user can read it:

```bash
chmod 600 ~/.config/magicmirror/goodwe.env
```

The environment file can then be loaded before starting MagicMirror:

```bash
set -a
source ~/.config/magicmirror/goodwe.env
set +a
```

> **Important:** Never commit your credentials or environment file to Git.

## Installation

1. Clone this repository into the MagicMirror `modules` directory.

2. Configure the `GOODWE_USERNAME` and `GOODWE_PASSWORD` environment variables as described above.

3. Add the module to your MagicMirror `config/config.js`.

**Example:**

```javascript
{
  module: "MMM-GoodWe",
  position: "bottom_right",
  config: {
    powerstationId: "test-id", // The ID of your powerstation
    totalCapacity: 5600, // The total capacity all your inverters can handle
    updateIntervalMinutes: 0, // Defaults to every 5 minutes unless set to 1 or higher
    showInverterGauges: true, // Show the gauges at the top
    showBottomTotalGauge: true, // Show the large gauge at the bottom
    showInterverDetail: true, // Show the details of the inverters
    enableCustomGaugeColors: false, // Enable custom gauge colors
    customGaugeColors: {
      innerCircleColor: "#3a455e", // Color of the inner circle
      outerCircleColor: "transparent", // Color of the outer circle
      currentValueRingColor: "red" // Color of the value/percentage ring
    }
  }
},
```

4. If required by your Node.js version, install `node-fetch` from the MagicMirror directory:

```bash
cd ~/MagicMirror
npm install node-fetch
```

5. Start or restart MagicMirror. The module should now authenticate using the credentials from the environment variables.

## Additional Options

In the `goodwe-options.json` file, you can enable extra fields in the info section.

To enable or disable a field, change the value `enabled` to `true` or `false` and save the file. Restart your MagicMirror after applying your changes.

You don't need to change anything else in this file.

```json
{
  "config": {
    "left": [
      {
        "name": "Device Name",
        "NL_title": "Device Naam:",
        "EN_title": "Device Name:",
        "API_field": "dmDeviceType",
        "enabled": true
      },
      {
        "name": "Serial Number",
        "NL_title": "Serienummer:",
        "EN_title": "Serial Number:",
        "API_field": "serialNum",
        "enabled": true
      },
      {
        "name": "Checkcode",
        "NL_title": "Checkcode:",
        "EN_title": "Checkcode:",
        "API_field": "laCheckcode",
        "enabled": false
      }
    ],
    "right": [
      {
        "name": "Indoor temperature",
        "NL_title": "Binnentemperatuur:",
        "EN_title": "Indoor temperature:",
        "API_field": "innerTemp",
        "enabled": false
      }
    ]
  }
}
```
