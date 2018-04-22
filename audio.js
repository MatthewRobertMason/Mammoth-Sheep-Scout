var audioContext;
var loadedMusic = null;

var Music = [
    "Audio/Gregorian Chant.mp3"
];

try {
    window.AudioContext = window.AudioContext||window.webkitAudioContext;
    audioContext = new AudioContext();
}
catch(e) {
    alert('Web Audio API is not supported in this browser');
}
console.log("start");
GetSound(Music[0]);

function getPeaksAtThreshold(data, threshold) {
    var peaksArray = [];
    var length = data.length;
    for(var i = 0; i < length;) {
        if (data[i] > threshold) {
            peaksArray.push(i);
            // Skip forward ~ 1/4s to get past this peak.
            i += 10000;
        }
        i++;
    }
    return peaksArray;
}

function GetSound(url){
    console.log("GetSound");
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    // Decode asynchronously
    request.onload = function() {
        console.log("Before Decode");
        audioContext.decodeAudioData(request.response, function(buffer) {
            loadedMusic = buffer;
            console.log("Music Loaded");
            PlaySound(loadedMusic);
      });
    }
    request.send();
}

function PlaySound(buffer) {
  console.log("PlaySound");
  var source = audioContext.createBufferSource(); // creates a sound source
  source.buffer = buffer;                    // tell the source which sound to play
  source.connect(audioContext.destination);       // connect the source to the context's destination (the speakers)
  source.start(0);                           // play the source now
                                             // note: on older systems, may have to use deprecated noteOn(time);
}
