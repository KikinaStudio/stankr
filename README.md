```markdown
# 🎵 K.Lab : Face the Music

An interactive web-based music player that responds to your facial expressions and arm movements in real-time. Control your music with just your face and body!

![Demo](https://img.shields.io/badge/Demo-Live%20Site-blue?style=for-the-badge&logo=github)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)

## ✨ Features

### 🎭 Facial Expression Control
- **Happy** 😊 - Control track playback or apply effects
- **Sad** 😢 - Mute specific tracks or change audio effects  
- **Angry** 😠 - Solo specific instruments
- **Surprised** 😲 - Trigger special audio effects

### 💪 Arm Movement Volume Control
- **Raise your right arm** - Decrease volume
- **Lower your right arm** - Increase volume
- Real-time visual volume indicator

### ��️ Multi-Track Audio Mixing
- **4 Independent Tracks**: Drums, Bass, Piano, Vocals
- **Individual Volume Control** for each instrument
- **Real-time Effects**: Reverb, Echo, Phaser, Underwater
- **Interactive Progress Bar** with seek functionality

### 🎨 User Interface
- **Toggle Switches** for expression modes (Mute/Solo)
- **Effect Buttons** for each facial expression
- **Compact Track Cards** with emoji icons
- **Real-time Status Display**

## 🚀 Live Demo

**[Try it now!](https://kikinastudio.github.io/stankr/)**

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Computer Vision**: 
  - [Face-API.js](https://github.com/justadudewhohacks/face-api.js) - Facial expression detection
  - [TensorFlow.js](https://www.tensorflow.org/js) - Pose detection with MoveNet
- **Audio Processing**: Web Audio API
- **Hosting**: GitHub Pages

## 📋 Prerequisites

- Modern web browser with camera access
- HTTPS connection (required for camera access)
- Good lighting for facial detection
- Camera positioned to capture face and upper body

## 🎯 How to Use

### Getting Started
1. **Allow Camera Access** when prompted
2. **Position yourself** in front of the camera
3. **Ensure good lighting** for optimal detection

### Facial Expression Controls
- **Toggle Mode**: Choose between "Mute" or "Solo" for each expression
- **Select Effects**: Pick audio effects (Reverb, Phaser, Echo) for each expression
- **Make Expressions**: Your music will respond in real-time!

### Volume Control
- **Raise Right Arm**: Volume decreases
- **Lower Right Arm**: Volume increases
- **Visual Feedback**: Volume indicator shows current level

### Track Management
- **Individual Controls**: Adjust volume and effects for each instrument
- **Play/Stop**: Control overall playback
- **Progress Bar**: Click to seek through the song

## 🎵 Audio Tracks

The application includes four synchronized audio tracks:
- 🥁 **Drums** - Rhythmic foundation
- 🎸 **Bass** - Low-frequency groove
- 🎹 **Piano** - Melodic accompaniment  
- 🎤 **Vocals** - Lead vocal track

## 🔧 Installation

### Local Development
```bash
# Clone the repository
git clone https://github.com/kikinastudio/stankr.git

# Navigate to the project directory
cd stankr

# Open index.html in your browser
# Or serve with a local server:
python -m http.server 8000
```

### Requirements
- Web server with HTTPS (for camera access)
- Modern browser supporting Web Audio API
- Camera and microphone permissions

## �� Customization

### Adding New Tracks
1. Add audio files to the `tracks/` directory
2. Update the `trackConfig` array in `script.js`
3. Add corresponding UI controls

### Modifying Effects
- Edit the `effectPresets` object in `script.js`
- Create custom audio processing functions
- Update the UI to include new effects

### Adjusting Detection Sensitivity
- Modify confidence thresholds in detection functions
- Adjust pose detection intervals
- Fine-tune facial expression recognition

## 🐛 Troubleshooting

### Common Issues

**Camera Not Working**
- Ensure HTTPS connection
- Check browser permissions
- Try refreshing the page

**Audio Not Playing**
- Check browser audio settings
- Verify audio files are loaded
- Check console for errors

**Detection Not Responding**
- Improve lighting conditions
- Position face clearly in camera view
- Check browser console for errors

### Browser Compatibility
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## �� Acknowledgments

- [Face-API.js](https://github.com/justadudewhohacks/face-api.js) for facial expression detection
- [TensorFlow.js](https://www.tensorflow.org/js) for pose detection
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) for audio processing

## 📞 Support

If you encounter any issues or have questions:
- Open an [Issue](https://github.com/kikinastudio/stankr/issues)
- Check the [Troubleshooting](#troubleshooting) section
- Review browser console for error messages

---

**Made with ❤️ by K.Lab**

*Experience music like never before - control it with your expressions!*
```
