'use strict';
/**
 * Creates a sanitised demo profile so the editor can be tried without
 * touching the real save file.
 *
 * The real profile is decrypted, a handful of values are replaced and the
 * payload is written back into a separate folder. The original save file is
 * only read, never modified.
 *
 * Usage:
 *   node scripts/make-demo-profile.cjs [target folder]
 *
 * The source folder defaults to the standard Phasmophobia data directory.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const SOURCE_DIR =
  process.env.PHASMO_SAVE_DIR ||
  path.join(os.homedir(), 'AppData', 'LocalLow', 'Kinetic Games', 'Phasmophobia');
const TARGET_DIR = process.argv[2] || path.join(os.tmpdir(), 'phasmo-demo');
const SOURCE = path.join(SOURCE_DIR, 'SaveFile.txt');
const TARGET = path.join(TARGET_DIR, 'SaveFile.txt');

const PASSWORD = 't36gref9u84y7f43g';

function decrypt(blob) {
  const iv = blob.subarray(0, 16);
  const ct = blob.subarray(16);
  const key = crypto.pbkdf2Sync(Buffer.from(PASSWORD, 'utf8'), iv, 100, 16, 'sha1');
  const d = crypto.createDecipheriv('aes-128-cbc', key, iv);
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
}

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(Buffer.from(PASSWORD, 'utf8'), iv, 100, 16, 'sha1');
  const c = crypto.createCipheriv('aes-128-cbc', key, iv);
  const ct = Buffer.concat([c.update(Buffer.from(text, 'utf8')), c.final()]);
  return Buffer.concat([iv, ct]);
}

// The demo profile.
const VALUES = {
  PlayersMoney: 24500,
  NewLevel: 27,
  Experience: 1240,
  PrestigeIndex: 2,
  RewardMultiplier: 2.5,
  FlashlightInventory: 3,
  CandleInventory: 5,
  SaltInventory: 4,
  LighterInventory: 2,
  EMFReaderInventory: 2,
  SpiritBoxInventory: 1,
  UVFlashlightInventory: 2,
  StrongFlashlightInventory: 1,
  TripodInventory: 1,
  ThermometerInventory: 2,
  MotionSensorInventory: 1,
  SoundSensorInventory: 1,
  DOTSProjectorInventory: 1,
  ParabolicMicrophoneInventory: 1,
  SoundRecorderInventory: 1,
  VideoCameraInventory: 1,
  PhotoCameraInventory: 1,
  DSLRCameraInventory: 1,
  HeadMountedCameraInventory: 1,
  UVLightInventory: 1,
  EVPRecorderInventory: 1,
  CrucifixInventory: 2,
  SageInventory: 3,
  GhostWritingBookInventory: 1,
  FirelightInventory: 2,
  IgniterInventory: 1,
  GlowstickInventory: 4,
  SanityPillsInventory: 6,
  SanityMedicationInventory: 2,
  RepellentInventory: 2,
  HeadGearInventory: 1,
  SpiritBoxTier: 3,
  EMFReaderTier: 2,
  FlashlightTier: 2,
  UVFlashlightTier: 2,
  VideoCameraTier: 3,
  PhotoCameraTier: 2,
  MotionSensorTier: 2,
  SoundSensorTier: 2,
  DOTSProjectorTier: 3,
  ParabolicMicrophoneTier: 2,
  SaltTier: 2,
  CrucifixTier: 2,
  TripodTier: 2,
};

let text = decrypt(fs.readFileSync(SOURCE));
let applied = 0;

for (const [key, value] of Object.entries(VALUES)) {
  const pattern = new RegExp(
    '("' +
      key +
      '"\\s*:\\s*\\{\\s*"__type"\\s*:\\s*"(?:int|float)"\\s*,\\s*"value"\\s*:\\s*)-?[0-9.]+',
  );

  if (!pattern.test(text)) {
    console.warn('  ! field not found: ' + key);
    continue;
  }

  const before = text;
  text = text.replace(pattern, (match, prefix) => prefix + value);
  applied += 1;
  if (text === before) console.log('  = already set: ' + key);
}

fs.mkdirSync(TARGET_DIR, { recursive: true });
fs.writeFileSync(TARGET, encrypt(text));

console.log('applied ' + applied + ' of ' + Object.keys(VALUES).length + ' values');
console.log('wrote ' + TARGET + ' (' + fs.statSync(TARGET).size + ' bytes)');
console.log('run the editor against it with: set PHASMO_SAVE_DIR=' + TARGET_DIR);
