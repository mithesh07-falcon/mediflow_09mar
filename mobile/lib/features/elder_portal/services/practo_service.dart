import 'dart:convert';
import 'package:http/http.dart' as http;

class PractoService {
  final String _apiKey = "YOUR_PRACTO_API_KEY"; // Placeholder
  final String _baseUrl = "https://api.practo.com/v1";

  Future<List<Doctor>> searchDoctors(String specialty, String city) async {
    // 1. Search doctors via Practo Partner API
    final response = await http.get(
      Uri.parse("$_baseUrl/search?specialty=$specialty&city=$city"),
      headers: {"Authorization": "Bearer $_apiKey"},
    );

    if (response.statusCode == 200) {
      final List data = jsonDecode(response.body)['doctors'];
      return data.map((d) => Doctor.fromJson(d)).toList();
    } else {
      throw Exception("Failed to fetch doctors from Practo API.");
    }
  }

  Future<bool> bookAppointment(String doctorId, String slotTime, String patientId) async {
    // 2. Atomic Slot Lock (2-minute window)
    // In production, this would call a backend function that locks the slot in Redis/Firestore
    
    final response = await http.post(
      Uri.parse("$_baseUrl/appointments/book"),
      headers: {
        "Authorization": "Bearer $_apiKey",
        "Content-Type": "application/json",
      },
      body: jsonEncode({
        "doctor_id": doctorId,
        "slot_time": slotTime,
        "patient_id": patientId,
      }),
    );

    return response.statusCode == 201;
  }
}

class Doctor {
  final String id;
  final String name;
  final String specialty;
  final String clinic;
  final List<String> slots;

  Doctor({required this.id, required this.name, required this.specialty, required this.clinic, required this.slots});

  factory Doctor.fromJson(Map<String, dynamic> json) {
    return Doctor(
      id: json['id'],
      name: json['name'],
      specialty: json['specialty'],
      clinic: json['clinic_name'],
      slots: List<String>.from(json['available_slots']),
    );
  }
}
