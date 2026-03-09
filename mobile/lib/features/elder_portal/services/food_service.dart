import 'dart:convert';
import 'package:http/http.dart' as http;

enum HealthCondition { diabetic, hypertension, general }

class FoodRecommendationService {
  final String _edamamAppId = "YOUR_EDAMAM_APP_ID"; // Placeholder
  final String _edamamAppKey = "YOUR_EDAMAM_APP_KEY";

  Future<List<String>> getSuggestions(HealthCondition condition) async {
    // 1. Rule-based Filter
    String query = "Indian food";
    String healthFilter = "";

    switch (condition) {
      case HealthCondition.diabetic:
        query = "Indian low sugar meals";
        healthFilter = "&health=sugar-conscious";
        break;
      case HealthCondition.hypertension:
        query = "Indian low sodium meals";
        healthFilter = "&diet=low-sodium";
        break;
      default:
        query = "Healthy Indian dinner";
    }

    // 2. Fetch from Edamam/Spoonacular API
    final response = await http.get(
      Uri.parse("https://api.edamam.com/search?q=$query&app_id=$_edamamAppId&app_key=$_edamamAppKey$healthFilter&from=0&to=5"),
    );

    if (response.statusCode == 200) {
      final List hits = jsonDecode(response.body)['hits'];
      return hits.map<String>((h) => h['recipe']['label'] as String).toList();
    } else {
      // Fallback for demo
      return condition == HealthCondition.diabetic 
          ? ["Bajra Roti with Palak", "Dal Tadka (no rice)"] 
          : ["Oats Upma", "Fruits Salad"];
    }
  }

  String getVoiceTip(HealthCondition condition) {
    if (condition == HealthCondition.diabetic) {
      return "Current blood sugar is stable. For dinner, try Bajra Roti and plenty of green leafy vegetables. Avoid White Rice.";
    } else if (condition == HealthCondition.hypertension) {
      return "Keep your salt intake low. Try a vegetable soup with little or no added Salt.";
    }
    return "Make sure to drink plenty of water and eat a balanced meal.";
  }
}
