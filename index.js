var debug = require('debug')('homebridge-ac-remote');
var request = require("request");
var eventSource = require('eventsource');
var Service, Characteristic;

module.exports = function(homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;

	homebridge.registerPlatform("homebridge-ac-remote", "ACRemote", ACRemotePlatform);
}

function ACRemotePlatform(log, config){
	this.log = log;
	this.accessToken = config["access_token"];
	this.deviceId = config["deviceid"];
	this.url = config["cloudurl"];
	this.devices = config["devices"];
}

ACRemotePlatform.prototype = {
	accessories: function(callback){
		var foundAccessories = [];

		var count = this.devices.length;

		for(index=0; index< count; ++index){
			var accessory  = new RemoteAccessory(
				this.log,
				this.url,
				this.accessToken,
				this.devices[index]);

			foundAccessories.push(accessory);
		}

		callback(foundAccessories);
	}
}

function RemoteAccessory(log, url, access_token, device) {
	this.log = log;
	this.name = device["name"],
	//this.args = device["args"];
	this.deviceId = device["deviceid"];
	this.functionName = device["function_name"] || "LogicalCommand";
	//this.eventName = device["event_name"]; // we're going to hardcode these events
	this.accessToken = access_token;
	this.url = url;
  this.pollingInterval = device["pollingInterval"] || 10000;

  this.make = "Particle";
  this.model = "Photon";
  this.firmware = "0.01";
  this.serialNumber = "AA098BB09";


/*
	this.services = [];

	this.informationService = new Service.AccessoryInformation();

	this.informationService
		.setCharacteristic(Characteristic.Manufacturer, "Particle")
		.setCharacteristic(Characteristic.Model, "Photon")
		.setCharacteristic(Characteristic.SerialNumber, "AA098BB09");

	this.services.push(this.informationService);
	this.services.push(service);
	console.log("Service Count: " + this.services.length);

  this.thermostatService = new Service.Thermostat(this.name);
	this.services.push(this.thermostatService);

	console.log("Initializing " + this.thermostatService.displayName);
*/

  this.fanSpeed = 0;

  // Characteristic.TargetHeatingCoolingState.OFF
  // Characteristic.TargetHeatingCoolingState.HEAT
  // Characteristic.TargetHeatingCoolingState.AUTO
  // Characteristic.TargetHeatingCoolingState.COOL

  //this.currentCoolingState = Characteristic.TargetHeatingCoolingState.OFF;
  //this.currentCoolingState = 70;
  this.currentCoolingState = undefined;
  this.targetCoolingState  = this.currentHeatingCoolingState;

  //this.currentTemperature  = 70;
  this.currentTemperature  = undefined;
  this.targetTemperature   = this.currentTemperature;

  // Characteristic.TemperatureDisplayUnits.FAHRENHEIT
  // Characteristic.TemperatureDisplayUnits.CELSIUS

  this.temperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.FAHRENHEIT;

/*
	this.eventUrl = this.url + this.deviceId + "/events/" + this.eventName + "?access_token=" + this.accessToken;
	var es = new eventSource(eventUrl);

	debug(eventUrl);

	es.onerror = function() {
		console.log('ERROR!');
	};

	es.addEventListener(this.eventName,
		this.processEventData.bind(this), false);
*/

  //this.updateAll();
  this.log('pollingInterval is set to '+this.pollingInterval);
  var self = this;
  this.updateTimer = setInterval(function () { self.updateAll(); }, this.pollingInterval);
}

