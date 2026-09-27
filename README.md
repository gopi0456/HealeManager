# 🏥 HealeManager

**HealeManager** is a lightweight, offline-first patient management and token system designed for small clinics. Built with HTML, CSS, JavaScript, and Capacitor, it runs smoothly on Android devices without requiring a constant internet connection.

## ✨ Key Features

- 🔐 **Secure Login**: Simple admin authentication (Default: `admin` / `admin`).
- 📊 **Dashboard**: Real-time stats (Total patients, today's unique visits, tokens, follow-ups, monthly avg).
- 📝 **Patient Registration**: Capture Name, Age, Phone, Aadhar (last 5 digits), Address, and Medical Notes.
- 🎟️ **Token System**: Generate daily queue tokens with printable PDF tickets.
- 🔍 **Smart Search**: Find patients instantly by Name or Aadhar number.
- 📋 **Visit History**: View complete medical history and add new notes for returning patients.
- 🔔 **Reminders**: Automated follow-up tracking for next-week visits.
- 📤 **Data Backup**: Export and Import patient data as JSON for safekeeping.
- 🌙 **Dark/Light Mode**: Built-in theme toggle for comfortable viewing.
- 📱 **Sharing**: Direct WhatsApp and SMS integration for patient communication.

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Mobile Framework**: Capacitor (v5/v6)
- **Database**: SQLite (`cordova-sqlite-storage` / `@capacitor-community/sqlite`)
- **PDF Generation**: `jsPDF`
- **Icons**: Custom SVG/PNG assets + Emoji icons

## 📂 Project Structure

```text
PatientApps/
├── android/                 # Capacitor Android platform files
├── www/                     # Web assets (HTML, CSS, JS)
│   ├── css/
│   │   └── styles.css       # All styling and theme variables
│   ├── img/
│   │   ├── app.png          # Launcher icon source
│   │   └── app_icon.png     # In-app logo
│   ├── js/
│   │   ├── database.js      # SQLite initialization
│   │   ├── navigation.js    # Page routing & back button logic
│   │   ├── patients.js      # Patient CRUD & search logic
│   │   ├── tokens.js        # Token generation & history
│   │   ├── reminders.js     # Follow-up tracking
│   │   ├── messages.js      # WhatsApp/SMS sharing
│   │   ├── print.js         # jsPDF ticket generation
│   │   └── export-import.js # JSON backup/restore
│   └── index.html           # Main application shell
├── capacitor.config.json    # Capacitor configuration
├── package.json             # Node dependencies
└── README.md                # This file
```

## 🚀 Installation & Setup (Termux / Proot Ubuntu)

### 1. Prerequisites
Ensure you have Node.js, npm, and Java JDK installed in your environment.

### 2. Install Dependencies
```bash
cd ~/PatientApps
npm install
```

### 3. Add Android Platform (if not present)
```bash
npx cap add android
```

### 4. Sync Web Assets
```bash
npx cap sync
```

## 📦 Building the APK

To generate a debug APK for testing:

```bash
cd android
./gradlew clean assembleDebug
cd ..

# Copy to phone storage
cp android/app/build/outputs/apk/debug/app-debug.apk ~/storage/shared/Download/HealeManager.apk
```

## 🔑 Default Credentials

- **Username**: `admin`
- **Password**: `admin`

*(Change these in `www/js/navigation.js` for production use)*

## 💡 Future Enhancements

- [ ] Cloud sync / Firebase integration for multi-device support.
- [ ] Role-based access (Admin vs. Receptionist).
- [ ] Prescription generation with clinic letterhead.
- [ ] Biometric login (Fingerprint) support via Capacitor.

## 📄 License

This project is proprietary and intended for internal clinic use.

---
*Built with ❤️ for efficient clinic management.*
