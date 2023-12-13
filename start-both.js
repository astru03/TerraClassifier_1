const { spawn } = require('child_process');

// Start Backend Server
const backend = spawn('npm', ['start'], { cwd: '/Users/jonasstarke/Desktop/Uni/WiSe23:24/TerraClassifier_1_final/TerraClassifier_backend/' });
backend.stdout.on('data', (data) => {
  console.log(`Backend: ${data}`);
});

// Start Frontend Server
const frontend = spawn('npm', ['start'], { cwd: '/Users/jonasstarke/Desktop/Uni/WiSe23:24/TerraClassifier_1_final/TerraClassifier_app/' });
frontend.stdout.on('data', (data) => {
  console.log(`Frontend: ${data}`);
});

// Fehlerbehandlung
backend.on('error', (error) => {
  console.error(`Fehler im Backend: ${error}`);
});

frontend.on('error', (error) => {
  console.error(`Fehler im Frontend: ${error}`);
});
