# Homebridge-AC-Remote

This is a simple plugin for use with Particle devices to transmit AC codes to a dumb AC unit.

Note this is very much beta, and still a long way to go to be reliable.  Right now you can command/control via a particle, but not able to read back telementry.  Homebridge and the particle will become out of sync if you restart homebridge.

## Tested AC untis
* Frigidiare Units

## How to Use

* Flash your Particle Device
* Wire up an IR LED
* put in an enclosure (optional)
* place in range of your target AC unit
* install and configure the plugin into Homebridge
* sync the settings manually (power and temp)

## Config

```
{
  "bridge": {
    "name": "Homebridge",
    "username": "CC:22:3D:E3:CE:39",
    "port": 51826,
    "pin": "031-45-154"
  },
  "description": "This is an example configuration file with one Particle platform loaded with the correct fromware for AC Remote.  You should replace the access token and device id placeholder with your access token and device id",
  "platforms": [
    {
      "platform": "ACRemote",
      "name": "AC Remote Devices",
      "access_token": "<<access token>>",
      "cloudurl": "https://api.spark.io/v1/devices/",
      "devices": [
        {
          "accessory": "OfficeAC",
          "name": "Office AC",
          "deviceid": "8b9201a99023819283757291"
        },
        {
          "accessory": "BedroomAC",
          "name": "Bedroom AC",
          "deviceid": "8b9201a99283918377848939"
        }
      ]
    }
  ]
}
```

## Hardware

This is 
Plans will be posted later in this repo.

This implementation is based on the Particle line of devices using the Particle cloud to send/receive telemetry and commands.

Mostly implimented Paticle App here.  Only tested on the Photon.  Should work with others however.
https://go.particle.io/shared_apps/5d2c7e063275db000b97f3c8

## Todo
* add get functions to poll partile for existing state
* more testing
* build a hardware board
* add a temp sensor to board
* build an enclosure
* impliment an identify function to blink the LED for 20 seconds

## Credits
Thanks to @krvarma for the initial implementation of homebridge-particle.  Much of the code here was reused.
https://github.com/krvarma/homebridge-particle

I decided to start a new repo dedicated to AC Controllers rather than fork the above repo, is this is less general use than his intended homebridge-particle plugin.
