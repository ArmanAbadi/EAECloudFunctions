const functions = require('firebase-functions/v1');

// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
admin.initializeApp();

exports.SetMotorSpeed = functions.https.onCall(async (req, res) => {
  var MotorSpeed = req.MotorSpeedSetting;
  
  var JSONVehicle = {};

  var ParkingBrakeIndicator = false;

  if(MotorSpeed == 0){
    ParkingBrakeIndicator = true;
  }
  if(MotorSpeed == 4){
    JSONVehicle.MotorStatusIndicator = true;
  }
  else{
    JSONVehicle.MotorStatusIndicator = false;
  }
  
  JSONVehicle.Charging = false;
  JSONVehicle.PowerConsumption = MotorSpeed * 250;

  var MotorRPM = MotorSpeed * 200;
  var BatteryTemperature = MotorSpeed * 25 + 20;

  JSONVehicle.MotorSpeedSetting = MotorSpeed;
  JSONVehicle.ParkingBrakeIndicator = ParkingBrakeIndicator;
  JSONVehicle.MotorRPM = MotorRPM;
  JSONVehicle.BatteryTemperature = BatteryTemperature

  // Save the new data
  const writeResult = await admin
    .firestore()
    .collection("vehicles")
    .doc("vehicle1")
    .set(
      JSONVehicle,
      { merge: true });

  var VehicleData = {};
  
  // Get the new vehicle data
  await admin
  .firestore()
  .collection("vehicles")
  .doc("vehicle1")
  .get()
  .then(async snapshot => {
      VehicleData = snapshot.data();
  });
  // Send back vehicle data
  return VehicleData;
});

exports.SetCharging = functions.https.onCall(async (req, res) => {
  var VehicleData = {};

  await admin
  .firestore()
  .collection("vehicles")
  .doc("vehicle1")
  .get()
  .then(async snapshot => {
      VehicleData = snapshot.data();
  });

  //Only allow charging when motor is off
  if(VehicleData.MotorSpeedSetting != 0) return VehicleData;

  var Charging = req.Charging;
  
  var JSONVehicle = {};
  
  JSONVehicle.Charging = Charging;
  if(Charging)JSONVehicle.PowerConsumption = -1000;
  else JSONVehicle.PowerConsumption = 0;

  // Save the new data
  const writeResult = await admin
    .firestore()
    .collection("vehicles")
    .doc("vehicle1")
    .set(
      JSONVehicle,
      { merge: true });
  
      
  // Get the new vehicle data
  await admin
  .firestore()
  .collection("vehicles")
  .doc("vehicle1")
  .get()
  .then(async snapshot => {
      VehicleData = snapshot.data();
  });
  // Send back vehicle data
  return VehicleData;
});

//Update vehicle data on a 1 minute timer
exports.scheduledFunction = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
  var VehicleData = {};

  await admin
  .firestore()
  .collection("vehicles")
  .doc("vehicle1")
  .get()
  .then(async snapshot => {
      VehicleData = snapshot.data();
  });

  if(VehicleData.Charging){
    VehicleData.BatteryPercentage += 10;
    VehicleData.BatteryTemperature = 30;
  }

  VehicleData.BatteryPercentage -= VehicleData.MotorSpeedSetting*10;
  
  if(VehicleData.BatteryPercentage > 100) VehicleData.BatteryPercentage = 100;

  //Battery dead turn off motor
  if(VehicleData.BatteryPercentage < 0){
     VehicleData.BatteryPercentage = 0;
     VehicleData.MotorRPM = 0;
     VehicleData.BatteryTemperature = 0;
     VehicleData.MotorSpeedSetting = 0;
     VehicleData.ParkingBrakeIndicator = true;
     VehicleData.BatteryTemperature = 20;
  }

  //Low battery warning
  if(VehicleData.BatteryPercentage < 30) VehicleData.BatteryLowIndicator = true;
  else VehicleData.BatteryLowIndicator = false;

  // Save the new data
  const writeResult = await admin
    .firestore()
    .collection("vehicles")
    .doc("vehicle1")
    .set(
      VehicleData,
      { merge: true });

  return null;
});