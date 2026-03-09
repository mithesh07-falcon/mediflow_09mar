import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:flutter_tts/flutter_tts.dart';

class ElderHome extends StatefulWidget {
  const ElderHome({super.key});

  @override
  State<ElderHome> createState() => _ElderHomeState();
}

class _ElderHomeState extends State<ElderHome> {
  late stt.SpeechToText _speech;
  bool _isListening = false;
  String _text = 'Press the button and speak. (e.g., "Emergency", "Scan pills")';
  late FlutterTts _tts;

  @override
  void initState() {
    super.initState();
    _speech = stt.SpeechToText();
    _tts = FlutterTts();
    _initializeVoice();
  }

  void _initializeVoice() async {
    await _speech.initialize();
    _setTtsParams();
  }

  void _setTtsParams() async {
    await _tts.setLanguage("en-IN");
    await _tts.setPitch(1.0);
    await _tts.setSpeechRate(0.4); // Slower for elder users
  }

  void _listen() async {
    if (!_isListening) {
      bool available = await _speech.initialize(
        onStatus: (val) => print('onStatus: $val'),
        onError: (val) => print('onError: $val'),
      );
      if (available) {
        setState(() => _isListening = true);
        _speech.listen(
          onResult: (val) => setState(() {
            _text = val.recognizedWords;
            if (val.finalResult) {
              _isListening = false;
              _handleCommand(_text.toLowerCase());
            }
          }),
        );
      }
    } else {
      setState(() => _isListening = false);
      _speech.stop();
    }
  }

  void _handleCommand(String command) {
    if (command.contains("emergency") || command.contains("sos")) {
      _triggerSos();
    } else if (command.contains("pill") || command.contains("medicine")) {
      _navigateToPillScan();
    } else if (command.contains("doctor") || command.contains("book")) {
      _navigateToDoctorBooking();
    } else {
      _speak("I didn't quite catch that. Try saying SOS or Scan Pills.");
    }
  }

  void _speak(String message) async {
    await _tts.speak(message);
  }

  void _triggerSos() {
    // Logic for SOS
    _speak("Triggering SOS. Calling your family now.");
  }

  void _navigateToPillScan() {
    // Placeholder navigation
    _speak("Opening camera for pill identification.");
  }

  void _navigateToDoctorBooking() {
    // Placeholder navigation
    _speak("Opening doctor booking.");
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5), // Soft high contrast background
      appBar: AppBar(
        title: const Text('MediFlow Elder', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 26)),
        centerTitle: true,
        toolbarHeight: 80,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            // Voice Output Display
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 5)),
                ],
              ),
              child: Text(
                _text,
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.normal, color: Colors.teal),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 30),

            // Large Action Grid
            Expanded(
              child: GridView.count(
                crossAxisCount: 2,
                crossAxisSpacing: 20,
                mainAxisSpacing: 20,
                children: [
                  _BigButton(
                    label: 'SOS',
                    icon: Icons.emergency,
                    color: Colors.red,
                    onTap: _triggerSos,
                  ),
                  _BigButton(
                    label: 'Scan Pills',
                    icon: Icons.camera_alt,
                    color: Colors.orange,
                    onTap: _navigateToPillScan,
                  ),
                  _BigButton(
                    label: 'Reminders',
                    icon: Icons.alarm,
                    color: Colors.blue,
                    onTap: () {},
                  ),
                  _BigButton(
                    label: 'Doctor',
                    icon: Icons.medical_services,
                    color: Colors.green,
                    onTap: _navigateToDoctorBooking,
                  ),
                ],
              ),
            ),

            // Central Voice Button (Floating feel)
            GestureDetector(
              onTap: _listen,
              child: CircleAvatar(
                radius: 60,
                backgroundColor: _isListening ? Colors.red : Colors.teal,
                child: Icon(
                  _isListening ? Icons.mic : Icons.mic_none,
                  size: 60,
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(height: 10),
            Text(
              _isListening ? "Listening..." : "Tap to Speak",
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

class _BigButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _BigButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: color.withOpacity(0.15),
          borderRadius: BorderRadius.circular(30),
          border: Border.all(color: color, width: 3),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 60, color: color),
            const SizedBox(height: 15),
            Text(
              label,
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color),
            ),
          ],
        ),
      ),
    );
  }
}