RemoteAccessory.prototype = {
  // Start
  identify: function(callback) {
    this.log("Identify requested");
    this.sendCommand("LogicalCommand", "Identify", callback);
  },

  updateData: function(callback) {
    this.log("updateData, nothing to do");
    callback(null);
  },

  // Required
  getCurrentHeatingCoolingState: function(callback) {
    var self = this;
    this.getVariable("Mode", function(error, result) {
      if (error) return console.error(error);
      self.log("getCurrentHeatingCoolingState got response: ", result);
      if (result == 0) self.currentCoolingState = Characteristic.CurrentHeatingCoolingState.OFF;
      else if (result == 1) self.currentCoolingState = Characteristic.CurrentHeatingCoolingState.COOL;
      else if (result == 2) self.currentCoolingState = Characteristic.CurrentHeatingCoolingState.COOL;
      else if (result == 3) self.currentCoolingState = Characteristic.CurrentHeatingCoolingState.HEAT;
      self.log("getCurrentHeatingCoolingState: ", self.currentCoolingState);
      self.thermostatService
        .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
        .updateValue(self.currentCoolingState);
      callback(null, self.currentCoolingState);
    });
  },

  getTargetHeatingCoolingState: function(callback) {
    var self = this;
    self.log("getTargetHeatingCoolingState: ", self.targetCoolingState);
    this.getVariable("Mode", function(error, result) {
      if (error) return console.error(error);
      if (result == 0) self.targetCoolingState = Characteristic.TargetHeatingCoolingState.OFF;
      else if (result == 1) self.targetCoolingState = Characteristic.TargetHeatingCoolingState.AUTO;
      else if (result == 2) self.targetCoolingState = Characteristic.TargetHeatingCoolingState.COOL;
      else if (result == 3) self.targetCoolingState = Characteristic.TargetHeatingCoolingState.HEAT;
      self.thermostatService
        .getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .updateValue(self.targetCoolingState);
      callback(null, self.targetCoolingState);
    });
  },

  sleepOn: function(value, callback) {
    callback();
  },

  setTargetHeatingCoolingState: function(value, callback) {
    var self = this;
    this.log('setTargetHeatingCoolingState()');
    var command = "";
    if (value == Characteristic.TargetHeatingCoolingState.OFF)
      command = "Off";
    else if (value == Characteristic.TargetHeatingCoolingState.AUTO)
      command = "Auto";
    else if (value == Characteristic.TargetHeatingCoolingState.COOL)
      command = "Cool";
    else if (value == Characteristic.TargetHeatingCoolingState.HEAT)
      command = "FanMode";

    this.sendCommand("LogicalCommand", command, function(error, result) {
      if (error) return console.error(error);
      self.log("setTargetHeatingCoolingState from/to: ", self.targetCoolingState, value);
      self.targetCoolingState = value;
      self.currentCoolingState = self.targetCoolingState;
      callback(null);
    });
  },

  getCurrentTemperature: function(callback) {
    var self = this;
    if ( this.disableTemp )
      callback(null, undefined);
/*
    this.getVariable("Unit", function(error, result) {
    this.AC.getRoomTemp(self.applianceId, function(err, result) {
      if (err) return console.error(err);
      if (self.temperatureDisplayUnits == Characteristic.TemperatureDisplayUnits.FAHRENHEIT) self.currentTemperature = fahrenheitToCelsius(result);
      if (self.temperatureDisplayUnits == Characteristic.TemperatureDisplayUnits.CELSIUS) self.currentTemperature = fahrenheitToCelsius(result);
      self.log("getCurrentTemperature: %s -> %s", result, self.currentTemperature);
      callback(null, self.currentTemperature);
    });
*/
    self.thermostatService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .updateValue(self.currentTemperature);
    callback(null, self.currentTemperature);
  },

  getTargetTemperature: function(callback) {
    var self = this;

    this.getVariable("Temp", function(error, result) {
      self.log("got response: ", result);
      if (error) return console.error(error);
      if (self.temperatureDisplayUnits == Characteristic.TemperatureDisplayUnits.FAHRENHEIT) self.targetTemperature = fahrenheitToCelsius(result);
      if (self.temperatureDisplayUnits == Characteristic.TemperatureDisplayUnits.CELSIUS) self.targetTemperature = fahrenheitToCelsius(result);
      self.thermostatService
        .getCharacteristic(Characteristic.TargetTemperature)
        .updateValue(self.targetTemperature);
      self.log("getTargetTemperature: %s -> %s", result, self.targetTemperature);
      callback(null, self.targetTemperature);
    });
  },

  setTargetTemperature: function(value, callback) {
    var self = this;
    if (self.temperatureDisplayUnits == Characteristic.TemperatureDisplayUnits.FAHRENHEIT) value = celsiusToFahrenheit(value);
    this.sendCommand("LogicalCommand", "Temp="+value, function(error, result) {
      if (error) return console.error(error);
      self.targetTemperature = value;
      
      self.log("setTargetTemperature to: ", value);
      callback(null, self.targetTemperature);
    });
  },

  getTemperatureDisplayUnits: function(callback) {
    var self = this;
    this.getVariable("Unit", function(error, result) {
      if (error) return console.error(error);
      if (result == false) self.temperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.FAHRENHEIT;
      else if (result == true) self.temperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.CELSIUS;
      self.thermostatService
        .getCharacteristic(Characteristic.TemperatureDisplayUnits)
        .updateValue(self.temperatureDisplayUnits);
      self.log("getTemperatureDisplayUnits: ", self.temperatureDisplayUnits);
      return callback(null, self.temperatureDisplayUnits);
    });
  },

  setTemperatureDisplayUnits: function(value, callback) {
    var self = this;
    if (value == Characteristic.TemperatureDisplayUnits.FAHRENHEIT) var newValue = "Fahrenheit";
    else if (value == Characteristic.TemperatureDisplayUnits.CELSIUS) var newValue = "Celsius";
    this.sendCommand("LogicalCommand", newValue, function(error, result) {
      if (error) return console.error(error);
      self.temperatureDisplayUnits = newValue;
      self.log("setTemperatureDisplayUnits - %s and %s", self.temperatureDisplayUnits, newValue);
      return callback(null);
    });
  },

  getFanSpeed: function(callback) {
    var self = this;

/*
    this.AC.getFanMode(self.applianceId, function(err, result) {
      if (err) return console.error(err);

      // we only have 3 fan speeds, plus auto.
      // auto = 100%
      // high = 67-99%
      // med  = 34-66%
      // low  = 0-33%
      // off? = 0% - we may need to add this later, if there's no way to turn off the unit using other controls
      //
      self.log('current fan mode is '+result);
      if(result == self.AC.FANMODE_AUTO)
        self.fanSpeed = 100;
      else if(result == self.AC.FANMODE_LOW) {
        if (self.fanSpeed > 33) self.fanSpeed = 33;
        if (self.fanSpeed <= 0) self.fanSpeed = 1;
      } else if(result == self.AC.FANMODE_MED) {
        if (self.fanSpeed > 66) self.fanSpeed = 66;
        if (self.fanSpeed <= 33) self.fanSpeed = 34;
      } else if(result == self.AC.FANMODE_HIGH) {
        if (self.fanSpeed >= 100) self.fanSpeed = 99;
        if (self.fanSpeed <= 66) self.fanSpeed = 67;
      }

      self.log("getFanSpeed: ", self.fanSpeed);
      callback(null, self.fanSpeed);
    });
*/
    self.log("getFanSpeed: ", self.fanSpeed);
    callback(null, self.fanSpeed);
  },

  setFanSpeed: function(value, callback) {
    var self = this;

    this.sendCommand("LogicalCommand", "Fan="+value, callback);
/*
    var newMode;
    if (this.fanPending)
      callback(null);
    else {
      this.fanPending = true;
      if(value == 100) newMode =  this.AC.FANMODE_AUTO;
      else if (value >= 0 && value <= 33) newMode = this.AC.FANMODE_LOW;
      else if (value > 33 && value <= 66) newMode = this.AC.FANMODE_MED;
      else if (value > 66 && value < 100) newMode = this.AC.FANMODE_HIGH;
      this.log('newMode = '+newMode);

      this.AC.fanMode(self.applianceId, newMode, function(err, result) {
        if (err) return console.error(err);
        self.log('Turned fan to '+self.fanSpeed);

        self.fanSpeed = value;
        self.fanPending = false;
        callback(null);
      });
    }
*/

    self.fanSpeed = value;
    callback(null);
  },

  pushUpdate: function(characteristic, err, value) {

  },

  updateAll: function() {
    this.getTemperatureDisplayUnits(function () {});
    this.getCurrentHeatingCoolingState(function () {});
    this.getTargetHeatingCoolingState(function () {});
    this.getCurrentTemperature(function () {});
    this.getTargetTemperature(function () {});
    this.getFanSpeed(function () {});
  },

  getServices: function() {
    this.log("getServices");

    // you can OPTIONALLY create an information service if you wish to override
    // the default values for things like serial number, model, etc.
    this.informationService = new Service.AccessoryInformation();

    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, this.make)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.FirmwareRevision, this.firmware)
      .setCharacteristic(Characteristic.SerialNumber, this.serialNumber);

    this.thermostatService = new Service.Thermostat(this.name);

    // Required Characteristics
    this.thermostatService
      .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
      .on('get', this.getCurrentHeatingCoolingState.bind(this));
      //.on('set', this.setCurrentHeatingCoolingState.bind(this));

    this.thermostatService
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .on('get', this.getTargetHeatingCoolingState.bind(this))
      .on('set', this.setTargetHeatingCoolingState.bind(this));

    this.thermostatService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on('get', this.getCurrentTemperature.bind(this));

    this.thermostatService
      .getCharacteristic(Characteristic.TargetTemperature)
      .setProps({
        minValue: 15.5,
        maxValue: 32
      })
      .on('get', this.getTargetTemperature.bind(this))
      .on('set', this.setTargetTemperature.bind(this));

    this.thermostatService
      .getCharacteristic(Characteristic.TemperatureDisplayUnits)
      .on('get', this.getTemperatureDisplayUnits.bind(this))
      .on('set', this.setTemperatureDisplayUnits.bind(this));

    this.thermostatService
      .addCharacteristic(Characteristic.RotationSpeed)
      .on('get', this.getFanSpeed.bind(this))
      .on('set', this.setFanSpeed.bind(this));

    // Optional Characteristics
