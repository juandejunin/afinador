/*
The MIT License (MIT)

Copyright (c) 2014 Chris Wilson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// Se asegura de que se utiliza el contexto de audio adecuado en todos los navegadores
window.AudioContext = window.AudioContext || window.webkitAudioContext;

// Inicialización de variables globales
var audioContext = null;
var isPlaying = false;
var sourceNode = null;
var analyser = null;
var theBuffer = null;
// var DEBUGCANVAS = null;
var mediaStreamSource = null;
var detectorElem,
  canvasElem,
  waveCanvas,
  pitchElem,
  noteElem,
  detuneElem,
  detuneAmount;

// La función window.onload se ejecuta cuando se carga completamente el documento HTML
window.onload = function () {
  // Crea un contexto de audio
  // El objeto AudioContext es parte de la Web Audio API, que es una interfaz de programación
  //  de aplicaciones (API) de JavaScript diseñada para procesar y sintetizar audio en la web.
  //  No es parte de JavaScript puro estándar, sino que es una API específica del navegador que
  //   proporciona funcionalidades avanzadas para trabajar con audio en aplicaciones web.

  audioContext = new AudioContext();
  // Define el tamaño máximo para el análisis de frecuencia
  MAX_SIZE = Math.max(4, Math.floor(audioContext.sampleRate / 5000)); // corresponde a una señal de 5kHz

  detectorElem = document.getElementById("detector");
  canvasElem = document.getElementById("output");
  DEBUGCANVAS = document.getElementById("waveform");
  if (DEBUGCANVAS) {
    waveCanvas = DEBUGCANVAS.getContext("2d");
    waveCanvas.strokeStyle = "black";
    waveCanvas.lineWidth = 1;
  }
  pitchElem = document.getElementById("pitch");
  noteElem = document.getElementById("note");
  detuneElem = document.getElementById("detune");
  detuneAmount = document.getElementById("detune_amt");

};

// Inicia la detección de tono desde una fuente de audio en vivo
function startPitchDetect() {
  // Intenta obtener la entrada de audio
  navigator.mediaDevices
    .getUserMedia({
      audio: {
        mandatory: {
          googEchoCancellation: "false",
          googAutoGainControl: "false",
          googNoiseSuppression: "false",
          googHighpassFilter: "false",
        },
        optional: [],
      },
    })
    .then((stream) => {
      // Crea un nodo de audio a partir del flujo de entrada
      mediaStreamSource = audioContext.createMediaStreamSource(stream);

      // Conecta el nodo de entrada al analizador de frecuencia
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 8192;
      mediaStreamSource.connect(analyser);
      // Actualiza continuamente la frecuencia de tono
      updatePitch();
    })
    .catch((err) => {
      // Verifica siempre los errores
      console.error(`${err.name}: ${err.message}`);
      alert("La generación del flujo falló.");
    });
}

// Alterna la reproducción de un oscilador en el navegador
function toggleOscillator() {
  if (isPlaying) {
    // Detiene la reproducción y retorna
    sourceNode.stop(0);
    sourceNode = null;
    analyser = null;
    isPlaying = false;
    if (!window.cancelAnimationFrame)
      window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
    window.cancelAnimationFrame(rafID);
    return "Reproducir oscilador";
  }
  sourceNode = audioContext.createOscillator();

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  sourceNode.connect(analyser);
  analyser.connect(audioContext.destination);
  sourceNode.start(0);
  isPlaying = true;
  isLiveInput = false;
  // Actualiza continuamente la frecuencia de tono
  updatePitch();

  return "Detener";
}

// Alterna la entrada de audio en vivo
function toggleLiveInput() {
  if (isPlaying) {
    // Detiene la reproducción y retorna
    sourceNode.stop(0);
    sourceNode = null;
    analyser = null;
    isPlaying = false;
    if (!window.cancelAnimationFrame)
      window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
    window.cancelAnimationFrame(rafID);
  }
  getUserMedia(
    {
      audio: {
        mandatory: {
          googEchoCancellation: "false",
          googAutoGainControl: "false",
          googNoiseSuppression: "false",
          googHighpassFilter: "false",
        },
        optional: [],
      },
    },
    gotStream
  );
}

var rafID = null;
var tracks = null;
var buflen = 2048;
var buf = new Float32Array(buflen);


var noteStrings = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B"
];  


function noteFromPitch(frequency) {
  var noteNum = 69 + 12 * Math.log(frequency / 440) / Math.log(2);
  var noteNumRounded = Math.round(noteNum);
  var cents = 1200 * (Math.log(frequency / (440 * Math.pow(2, (noteNumRounded - 69) / 12))) / Math.log(2));
  var roundedCents = Math.round(cents);
  console.log(noteNumRounded)
  if (roundedCents < -50) {
      noteNumRounded--;
  } else if (roundedCents >= 50) {
      noteNumRounded++;
  }
  return noteNumRounded;
}



// // Calcula la frecuencia a partir de un número de nota musical
function frequencyFromNoteNumber(note) {
    return 440 * Math.pow(2, (note - 69) / 24);
}

// Calcula la diferencia en centésimas de semitono entre una frecuencia y una nota
function centsOffFromPitch(frequency, note) {
  // Obtiene la frecuencia de la nota objetivo
  var targetFrequency = frequencyFromNoteNumber(note);

  // Calcula la diferencia de frecuencia entre la nota detectada y la nota objetivo
  var frequencyDifference = frequency - targetFrequency;

  // Calcula la diferencia en cuartos de tono (un cuarto de tono = 50 centésimas de semitono)
  var quarterToneDifference = frequencyDifference / (targetFrequency / 4);

  // Redondea al número entero más cercano
  return Math.round(quarterToneDifference * 100);
}


// Implementa el algoritmo de autocorrelación para la detección de tono
// el algoritmo de autocorrelación es una técnica comúnmente utilizada en procesamiento de señales
//  para determinar la periodicidad de una señal. En el contexto de la detección de tono, 
//  este algoritmo se utiliza para estimar la frecuencia fundamental de una señal de audio,
//   es decir, la frecuencia principal que define el tono de la señal.
function autoCorrelate(buf, sampleRate) {
  var SIZE = buf.length;
  var rms = 0;

  for (var i = 0; i < SIZE; i++) {
    var val = buf[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.005)
    // no hay suficiente señal
    return -1;

  var r1 = 0,
    r2 = SIZE - 1,
    thres = 0.2;
  for (var i = 0; i < SIZE / 2; i++)
    if (Math.abs(buf[i]) < thres) {
      r1 = i;
      break;
    }
  for (var i = 1; i < SIZE / 2; i++)
    if (Math.abs(buf[SIZE - i]) < thres) {
      r2 = SIZE - i;
      break;
    }

  buf = buf.slice(r1, r2);
  SIZE = buf.length;

  var c = new Array(SIZE).fill(0);
  for (var i = 0; i < SIZE; i++)
    for (var j = 0; j < SIZE - i; j++) c[i] = c[i] + buf[j] * buf[j + i];

  var d = 0;
  while (c[d] > c[d + 1]) d++;
  var maxval = -1,
    maxpos = -1;
  for (var i = d; i < SIZE; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  var T0 = maxpos;

  var x1 = c[T0 - 1],
    x2 = c[T0],
    x3 = c[T0 + 1];
  a = (x1 + x3 - 2 * x2) / 2;
  b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
}

// Actualiza continuamente la frecuencia de tono



// Actualiza continuamente la frecuencia de tono
function updatePitch(time) {
  var cycles = new Array();
  analyser.getFloatTimeDomainData(buf);
  var ac = autoCorrelate(buf, audioContext.sampleRate);

  if (ac == -1) {
    detectorElem.className = "vague";
    pitchElem.innerText = "--";
    noteElem.innerText = "-";
  } else {
    detectorElem.className = "confident";
    pitch = ac;
    pitchElem.innerText = Math.round(pitch);
    var note = noteFromPitch(pitch);
    noteElem.innerHTML = noteStrings[note % 12];
    var detune = centsOffFromPitch(pitch, note);
  }

  // Colorear los recuadros según la afinación detectada
      var boxes = document.querySelectorAll(".box");
      boxes.forEach(function(box) {
        box.style.backgroundColor = "transparent"; // Reinicia todos los recuadros a transparente
      });
  


      if (detune == 0) {
        // Afinación perfecta
        document.getElementById("box6").style.backgroundColor = "green"; // Cuadro 6 verde
      } else if (detune < 0 && detune > -10) {
        // Desviación entre -1 y -10
        document.getElementById("box5").style.backgroundColor = "#99ff99"; // Cuadro 5 verde claro
      } else if (detune <= -10 && detune > -20) {
        // Desviación entre -11 y -20
        document.getElementById("box4").style.backgroundColor = "#66ff66"; // Cuadro 4 verde más claro
      } else if (detune <= -20 && detune > -30) {
        // Desviación entre -21 y -30
        document.getElementById("box3").style.backgroundColor = "#33ff33"; // Cuadro 3 verde aún más claro
      } else if (detune <= -30 && detune > -40) {
        // Desviación entre -31 y -40
        document.getElementById("box2").style.backgroundColor = "#00ff00"; // Cuadro 2 verde brillante
      } else if (detune <= -40 && detune > -50) {
        // Desviación entre -41 y -50
        document.getElementById("box1").style.backgroundColor = "#00cc00"; // Cuadro 1 verde intenso
      } else if (detune > 0 && detune < 10) {
        // Desviación entre 1 y 10
        document.getElementById("box7").style.backgroundColor = "#99ff99"; // Cuadro 7 verde claro
      } else if (detune >= 10 && detune < 20) {
        // Desviación entre 11 y 20
        document.getElementById("box8").style.backgroundColor = "#66ff66"; // Cuadro 8 verde más claro
      } else if (detune >= 20 && detune < 30) {
        // Desviación entre 21 y 30
        document.getElementById("box9").style.backgroundColor = "#33ff33"; // Cuadro 9 verde aún más claro
      } else if (detune >= 30 && detune < 40) {
        // Desviación entre 31 y 40
        document.getElementById("box10").style.backgroundColor = "#00ff00"; // Cuadro 10 verde brillante
      } else if (detune >= 40 && detune < 50) {
          // Afinación baja
          document.getElementById("box11").style.backgroundColor = "#99ff99"; // Recuadro 1 rojo
        }
 

  if (!window.requestAnimationFrame)
    window.requestAnimationFrame = window.webkitRequestAnimationFrame;
  rafID = window.requestAnimationFrame(updatePitch);
}


