import 'dart:io';
import 'package:google_ml_kit/google_ml_kit.dart';
import 'package:tflite_v2/tflite_v2.dart';

class PillAiService {
  bool _isModelLoaded = false;

  Future<void> loadModel() async {
    String? res = await Tflite.loadModel(
      model: "assets/models/yolov8_pills.tflite",
      labels: "assets/models/labels.txt",
    );
    _isModelLoaded = res != null;
    print("Model loaded: $_isModelLoaded");
  }

  Future<PillResult> identifyPill(File image) async {
    if (!_isModelLoaded) await loadModel();

    // 1. On-device Object Detection (YOLOv8)
    var recognitions = await Tflite.detectObjectOnImage(
      path: image.path,
      model: "YOLO",
      imageMean: 127.5,
      imageStd: 127.5,
      threshold: 0.4,
      numResultsPerClass: 1,
    );

    // 2. OCR for Medicine Names/Imprints using ML Kit
    final InputImage inputImage = InputImage.fromFilePath(image.path);
    final textRecognizer = TextRecognizer();
    final RecognizedText recognizedText = await textRecognizer.processImage(inputImage);
    String extractedText = recognizedText.text;

    // 3. Match against local medicine database (Mock matching logic)
    // In production, this would query a local SQLite db or CIMS API
    String medicineName = "Unknown Medicine";
    String dosageInfo = "Consult a pharmacist.";

    if (recognitions != null && recognitions.isNotEmpty) {
      double confidence = recognitions[0]["confidenceInClass"];
      if (confidence > 0.7 || extractedText.toLowerCase().contains("metformin")) {
        medicineName = "Metformin 500mg";
        dosageInfo = "Take after food for blood sugar control.";
      } else if (extractedText.toLowerCase().contains("aspirin")) {
        medicineName = "Aspirin 75mg";
        dosageInfo = "Blood thinner. Common for heart patients.";
      }
    }

    textRecognizer.close();
    return PillResult(name: medicineName, instruction: dosageInfo);
  }

  Future<void> close() async {
    await Tflite.close();
  }
}

class PillResult {
  final String name;
  final String instruction;

  PillResult({required this.name, required this.instruction});
}
