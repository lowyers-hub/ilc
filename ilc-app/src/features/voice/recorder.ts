import { Audio } from 'expo-av';

let recording: Audio.Recording | null = null;

export async function startRecording() {
  const perm = await Audio.requestPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Izin microphone diperlukan.');
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
  });

  const created = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  recording = created.recording;
}

export async function stopRecording(): Promise<{ uri: string; mimeType: string; name: string }> {
  if (!recording) throw new Error('Tidak ada rekaman aktif.');

  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  recording = null;

  if (!uri) throw new Error('Gagal menyimpan rekaman.');

  // Expo AV typically produces m4a on iOS and 3gp/m4a on Android depending on preset.
  return { uri, mimeType: 'audio/m4a', name: 'voice.m4a' };
}

export function isRecording() {
  return Boolean(recording);
}