/*
    this.thermostatService
      .getCharacteristic(Characteristic.Name)
      .on('get', this.getName.bind(this))
      .on('set', this.setName.bind(this));
*/

    //var sleepService = new Service.Switch(this.name);
    //sleepService.getCharacteristic(Characteristic.On)
      //.on('set', this.sleepOn.bind(this));

    return [this.informationService, this.thermostatService];
  },

  logger: function(result) {
    debug(result);
  },

  getVariable: function(variableName, callback) {
	  debug("getVariable()");

	  debug("URL: " + this.url);
	  debug("Device ID: " + this.deviceId)

	  var onUrl = this.url + this.deviceId + "/" + variableName + "?access_token=" + this.accessToken;

	  debug("Calling function: " + onUrl);

	  request.get(
		  onUrl,
		  function(error, response, body) {
			  console.log(body);
        if (!error) {
          try {
            resp = JSON.parse(body);
				    callback(null, resp.result);
          } catch(e) {
            this.log(e);
            callback(true, undefined);
          }
        } else
          callback(true, undefined);
		  }
	  );
  },

  sendCommand: function(functionName, state, callback) {
	  debug("sendCommand()");

	  debug("URL: " + this.url);
	  debug("Device ID: " + this.deviceId)

	  var onUrl = this.url + this.deviceId + "/" + functionName;

	  //var argument = this.args.replace("{STATE}", (state ? "1" : "0"));
    var argument = state;

	  debug("Calling function: " + onUrl + "?" + argument);

	  request.post(
		  onUrl, {
			  form: {
				  access_token: this.accessToken,
				  args: argument
			  }
		  },
		  function(error, response, body) {
			  //console.log(response);

			  if (!error) {
				  callback(null);
			  } else {
				  callback(error);
			  }
		  }
	  );
  }

