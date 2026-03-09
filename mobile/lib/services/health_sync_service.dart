import 'package:health/health.dart';

class HealthSyncService {
  HealthFactory health = HealthFactory();

  Future<bool> requestPermissions() async {
    final types = [
      HealthDataType.BLOOD_PRESSURE_SYSTOLIC,
      HealthDataType.BLOOD_PRESSURE_DIASTOLIC,
      HealthDataType.BLOOD_GLUCOSE,
      HealthDataType.WEIGHT,
      HealthDataType.STEPS,
    ];

    bool? hasPermissions = await health.hasPermissions(types);
    if (hasPermissions == false) {
      return await health.requestAuthorization(types);
    }
    return true;
  }

  Future<List<HealthDataPoint>> fetchVitals() async {
    final now = DateTime.now();
    final yesterday = now.subtract(const Duration(days: 1));

    final types = [
      HealthDataType.BLOOD_PRESSURE_SYSTOLIC,
      HealthDataType.BLOOD_PRESSURE_DIASTOLIC,
      HealthDataType.BLOOD_GLUCOSE,
      HealthDataType.WEIGHT,
    ];

    try {
      List<HealthDataPoint> data = await health.getHealthDataFromTypes(yesterday, now, types);
      return health.removeDuplicates(data);
    } catch (e) {
      print("Health Fetch Error: $e");
      return [];
    }
  }

  Future<void> writeVitals(HealthDataType type, double value) async {
    final now = DateTime.now();
    await health.writeHealthData(value, type, now, now);
  }
}
