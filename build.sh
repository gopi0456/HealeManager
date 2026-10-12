#!/bin/bash

echo "=========================================="
echo "🏥 Building PatientApps APK"
echo "=========================================="

# Step 1: Sync web files to Android
echo ""
echo "📱 Step 1: Syncing web files to Android..."
npx cap sync android
if [ $? -ne 0 ]; then
    echo "❌ Sync failed!"
    exit 1
fi
echo "✅ Sync complete"

# Step 2: Build the APK
echo ""
echo "🔨 Step 2: Building APK..."
cd android
./gradlew assembleDebug
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi
echo "✅ Build complete"

# Step 3: Copy APK to project root
echo ""
echo "📦 Step 3: Copying APK..."
cp app/build/outputs/apk/debug/app-debug.apk ../PatientApps.apk
cd ..

echo ""
echo "=========================================="
echo "✅ BUILD SUCCESSFUL!"
echo "=========================================="
echo ""
echo "📍 APK Location: ./PatientApps.apk"
echo ""
echo "📲 Install on device:"
echo "   adb install PatientApps.apk"
echo ""
echo "📤 Or transfer to phone and install manually"
echo "=========================================="