/*
  processEventData: function(e) {
	  var data = JSON.parse(e.data);
	  var tokens = data.data.split('=');
  
	  debug(tokens[0] + " = " + tokens[1] + ", " + this.services[1].displayName + ", " + this.sensorType + ", " + this.key.toLowerCase() + ", " + tokens[0].toLowerCase());
	  debug(this.services[1] != undefined && this.key.toLowerCase() === tokens[0].toLowerCase());
  
	  if(this.services[1] != undefined && this.key.toLowerCase() === tokens[0].toLowerCase()){
		  if (tokens[0].toLowerCase() === "temperature") {
			  this.value = parseFloat(tokens[1]);
  
			  this.services[1]
				  .getCharacteristic(Characteristic.CurrentTemperature)
				  .setValue(parseFloat(tokens[1]));
		  }
		  else if (tokens[0].toLowerCase() === "humidity") {
			  this.value = parseFloat(tokens[1]);

			  this.services[1]
				  .getCharacteristic(Characteristic.CurrentRelativeHumidity)
				  .setValue(parseFloat(tokens[1]));
		  }
		  else if (tokens[0].toLowerCase() === "light") {
			  this.value = parseFloat(tokens[1]);

			  this.services[1]
				  .getCharacteristic(Characteristic.CurrentAmbientLightLevel)
				  .setValue(parseFloat(tokens[1]));
		  }
		  else if (tokens[0].toLowerCase() === "switch") {
			  this.value = parseFloat(tokens[1]);

			  this.services[1]
				  .getCharacteristic(Characteristic.On)
				  .setValue(parseFloat(tokens[1]));
		  }
		  else if (tokens[0].toLowerCase() === "motion") {
			  this.value = parseFloat(tokens[1]);
			  debug('Received ' + this.value);
			  if (this.value === '1.00' || this.value === 1.00 || this.value === 'true' || this.value === 'TRUE') this.value = true;
        else if (this.value === '0.00' || this.value === 0.00 || this.value === 'false' || this.value === 'FALSE') this.value = false;
			  if (this.value !== true && this.value !== false) {
          debug('Received value is not valid.');
     	  } else {
      	  this.services[1]
          .getCharacteristic(Characteristic.MotionDetected)
				  .setValue(this.value);
        }
		  }
		  else if (tokens[0].toLowerCase() === "contact") {
			  this.value = parseFloat(tokens[1]);
			  debug('Received ' + this.value);
			  if (this.value === '1.00' || this.value === 1.00 || this.value === 'true' || this.value === 'TRUE') this.value = true;
        else if (this.value === '0.00' || this.value === 0.00 || this.value === 'false' || this.value === 'FALSE') this.value = false;
			  if (this.value !== true && this.value !== false) {
          debug('Received value is not valid.');
     	  } else {
      	  this.services[1]
          .getCharacteristic(Characteristic.ContactDetected)
				  .setValue(this.value);
			  }
      }
    }
  }
*/
};

function fahrenheitToCelsius(temperature) {
  return (temperature - 32) / 1.8;
}

function celsiusToFahrenheit(temperature) {
  return (temperature * 1.8) + 32;
}

